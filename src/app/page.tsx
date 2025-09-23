"use client";

import { useState, useEffect } from "react";
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
import { Trash2 } from "lucide-react";

export default function Home() {
  const [websites, setWebsites] = useState<Website[]>([]);

  const checkStatus = async (websiteToCheck: Website) => {
    try {
      const response = await fetch("/api/check-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: websiteToCheck.url }),
      });
      const data = await response.json();
      setWebsites((currentWebsites) =>
        currentWebsites.map((site) =>
          site.id === websiteToCheck.id
            ? {
                ...site,
                status: data.status,
                latency: data.latency,
                lastChecked: new Date().toLocaleString(),
              }
            : site
        )
      );
    } catch (error) {
      console.error("Failed to check status:", error);
      setWebsites((currentWebsites) =>
        currentWebsites.map((site) =>
          site.id === websiteToCheck.id
            ? {
                ...site,
                status: "Down",
                latency: null,
                lastChecked: new Date().toLocaleString(),
              }
            : site
        )
      );
    }
  };

  const handleAddSite = (url: string) => {
    const newWebsite: Website = {
      id: crypto.randomUUID(),
      url,
      status: "Checking...",
      latency: null,
      lastChecked: null,
    };
    setWebsites((prev) => [...prev, newWebsite]);
    checkStatus(newWebsite);
  };

  const handleRemoveSite = (id: string) => {
    setWebsites((prev) => prev.filter((site) => site.id !== id));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      websites.forEach(checkStatus);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [websites]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-[family-name:var(--font-geist-sans)]">
      <header className="bg-white dark:bg-gray-950 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold">Uptime Monitor</h1>
            <AddSiteDialog onAddSite={handleAddSite} />
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
                {websites.length > 0 ? (
                  websites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.url}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            site.status === "Up"
                              ? "default"
                              : site.status === "Down"
                              ? "destructive"
                              : "secondary"
                          }
                          className={site.status === "Up" ? "bg-green-500" : ""}
                        >
                          {site.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {site.latency !== null ? `${site.latency} ms` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {site.lastChecked ? site.lastChecked : "Never"}
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