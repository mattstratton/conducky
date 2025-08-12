import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { TagManager } from '../../../../components/tags/TagManager';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { UserContext } from '../../../_app';

export default function EventTagsPage() {
  const router = useRouter();
  const { eventSlug } = router.query;
  const { user } = useContext(UserContext);
  const [event, setEvent] = useState<{
    id: string;
    name: string;
    slug: string;
    tags?: Array<{ id: string; name: string; color: string }>;
  } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch event and user roles
  useEffect(() => {
    if (!eventSlug || !user) return;

    const fetchEventAndRoles = async () => {
      try {
        setLoading(true);
        
        // Fetch event data
        const eventResponse = await fetch(`${apiBase}/api/events/slug/${eventSlug}`, {
          credentials: 'include'
        });
        
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event data');
        }
        
        const eventData = await eventResponse.json();
        setEvent(eventData.event);
        
        // Fetch user roles for this event
        const rolesResponse = await fetch(`${apiBase}/api/events/slug/${eventSlug}/my-roles`, {
          credentials: 'include'
        });
        
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          setUserRoles(rolesData?.roles || []);
        } else {
          setUserRoles([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndRoles();
  }, [eventSlug, user, apiBase]);

  // Check if user can manage tags (event admin, responder, or system admin)
  const canManageTags = userRoles.some(role => 
    ['event_admin', 'responder'].includes(role)
  ) || (user?.roles && user.roles.includes('system_admin'));

  if (!router.isReady) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">You must be logged in to access tag management.</p>
              <Button asChild>
                <Link href={`/login?next=${encodeURIComponent(router.asPath || '')}`}>Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Loading...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              Error: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canManageTags) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild>
                <Link href={`/events/${eventSlug}/dashboard`}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Event
                </Link>
              </Button>
              <div>
                <CardTitle>Access Denied</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                You need event admin or responder privileges to manage tags.
              </p>
              <Button asChild variant="outline">
                <Link href={`/events/${eventSlug}/dashboard`}>
                  Go to Event Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 mt-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" asChild>
            <Link href={`/events/${eventSlug}/settings`}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tag Management</h1>
            <p className="text-muted-foreground">
              Manage tags for <span className="font-medium">{event?.name}</span>
            </p>
          </div>
        </div>
        
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>About Tags:</strong> Tags help categorize and organize incidents for easier filtering and analysis.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Tags are specific to this event and won&apos;t appear in other events</li>
                <li>Responders and event admins can create and manage tags</li>
                <li>Tags can be assigned to incidents during creation or editing</li>
                <li>Use colors to visually distinguish different types of incidents</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tag Manager */}
      <TagManager eventSlug={eventSlug as string} />
    </div>
  );
} 