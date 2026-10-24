import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerifyEmailPage from '../../pages/verify-email';

let mockQuery: Record<string, unknown> = {};
let mockReady = true;
jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: mockQuery, isReady: mockReady, asPath: '/verify-email' }),
}));

const mockFetch = jest.fn();
function reply(status: number, body: unknown) {
  mockFetch.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe('verify-email page', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockQuery = { token: 'abc123' };
    mockReady = true;
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  ([
    ['verified', /Your email address is verified. You can sign in now./i],
    ['already_verified', /This email address is already verified./i],
    ['email_changed', /Your email address has been changed./i],
  ] as [string, RegExp][]).forEach(([status, text]) => it(`shows success for ${status} with a sign-in link, calling the API once`, async () => {
    reply(200, { status });
    render(<VerifyEmailPage />);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/verify-email$/);
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({ token: 'abc123' });
  }));

  it('announces verifying while pending', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    render(<VerifyEmailPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/verifying/i);
  });

  it('shows the invalid-link message on 400', async () => {
    reply(400, { error: 'bad' });
    render(<VerifyEmailPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This verification link is invalid or has expired. Sign in to request a new one.'
    );
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('treats a missing token as invalid without calling the API', async () => {
    mockQuery = {};
    render(<VerifyEmailPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('waits for router.isReady', () => {
    mockReady = false;
    render(<VerifyEmailPage />);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('announces 429', async () => {
    reply(429, {});
    render(<VerifyEmailPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Too many attempts/i);
  });

  it('announces a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('down'));
    render(<VerifyEmailPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i);
  });

  it('calls the API once under strict mode', async () => {
    reply(200, { status: 'verified' });
    render(<React.StrictMode><VerifyEmailPage /></React.StrictMode>);
    await screen.findByText(/is verified/i);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
