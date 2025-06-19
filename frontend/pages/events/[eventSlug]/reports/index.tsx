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

  // Fetch user's role for this event
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!eventSlug || !user) return;
      
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/events/slug/${eventSlug}/user-role`,
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // If user is a Reporter, redirect to my-reports page
          if (data.role === 'Reporter') {
            router.replace(`/events/${eventSlug}/my-reports`);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      }
      
      setLoading(false);
    };

    fetchUserRole();
  }, [eventSlug, user, router]);

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

  // This page should only be accessible to Responders and Admins
  // Reporters are redirected to my-reports page above
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