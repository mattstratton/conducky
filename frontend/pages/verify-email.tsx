import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type State = 'verifying' | 'confirm' | 'verified' | 'already_verified' | 'email_changed' | 'invalid' | 'rate_limited' | 'network';

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
  const [attempt, setAttempt] = useState(0);
  const calledFor = useRef<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  // Email-change links must not apply on load: a link scanner that runs JS would confirm them.
  const needsClick = router.query.confirm !== undefined;

  const verify = async () => {
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
  };

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setState('invalid');
      return;
    }
    if (needsClick) {
      setState((s) => (s === 'verifying' ? 'confirm' : s));
      return;
    }
    // Guard against strict-mode double effects: one API call per token.
    const key = `${token}:${attempt}`;
    if (calledFor.current === key) return;
    calledFor.current = key;
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, token, attempt, needsClick]);

  // One post per click: a double click (or Try again while busy) is ignored.
  const confirm = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    // Keep focus on the Confirm button; only the Try again path (button about to unmount) moves it.
    if (state !== 'confirm') statusRef.current?.focus();
    setState('confirm');
    await verify();
    busyRef.current = false;
    setBusy(false);
    statusRef.current?.focus();
  };

  const isSuccess = state in SUCCESS_COPY;
  const canRetry = state === 'rate_limited' || state === 'network';
  const title = isSuccess
    ? 'Email verified'
    : state === 'confirm'
      ? 'Confirm email change'
      : state === 'verifying'
      ? 'Verifying your email'
      : canRetry
        ? 'Verification could not be completed'
        : 'Verification link problem';
  const statusText =
    state === 'verifying'
      ? 'Verifying your email address...'
      : state === 'confirm'
        ? busy
          ? 'Confirming your new email address...'
          : ''
        : isSuccess
          ? SUCCESS_COPY[state]
          : '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Head>
        <title>{title}</title>
      </Head>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight text-center">Email verification</h1>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div
            ref={statusRef}
            role="status"
            tabIndex={-1}
            className={`rounded focus:outline-none focus:ring-2 focus:ring-ring ${
              isSuccess ? 'text-sm font-medium text-center text-green-700 dark:text-green-400' : 'text-sm text-center'
            }`}
          >
            {statusText}
          </div>
          {state === 'confirm' && (
            <>
              <p className="text-sm text-center">
                You asked to change the email address on your Conducky account. Confirm to finish the change.
              </p>
              <Button
                type="button"
                className="h-11"
                aria-disabled={busy}
                onClick={confirm}
              >
                Confirm email change
              </Button>
            </>
          )}
          {ERROR_COPY[state] && (
            <Alert variant="destructive">
              <AlertDescription>{ERROR_COPY[state]}</AlertDescription>
            </Alert>
          )}
          {canRetry && (
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                if (needsClick) return confirm();
                setState('verifying');
                statusRef.current?.focus();
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          )}
          {state !== 'verifying' && state !== 'confirm' && (
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
