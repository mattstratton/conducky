import React, { useContext, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserContext } from '../pages/_app';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Calm nudge for existing accounts whose email is not verified (only when the server says
 * canVerifyEmail). Never blocks anything. The role="status" wrapper is always rendered (and takes
 * no space while empty) so that adding the banner to an existing live region is announced reliably.
 */
export function UnverifiedEmailBanner() {
  const { user } = useContext(UserContext);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const busyRef = useRef(false);

  const send = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setStatus('Sending…');
    try {
      const res = await fetch(`${API}/api/users/me/verification-email`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setStatus('Please wait a minute before requesting another email.');
      } else if (res.ok && data.status === 'already_verified') {
        setVerified(true);
        setStatus('Your email is already verified.');
      } else if (res.ok) {
        setStatus(
          data.verificationEmailSent === true
            ? `We sent a link to ${user?.email}. Check your inbox.`
            : 'We could not send the email. Please try again in a minute.'
        );
      } else {
        setStatus('');
        setError(typeof data.error === 'string' && data.error ? data.error : 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('');
      setError('Network error. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const show = user?.canVerifyEmail === true && !verified;
  return (
    <div role="status">
      {verified && <p className="mx-4 mt-4 text-sm">{status}</p>}
      {show && (
        <section
          aria-label="Email verification"
          className="relative mx-4 mt-4 rounded-lg border border-blue-700 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-100 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
          <div className="grid gap-2">
            <p>
              Please verify your email address so you receive notifications. We will send a verification link to{' '}
              <strong className="break-all">{user?.email}</strong>.
            </p>
            {status && <p className="font-medium">{status}</p>}
            {error && (
              <p role="alert" className="font-medium text-red-800 dark:text-red-300">
                {error}
              </p>
            )}
            <div>
              <Button
                type="button"
                onClick={send}
                aria-disabled={busy}
                className="min-h-[44px] aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                Send verification email
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default UnverifiedEmailBanner;
