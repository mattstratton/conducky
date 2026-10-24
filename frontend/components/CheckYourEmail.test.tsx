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
    expect(screen.getByRole('heading', { name: /check your email/i })).toHaveFocus();
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

  const correct = async (value = 'b@example.com') => {
    await userEvent.type(screen.getByLabelText(/wrong address/i), value);
    await userEvent.click(screen.getByRole('button', { name: /change address/i }));
  };

  it('has the polite live region in the DOM before any message and it is not display:none', () => {
    setup();
    const region = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(region).toBeEmptyDOMElement();
    expect(region.className).not.toMatch(/hidden/);
  });

  it('shows the server-returned address, not the typed one', async () => {
    reply(200, { email: 'canonical@example.com', verificationEmailSent: true });
    setup();
    await correct('Typed@Example.com');
    await waitFor(() =>
      expect(screen.getByText(/We sent a verification link to/i)).toHaveTextContent('canonical@example.com')
    );
  });

  it('shows could-not-send copy when the correction response says no mail was sent', async () => {
    reply(200, { email: 'b@example.com', verificationEmailSent: false });
    setup();
    await correct();
    expect(await screen.findByText(/We could not send the email. Use Resend to try again./i)).toBeInTheDocument();
    expect(screen.queryByText(/We sent a verification link to/i)).not.toBeInTheDocument();
  });

  it('resend uses the new address after a correction', async () => {
    reply(200, { email: 'b@example.com', verificationEmailSent: true });
    setup();
    await correct();
    await screen.findByText(/We sent a verification link to/i);
    reply(200, { message: 'ok' });
    await userEvent.click(screen.getByRole('button', { name: /resend/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual({ email: 'b@example.com' });
  });

  it('ignores a second resend click while busy and announces the busy text', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    setup();
    const btn = screen.getByRole('button', { name: /resend/i });
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).not.toBeDisabled();
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(/sending/i);
    await userEvent.click(btn);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    resolve({ ok: true, status: 200, json: async () => ({}) });
    await screen.findByText('If this address needs verification, a new link is on its way.');
  });

  it('blocks a double submit of the correction form while busy', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    setup();
    await userEvent.type(screen.getByLabelText(/wrong address/i), 'b@example.com');
    await userEvent.type(screen.getByLabelText(/wrong address/i), '{enter}{enter}');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(/changing/i);
    resolve({ ok: true, status: 200, json: async () => ({ email: 'b@example.com', verificationEmailSent: true }) });
    await waitFor(() => expect(screen.getByRole('heading', { name: /check your email/i })).toHaveFocus());
  });

  it('links a correct-email error to the input', async () => {
    reply(409, { error: 'Email already registered.' });
    setup();
    await correct();
    const alert = await screen.findByRole('alert');
    const input = screen.getByLabelText(/wrong address/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const id = input.getAttribute('aria-describedby') as string;
    expect(alert.querySelector(`#${id}`)).not.toBeNull();
  });

  it('does not mark the input invalid for a resend error', async () => {
    reply(429, {});
    setup();
    await userEvent.click(screen.getByRole('button', { name: /resend/i }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText(/wrong address/i)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('uses neutral copy when emailSent is not provided', () => {
    render(<CheckYourEmail email="a@example.com" password={PASSWORD} />);
    expect(screen.getByText(/Use Resend to get a new link sent to/i)).toHaveTextContent('a@example.com');
    expect(screen.queryByText(/We could not send/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/we sent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/when you signed up/i)).not.toBeInTheDocument();
  });

  it('supports the heading level prop', () => {
    const { unmount } = setup();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    unmount();
    setup({ headingLevel: 'h1' });
    expect(screen.getByRole('heading', { level: 1, name: /check your email/i })).toBeInTheDocument();
  });

  it('gives aria-disabled buttons a disabled look while busy', async () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    setup();
    const btn = screen.getByRole('button', { name: /resend/i });
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn.className).toMatch(/aria-disabled:opacity-50/);
    expect(btn.className).toMatch(/aria-disabled:pointer-events-none/);
    const submit = screen.getByRole('button', { name: /change address|changing/i });
    expect(submit.className).toMatch(/aria-disabled:opacity-50/);
  });

  it('does not render busy text in the success colour', async () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    setup();
    await userEvent.click(screen.getByRole('button', { name: /resend/i }));
    const region = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region).toHaveTextContent(/sending/i);
    expect(region.className).not.toMatch(/green/);
  });

  it('renders success text in the success colour', async () => {
    reply(200, {});
    setup();
    await userEvent.click(screen.getByRole('button', { name: /resend/i }));
    await screen.findByText(/a new link is on its way/i);
    expect((document.querySelector('[aria-live="polite"]') as HTMLElement).className).toMatch(/green/);
  });

  it('an empty submit sends nothing and shows a field-level error', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /change address/i }));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the correct email address.');
    const input = screen.getByLabelText(/wrong address/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
  });
});
