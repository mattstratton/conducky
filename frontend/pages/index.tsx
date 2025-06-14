import React from "react";
import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { UserContext } from './_app';
import { Card } from "../components/ui/card";
import { UserRegistrationForm } from '../components/UserRegistrationForm';
import { QuickStats } from "../components/shared/QuickStats";
import { EventCard } from "../components/shared/EventCard";
import { ActivityFeed } from "../components/shared/ActivityFeed";
import { JoinEventWidget } from "../components/shared/JoinEventWidget";

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

export default function Home() {
  const [firstUserNeeded, setFirstUserNeeded] = useState(false);
  const [firstUserError, setFirstUserError] = useState('');
  const [firstUserSuccess, setFirstUserSuccess] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, setUser } = useContext(UserContext) as UserContextType;

  const [showEventList, setShowEventList] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');

  const [userEvents, setUserEvents] = useState<Event[] | null>(null);
  const [userEventsLoading, setUserEventsLoading] = useState(false);
  const [userEventsError, setUserEventsError] = useState('');

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.firstUserNeeded) {
          setFirstUserNeeded(true);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch system settings and event list if needed
  useEffect(() => {
    async function fetchSettingsAndEvents() {
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/system/settings');
        const data = await res.json();
        if (data.settings && data.settings.showPublicEventList === 'true') {
          setShowEventList(true);
          setEventsLoading(true);
          const eventsRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/events');
          if (!eventsRes.ok) throw new Error('Failed to fetch events');
          const eventsData = await eventsRes.json();
          setEvents(eventsData.events || []);
          setEventsLoading(false);
        } else {
          setShowEventList(false);
        }
      } catch {
        setShowEventList(false);
        setEventsError('Could not load event list.');
        setEventsLoading(false);
      }
    }
    fetchSettingsAndEvents();
  }, []);

  // Authenticated user: fetch their events
  useEffect(() => {
    if (user && !firstUserNeeded) {
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
  }, [user, firstUserNeeded]);

  // Show empty state if user has no events
  if (user && userEvents && userEvents.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4">
        <Card className="w-full max-w-md text-center p-4 sm:p-8">
          <h1 className="text-2xl font-bold mb-4">No Events Yet</h1>
          <p className="mb-4 text-gray-700 dark:text-gray-200">You have not been added to any events yet. Please check your email for invites or contact an event organizer.</p>
          <Link href="/profile/events" className="text-blue-700 dark:text-blue-400 hover:underline font-semibold">Manage Event Invites</Link>
        </Card>
      </div>
    );
  }

  // Show loading state for user events
  if (user && userEventsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4">
        <Card className="w-full max-w-md text-center p-4 sm:p-8">
          <p className="text-gray-500">Loading your events...</p>
        </Card>
      </div>
    );
  }

  // Show error state for user events
  if (user && userEventsError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4">
        <Card className="w-full max-w-md text-center p-4 sm:p-8">
          <p className="text-red-500">{userEventsError}</p>
        </Card>
      </div>
    );
  }

  // Show global dashboard for user with one or more events
  if (user && userEvents && userEvents.length > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4">
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
          <p className="mb-4 text-gray-700 dark:text-gray-200">Here are your events. (Full dashboard UI coming next!)</p>
        </Card>
        <div className="w-full max-w-md flex flex-col gap-4">
          {userEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    );
  }

  if (firstUserNeeded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4">
        <Card className="w-full max-w-md p-4 sm:p-8">
          <h1 className="text-2xl font-bold mb-4 text-center">Welcome! Set Up Your First User</h1>
          <p className="mb-4 text-gray-700 dark:text-gray-200">No users exist yet. Create the first user (will be Global Admin):</p>
          <UserRegistrationForm
            buttonText="Create First User"
            loading={false}
            error={firstUserError}
            success={firstUserSuccess}
            onSubmit={async ({ name, email, password }) => {
              setFirstUserError('');
              setFirstUserSuccess('');
              const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
                credentials: 'include',
              });
              if (!res.ok) {
                const data = await res.json();
                setFirstUserError(data.error || 'Failed to create user.');
                return;
              }
              setFirstUserSuccess('First user created and set as Global Admin! You can now log in.');
              setFirstUserNeeded(false);
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4">
      <Card className="w-full max-w-md text-center p-4 sm:p-8 mb-6">
        <h1 className="text-3xl font-bold mb-4">Welcome to Conducky!</h1>
        <p className="mb-6 text-gray-700 dark:text-gray-200">Conducky is your free and open source code of conduct report management system for conferences and events.</p>
        <Link href="/login" className="block w-full py-2 px-4 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition mb-4">Log In</Link>
        <div className="flex flex-col gap-2 mb-4">
          <Link href="https://conducky.com/user-guide/intro" className="text-blue-700 dark:text-blue-400 hover:underline">User Guide</Link>
          <Link href="/docs/code-of-conduct" className="text-blue-700 dark:text-blue-400 hover:underline">Code of Conduct</Link>
        </div>
        <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">powered by Conducky</p>
      </Card>
      {showEventList && (
        <Card className="w-full max-w-md p-4 sm:p-8">
          <h2 className="text-xl font-bold mb-4 text-center">Public Events</h2>
          {eventsLoading && <p className="text-center text-gray-500">Loading events...</p>}
          {eventsError && <p className="text-center text-red-500">{eventsError}</p>}
          {!eventsLoading && !eventsError && events.length === 0 && (
            <p className="text-center text-gray-500">No public events available.</p>
          )}
          <div className="flex flex-col gap-4">
            {events.map(event => (
              <Card key={event.id} className="p-4 text-left">
                <h3 className="text-lg font-semibold mb-1">{event.name}</h3>
                {event.description && <p className="text-gray-600 dark:text-gray-300 mb-2">{event.description}</p>}
                <Link href={`/events/${event.slug}`} className="text-blue-700 dark:text-blue-400 hover:underline font-semibold">View Event</Link>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}