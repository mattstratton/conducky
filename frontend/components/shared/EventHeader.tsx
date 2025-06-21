import React from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar, Globe, Mail, MapPin } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  website?: string;
  contactEmail?: string;
  logo?: string;
}

interface EventHeaderProps {
  event: Event;
  userRoles: string[];
  logoExists?: boolean;
}

export function EventHeader({ event, userRoles, logoExists }: EventHeaderProps) {
  const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const logoSrc = logoExists ? `${backendBaseUrl}/api/events/slug/${event.slug}/logo` : null;
  
  const isAdmin = userRoles.includes("Event Admin") || userRoles.includes("SuperAdmin");

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Logo */}
        {logoSrc && (
          <div className="flex-shrink-0">
            <img
              src={logoSrc}
              alt={`${event.name} logo`}
              className="w-20 h-20 lg:w-24 lg:h-24 object-contain rounded-lg bg-white border border-border"
            />
          </div>
        )}
        
        {/* Event Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                {event.name}
              </h1>
              <div className="flex flex-wrap gap-2">
                {userRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Admin Actions */}
            {isAdmin && (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/events/${event.slug}/settings`}>
                    Settings
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Event Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {(event.startDate || event.endDate) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {event.startDate && formatDate(event.startDate)}
                  {event.startDate && event.endDate && " - "}
                  {event.endDate && formatDate(event.endDate)}
                </span>
              </div>
            )}
            
            {event.website && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <a 
                  href={event.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Event Website
                </a>
              </div>
            )}
            
            {event.contactEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a 
                  href={`mailto:${event.contactEmail}`}
                  className="text-primary hover:underline"
                >
                  Contact
                </a>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <Link 
                href={`/events/${event.slug}/code-of-conduct`}
                className="text-primary hover:underline"
              >
                Code of Conduct
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 