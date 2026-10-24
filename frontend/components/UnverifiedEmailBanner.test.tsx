import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UserContext } from '@/pages/_app';
import { UnverifiedEmailBanner } from './UnverifiedEmailBanner';

const mockFetch = jest.fn();
const reply = (status: number, body: unknown) =>
  mockFetch.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });

const renderWith = (user: Record<string, unknown> | null) =>
  render(
    <UserContext.Provider value={{ user: user as never, setUser: jest.fn(), sessionLoading: false }}>
      <UnverifiedEmailBanner />
    </UserContext.Provider>
  );
const U = { id: '1', email: 'me@example.com', canVerifyEmail: true };

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe('UnverifiedEmailBanner', () => {
  const notEligible: Array<Record<string, unknown> | null> = [{ ...U, canVerifyEmail: false }, { id: '1', email: 'me@example.com' }, null];
  notEligible.forEach((user, i) => {
    it(`renders only the empty status wrapper when not eligible (case ${i})`, () => {
      const { container } = renderWith(user);
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      expect(container.querySelector('section')).toBeNull();
    });
  });

  it('shows the labelled section with the address when eligible, inside the status wrapper', () => {
    renderWith(U);
    const section = screen.getByRole('region', { name: 'Email verification' });
    expect(section).toHaveTextContent(
      'Please verify your email address so we know notifications reach you. We will send a verification link to me@example.com.'
    );
    expect(screen.getByRole('status')).toContainElement(section);
    expect(screen.getByRole('button', { name: 'Send verification email' })).toBeInTheDocument();
  });

  it('wrapper exists before the section appears', () => {
    const ctx = (user: unknown) => (
      <UserContext.Provider value={{ user: user as never, setUser: jest.fn(), sessionLoading: false }}>
        <UnverifiedEmailBanner />
      </UserContext.Provider>
    );
    const { rerender } = render(ctx({ ...U, canVerifyEmail: false }));
    const wrapper = screen.getByRole('status');
    rerender(ctx(U));
    expect(screen.getByRole('status')).toBe(wrapper);
    expect(wrapper).toContainElement(screen.getByRole('region', { name: 'Email verification' }));
  });

  it('posts once with credentials, ignores a double click, keeps focus, announces success politely', async () => {
    let resolve!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    renderWith(U);
    const btn = screen.getByRole('button', { name: 'Send verification email' });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Sending…');
    resolve({ ok: true, status: 200, json: async () => ({ verificationEmailSent: true, email: 'me@example.com' }) });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('We sent a link to me@example.com. Check your inbox.'));
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/users\/me\/verification-email$/);
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(btn).toHaveFocus();
    expect(btn).toHaveAttribute('aria-disabled', 'false');
  });

  it('names the address the server sent to, not the context one', async () => {
    reply(200, { verificationEmailSent: true, email: 'current@example.com' });
    renderWith(U);
    await userEvent.click(screen.getByRole('button', { name: 'Send verification email' }));
    expect(await screen.findByText('We sent a link to current@example.com. Check your inbox.')).toBeInTheDocument();
  });

  it('status wrapper is non-atomic so changes do not re-read the banner', () => {
    renderWith(U);
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'false');
  });

  it('does not claim a send when verificationEmailSent is false', async () => {
    reply(200, { verificationEmailSent: false });
    renderWith(U);
    await userEvent.click(screen.getByRole('button', { name: 'Send verification email' }));
    expect(await screen.findByText('We could not send the email. Please try again in a minute.')).toBeInTheDocument();
    expect(screen.queryByText(/We sent a link/)).toBeNull();
  });

  it('already_verified says so and hides the banner, keeping the wrapper', async () => {
    reply(200, { status: 'already_verified' });
    renderWith(U);
    await userEvent.click(screen.getByRole('button', { name: 'Send verification email' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Email verification' })).toBeNull());
    expect(screen.getByRole('status')).toHaveTextContent('Your email is already verified.');
    expect(screen.getByText('Your email is already verified.')).toHaveFocus();
  });

  it('429 shows the wait message', async () => {
    reply(429, { error: 'x' });
    renderWith(U);
    await userEvent.click(screen.getByRole('button', { name: 'Send verification email' }));
    expect(await screen.findByText('Please wait a minute before requesting another email.')).toBeInTheDocument();
  });

  it('errors are carried by the polite wrapper only (no nested alert), as plain text', async () => {
    reply(409, { error: 'Pending <b>change</b>' });
    renderWith(U);
    await userEvent.click(screen.getByRole('button', { name: 'Send verification email' }));
    const msg = await screen.findByText('Pending <b>change</b>');
    expect(msg.closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    mockFetch.mockRejectedValueOnce(new Error('down'));
    await userEvent.click(screen.getByRole('button', { name: 'Send verification email' }));
    await waitFor(() => expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument());
    expect(screen.queryByText('Pending <b>change</b>')).toBeNull();
  });
});
