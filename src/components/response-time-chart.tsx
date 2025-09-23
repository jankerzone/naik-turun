"use client";

import { StatusCheck } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ResponseTimeChartProps {
  data: StatusCheck[];
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  const chartData = data
    .map((check) => ({
      time: new Date(check.created_at).toLocaleTimeString(),
      latency: check.latency,
    }))
    .reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Time (ms)</CardTitle>
        <CardDescription>
          Latency of the last {data.length} checks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}