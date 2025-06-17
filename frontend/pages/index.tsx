import React from "react";
import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { UserContext } from './_app';
import { Card } from "../components/ui/card";
import { UserRegistrationForm } from '../components/UserRegistrationForm';

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
  const router = useRouter();
  const [firstUserNeeded, setFirstUserNeeded] = useState(false);
  const [firstUserError, setFirstUserError] = useState('');
  const [firstUserSuccess, setFirstUserSuccess] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, setUser } = useContext(UserContext) as UserContextType;

  const [showEventList, setShowEventList] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');



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
          const eventsRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/events');
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

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !firstUserNeeded) {
      router.push('/dashboard');
    }
  }, [user, firstUserNeeded, router]);



  if (firstUserNeeded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
        <Card className="w-full max-w-md p-4 sm:p-8">
          <h1 className="text-2xl font-bold mb-4 text-center text-foreground">Welcome! Set Up Your First User</h1>
          <p className="mb-4 text-muted-foreground">No users exist yet. Create the first user (will be Global Admin):</p>
          <UserRegistrationForm
            buttonText="Create First User"
            loading={false}
            error={firstUserError}
            success={firstUserSuccess}
            onSubmit={async ({ name, email, password }) => {
              setFirstUserError('');
              setFirstUserSuccess('');
              const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/auth/register', {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
      <Card className="w-full max-w-md text-center p-4 sm:p-8 mb-6">
        <h1 className="text-3xl font-bold mb-4 text-foreground">Welcome to Conducky!</h1>
        <p className="mb-6 text-muted-foreground">Conducky is your free and open source code of conduct report management system for conferences and events.</p>
        <Link href="/login" className="block w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition mb-4">Log In</Link>
        <div className="flex flex-col gap-2 mb-4">
          <Link href="https://conducky.com/user-guide/intro" className="text-primary hover:underline">User Guide</Link>
          <Link href="/docs/code-of-conduct" className="text-primary hover:underline">Code of Conduct</Link>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">powered by Conducky</p>
      </Card>
      {showEventList && (
        <Card className="w-full max-w-md p-4 sm:p-8">
          <h2 className="text-xl font-bold mb-4 text-center">Public Events</h2>
          {eventsLoading && <p className="text-center text-muted-foreground">Loading events...</p>}
          {eventsError && <p className="text-center text-destructive">{eventsError}</p>}
          {!eventsLoading && !eventsError && events.length === 0 && (
            <p className="text-center text-muted-foreground">No public events available.</p>
          )}
          <div className="flex flex-col gap-4">
            {events.map(event => (
              <Card key={event.id} className="p-4 text-left">
                <h3 className="text-lg font-semibold mb-1">{event.name}</h3>
                {event.description && <p className="text-muted-foreground mb-2">{event.description}</p>}
                <Link href={`/events/${event.slug}`} className="text-primary hover:underline font-semibold">View Event</Link>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}