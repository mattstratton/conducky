import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RegisterPage from '../../pages/register';
import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    prefetch: jest.fn(),
    query: {},
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


