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
    expect(setUser).not.toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
    expect(screen.queryByText('Profile updated successfully!')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-describedby', expect.stringContaining('profile-status'));
  });

  it('updates the name normally while an email change is pending', async () => {
    const updated = { ...user, name: 'Renamed' };
    patchReply = { status: 200, body: { user: updated, emailChangePending: 'new@example.com', verificationEmailSent: true } };
    renderPage();
    await submit('new@example.com', 'Renamed');
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(updated));
  });

  it('shows a warning when the verification link could not be sent', async () => {
    patchReply = { status: 200, body: { user, emailChangePending: 'new@example.com', verificationEmailSent: false } };
    renderPage();
    await submit('new@example.com');
    const region = document.getElementById('profile-status')!;
    await waitFor(() => expect(region).toHaveTextContent(
      'We could not send a verification link to new@example.com. Your email is still old@example.com. Try saving again.'));
    expect(screen.getByLabelText(/email address/i)).toHaveValue('old@example.com');
    expect(screen.queryByText(/updated successfully/i)).not.toBeInTheDocument();
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
    expect(await screen.findByRole('alert')).toHaveTextContent('This email address is already in use.');
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
    expect(setUser).toHaveBeenCalledWith(user);
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
    release(undefined);
    await waitFor(() => expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument());
  });
});
