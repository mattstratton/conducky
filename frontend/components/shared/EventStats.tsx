import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";

interface EventStatsData {
  totalReports: number;
  myReports?: number;
  assignedReports?: number;
  needsResponseCount?: number;
  resolvedReports?: number;
  totalUsers?: number;
  pendingInvites?: number;
}

interface EventStatsProps {
  eventSlug: string;
  userRoles: string[];
}

export function EventStats({ eventSlug, userRoles }: EventStatsProps) {
  const [stats, setStats] = useState<EventStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = userRoles.includes("Event Admin") || userRoles.includes("SuperAdmin");
  const isResponder = userRoles.includes("Responder");
  const isReporter = userRoles.includes("Reporter");

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + 
          `/api/events/slug/${eventSlug}/stats`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch {
        setError("Could not load event stats.");
      } finally {
        setLoading(false);
      }
    }
    
    if (eventSlug) {
      fetchStats();
    }
  }, [eventSlug]);

  if (loading) {
    return (
      <Card className="p-6 mb-6">
        <div className="text-center text-muted-foreground">Loading stats...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 mb-6">
        <div className="text-center text-destructive">{error}</div>
      </Card>
    );
  }

  if (!stats) return null;

  // Role-specific stat configurations
  const getStatsForRole = () => {
    if (isAdmin) {
      return [
        { label: "Total Reports", value: stats.totalReports, color: "text-blue-600" },
        { label: "Total Users", value: stats.totalUsers || 0, color: "text-green-600" },
        { label: "Needs Response", value: stats.needsResponseCount || 0, color: "text-orange-600" },
        { label: "Pending Invites", value: stats.pendingInvites || 0, color: "text-purple-600" },
      ];
    } else if (isResponder) {
      return [
        { label: "Total Reports", value: stats.totalReports, color: "text-blue-600" },
        { label: "Assigned to Me", value: stats.assignedReports || 0, color: "text-orange-600" },
        { label: "Needs Response", value: stats.needsResponseCount || 0, color: "text-red-600" },
        { label: "Resolved", value: stats.resolvedReports || 0, color: "text-green-600" },
      ];
    } else if (isReporter) {
      return [
        { label: "My Reports", value: stats.myReports || 0, color: "text-blue-600" },
        { label: "Resolved", value: stats.resolvedReports || 0, color: "text-green-600" },
        { label: "Total Reports", value: stats.totalReports, color: "text-gray-600" },
      ];
    }
    return [];
  };

  const statsToShow = getStatsForRole();

  return (
    <Card className="p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Event Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsToShow.map((stat, index) => (
          <StatBox
            key={index}
            label={stat.label}
            value={stat.value}
            color={stat.color}
          />
        ))}
      </div>
    </Card>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  color?: string;
}

function StatBox({ label, value, color = "text-primary" }: StatBoxProps) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color} mb-1`}>
        {value}
      </div>
      <div className="text-sm text-muted-foreground">
        {label}
      </div>
    </div>
  );
} 