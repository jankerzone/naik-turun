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
import { Trash2, LogOut, Settings, Download, FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);

  // Check if user is authenticated to determine which view to show
  const isAuthenticated = !!user;

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    };
    getUser();
  }, []);

  // Fetch websites for authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchWebsites = async () => {
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
      };

      fetchWebsites();
    } else if (!isAuthenticated) {
      setLoading(false); // Ensure loading state is set for unauthenticated users
    }
  }, [isAuthenticated, user]);

  const checkStatus = useCallback(async (websiteToCheck: Website) => {
    if (!isAuthenticated || !user) return;
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
  }, [isAuthenticated, user]);

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
    if (!isAuthenticated || !user) return;
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
    if (!isAuthenticated || !user) return;
    await supabase.from("websites").delete().match({ id });
    setWebsites((prev) => prev.filter((site) => site.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const downloadCSV = useCallback(async (type: 'websites' | 'status-checks') => {
    if (!user || !isAuthenticated) return;

    try {
      let data: any[] = [];
      let filename = '';
      let headers: string[] = [];

      if (type === 'websites') {
        // Fetch all websites data for the user
        const { data: websitesData, error: websitesError } = await supabase
          .from("websites")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (websitesError) {
          console.error("Error fetching websites:", websitesError);
          return;
        }

        headers = ["ID", "URL", "Last Status", "Last Latency (ms)", "Interval (s)", "Monitoring Location", "Created At", "Last Checked At"];
        data = websitesData.map((site: Website) => [
          site.id,
          site.url,
          site.last_status,
          site.last_latency,
          site.interval,
          site.monitoring_location,
          site.created_at ? format(new Date(site.created_at), "yyyy-MM-dd HH:mm:ss") : "",
          site.last_checked_at ? format(new Date(site.last_checked_at), "yyyy-MM-dd HH:mm:ss") : ""
        ]);
        filename = `websites-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
      } else if (type === 'status-checks') {
        // Fetch all status checks data for the user's websites
        const { data: websitesData, error: websitesError } = await supabase
          .from("websites")
          .select("id")
          .eq("user_id", user.id);

        if (websitesError) {
          console.error("Error fetching websites:", websitesError);
          return;
        }

        const websiteIds = websitesData.map((site: any) => site.id);
        
        const { data: checksData, error: checksError } = await supabase
          .from("status_checks")
          .select("*")
          .in("website_id", websiteIds)
          .order("created_at", { ascending: false });

        if (checksError) {
          console.error("Error fetching status checks:", checksError);
          return;
        }

        headers = ["ID", "Website ID", "Status", "Latency (ms)", "Monitoring Location", "Created At"];
        data = checksData.map((check: any) => [
          check.id,
          check.website_id,
          check.status,
          check.latency,
          check.monitoring_location,
          check.created_at ? format(new Date(check.created_at), "yyyy-MM-dd HH:mm:ss") : ""
        ]);
        filename = `status-checks-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
      }

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(field => 
          typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n')) 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(','))
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(`Error downloading ${type} CSV:`, error);
    }
  }, [user, isAuthenticated]);

  const downloadExcel = useCallback(async (type: 'websites' | 'status-checks') => {
    if (!user || !isAuthenticated) return;

    try {
      let data: any[] = [];
      let filename = '';
      let headers: string[] = [];

      if (type === 'websites') {
        // Fetch all websites data for the user
        const { data: websitesData, error: websitesError } = await supabase
          .from("websites")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (websitesError) {
          console.error("Error fetching websites:", websitesError);
          return;
        }

        headers = ["ID", "URL", "Last Status", "Last Latency (ms)", "Interval (s)", "Monitoring Location", "Created At", "Last Checked At"];
        data = websitesData.map((site: Website) => ({
          ID: site.id,
          URL: site.url,
          "Last Status": site.last_status,
          "Last Latency (ms)": site.last_latency,
          "Interval (s)": site.interval,
          "Monitoring Location": site.monitoring_location,
          "Created At": site.created_at ? format(new Date(site.created_at), "yyyy-MM-dd HH:mm:ss") : "",
          "Last Checked At": site.last_checked_at ? format(new Date(site.last_checked_at), "yyyy-MM-dd HH:mm:ss") : ""
        }));
        filename = `websites-${format(new Date(), "yyyyMMdd-HHmmss")}.xlsx`;
      } else if (type === 'status-checks') {
        // Fetch all status checks data for the user's websites
        const { data: websitesData, error: websitesError } = await supabase
          .from("websites")
          .select("id")
          .eq("user_id", user.id);

        if (websitesError) {
          console.error("Error fetching websites:", websitesError);
          return;
        }

        const websiteIds = websitesData.map((site: any) => site.id);
        
        const { data: checksData, error: checksError } = await supabase
          .from("status_checks")
          .select("*")
          .in("website_id", websiteIds)
          .order("created_at", { ascending: false });

        if (checksError) {
          console.error("Error fetching status checks:", checksError);
          return;
        }

        headers = ["ID", "Website ID", "Status", "Latency (ms)", "Monitoring Location", "Created At"];
        data = checksData.map((check: any) => ({
          ID: check.id,
          "Website ID": check.website_id,
          Status: check.status,
          "Latency (ms)": check.latency,
          "Monitoring Location": check.monitoring_location,
          "Created At": check.created_at ? format(new Date(check.created_at), "yyyy-MM-dd HH:mm:ss") : ""
        }));
        filename = `status-checks-${format(new Date(), "yyyyMMdd-HHmmss")}.xlsx`;
      }

      // Since we can't use external XLSX libraries without installing them, 
      // we'll create a CSV file with .xlsx extension to make it openable in Excel
      const csvContent = [
        headers.join('\t'), // Use tab delimiter for better Excel compatibility
        ...data.map(row => Object.values(row).map(field => 
          typeof field === 'string' && (field.includes('\t') || field.includes('"') || field.includes('\n')) 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join('\t'))
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(`Error downloading ${type} Excel:`, error);
    }
  }, [user, isAuthenticated]);

  // Status check timer for authenticated users
  useEffect(() => {
    if (!isAuthenticated || !user) return; // Only run for authenticated users
    
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
  }, [isAuthenticated, user, websites, checkStatus]);

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <header className="bg-white dark:bg-gray-950 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <h1 className="text-xl font-semibold">Uptime Monitor</h1>
              <div className="flex items-center gap-4">
                <Button onClick={() => router.push('/login')}>
                  Login
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl w-full text-center space-y-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Monitor Your Website's Uptime
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Keep track of your website's availability and performance with our easy-to-use monitoring tool.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => router.push('/login')}
                className="px-8 py-6 text-lg"
              >
                Get Started - Login
              </Button>
            </div>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Real-time Monitoring</h3>
                <p className="text-muted-foreground">Track your website status in real-time with instant notifications.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Detailed Reports</h3>
                <p className="text-muted-foreground">Access comprehensive uptime reports and performance metrics.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Global Checks</h3>
                <p className="text-muted-foreground">Monitor from multiple locations to ensure worldwide availability.</p>
              </div>
            </div>
          </div>
        </main>
        
        <MadeWithDyad />
      </div>
    );
  }

  // Show dashboard for authenticated users
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
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Monitored Websites</CardTitle>
              <CardDescription>
                A list of your websites and their current status.
              </CardDescription>
            </div>
            {isAuthenticated && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCSV('websites')}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadExcel('websites')}
                  className="flex items-center gap-1"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
              </div>
            )}
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
        
        {isAuthenticated && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Status Check History</CardTitle>
                <CardDescription>
                  Download historical status check data for all your websites.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCSV('status-checks')}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadExcel('status-checks')}
                  className="flex items-center gap-1"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click the buttons above to download all status check records for your websites.
              </p>
            </CardContent>
          </Card>
        )}
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