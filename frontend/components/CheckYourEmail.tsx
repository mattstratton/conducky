import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CheckYourEmailProps {
  email: string;
  // Only used to authorize correct-email; never rendered or stored beyond this prop.
  password: string;
  emailSent: boolean;
  onEmailChanged?: (email: string) => void;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const RATE_LIMITED = 'Too many attempts. Please wait a few minutes and try again.';

async function post(path: string, body: unknown): Promise<{ status: number; data: { error?: string } }> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export function CheckYourEmail({ email, password, emailSent, onEmailChanged }: CheckYourEmailProps) {
  const [shownEmail, setShownEmail] = useState(email);
  const [sent, setSent] = useState(emailSent);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'resend' | 'correct' | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const run = async (kind: 'resend' | 'correct', fn: () => Promise<void>) => {
    setBusy(kind);
    setMessage('');
    setError('');
    try {
      await fn();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleResend = () =>
    run('resend', async () => {
      const { status } = await post('/api/auth/resend-verification', { email: shownEmail });
      if (status === 429) setError(RATE_LIMITED);
      else if (status >= 200 && status < 300) setMessage('If this address needs verification, a new link is on its way.');
      else setError('Something went wrong. Please try again.');
    });

  const handleCorrect = (e: React.FormEvent) => {
    e.preventDefault();
    return run('correct', async () => {
      const { status, data } = await post('/api/auth/correct-email', {
        email: shownEmail,
        password,
        newEmail: newEmail.trim(),
      });
      if (status === 429) {
        setError(RATE_LIMITED);
      } else if (status >= 200 && status < 300) {
        const changed = newEmail.trim();
        setShownEmail(changed);
        setSent(true);
        setNewEmail('');
        setMessage(`We updated your address to ${changed}. If it needs verification, a new link is on its way.`);
        onEmailChanged?.(changed);
      } else {
        setError(data.error || 'We could not change the address. Please try again.');
      }
    });
  };

  return (
    <div className="grid gap-4">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold tracking-tight text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        Check your email
      </h2>
      <p className="text-sm text-center">
        {sent ? (
          <>
            We sent a verification link to <strong className="break-all">{shownEmail}</strong>
          </>
        ) : (
          'We could not send the email. Use Resend to try again.'
        )}
      </p>
      <p className="text-sm text-center text-muted-foreground">
        Open the link to finish setting up your account, then sign in.
      </p>

      <div aria-live="polite" className="empty:hidden">
        {message && (
          <p className="text-sm font-medium text-center text-green-700 dark:text-green-400">{message}</p>
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="button" className="h-11 w-full" onClick={handleResend} disabled={busy !== null}>
        {busy === 'resend' ? 'Sending...' : 'Resend verification email'}
      </Button>

      <form onSubmit={handleCorrect} className="grid gap-2">
        <Label htmlFor="correct-email-input">Wrong address? Enter the correct one</Label>
        <Input
          id="correct-email-input"
          type="email"
          autoComplete="email"
          required
          className="h-11"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Button type="submit" variant="outline" className="h-11 w-full" disabled={busy !== null || !newEmail.trim()}>
          {busy === 'correct' ? 'Changing...' : 'Change address'}
        </Button>
      </form>
    </div>
  );
}

export default CheckYourEmail;
