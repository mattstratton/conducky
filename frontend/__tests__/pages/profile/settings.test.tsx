import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileSettings from '../../../pages/profile/settings';
import { UserContext } from '../../../pages/_app';

const mockRouter = {
  asPath: '/profile/settings', push: jest.fn(), replace: jest.fn(), back: jest.fn(),
  pathname: '/profile/settings', query: {}, route: '/profile/settings', basePath: '',
  events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() }, isReady: true,
};
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));

const user = { id: 'u1', name: 'Test User', email: 'old@example.com' };
const setUser = jest.fn();
const mockFetch = jest.fn();
// setUser receives either a user or an updater (so the saved fields merge into the context user).
type Applied = Record<string, unknown> | null;
const appliedTo = (prev: Applied): Applied[] =>
  setUser.mock.calls.map(([arg]: [Applied | ((p: Applied) => Applied)]) => (typeof arg === 'function' ? arg(prev) : arg));
let patchReply: { status: number; body: unknown } | 'network';

function renderPage() {
  return render(
    <UserContext.Provider value={{ user, setUser } as never}>
      <ProfileSettings />
    </UserContext.Provider>
  );
}

async function submit(newEmail?: string, newName?: string) {
  const email = await screen.findByLabelText(/email address/i);
  if (newEmail) fireEvent.change(email, { target: { value: newEmail } });
  if (newName) fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: newName } });
  fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
}

describe('profile settings: email change', () => {
  afterEach(() => jest.restoreAllMocks());

  beforeEach(() => {
    setUser.mockReset();
    mockFetch.mockReset();
    patchReply = { status: 200, body: { user, message: 'ok' } };
    mockFetch.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (init?.method === 'PATCH' && url.endsWith('/api/users/me/profile')) {
        const reply = patchReply;
        if (reply === 'network') throw new Error('down');
        return { ok: reply.status < 300, status: reply.status, json: async () => reply.body };
      }
      return { ok: true, status: 200, json: async () => ({ enabled: true }) };
    });
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('keeps the context-only fields (canVerifyEmail, emailVerified, roles) when a profile save returns a plain user', async () => {
    const rich = { ...user, canVerifyEmail: true, emailVerified: true, roles: ['event_admin'] };
    const saved = { id: 'u1', name: 'Renamed', email: 'old@example.com', avatarUrl: null };
    patchReply = { status: 200, body: { user: saved, message: 'ok' } };
    renderPage();
    await submit(undefined, 'Renamed');
    await waitFor(() => expect(setUser).toHaveBeenCalled());
    expect(appliedTo(rich)).toContainEqual({ ...rich, ...saved });
    expect(appliedTo(null)).toContainEqual(saved);
  });

  it('has the polite live region in the DOM before any message', async () => {
    renderPage();
    await screen.findByLabelText(/email address/i);
    const region = document.getElementById('profile-status');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toBeEmptyDOMElement();
  });

  it('shows the pending message with both addresses and keeps the old address', async () => {
    patchReply = { status: 200, body: { user, emailChangePending: 'new@example.com', verificationEmailSent: true } };
    renderPage();
    await submit('New@Example.com');
    const region = document.getElementById('profile-status')!;
    await waitFor(() => expect(region).toHaveTextContent(
      'We sent a verification link to new@example.com. Your email stays old@example.com until you verify.'));
    expect(screen.getByLabelText(/email address/i)).toHaveValue('old@example.com');
    expect(appliedTo(user).some((u) => u?.email === 'new@example.com')).toBe(false);
    expect(screen.queryByText('Profile updated successfully!')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-describedby', expect.stringContaining('profile-status'));
  });

  it('updates the name normally while an email change is pending', async () => {
    const updated = { ...user, name: 'Renamed' };
    patchReply = { status: 200, body: { user: updated, emailChangePending: 'new@example.com', verificationEmailSent: true } };
    renderPage();
    await submit('new@example.com', 'Renamed');
    await waitFor(() => expect(appliedTo(user)).toContainEqual(updated));
  });

  it('shows a warning when the verification link could not be sent', async () => {
    patchReply = { status: 200, body: { user, emailChangePending: 'new@example.com', verificationEmailSent: false } };
    renderPage();
    await submit('new@example.com');
    const region = document.getElementById('profile-status')!;
    await waitFor(() => expect(region).toHaveTextContent(
      'We could not send a verification link to new@example.com. Your email is still old@example.com. Try saving again.'));
    expect(screen.getByLabelText(/email address/i)).toHaveValue('new@example.com');
    expect(screen.queryByText(/updated successfully/i)).not.toBeInTheDocument();
  });

  it('resubmits the same pending address after a failed send', async () => {
    patchReply = { status: 200, body: { user, emailChangePending: 'new@example.com', verificationEmailSent: false } };
    renderPage();
    await submit('new@example.com');
    await waitFor(() => expect(document.getElementById('profile-status')).toHaveTextContent(/could not send/));
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    await waitFor(() => expect(mockFetch.mock.calls.filter((c: [string, { method?: string }]) => c[1]?.method === 'PATCH')).toHaveLength(2));
    const second = mockFetch.mock.calls.filter((c: [string, { method?: string }]) => c[1]?.method === 'PATCH')[1];
    expect(JSON.parse(second[1].body).email).toBe('new@example.com');
  });

  it('treats an absent verificationEmailSent as failed', async () => {
    patchReply = { status: 200, body: { user, emailChangePending: 'new@example.com' } };
    renderPage();
    await submit('new@example.com');
    await waitFor(() => expect(document.getElementById('profile-status')).toHaveTextContent(/could not send/));
    expect(screen.getByLabelText(/email address/i)).toHaveValue('new@example.com');
  });

  it('keeps the typed address after a failed send when setUser updates the user', async () => {
    patchReply = { status: 200, body: { user: { ...user }, emailChangePending: 'new@example.com', verificationEmailSent: false } };
    function Stateful() {
      const [u, setU] = React.useState<typeof user | null>(user);
      return (
        <UserContext.Provider value={{ user: u, setUser: setU } as never}>
          <ProfileSettings />
        </UserContext.Provider>
      );
    }
    render(<Stateful />);
    await submit('new@example.com');
    await waitFor(() => expect(document.getElementById('profile-status')).toHaveTextContent(/could not send/));
    expect(screen.getByLabelText(/email address/i)).toHaveValue('new@example.com');
  });

  it('announces a 429 and keeps the typed values', async () => {
    patchReply = { status: 429, body: { error: 'Please wait a minute before requesting another email change.' } };
    renderPage();
    await submit('new@example.com', 'Typed Name');
    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait a minute before requesting another email change.');
    expect(screen.getByLabelText(/email address/i)).toHaveValue('new@example.com');
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Typed Name');
  });

  it('announces a 409', async () => {
    patchReply = { status: 409, body: { error: 'This email address is already in use.' } };
    renderPage();
    await submit('taken@example.com');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This email address is already in use.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    const email = screen.getByLabelText(/email address/i);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email.getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('routes an email-related 400 to the field, other 400s to the top alert', async () => {
    patchReply = { status: 400, body: { error: 'Invalid Email address' } };
    renderPage();
    await submit('x@example.com');
    expect((await screen.findByRole('alert')).id).toBe('email-error');
    patchReply = { status: 400, body: { error: 'Name too long' } };
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Name too long'));
    expect(screen.getByRole('alert').id).not.toBe('email-error');
  });

  it('error alert uses explicit contrast-safe colours', async () => {
    patchReply = { status: 429, body: { error: 'wait' } };
    renderPage();
    await submit('new@example.com');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveClass('border-red-600', 'text-red-700', 'dark:border-red-400', 'dark:text-red-400');
  });

  it('does not announce an alert after a pending success', async () => {
    patchReply = { status: 200, body: { user, emailChangePending: 'new@example.com', verificationEmailSent: true } };
    renderPage();
    await submit('new@example.com');
    await waitFor(() => expect(document.getElementById('profile-status')).toHaveTextContent(/We sent/));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces saving in the status region and clears it after', async () => {
    renderPage();
    await submit(undefined, 'Renamed');
    const region = document.getElementById('profile-status')!;
    await waitFor(() => expect(region).toHaveTextContent('Profile updated successfully!'));
    expect(region).not.toHaveTextContent(/Saving profile/);
  });

  it('clears the notice and describedby when the email is edited again', async () => {
    patchReply = { status: 200, body: { user, emailChangePending: 'new@example.com', verificationEmailSent: true } };
    renderPage();
    await submit('new@example.com');
    await waitFor(() => expect(document.getElementById('profile-status')).toHaveTextContent(/We sent/));
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'other@example.com' } });
    expect(document.getElementById('profile-status')).toBeEmptyDOMElement();
    expect(screen.getByLabelText(/email address/i)).not.toHaveAttribute('aria-describedby');
  });

  it('keeps the focused submit button enabled when the email is invalid, and announces it', async () => {
    renderPage();
    await submit('not-an-email');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/valid email/i);
    const btn = screen.getByRole('button', { name: /save profile/i });
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('sets autocomplete on name and email', async () => {
    renderPage();
    expect(await screen.findByLabelText(/email address/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('autocomplete', 'name');
  });

  it('announces a network error', async () => {
    patchReply = 'network';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();
    await submit('new@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i);
  });

  it('keeps the plain success message without emailChangePending', async () => {
    renderPage();
    await submit(undefined, 'Renamed');
    const region = document.getElementById('profile-status')!;
    await waitFor(() => expect(region).toHaveTextContent('Profile updated successfully!'));
    expect(region).not.toHaveTextContent(/verification|email/i);
    expect(appliedTo(user)).toContainEqual(user);
  });

  it('does not disable the focused submit button while saving', async () => {
    let release: (v: unknown) => void = () => {};
    mockFetch.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (init?.method === 'PATCH') await new Promise(r => { release = r; });
      return { ok: true, status: 200, json: async () => ({ user }) };
    });
    renderPage();
    await submit(undefined, 'Renamed');
    const btn = await screen.findByRole('button', { name: /saving/i });
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(document.getElementById('profile-status')).toHaveTextContent('Saving profile…');
    release(undefined);
    await waitFor(() => expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument());
  });
});
