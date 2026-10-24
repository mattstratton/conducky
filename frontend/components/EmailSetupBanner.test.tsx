import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmailSetupBanner, shouldShowEmailSetupBanner } from './EmailSetupBanner';

const mockFetch = jest.fn();
const reply = (ok: boolean, body: unknown) =>
  mockFetch.mockResolvedValueOnce({ ok, status: ok ? 200 : 500, json: async () => body });

describe('EmailSetupBanner', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('shows the strong warning and a docs link when email is not configured', async () => {
    reply(true, { configured: false });
    render(<EmailSetupBanner />);
    expect(
      await screen.findByText(/Email is not configured\. New signups are not being verified\. Configuring email is strongly recommended\./)
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'How to configure email' });
    expect(link).toHaveAttribute('href', expect.stringContaining('conducky.com/docs/admin-guide/system-configuration'));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/email-status'),
      expect.objectContaining({ credentials: 'include' })
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when email is configured', async () => {
    reply(true, { configured: true });
    const { container } = render(<EmailSetupBanner />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('renders nothing while loading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<EmailSetupBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on a non-OK response', async () => {
    reply(false, { error: 'x' });
    const { container } = render(<EmailSetupBanner />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on a fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { container } = render(<EmailSetupBanner />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('shouldShowEmailSetupBanner', () => {
  it('is true only for system admins on /admin paths', () => {
    expect(shouldShowEmailSetupBanner(['system_admin'], '/admin/system/settings')).toBe(true);
    expect(shouldShowEmailSetupBanner(['system_admin'], '/admin')).toBe(true);
    expect(shouldShowEmailSetupBanner([], '/admin')).toBe(false);
    expect(shouldShowEmailSetupBanner(['org_admin'], '/admin')).toBe(false);
    expect(shouldShowEmailSetupBanner(['system_admin'], '/dashboard')).toBe(false);
    expect(shouldShowEmailSetupBanner(['system_admin'], '/administrators')).toBe(false);
  });
});
