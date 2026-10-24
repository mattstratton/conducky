import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const DOCS_URL = 'https://conducky.com/docs/admin-guide/system-configuration#email-configuration';

/** Banner is for System Admins on /admin pages only. */
export function shouldShowEmailSetupBanner(globalRoles: string[], pathname: string): boolean {
  return globalRoles.includes('system_admin') && (pathname === '/admin' || pathname.startsWith('/admin/'));
}

/** Warns System Admins that email is not configured, so signups are not verified. */
export function EmailSetupBanner() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/admin/email-status`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.configured === 'boolean') setConfigured(data.configured);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The role="status" wrapper is always rendered (and takes no space while empty) so that
  // adding the warning to an existing live region reliably triggers a polite announcement.
  return (
    <div role="status">
      {configured === false && (
        <section
          aria-label="Email configuration warning"
          className="relative mx-4 mt-4 rounded-lg border border-amber-700 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-200 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              Email is not configured. New signups are not being verified. Configuring email is strongly recommended.
            </p>
            <a
              href={DOCS_URL}
              className="inline-flex min-h-[44px] items-center font-medium underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 dark:focus-visible:outline-amber-200"
            >
              How to configure email
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
