import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type State = 'verifying' | 'verified' | 'already_verified' | 'email_changed' | 'invalid' | 'rate_limited' | 'network';

const SUCCESS_COPY: Record<string, string> = {
  verified: 'Your email address is verified. You can sign in now.',
  already_verified: 'This email address is already verified.',
  email_changed: 'Your email address has been changed.',
};

const ERROR_COPY: Record<string, string> = {
  invalid: 'This verification link is invalid or has expired. Sign in to request a new one.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
  network: 'Network error. Please check your connection and try again.',
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const [state, setState] = useState<State>('verifying');
  const calledFor = useRef<string | null>(null);
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setState('invalid');
      return;
    }
    // Guard against strict-mode double effects: one API call per token.
    if (calledFor.current === token) return;
    calledFor.current = token;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/verify-email`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token }),
          }
        );
        if (res.status === 429) return setState('rate_limited');
        if (!res.ok) return setState('invalid');
        const data: { status?: string } = await res.json().catch(() => ({}));
        setState(data.status && SUCCESS_COPY[data.status] ? (data.status as State) : 'verified');
      } catch {
        setState('network');
      }
    })();
  }, [router.isReady, token]);

  const isSuccess = state in SUCCESS_COPY;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight text-center">Email verification</h1>
        </CardHeader>
        <CardContent className="grid gap-4">
          {state === 'verifying' && (
            <p role="status" className="text-sm text-center">Verifying your email address...</p>
          )}
          {isSuccess && (
            <p role="status" className="text-sm font-medium text-center text-green-700 dark:text-green-400">
              {SUCCESS_COPY[state]}
            </p>
          )}
          {ERROR_COPY[state] && (
            <Alert variant="destructive">
              <AlertDescription>{ERROR_COPY[state]}</AlertDescription>
            </Alert>
          )}
          {state !== 'verifying' && (
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
