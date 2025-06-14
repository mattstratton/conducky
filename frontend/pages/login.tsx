import React from "react";
import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { UserContext } from './_app';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

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
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Sign in to your account</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your email and password to access Conducky.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="you@example.com" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            {error && <div className="text-destructive text-sm font-semibold text-center">{error}</div>}
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 items-center">
          <span className="text-xs text-muted-foreground">Don&apos;t have an account? <Link href="/register" className="text-primary hover:underline">Sign up</Link></span>
        </CardFooter>
      </Card>
    </div>
  );
}

export { Login };
export default Login; 