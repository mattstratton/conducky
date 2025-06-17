import React from "react";
import Link from "next/link";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

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
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground mb-3 text-sm line-clamp-3 flex-grow">
          {description}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-auto">
        {/* Admin actions */}
        {isAdmin && (
          <div className="space-y-1">
            <Button asChild size="sm" variant="outline" className="w-full justify-start">
              <Link href={`/events/${slug}/team`}>Manage Team</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full justify-start">
              <Link href={`/events/${slug}/reports`}>View All Reports</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full justify-start">
              <Link href={`/events/${slug}/settings`}>Event Settings</Link>
            </Button>
          </div>
        )}

        {/* Responder actions */}
        {isResponder && (
          <div className="space-y-1">
            <Button asChild size="sm" variant="outline" className="w-full justify-start">
              <Link href={`/events/${slug}/reports?assigned=me`}>Assigned to Me</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full justify-start">
              <Link href={`/events/${slug}/reports`}>All Reports</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full justify-start">
              <Link href={`/events/${slug}/reports/new`}>Submit Report</Link>
            </Button>
          </div>
        )}

        {/* Reporter actions */}
        {isReporter && (
          <div className="space-y-1">
            <Button asChild size="sm" variant="outline" className="w-full justify-start">
              <Link href={`/events/${slug}/reports/new`}>Submit Report</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full justify-start">
              <Link href={`/events/${slug}/reports?mine=1`}>My Reports</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full justify-start">
              <Link href={`/events/${slug}/code-of-conduct`}>Code of Conduct</Link>
            </Button>
          </div>
        )}

        {/* Primary action - always show */}
        <Button asChild className="w-full mt-2">
          <Link href={`/events/${slug}/dashboard`}>Go to Event</Link>
        </Button>
      </div>
    </Card>
  );
} 