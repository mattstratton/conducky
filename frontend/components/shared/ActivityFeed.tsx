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
    <Card className="w-full max-w-md mx-auto mb-6 p-4">
      <h2 className="text-lg font-bold mb-3">Recent Activity</h2>
      {loading ? (
        <div className="text-center text-gray-500">Loading activity...</div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : activity.length === 0 ? (
        <div className="text-center text-gray-500">No recent activity.</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {activity.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-sm text-gray-800 dark:text-gray-100">{item.message}</div>
                <div className="text-xs text-gray-400 mt-1">{formatTimeAgo(item.timestamp)}</div>
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