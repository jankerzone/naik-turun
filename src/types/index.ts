export interface Website {
  id: string;
  user_id: string;
  url: string;
  created_at: string;
  last_status: "Up" | "Down" | "Checking..." | null;
  last_latency: number | null;
  last_checked_at: string | null;
}