import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AlertTriangle, Clock, TrendingUp, Plus } from "lucide-react";

// Simple in-memory cache for event card stats
const statsCache = new Map<string, { data: EventCardStats; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

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
  const isAdmin = roles.includes("Event Admin");
  const isResponder = roles.includes("Responder");
  const isReporter = roles.includes("Reporter");
  
  const [stats, setStats] = useState<EventCardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchStats() {
      try {
        setStatsLoading(true);
        setStatsError(null);
        
        // Check cache first
        const cacheKey = `stats-${slug}`;
        const cached = statsCache.get(cacheKey);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          setStats(cached.data);
          setStatsLoading(false);
          return;
        }
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/events/slug/${slug}/cardstats`,
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          
          // Cache the successful response
          statsCache.set(cacheKey, { data, timestamp: now });
        } else {
          const errorMessage = `Failed to fetch stats: ${response.status} ${response.statusText}`;
          console.warn(`Failed to fetch stats for event ${slug}: ${response.status}`);
          setStatsError(errorMessage);
        }
      } catch (error) {
        const errorMessage = 'Network error while fetching stats';
        console.error('Failed to fetch event card stats:', error);
        setStatsError(errorMessage);
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

      {/* Error State */}
      {!statsLoading && statsError && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          Unable to load event statistics
        </div>
      )}

      {/* Loading State */}
      {statsLoading && (
        <div className="mb-3 text-xs text-muted-foreground">
          Loading statistics...
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