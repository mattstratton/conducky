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
    <Card className="w-full p-6">
      {loading ? (
        <div className="w-full text-center text-muted-foreground">Loading stats...</div>
      ) : error ? (
        <div className="w-full text-center text-destructive">{error}</div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
    <div className="flex flex-col items-center text-center">
      <span className="text-3xl font-bold text-primary mb-1">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
} 