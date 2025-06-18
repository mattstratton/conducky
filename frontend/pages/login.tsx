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
import { Github } from "lucide-react";

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
  const [successMessage, setSuccessMessage] = useState('');
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
    
    // Check for success message from registration
    if (router.query.message) {
      setSuccessMessage(router.query.message as string);
    }
    
    // Check for OAuth error
    if (router.query.error === 'oauth_failed') {
      setError('Social login failed. Please try again or use email/password.');
    }
  }, [router.query.next, router.query.message, router.query.error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
          const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
      if (res.ok) {
        // Fetch user info and update context
        const sessionRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/session', { credentials: 'include' });
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
                  router.push(`/events/${eventSlug}/dashboard`);
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

  const handleSocialLogin = (provider: 'google' | 'github') => {
    // Redirect to OAuth provider with next URL as query parameter
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const redirectUrl = `${baseUrl}/api/auth/${provider}`;
    
    // Add next URL as state parameter that will be preserved through OAuth flow
    if (nextUrl && nextUrl !== '/') {
      // URL encode the next URL to be safe
      const encodedNextUrl = encodeURIComponent(nextUrl);
      window.location.href = `${redirectUrl}?state=${encodedNextUrl}`;
    } else {
      window.location.href = redirectUrl;
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
            {successMessage && (
              <div className="text-green-600 text-sm font-semibold text-center bg-green-50 dark:bg-green-900/20 p-2 rounded">
                {successMessage}
              </div>
            )}
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
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('github')}
              className="w-full"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 items-center">
          <span className="text-xs text-muted-foreground">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot your password?
            </Link>
          </span>
          <span className="text-xs text-muted-foreground">Don&apos;t have an account? <Link href="/register" className="text-primary hover:underline">Sign up</Link></span>
        </CardFooter>
      </Card>
    </div>
  );
}

export { Login };
export default Login; 