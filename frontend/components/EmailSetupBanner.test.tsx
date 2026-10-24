import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
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
    expect(link).toHaveAttribute('href', expect.stringContaining('conducky.com/docs/admin-guide/system-configuration#email-configuration'));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/email-status'),
      expect.objectContaining({ credentials: 'include' })
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  const settled = async () => {
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await act(async () => {});
  };

  const expectNoBanner = (container: HTMLElement) => {
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/not configured/i);
  };

  it('renders only the empty status wrapper when email is configured', async () => {
    reply(true, { configured: true });
    const { container } = render(<EmailSetupBanner />);
    await settled();
    expectNoBanner(container);
  });

  it('renders only the empty status wrapper while loading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<EmailSetupBanner />);
    expectNoBanner(container);
  });

  it('renders only the empty status wrapper on a non-OK response', async () => {
    reply(false, { error: 'x' });
    const { container } = render(<EmailSetupBanner />);
    await settled();
    expectNoBanner(container);
  });

  it('renders only the empty status wrapper on a fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { container } = render(<EmailSetupBanner />);
    await settled();
    expectNoBanner(container);
  });

  it('adds a named section inside the pre-existing status wrapper', async () => {
    reply(true, { configured: false });
    render(<EmailSetupBanner />);
    const wrapper = screen.getByRole('status');
    expect(wrapper).toBeEmptyDOMElement();
    const section = await screen.findByRole('region', { name: 'Email configuration warning' });
    expect(screen.getByRole('status')).toBe(wrapper);
    expect(wrapper).toContainElement(section);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
