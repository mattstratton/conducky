import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/router";
import { Card } from "../../../components/ui/card";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { UserContext } from "../../_app";
import { EnhancedIncidentList } from "../../../components/incidents/EnhancedIncidentList";
import Link from "next/link";

// Define UserContext type
interface UserContextType {
  user: {
    id: string;
    email?: string;
    name?: string;
  } | null;
}

export default function MyEventIncidentsPage() {
  const router = useRouter();
  const { eventSlug } = router.query;
  const { user } = useContext(UserContext) as UserContextType;
  const [loading, setLoading] = useState<boolean>(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    if (eventSlug && user) {
      // Fetch user's roles for this event
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlug}/my-roles`, {
        credentials: 'include'
      })
        .then(async response => {
          if (response.ok) {
            const data = await response.json();
            if (data.roles) {
              setUserRoles(data.roles);
            }
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [eventSlug, user]);

  if (!user) {
    return (
      <AccessDenied
        title="Please Log In"
        message="You need to log in to view your incidents for this event."
        loginRedirectPath={router.asPath as string}
      />
    );
  }

  if (loading || !eventSlug) {
    return (
      <Card className="max-w-7xl mx-auto p-4 sm:p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">My Incidents</h2>
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 mt-8">
      <h1 className="text-3xl font-bold mb-8">My Incidents</h1>
      <Card className="mb-6 p-4">
        <p className="text-sm text-muted-foreground">
          This page lists incidents that <span className="font-medium">you submitted</span> for this event.
          It does not include incidents submitted by others, even if they are assigned to you.
          {userRoles.some((r) => ["responder", "event_admin", "system_admin"].includes(r)) && (
            <>
              {" "}To view all incidents for this event, go to
              {" "}
              <Link
                href={`/events/${eventSlug as string}/incidents`}
                className="text-blue-600 dark:text-blue-400 underline"
              >
                Event Incidents
              </Link>
              .
            </>
          )}
        </p>
      </Card>
      <EnhancedIncidentList
        eventSlug={eventSlug as string}
        userId={user.id}
        showBulkActions={false}
        showPinning={true}
        showExport={true}
        className="w-full"
        userRoles={userRoles}
      />
    </div>
  );
} 