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

  useEffect(() => {
    if (eventSlug && user) {
      setLoading(false);
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