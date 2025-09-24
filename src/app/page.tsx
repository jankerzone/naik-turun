"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { AddSiteDialog } from "@/components/add-site-dialog";
import { EditIntervalDialog } from "@/components/edit-interval-dialog";
import { Website } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, LogOut, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        router.push("/login");
      }
    };
    getUser();
  }, [router]);

  const fetchWebsites = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("websites")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching websites:", error);
    } else if (data) {
      setWebsites(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWebsites();
    }
  }, [user, fetchWebsites]);

  const checkStatus = useCallback(async (websiteToCheck: Website) => {
    try {
      const response = await fetch("/api/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteToCheck.url }),
      });
      const data = await response.json();
      const last_checked_at = new Date().toISOString();

      await supabase
        .from("websites")
        .update({
          last_status: data.status,
          last_latency: data.latency,
          last_checked_at,
          monitoring_location: data.monitoringLocation,
        })
        .match({ id: websiteToCheck.id });

      await supabase.from("status_checks").insert({
        website_id: websiteToCheck.id,
        status: data.status,
        latency: data.latency,
        monitoring_location: data.monitoringLocation,
      });

      setWebsites((current) =>
        current.map((site) =>
          site.id === websiteToCheck.id
            ? {
                ...site,
                last_status: data.status,
                last_latency: data.latency,
                last_checked_at,
                monitoring_location: data.monitoringLocation,
              }
            : site
        )
      );
    } catch (error) {
      console.error("Failed to check status:", error);
    }
  }, []);

  const handleAddSite = async ({
    url,
    interval,
  }: {
    url: string;
    interval: number;
  }) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("websites")
      .insert({ url, user_id: user.id, interval })
      .select();

    if (error) {
      console.error("Error adding site:", error);
    } else if (data) {
      const newWebsite = data[0];
      setWebsites((prev) => [...prev, newWebsite]);
      checkStatus(newWebsite);
    }
  };

  const handleUpdateInterval = async (websiteId: string, interval: number) => {
    const { error } = await supabase
      .from("websites")
      .update({ interval })
      .match({ id: websiteId });

    if (error) {
      console.error("Error updating interval:", error);
    } else {
      setWebsites((prev) =>
        prev.map((site) =>
          site.id === websiteId ? { ...site, interval } : site
        )
      );
    }
  };

  const handleRemoveSite = async (id: string) => {
    await supabase.from("websites").delete().match({ id });
    setWebsites((prev) => prev.filter((site) => site.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    const timer = setInterval(() => {
      websites.forEach((site) => {
        const now = new Date();
        const lastChecked = site.last_checked_at
          ? new Date(site.last_checked_at)
          : new Date(0);
        const secondsSinceLastCheck = (now.getTime() - lastChecked.getTime()) / 1000;

        if (secondsSinceLastCheck >= site.interval) {
          checkStatus(site);
        }
      });
    }, 5000); // This is the "tick" interval, it checks every 5 seconds if a site needs a status update.

    return () => clearInterval(timer);
  }, [websites, checkStatus]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-[family-name:var(--font-geist-sans)]">
      <header className="bg-white dark:bg-gray-950 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold">Uptime Monitor</h1>
            <div className="flex items-center gap-4">
              <AddSiteDialog onAddSite={handleAddSite} />
              <Button variant="outline" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Monitored Websites</CardTitle>
            <CardDescription>
              A list of your websites and their current status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ) : websites.length > 0 ? (
                  websites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/website/${site.id}`}
                          className="hover:underline"
                        >
                          {site.url}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            site.last_status === "Up"
                              ? "default"
                              : site.last_status === "Down"
                              ? "destructive"
                              : "secondary"
                          }
                          className={
                            site.last_status === "Up" ? "bg-green-500" : ""
                          }
                        >
                          {site.last_status || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {site.last_latency !== null
                          ? `${site.last_latency} ms`
                          : "N/A"}
                      </TableCell>
                      <TableCell>{site.interval / 60} min</TableCell>
                      <TableCell>
                        {site.last_status === "Up" && site.monitoring_location
                          ? site.monitoring_location
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingWebsite(site)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSite(site.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-12"
                    >
                      No websites are being monitored.
                      <br />
                      Click &quot;Add Website&quot; to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <EditIntervalDialog
        isOpen={!!editingWebsite}
        onOpenChange={(open) => !open && setEditingWebsite(null)}
        website={editingWebsite}
        onUpdateInterval={handleUpdateInterval}
      />
      <MadeWithDyad />
    </div>
  );
}