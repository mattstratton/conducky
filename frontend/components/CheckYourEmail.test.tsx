import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CheckYourEmail } from './CheckYourEmail';

const PASSWORD = 'S3cret-pass!';
const mockFetch = jest.fn();

function reply(status: number, body: unknown) {
  mockFetch.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });
}

function setup(props: Partial<React.ComponentProps<typeof CheckYourEmail>> = {}) {
  return render(<CheckYourEmail email="a@example.com" password={PASSWORD} emailSent {...props} />);
}

describe('CheckYourEmail', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('shows the address and focuses the heading', () => {
    setup();
    const heading = screen.getByRole('heading', { name: /check your email/i });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/We sent a verification link to/i)).toHaveTextContent('a@example.com');
  });

  it('shows could-not-send copy when emailSent is false', () => {
    setup({ emailSent: false });
    expect(screen.getByText(/We could not send the email. Use Resend to try again./i)).toBeInTheDocument();
  });

  it('resend posts the email and shows the neutral message politely', async () => {
    reply(200, { message: 'ok' });
    setup();
    await userEvent.click(screen.getByRole('button', { name: /resend/i }));
    const msg = await screen.findByText('If this address needs verification, a new link is on its way.');
    expect(msg.closest('[aria-live="polite"]')).not.toBeNull();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/resend-verification$/);
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@example.com' });
  });

  it('corrects the address, updates the display and calls onEmailChanged', async () => {
    reply(200, { email: 'b@example.com', verificationEmailSent: true });
    const onEmailChanged = jest.fn();
    setup({ onEmailChanged });
    await userEvent.type(screen.getByLabelText(/wrong address/i), 'b@example.com');
    await userEvent.click(screen.getByRole('button', { name: /change address/i }));
    await waitFor(() => expect(onEmailChanged).toHaveBeenCalledWith('b@example.com'));
    expect(screen.getByText(/We sent a verification link to/i)).toHaveTextContent('b@example.com');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/correct-email$/);
    expect(JSON.parse(init.body)).toEqual({ email: 'a@example.com', password: PASSWORD, newEmail: 'b@example.com' });
  });

  ([
    [401, { error: 'Invalid email or password.' }, /Invalid email or password/i],
    [409, { error: 'Email already registered.' }, /already registered/i],
    [400, { error: 'Invalid email address.' }, /Invalid email address/i],
    [429, {}, /Too many attempts. Please wait a few minutes and try again./i],
  ] as [number, object, RegExp][]).forEach(([status, body, text]) => it(`announces a ${status} error`, async () => {
    reply(status, body);
    setup();
    await userEvent.type(screen.getByLabelText(/wrong address/i), 'b@example.com');
    await userEvent.click(screen.getByRole('button', { name: /change address/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
  }));

  it('announces a 429 on resend and a network error', async () => {
    reply(429, {});
    setup();
    await userEvent.click(screen.getByRole('button', { name: /resend/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Too many attempts/i);
    mockFetch.mockRejectedValueOnce(new Error('down'));
    await userEvent.click(screen.getByRole('button', { name: /resend/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/network error/i));
  });

  it('never renders the password', async () => {
    reply(401, { error: 'Invalid email or password.' });
    const { container } = setup();
    await userEvent.type(screen.getByLabelText(/wrong address/i), 'b@example.com');
    await userEvent.click(screen.getByRole('button', { name: /change address/i }));
    await screen.findByRole('alert');
    expect(container.textContent).not.toContain(PASSWORD);
  });
});
