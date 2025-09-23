export interface Website {
  id: string;
  url: string;
  status: "Up" | "Down" | "Checking...";
  latency: number | null;
  lastChecked: string | null;
}