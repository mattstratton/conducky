import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AlertTriangle, Clock, TrendingUp, Plus } from "lucide-react";

interface EventCardStats {
  totalReports: number;
  urgentReports: number;
  assignedToMe: number;
  needsResponse: number;
  recentActivity: number;
  recentReports: Array<{
    id: string;
    title: string;
    state: string;
    severity: string | null;
    createdAt: string;
  }>;
}

interface EventCardProps {
  event: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    roles: string[];
  };
}

export function EventCard({ event }: EventCardProps) {
  const { name, slug, description, roles } = event;
  const isAdmin = roles.includes("Admin");
  const isResponder = roles.includes("Responder");
  const isReporter = roles.includes("Reporter");
  
  const [stats, setStats] = useState<EventCardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchStats() {
      try {
        setStatsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/events/slug/${slug}/cardstats`,
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch event card stats:', error);
      } finally {
        setStatsLoading(false);
      }
    }
    
    fetchStats();
  }, [slug]);

  return (
    <Card className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">{name}</h3>
        <div className="flex gap-1 flex-wrap">
          {roles.map((role) => (
            <Badge key={role} variant="secondary" className="text-xs">
              {role}
            </Badge>
          ))}
          {stats && stats.urgentReports > 0 && (
            <Badge variant="destructive" className="text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {stats.urgentReports} Urgent
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      {!statsLoading && stats && (
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>{stats.totalReports} Reports</span>
          </div>
          {stats.needsResponse > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <Clock className="w-3 h-3" />
              <span>{stats.needsResponse} Awaiting Response</span>
            </div>
          )}
          {isResponder && stats.assignedToMe > 0 && (
            <div className="text-blue-600 col-span-2">
              {stats.assignedToMe} assigned to me
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-muted-foreground mb-3 text-sm line-clamp-3 flex-grow">
          {description}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col mt-auto">
        {/* Action buttons area with consistent minimum height */}
        <div className="min-h-[200px] flex flex-col justify-start space-y-1 mb-3">
          {/* Admin actions */}
          {isAdmin && (
            <>
              {/* Reporter actions available to Admin */}
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/reports/new`} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Submit Report
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/reports?mine=1`}>My Reports</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/code-of-conduct`}>Code of Conduct</Link>
              </Button>
              {/* Admin-specific actions */}
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/team`}>Manage Users</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/reports`}>All Reports</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/settings`}>Event Settings</Link>
              </Button>
            </>
          )}

          {/* Responder actions */}
          {isResponder && !isAdmin && (
            <>
              {/* Reporter actions available to Responder */}
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/reports/new`} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Submit Report
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/reports?mine=1`}>My Reports</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/code-of-conduct`}>Code of Conduct</Link>
              </Button>
              {/* Responder-specific actions */}
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/reports?assigned=me`}>Assigned to Me</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/reports`}>All Reports</Link>
              </Button>
            </>
          )}

          {/* Reporter actions (only for Reporter role without higher permissions) */}
          {isReporter && !isResponder && !isAdmin && (
            <>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/reports/new`} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Submit Report
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/reports?mine=1`}>My Reports</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full justify-start">
                <Link href={`/events/${slug}/code-of-conduct`}>Code of Conduct</Link>
              </Button>
            </>
          )}
        </div>

        {/* Primary action - always positioned at bottom */}
        <Button asChild className="w-full">
          <Link href={`/events/${slug}/dashboard`}>Go to Event</Link>
        </Button>
      </div>
    </Card>
  );
} 