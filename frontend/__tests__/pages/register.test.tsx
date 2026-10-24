import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RegisterPage from '../../pages/register';
import '@testing-library/jest-dom';

// Mock next/router
const mockPush = jest.fn();
let mockQuery: Record<string, unknown> = {};
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: jest.fn(),
    query: mockQuery,
    asPath: '/register',
  }),
}));

describe('Register page - OAuth visibility', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch as any;
  });

  it('hides Google/GitHub buttons when providers are disabled', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: { google: false, github: false } }),
    } as any);

    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Google/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/GitHub/i)).not.toBeInTheDocument();
    });
  });

  it('shows Google button when Google is enabled', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: { google: true, github: false } }),
    } as any);

    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByText(/Google/i)).toBeInTheDocument();
      expect(screen.queryByText(/GitHub/i)).not.toBeInTheDocument();
    });
  });

  it('shows both buttons when both providers are enabled', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: { google: true, github: true } }),
    } as any);

    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByText(/Google/i)).toBeInTheDocument();
      expect(screen.getByText(/GitHub/i)).toBeInTheDocument();
    });
  });
});

describe('Register page - email verification', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; mockPush.mockReset(); mockQuery = {}; });

  const submit = async (registerBody: Record<string, unknown>) => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.endsWith('/api/auth/register')) return { ok: true, status: 201, json: async () => registerBody };
      if (u.includes('/api/auth/check-email')) return { ok: true, json: async () => ({ available: true }) };
      return { ok: true, json: async () => ({ providers: { google: false, github: false } }) };
    }) as unknown as typeof fetch;
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input' }), { target: { value: 'Str0ng!Passw0rd' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Str0ng!Passw0rd' } });
    fireEvent.click(screen.getByLabelText(/accept the terms/i));
    await waitFor(() => expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
  };

  it('renders CheckYourEmail and does not navigate when verification is required', async () => {
    await submit({ message: 'ok', verificationRequired: true, verificationEmailSent: true });
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument();
    expect(screen.getByText(/We sent a verification link to/i)).toHaveTextContent('ada@example.com');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to login as before when verification is not required', async () => {
    await submit({ message: 'ok', verificationRequired: false, verificationEmailSent: false });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/login?message=')));
  });

  it('still preserves the invite next redirect when verification is not required', async () => {
    mockQuery = { next: '/invite/abc123' };
    await submit({ message: 'ok', verificationRequired: false });
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('next=' + encodeURIComponent('/invite/abc123')))
    );
  });

  it('renders CheckYourEmail with an h1', async () => {
    await submit({ message: 'ok', verificationRequired: true, verificationEmailSent: false });
    expect(await screen.findByRole('heading', { level: 1, name: /check your email/i })).toBeInTheDocument();
    expect(screen.getByText(/We could not send the email/i)).toBeInTheDocument();
  });
});
