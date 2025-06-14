import React from "react";
import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { UserContext } from '../_app';
import { Card } from "../../components/ui/card";
import { QuickStats } from "../../components/shared/QuickStats";
import { EventCard } from "../../components/shared/EventCard";
import { ActivityFeed } from "../../components/shared/ActivityFeed";
import { JoinEventWidget } from "../../components/shared/JoinEventWidget";

// Define the user type based on how it's used in the component
interface User {
  roles?: string[];
}

// Define the UserContext type to match how it's used
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  roles: string[];
}

export default function GlobalDashboard() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, setUser } = useContext(UserContext) as UserContextType;
  const [userEvents, setUserEvents] = useState<Event[] | null>(null);
  const [userEventsLoading, setUserEventsLoading] = useState(false);
  const [userEventsError, setUserEventsError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status and redirect if needed
  useEffect(() => {
    // Only redirect if we're certain user is null after context initialization
    if (user === null && authChecked) {
      router.replace('/login?next=' + encodeURIComponent('/dashboard'));
    }
  }, [user, authChecked, router]);

  // Separate effect to mark auth as checked after initial render
  useEffect(() => {
    const timer = setTimeout(() => setAuthChecked(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Authenticated user: fetch their events
  useEffect(() => {
    if (user) {
      setUserEventsLoading(true);
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/users/me/events', {
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          setUserEvents(data.events || []);
          setUserEventsLoading(false);
        })
        .catch(() => {
          setUserEventsError('Could not load your events.');
          setUserEventsLoading(false);
        });
    }
  }, [user]);

  // Don't render anything while checking authentication
  if (!authChecked || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
        <Card className="w-full max-w-md text-center p-4 sm:p-8">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  // Show empty state if user has no events
  if (userEvents && userEvents.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
        <Card className="w-full max-w-md text-center p-4 sm:p-8">
          <h1 className="text-2xl font-bold mb-4 text-foreground">No Events Yet</h1>
          <p className="mb-4 text-muted-foreground">You have not been added to any events yet. Please check your email for invites or contact an event organizer.</p>
          <Link href="/profile/events" className="text-primary hover:underline font-semibold">Manage Event Invites</Link>
        </Card>
      </div>
    );
  }

  // Show loading state for user events
  if (userEventsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
        <Card className="w-full max-w-md text-center p-4 sm:p-8">
          <p className="text-muted-foreground">Loading your events...</p>
        </Card>
      </div>
    );
  }

  // Show error state for user events
  if (userEventsError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
        <Card className="w-full max-w-md text-center p-4 sm:p-8">
          <p className="text-destructive">{userEventsError}</p>
        </Card>
      </div>
    );
  }

  // Show global dashboard for user with one or more events
  if (userEvents && userEvents.length > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
        <QuickStats />
        <ActivityFeed />
        <JoinEventWidget onJoin={() => {
          // Refetch user events after joining
          setUserEventsLoading(true);
          fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/users/me/events', {
            credentials: 'include',
          })
            .then(res => res.json())
            .then(data => {
              setUserEvents(data.events || []);
              setUserEventsLoading(false);
            })
            .catch(() => {
              setUserEventsError('Could not load your events.');
              setUserEventsLoading(false);
            });
        }} />
        <Card className="w-full max-w-md text-center p-4 sm:p-8 mb-6">
          <h1 className="text-2xl font-bold mb-4">Your Global Dashboard</h1>
          <p className="mb-4 text-muted-foreground">Here are your events. (Full dashboard UI coming next!)</p>
        </Card>
        <div className="w-full max-w-md flex flex-col gap-4">
          {userEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    );
  }

  return null;
} 