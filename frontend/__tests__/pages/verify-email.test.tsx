import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerifyEmailPage from '../../pages/verify-email';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

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

  it('treats an array-valued token as invalid without calling the API', async () => {
    mockQuery = { token: ['a', 'b'] };
    render(<VerifyEmailPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls the API exactly once when isReady flips from false to true', async () => {
    mockReady = false;
    reply(200, { status: 'verified' });
    const { rerender } = render(<VerifyEmailPage />);
    expect(mockFetch).not.toHaveBeenCalled();
    mockReady = true;
    rerender(<VerifyEmailPage />);
    await screen.findByText(/is verified/i);
    rerender(<VerifyEmailPage />);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('uses a single persistent status region', async () => {
    reply(200, { status: 'verified' });
    render(<VerifyEmailPage />);
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent(/verifying/i);
    await waitFor(() => expect(region).toHaveTextContent(/is verified/i));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getAllByRole('status')[0]).toBe(region);
  });

  it('offers Try again after a network error and re-runs the call', async () => {
    mockFetch.mockRejectedValueOnce(new Error('down'));
    render(<VerifyEmailPage />);
    await screen.findByRole('alert');
    reply(200, { status: 'verified' });
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await screen.findByText(/is verified/i);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('offers Try again on 429 but not on an invalid link', async () => {
    reply(429, {});
    const { unmount } = render(<VerifyEmailPage />);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    unmount();
    reply(400, {});
    render(<VerifyEmailPage />);
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('sets a document title per state', async () => {
    reply(200, { status: 'verified' });
    render(<VerifyEmailPage />);
    await waitFor(() => expect(document.title).toBe('Email verified'));
  });

  it('moves focus to the status region when Try again is pressed', async () => {
    mockFetch.mockRejectedValueOnce(new Error('down'));
    render(<VerifyEmailPage />);
    await screen.findByRole('alert');
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    const btn = screen.getByRole('button', { name: /try again/i });
    btn.focus();
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent(/verifying/i);
  });

  it('does not call a rate-limited page a link problem', async () => {
    reply(429, {});
    render(<VerifyEmailPage />);
    await screen.findByRole('alert');
    expect(document.title).toBe('Verification could not be completed');
  });

  it('keeps the link-problem title for an invalid link', async () => {
    reply(400, {});
    render(<VerifyEmailPage />);
    await screen.findByRole('alert');
    expect(document.title).toBe('Verification link problem');
  });
});

describe('verify-email page: email change links (confirm=1)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockQuery = { token: 'abc123', confirm: '1' };
    mockReady = true;
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('asks for a click and makes no request on mount', async () => {
    render(<VerifyEmailPage />);
    expect(
      await screen.findByText('You asked to change the email address on your Conducky account. Confirm to finish the change.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm email change' })).toBeInTheDocument();
    expect(document.title).toBe('Confirm email change');
    // not even after the effects settle (strict mode double effects included)
    await new Promise((r) => setTimeout(r, 20));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('makes no request on mount under strict mode', async () => {
    render(<React.StrictMode><VerifyEmailPage /></React.StrictMode>);
    await screen.findByRole('button', { name: 'Confirm email change' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('posts once on click and shows the result', async () => {
    reply(200, { status: 'email_changed' });
    render(<VerifyEmailPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm email change' }));
    expect(await screen.findByText(/Your email address has been changed./i)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ token: 'abc123' });
    expect(screen.queryByRole('button', { name: 'Confirm email change' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('ignores a double click and keeps focus on the busy button', async () => {
    let resolve!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    render(<VerifyEmailPage />);
    const btn = await screen.findByRole('button', { name: 'Confirm email change' });
    btn.focus();
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent(/confirming/i);
    resolve({ ok: true, status: 200, json: async () => ({ status: 'email_changed' }) });
    await screen.findByText(/Your email address has been changed./i);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('shows the invalid-link error and no retry for a 400', async () => {
    reply(400, {});
    render(<VerifyEmailPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm email change' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('Try again after a network error posts again on that click', async () => {
    mockFetch.mockRejectedValueOnce(new Error('down'));
    render(<VerifyEmailPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm email change' }));
    await screen.findByRole('alert');
    reply(200, { status: 'email_changed' });
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await screen.findByText(/Your email address has been changed./i);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('a link without confirm still auto-posts exactly once', async () => {
    mockQuery = { token: 'abc123' };
    reply(200, { status: 'verified' });
    render(<React.StrictMode><VerifyEmailPage /></React.StrictMode>);
    await screen.findByText(/is verified/i);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Confirm email change' })).not.toBeInTheDocument();
  });

  it('only confirm=1 triggers the click-to-confirm mode', async () => {
    mockQuery = { token: 'abc123', confirm: '0' };
    reply(200, { status: 'verified' });
    render(<VerifyEmailPage />);
    await screen.findByText(/is verified/i);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
