import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../../pages/login';
import { UserContext } from '../../pages/_app';
import '@testing-library/jest-dom';

// Mock the Next.js router
let mockQuery: Record<string, string> = {};
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    prefetch: jest.fn(),
    query: mockQuery,
    asPath: '/',
  }),
}));

describe('Login page', () => {
  it('renders email and password fields and login button', () => {
    render(
      <UserContext.Provider value={{ user: null, setUser: jest.fn(), sessionLoading: false }}>
        <LoginPage />
      </UserContext.Provider>
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // Be specific to the input to avoid matching the toggle button's aria-label
    expect(screen.getByLabelText(/^password$/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('sets autocomplete hints and exposes the password toggle state', () => {
    render(
      <UserContext.Provider value={{ user: null, setUser: jest.fn(), sessionLoading: false }}>
        <LoginPage />
      </UserContext.Provider>
    );
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
    const password = screen.getByLabelText(/^password$/i, { selector: 'input' });
    expect(password).toHaveAttribute('autocomplete', 'current-password');

    const toggle = screen.getByRole('button', { name: /show password/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(password).toHaveAttribute('type', 'text');
  });

  describe('unverified accounts', () => {
    const originalFetch = global.fetch;
    afterEach(() => { global.fetch = originalFetch; });

    const signIn = async (response: { status: number; body: unknown }) => {
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (String(url).endsWith('/api/auth/login')) {
          return { ok: false, status: response.status, json: async () => response.body };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      }) as unknown as typeof fetch;
      render(
        <UserContext.Provider value={{ user: null, setUser: jest.fn(), sessionLoading: false }}>
          <LoginPage />
        </UserContext.Provider>
      );
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@example.com' } });
      fireEvent.change(screen.getByLabelText(/^password$/i, { selector: 'input' }), { target: { value: 'pw-12345' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    };

    it('renders CheckYourEmail for EMAIL_NOT_VERIFIED instead of the generic error', async () => {
      await signIn({ status: 401, body: { error: 'Please verify your email address to sign in.', code: 'EMAIL_NOT_VERIFIED' } });
      expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: /check your email/i })).toBeInTheDocument();
      expect(screen.getByText(/Use Resend to get a new link sent to/i)).toHaveTextContent('a@example.com');
      expect(screen.queryByText(/when you signed up/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/We sent a verification link to/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Please verify your email address to sign in/i)).not.toBeInTheDocument();
    });

    it('Back to sign in returns to the form with the password cleared', async () => {
      await signIn({ status: 401, body: { error: 'x', code: 'EMAIL_NOT_VERIFIED' } });
      fireEvent.click(await screen.findByRole('button', { name: /back to sign in/i }));
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i, { selector: 'input' })).toHaveValue('');
      expect(screen.getByLabelText(/email/i)).toHaveFocus();
    });

    it('still shows the generic error for a wrong password', async () => {
      await signIn({ status: 401, body: { error: 'Invalid email or password.' } });
      await waitFor(() => expect(screen.getByText('Invalid email or password.')).toBeInTheDocument());
      expect(screen.queryByRole('heading', { name: /check your email/i })).not.toBeInTheDocument();
    });
  });
});

describe('Login page OAuth failure', () => {
  afterEach(() => { mockQuery = {}; });

  it('tells the person to check their provider email is verified', async () => {
    mockQuery = { error: 'oauth_failed' };
    render(
      <UserContext.Provider value={{ user: null, setUser: jest.fn(), sessionLoading: false }}>
        <LoginPage />
      </UserContext.Provider>
    );
    expect(await screen.findByText(
      'Social login failed. If you used Google or GitHub, make sure the email address on that account is verified, then try again, or sign in with email and password.'
    )).toBeInTheDocument();
  });
});
