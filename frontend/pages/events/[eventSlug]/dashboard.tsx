/* global process */
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EventHeader } from "@/components/shared/EventHeader";
import { EventStats } from "@/components/shared/EventStats";
import { EventActions } from "@/components/shared/EventActions";
import { EventRecentActivity } from "@/components/shared/EventRecentActivity";

// Define valid report states
const validStates = [
  "submitted",
  "acknowledged",
  "investigating",
  "resolved",
  "closed",
] as const;

type ReportState = typeof validStates[number];

interface User {
  id: string;
  name: string;
  email: string;
}

interface Reporter {
  id: string;
  email?: string;
}

interface Report {
  id: string;
  type: string;
  description: string;
  state: ReportState;
  reporter?: Reporter;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
}

interface StateChangeStatus {
  loading: boolean;
  error: string;
  success: string;
}

type StateChangeMap = {
  [reportId: string]: StateChangeStatus;
};

export default function EventDashboard() {
  const router = useRouter();
  const { eventSlug } = router.query;
  const [event, setEvent] = useState<Event | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch event details and user session
  useEffect(() => {
    if (!eventSlug || typeof eventSlug !== 'string') return;
    setLoading(true);
    
    // Fetch event details
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/api/events/slug/${eventSlug}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then((data) => setEvent(data.event))
      .catch(() => setError("Event not found"));
    
    // Fetch user session
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/session",
      { credentials: "include" }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data ? data.user : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [eventSlug]);

  // Fetch user roles for this event
  useEffect(() => {
    if (!eventSlug || typeof eventSlug !== 'string' || !user) return;
    
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/api/events/slug/${eventSlug}/my-roles`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : { roles: [] }))
      .then((data) => setUserRoles(data.roles || []))
      .catch(() => setUserRoles([]));
  }, [eventSlug, user]);

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold">Loading event...</h2>
          </Card>
        </div>
      </div>
    );
  }

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <EventHeader event={event} userRoles={[]} />
          
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
            <p className="text-muted-foreground mb-6">
              You need to log in to access the full event dashboard and submit reports.
            </p>
            <Link href="/login">
              <Button size="lg">Log In</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // Determine user's highest role for content display
  const isAdmin = userRoles.includes('Event Admin');
  const isResponder = userRoles.includes('Responder');
  const isReporter = userRoles.includes('Reporter');

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Event Header */}
        <EventHeader event={event} userRoles={userRoles} />

        {/* Event Statistics - Full Width */}
        {(isAdmin || isResponder) && (
          <EventStats eventSlug={eventSlug as string} userRoles={userRoles} />
        )}

        {/* Quick Actions - Full Width */}
        <EventActions 
          eventSlug={eventSlug as string} 
          userRoles={userRoles}
        />

        {/* Recent Activity - Full Width */}
        <EventRecentActivity 
          eventSlug={eventSlug as string}
          userRoles={userRoles}
        />

        {/* Role-based Content Sections */}
        {isReporter && !isResponder && !isAdmin && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reporter Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              As a reporter, you can submit new incident reports and view the status of your submissions.
            </p>
            <div className="flex gap-4">
              <Link href={`/events/${eventSlug}/reports/new`}>
                <Button>Submit New Report</Button>
              </Link>
              <Link href={`/events/${eventSlug}/reports`}>
                <Button variant="outline">View My Reports</Button>
              </Link>
            </div>
          </Card>
        )}

        {(isResponder || isAdmin) && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {isAdmin ? 'Admin Dashboard' : 'Responder Dashboard'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin 
                ? 'Manage all aspects of this event including reports, team members, and settings.'
                : 'Respond to and manage incident reports for this event.'
              }
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={`/events/${eventSlug}/reports`}>
                <Button>Manage Reports</Button>
              </Link>
              {isAdmin && (
                <>
                  <Link href={`/events/${eventSlug}/team`}>
                    <Button variant="outline">Manage Team</Button>
                  </Link>
                  <Link href={`/events/${eventSlug}/settings`}>
                    <Button variant="outline">Event Settings</Button>
                  </Link>
                </>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
} 