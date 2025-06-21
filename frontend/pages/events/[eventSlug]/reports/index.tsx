import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/router";
import { Card } from "../../../../components/ui/card";
import { UserContext } from "../../../_app";
import { EnhancedReportList } from "../../../../components/reports/EnhancedReportList";

// Define UserContext type
interface UserContextType {
  user: {
    id: string;
    email?: string;
    name?: string;
  } | null;
}

export default function EventReportsPage() {
  const router = useRouter();
  const { eventSlug } = router.query;
  const { user } = useContext(UserContext) as UserContextType;
  const [loading, setLoading] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

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
          } catch (e) {
            data = { error: await response.text() };
          }
          if (!response.ok) {
            console.error('Error fetching user roles:', data.error || data);
            setAccessDenied(true);
            setLoading(false);
            return;
          }
          if (data.roles) {
            // Check if user has responder, event admin, or superadmin role
            const hasAccess = data.roles.some((role: string) => 
              ['responder', 'event admin', 'superadmin'].includes(role.toLowerCase())
            );
            setAccessDenied(!hasAccess);
          } else {
            setAccessDenied(true);
          }
          setLoading(false);
        })
        .catch(error => {
          console.error('Network or parsing error fetching user roles:', error);
          setAccessDenied(true);
          setLoading(false);
        });
    }
  }, [eventSlug, user]);

  if (!user) {
    return (
      <Card className="max-w-7xl mx-auto p-4 sm:p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">Event Reports</h2>
        <div className="text-gray-500 dark:text-gray-400">You must be logged in to view reports.</div>
      </Card>
    );
  }

  if (loading || !eventSlug) {
    return (
      <Card className="max-w-7xl mx-auto p-4 sm:p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">Event Reports</h2>
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </Card>
    );
  }

  if (accessDenied) {
    return (
      <Card className="max-w-7xl mx-auto p-4 sm:p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">Access Denied</h2>
        <div className="text-gray-500 dark:text-gray-400">
          You don&apos;t have permission to view all event reports. Only Responders and Admins can access this page.
        </div>
      </Card>
    );
  }

  // This page shows all event reports (accessible via navigation only to Responders/Admins)
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 mt-8">
      <h1 className="text-3xl font-bold mb-8">All Event Reports</h1>
      <EnhancedReportList
        eventSlug={eventSlug as string}
        showBulkActions={true}
        showPinning={true}
        showExport={true}
        className="w-full"
      />
    </div>
  );
}