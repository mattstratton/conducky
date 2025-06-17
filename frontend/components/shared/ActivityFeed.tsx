import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";

// NOTE: This uses mock data from the backend for now. Update to use real AuditLog data when available.

interface ActivityItem {
  type: string;
  message: string;
  timestamp: string;
  eventSlug?: string;
  reportId?: string;
}

export function ActivityFeed() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchActivity() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/users/me/activity", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch activity");
        const data = await res.json();
        setActivity(data.activity || []);
      } catch {
        setError("Could not load activity.");
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, []);

  return (
    <Card className="w-full h-fit p-6">
      <h2 className="text-xl font-bold mb-4 text-foreground">Recent Activity</h2>
      {loading ? (
        <div className="text-center text-muted-foreground py-8">Loading activity...</div>
      ) : error ? (
        <div className="text-center text-destructive py-8">{error}</div>
      ) : activity.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">No recent activity.</div>
      ) : (
        <ul className="flex flex-col gap-4">
          {activity.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-2 w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground leading-relaxed">{item.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatTimeAgo(item.timestamp)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
} 