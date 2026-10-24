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
      'Please verify your email address so you receive notifications. We will send a verification link to me@example.com.'
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
    resolve({ ok: true, status: 200, json: async () => ({ verificationEmailSent: true }) });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('We sent a link to me@example.com. Check your inbox.'));
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/users\/me\/verification-email$/);
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(btn).toHaveFocus();
    expect(btn).toHaveAttribute('aria-disabled', 'false');
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
  });

  it('429 shows the wait message', async () => {
    reply(429, { error: 'x' });
    renderWith(U);
    await userEvent.click(screen.getByRole('button', { name: 'Send verification email' }));
    expect(await screen.findByText('Please wait a minute before requesting another email.')).toBeInTheDocument();
  });

  it('other errors and network failures are announced as alerts', async () => {
    reply(500, { error: 'Boom <b>bold</b>' });
    renderWith(U);
    await userEvent.click(screen.getByRole('button', { name: 'Send verification email' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Boom <b>bold</b>');
    mockFetch.mockRejectedValueOnce(new Error('down'));
    await userEvent.click(screen.getByRole('button', { name: 'Send verification email' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network error. Please try again.'));
  });
});
