import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CheckYourEmailProps {
  email: string;
  // Only used to authorize correct-email; never rendered or stored beyond this prop.
  password: string;
  // true: we sent a link; false: sending failed; undefined: unknown (e.g. from sign-in)
  emailSent?: boolean;
  onEmailChanged?: (email: string) => void;
  headingLevel?: 'h1' | 'h2';
}

interface ApiData {
  error?: string;
  email?: string;
  verificationEmailSent?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const RATE_LIMITED = 'Too many attempts. Please wait a few minutes and try again.';
const ERROR_ID = 'check-your-email-error';

async function post(path: string, body: unknown): Promise<{ status: number; data: ApiData }> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data: ApiData = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export function CheckYourEmail({
  email,
  password,
  emailSent,
  onEmailChanged,
  headingLevel = 'h2',
}: CheckYourEmailProps) {
  const [shownEmail, setShownEmail] = useState(email);
  const [sent, setSent] = useState<boolean | undefined>(emailSent);
  const [newEmail, setNewEmail] = useState('');
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<'busy' | 'success'>('busy');
  const [error, setError] = useState<{ text: string; source: 'resend' | 'correct' } | null>(null);
  const [busy, setBusy] = useState<'resend' | 'correct' | null>(null);
  const busyRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const Heading = headingLevel;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const run = async (kind: 'resend' | 'correct', busyText: string, fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    setStatusKind('busy');
    setStatus(busyText);
    setError(null);
    try {
      await fn();
    } catch {
      setStatus('');
      setError({ text: 'Network error. Please try again.', source: kind });
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const handleResend = () =>
    run('resend', 'Sending…', async () => {
      const { status: code } = await post('/api/auth/resend-verification', { email: shownEmail });
      if (code === 429) {
        setStatus('');
        setError({ text: RATE_LIMITED, source: 'resend' });
      } else if (code >= 200 && code < 300) {
        setStatusKind('success');
        setStatus('If this address needs verification, a new link is on its way.');
      } else {
        setStatus('');
        setError({ text: 'Something went wrong. Please try again.', source: 'resend' });
      }
    });

  const handleCorrect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      setError({ text: 'Enter the correct email address.', source: 'correct' });
      return;
    }
    return run('correct', 'Changing…', async () => {
      const typed = newEmail.trim();
      const { status: code, data } = await post('/api/auth/correct-email', {
        email: shownEmail,
        password,
        newEmail: typed,
      });
      setStatus('');
      if (code === 429) {
        setError({ text: RATE_LIMITED, source: 'correct' });
      } else if (code >= 200 && code < 300) {
        const confirmed = data.email ?? typed;
        setShownEmail(confirmed);
        setSent(data.verificationEmailSent === true);
        setNewEmail('');
        setStatusKind('success');
        setStatus('Email address changed.');
        onEmailChanged?.(confirmed);
        headingRef.current?.focus();
      } else {
        setError({ text: data.error || 'We could not change the address. Please try again.', source: 'correct' });
      }
    });
  };

  const correctError = error?.source === 'correct';

  return (
    <div className="grid gap-4">
      <Head>
        <title>Check your email</title>
      </Head>
      <Heading
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold tracking-tight text-center rounded focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Check your email
      </Heading>
      <p className="text-sm text-center">
        {sent === true && (
          <>
            We sent a verification link to <strong className="break-all">{shownEmail}</strong>
          </>
        )}
        {sent === false && 'We could not send the email. Use Resend to try again.'}
        {sent === undefined && (
          <>
            Your account needs its email address verified. Use Resend to get a new link sent to{' '}
            <strong className="break-all">{shownEmail}</strong>.
          </>
        )}
      </p>
      {sent === false && (
        <p className="text-sm text-center text-muted-foreground break-all">Address: {shownEmail}</p>
      )}
      <p className="text-sm text-center text-muted-foreground">
        Open the link to finish setting up your account, then sign in.
      </p>

      <div
        aria-live="polite"
        className={`text-sm font-medium text-center ${
          statusKind === 'success' ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
        }`}
      >
        {status}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription id={ERROR_ID}>{error.text}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        className="h-11 w-full aria-disabled:opacity-50 aria-disabled:pointer-events-none"
        onClick={handleResend}
        aria-disabled={busy !== null}
      >
        {busy === 'resend' ? 'Sending…' : 'Resend verification email'}
      </Button>

      <form onSubmit={handleCorrect} noValidate className="grid gap-2">
        <Label htmlFor="correct-email-input">Wrong address? Enter the correct one</Label>
        <Input
          id="correct-email-input"
          type="email"
          autoComplete="email"
          aria-required="true"
          className="h-11"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="you@example.com"
          aria-invalid={correctError ? true : undefined}
          aria-describedby={correctError ? ERROR_ID : undefined}
        />
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full aria-disabled:opacity-50 aria-disabled:pointer-events-none"
          aria-disabled={busy !== null}
        >
          {busy === 'correct' ? 'Changing…' : 'Change address'}
        </Button>
      </form>
    </div>
  );
}

export default CheckYourEmail;
