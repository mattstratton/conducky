import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { InviteManager } from '../../../../components/InviteManager';
import { AppBreadcrumbs } from '../../../../components/AppBreadcrumbs';

interface User {
  id: string;
  name: string;
  email: string;
  roles?: string[];
}

export default function InviteUsersPage() {
  const router = useRouter();
  const { eventSlug } = router.query as { eventSlug?: string };
  const [user, setUser] = useState<User | null>(null);
  const [userEventRoles, setUserEventRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<{ name: string } | null>(null);
  const rolesList = ["Admin", "Responder", "Reporter"];

  useEffect(() => {
    if (!eventSlug) return;

    const fetchData = async () => {
      try {
        // Fetch event details
        const eventRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}`,
          { credentials: 'include' }
        );
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvent(eventData.event);
        }

        // Fetch user session
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/session`,
          { credentials: 'include' }
        );
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData?.user || null);
        }

        // Fetch user's event-specific roles
        const rolesRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}/my-roles`,
          { credentials: 'include' }
        );
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setUserEventRoles(rolesData?.roles || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load page data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventSlug]);

  function hasGlobalRole(role: string): boolean {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  function hasEventRole(role: string): boolean {
    return userEventRoles.includes(role);
  }

  const isSuperAdmin = hasGlobalRole("SuperAdmin");
  const isEventAdmin = hasEventRole("Admin");

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <AppBreadcrumbs />
          <div className="mt-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <AppBreadcrumbs />
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => router.back()}>Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Only allow SuperAdmins or Event Admins to access invite page
  if (!isSuperAdmin && !isEventAdmin) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <AppBreadcrumbs />
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-4">You do not have permission to access this page.</p>
                <Button onClick={() => router.back()}>Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="w-full max-w-6xl mx-auto">
        <AppBreadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
          <div>
            <h1 className="text-2xl font-bold">Invite Users</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage invitation links for {event?.name || 'this event'}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/events/${eventSlug}/team`)}
          >
            ← Back to Users
          </Button>
        </div>

        {/* Invite Management */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Invitation Links</CardTitle>
          </CardHeader>
          <CardContent>
            {eventSlug && (
              <InviteManager 
                eventSlug={eventSlug as string} 
                rolesList={rolesList} 
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 