import React from "react";
import Link from "next/link";
import { Card } from "../ui/card";

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

  const actionBtnClass = "inline-block bg-blue-700 text-white text-xs px-3 py-1 rounded hover:bg-blue-800 transition mb-1";

  return (
    <Card className="p-4 text-left flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-lg font-semibold">{name}</h3>
        <div className="flex gap-1 flex-wrap">
          {roles.map((role) => (
            <span key={role} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
              {role}
            </span>
          ))}
        </div>
      </div>
      {description && <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">{description}</p>}
      <div className="flex flex-wrap gap-2 mt-2">
        {/* Admin actions */}
        {isAdmin && (
          <>
            <Link href={`/events/${slug}/team`} className={actionBtnClass}>Manage Team</Link>
            <Link href={`/events/${slug}/reports`} className={actionBtnClass}>View All Reports</Link>
            <Link href={`/events/${slug}/settings`} className={actionBtnClass}>Event Settings</Link>
          </>
        )}
        {/* Responder actions */}
        {isResponder && (
          <>
            <Link href={`/events/${slug}/reports?assigned=me`} className={actionBtnClass}>Assigned to Me</Link>
            <Link href={`/events/${slug}/reports`} className={actionBtnClass}>All Reports</Link>
            <Link href={`/events/${slug}/reports/new`} className={actionBtnClass}>Submit Report</Link>
          </>
        )}
        {/* Reporter actions */}
        {isReporter && (
          <>
            <Link href={`/events/${slug}/reports/new`} className={actionBtnClass}>Submit Report</Link>
            <Link href={`/events/${slug}/reports?mine=1`} className={actionBtnClass}>My Reports</Link>
            <Link href={`/events/${slug}/code-of-conduct`} className={actionBtnClass}>Code of Conduct</Link>
          </>
        )}
        {/* Always show Go to Event */}
        <Link href={`/events/${slug}/dashboard`} className={actionBtnClass + " font-semibold"}>Go to Event</Link>
      </div>
    </Card>
  );
} 