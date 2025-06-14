import React from "react";
import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { UserContext } from './_app';
import { Button } from "@/components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "@/components/ui/input";

// Define User interface
interface User {
  id: string;
  name?: string;
  email: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Define UserContext type
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

// Define API response interfaces
interface ApiResponse {
  error?: string;
  message?: string;
}

interface SessionResponse extends ApiResponse {
  user: User;
}

interface InviteResponse extends ApiResponse {
  event?: {
    slug: string;
  };
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const [nextUrl, setNextUrl] = useState('/');
  const { setUser } = useContext(UserContext) as UserContextType;

  useEffect(() => {
    // Prefer ?next=... in query, else use document.referrer if it's from the same origin
    if (router.query.next) {
      setNextUrl(router.query.next as string);
    } else if (typeof document !== 'undefined' && document.referrer && document.referrer.startsWith(window.location.origin)) {
      const refPath = document.referrer.replace(window.location.origin, '');
      setNextUrl(refPath || '/');
    }
  }, [router.query.next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        // Fetch user info and update context
        const sessionRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', { credentials: 'include' });
        if (sessionRes.ok) {
          const data: SessionResponse = await sessionRes.json();
          setUser(data.user);
        }
        // If nextUrl is an invite redeem page, redirect to the event page instead
        if (nextUrl && nextUrl.startsWith('/invite/')) {
          // Extract invite code from nextUrl
          const code = nextUrl.split('/invite/')[1]?.split('/')[0];
          if (code) {
            // Fetch invite details to get event slug
            try {
              const inviteRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/invites/${code}`);
              if (inviteRes.ok) {
                const inviteData: InviteResponse = await inviteRes.json();
                const eventSlug = inviteData?.event?.slug;
                if (eventSlug) {
                  router.push(`/event/${eventSlug}`);
                  return;
                }
              }
            } catch { /* Ignore errors and fallback to normal redirect */ }
          }
        }
        router.push(nextUrl);
      } else {
        let errMsg = 'Login failed';
        try {
          const data: ApiResponse = await res.json();
          errMsg = data.error || data.message || errMsg;
        } catch {
          // If not JSON, keep default
        }
        setError(errMsg);
      }
    } catch {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background transition-colors duration-200 p-4">
      <Card className="w-full max-w-md p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-foreground text-sm font-bold mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" id="email" />
          </div>
          <div>
            <label
              className="block text-foreground text-sm font-bold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" id="password" />
          </div>
          {error && <div className="text-destructive text-sm font-semibold">{error}</div>}
          <Button type="submit" className="w-full px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Login</Button>
        </form>
      </Card>
    </div>
  );
}

export { Login };
export default Login; 