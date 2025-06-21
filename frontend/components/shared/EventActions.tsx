import React from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Users, Settings, FileText, AlertCircle, Eye } from "lucide-react";
import Link from "next/link";

interface EventActionsProps {
  eventSlug: string;
  userRoles: string[];
  onSubmitReport?: () => void;
}

export function EventActions({ eventSlug, userRoles, onSubmitReport }: EventActionsProps) {
  const isAdmin = userRoles.includes("Event Admin") || userRoles.includes("SuperAdmin");
  const isResponder = userRoles.includes("Responder");
  const isReporter = userRoles.includes("Reporter");

  return (
    <Card className="p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Primary Submit Report Action - Always Available */}
        <Button 
          onClick={onSubmitReport}
          className="flex items-center gap-2 h-12"
          size="lg"
        >
          <Plus className="h-4 w-4" />
          Submit Report
        </Button>

        {/* Reporter Actions */}
        {isReporter && (
          <>
            <Button asChild variant="outline" className="flex items-center gap-2 h-12">
              <Link href={`/events/${eventSlug}/reports?mine=1`}>
                <FileText className="h-4 w-4" />
                My Reports
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex items-center gap-2 h-12">
              <Link href={`/events/${eventSlug}/code-of-conduct`}>
                <Eye className="h-4 w-4" />
                Code of Conduct
              </Link>
            </Button>
          </>
        )}

        {/* Responder Actions */}
        {isResponder && (
          <>
            <Button asChild variant="outline" className="flex items-center gap-2 h-12">
              <Link href={`/events/${eventSlug}/reports`}>
                <FileText className="h-4 w-4" />
                All Reports
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex items-center gap-2 h-12">
              <Link href={`/events/${eventSlug}/reports?assigned=me`}>
                <AlertCircle className="h-4 w-4" />
                Assigned to Me
              </Link>
            </Button>
          </>
        )}

        {/* Admin Actions */}
        {isAdmin && (
          <>
            <Button asChild variant="outline" className="flex items-center gap-2 h-12">
              <Link href={`/events/${eventSlug}/team`}>
                <Users className="h-4 w-4" />
                Manage Team
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex items-center gap-2 h-12">
              <Link href={`/events/${eventSlug}/reports`}>
                <FileText className="h-4 w-4" />
                All Reports
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex items-center gap-2 h-12">
              <Link href={`/events/${eventSlug}/settings`}>
                <Settings className="h-4 w-4" />
                Event Settings
              </Link>
            </Button>
          </>
        )}
      </div>
    </Card>
  );
} 