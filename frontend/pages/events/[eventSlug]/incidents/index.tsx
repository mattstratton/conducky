import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/router";
import { Card } from "../../../../components/ui/card";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { UserContext } from "../../../_app";
import { EnhancedIncidentList } from "../../../../components/incidents/EnhancedIncidentList";
import { useLogger } from "../../../../hooks/useLogger";

// Define UserContext type
interface UserContextType {
  user: {
    id: string;
    email?: string;
    name?: string;
  } | null;
}

export default function EventIncidentsPage() {
  const router = useRouter();
  const { eventSlug } = router.query;
  const { user } = useContext(UserContext) as UserContextType;
  const { error: logError } = useLogger();
  const [loading, setLoading] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Fetch user roles for this event after user is set
  useEffect(() => {
    if (eventSlug && user) {
      // Fetch user's roles for this event using the full backend URL
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlug}/my-roles`, {
        credentials: 'include'
      })
        .then(async response => {
          let data = null;
          try {
            data = await response.json();
          } catch {
            data = { error: await response.text() };
          }
          if (!response.ok) {
            logError('Error fetching user roles', { 
              eventSlug: typeof eventSlug === 'string' ? eventSlug : eventSlug?.[0], 
              userId: user.id 
            }, new Error(data.error || JSON.stringify(data)));
            setAccessDenied(true);
            setLoading(false);
            return;
          }
          if (data.roles) {
            setUserRoles(data.roles);
            // Check if user has responder, event admin, or system admin role (unified names)
            const hasAccess = data.roles.some((role: string) => 
              ['responder', 'event_admin', 'system_admin'].includes(role)
            );
            setAccessDenied(!hasAccess);
          } else {
            setAccessDenied(true);
          }
          setLoading(false);
        })
        .catch(error => {
          logError('Network or parsing error fetching user roles', { 
            eventSlug: typeof eventSlug === 'string' ? eventSlug : eventSlug?.[0], 
            userId: user.id 
          }, error);
          setAccessDenied(true);
          setLoading(false);
        });
    }
  }, [eventSlug, user]);

  if (!user) {
    return (
      <AccessDenied
        title="Please Log In"
        message="You need to log in to view incidents for this event."
        loginRedirectPath={router.asPath as string}
      />
    );
  }

  if (loading || !eventSlug) {
    return (
      <Card className="max-w-7xl mx-auto p-4 sm:p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">Event Incidents</h2>
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </Card>
    );
  }

  if (accessDenied) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don’t have permission to view all event incidents. Only Responders and Admins can access this page."
        showLoginButton={false}
      />
    );
  }

  // This page shows all event reports (accessible via navigation only to Responders/Admins)
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 mt-8">
      <h1 className="text-3xl font-bold mb-8">All Event Incidents</h1>
      <EnhancedIncidentList
        eventSlug={eventSlug as string}
        showBulkActions={true}
        showPinning={true}
        showExport={true}
        className="w-full"
        userRoles={userRoles}
      />
    </div>
  );
}