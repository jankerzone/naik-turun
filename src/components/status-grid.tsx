"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { cn } from "@/lib/utils";

type DailyStatus = {
  date: string;
  status: "Up" | "Down" | "NoData";
};

interface StatusGridProps {
  dailyStatuses: DailyStatus[];
}

export function StatusGrid({ dailyStatuses }: StatusGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Status</CardTitle>
        <CardDescription>Uptime status for the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-10 gap-2">
            {dailyStatuses.map(({ date, status }) => (
              <Tooltip key={date}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "h-8 w-full rounded-sm",
                      status === "Up" && "bg-green-500",
                      status === "Down" && "bg-red-500",
                      status === "NoData" && "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {new Date(date).toLocaleDateString()}: {status}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}