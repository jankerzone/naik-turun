"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Website, StatusCheck } from "@/types";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { ResponseTimeChart } from "@/components/response-time-chart";
import { StatusGrid } from "@/components/status-grid";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";

export default function WebsiteDetailPage({ params }: { params: any }) {
  const { id } = params;
  const [website, setWebsite] = useState<Website | null>(null);
  const [statusChecks, setStatusChecks] = useState<StatusCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebsiteData = async () => {
      setLoading(true);

      const { data: websiteData, error: websiteError } = await supabase
        .from("websites")
        .select("*")
        .eq("id", id)
        .single();

      if (websiteError) {
        console.error("Error fetching website:", websiteError);
        setLoading(false);
        return;
      }
      setWebsite(websiteData);

      const thirtyDaysAgo = subDays(new Date(), 29);
      const { data: checksData, error: checksError } = await supabase
        .from("status_checks")
        .select("*")
        .eq("website_id", id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (checksError) {
        console.error("Error fetching status checks:", checksError);
      } else {
        setStatusChecks(checksData);
      }

      setLoading(false);
    };

    fetchWebsiteData();
  }, [id]);

  const { uptimePercentage, averageLatency } = useMemo(() => {
    if (statusChecks.length === 0) {
      return { uptimePercentage: 100, averageLatency: 0 };
    }

    const upChecks = statusChecks.filter((c) => c.status === "Up").length;
    const uptime = (upChecks / statusChecks.length) * 100;

    const latencies = statusChecks
      .map((c) => c.latency)
      .filter((l): l is number => l !== null);
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;

    return {
      uptimePercentage: uptime,
      averageLatency: avgLatency,
    };
  }, [statusChecks]);

  const dailyStatuses = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = startOfDay(subDays(today, 29));
    const dateInterval = eachDayOfInterval({
      start: thirtyDaysAgo,
      end: today,
    });

    const checksByDay = statusChecks.reduce((acc, check) => {
      const day = format(startOfDay(new Date(check.created_at)), "yyyy-MM-dd");
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(check.status);
      return acc;
    }, {} as Record<string, (string | null)[]>);

    return dateInterval.map((date) => {
      const dayKey = format(date, "yyyy-MM-dd");
      const statuses = checksByDay[dayKey];
      let status: "Up" | "Down" | "NoData" = "NoData";
      if (statuses) {
        status = statuses.includes("Down") ? "Down" : "Up";
      }
      return { date: dayKey, status };
    });
  }, [statusChecks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <p>Website not found.</p>
        <Link href="/" className="text-blue-500 hover:underline mt-4 inline-block">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <Link
          href="/"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold break-all">{website.url}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Uptime (30d)"
          value={`${uptimePercentage.toFixed(2)}%`}
        />
        <StatCard
          title="Avg. Latency (30d)"
          value={`${averageLatency.toFixed(0)} ms`}
        />
        <StatCard
          title="Current Status"
          value={website.last_status || "N/A"}
        />
        <StatCard
          title="Monitoring Location"
          value={website.monitoring_location || "N/A"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResponseTimeChart data={statusChecks} />
        <StatusGrid dailyStatuses={dailyStatuses} />
      </div>
    </main>
  );
}