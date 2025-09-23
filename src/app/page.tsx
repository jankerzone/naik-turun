"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { AddSiteDialog } from "@/components/add-site-dialog";
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
import { Trash2, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

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

  const checkStatus = useCallback(
    async (websiteToCheck: Website) => {
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
          })
          .match({ id: websiteToCheck.id });

        await supabase
          .from("status_checks")
          .insert({
            website_id: websiteToCheck.id,
            status: data.status,
            latency: data.latency,
          });

        setWebsites((current) =>
          current.map((site) =>
            site.id === websiteToCheck.id
              ? {
                  ...site,
                  last_status: data.status,
                  last_latency: data.latency,
                  last_checked_at,
                }
              : site
          )
        );
      } catch (error) {
        console.error("Failed to check status:", error);
      }
    },
    []
  );

  const handleAddSite = async (url: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("websites")
      .insert({ url, user_id: user.id })
      .select();

    if (error) {
      console.error("Error adding site:", error);
    } else if (data) {
      const newWebsite = data[0];
      setWebsites((prev) => [...prev, newWebsite]);
      checkStatus(newWebsite);
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
    if (websites.length > 0) {
      const interval = setInterval(() => {
        websites.forEach(checkStatus);
      }, 30000);
      return () => clearInterval(interval);
    }
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
              A list of your websites and their current status. Statuses refresh
              every 30 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Last Checked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ) : websites.length > 0 ? (
                  websites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.url}</TableCell>
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
                      <TableCell>
                        {site.last_checked_at
                          ? new Date(site.last_checked_at).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
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
                      colSpan={5}
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
      <MadeWithDyad />
    </div>
  );
}