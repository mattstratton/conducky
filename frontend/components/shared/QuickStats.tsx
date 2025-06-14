import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";

interface QuickStatsData {
  eventCount: number;
  reportCount: number;
  needsResponseCount: number;
}

export function QuickStats() {
  const [stats, setStats] = useState<QuickStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/users/me/quickstats", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch {
        setError("Could not load stats.");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto mb-6 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
      {loading ? (
        <div className="w-full text-center text-gray-500">Loading stats...</div>
      ) : error ? (
        <div className="w-full text-center text-red-500">{error}</div>
      ) : stats ? (
        <div className="flex w-full justify-between gap-4">
          <StatBox label="Events" value={stats.eventCount} />
          <StatBox label="Reports" value={stats.reportCount} />
          <StatBox label="Needs Response" value={stats.needsResponseCount} />
        </div>
      ) : null}
    </Card>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
}

function StatBox({ label, value }: StatBoxProps) {
  return (
    <div className="flex flex-col items-center flex-1">
      <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">{value}</span>
      <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">{label}</span>
    </div>
  );
} 