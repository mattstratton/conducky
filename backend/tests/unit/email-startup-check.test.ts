import { emailService } from '../../src/utils/email';
import logger from '../../src/config/logger';
import { logEmailSetupWarning } from '../../src/utils/email-startup-check';

describe('logEmailSetupWarning', () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(logger(), 'warn').mockImplementation((() => logger()) as any);
    error = jest.spyOn(logger(), 'error').mockImplementation((() => logger()) as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it('warns exactly once, loudly, when email is not configured', async () => {
    jest.spyOn(emailService, 'isConfigured').mockResolvedValue(false);
    await logEmailSetupWarning();
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain('DISABLED');
    expect(msg).toContain('STRONGLY RECOMMENDED');
    expect(msg).toContain('EMAIL_PROVIDER');
    expect(msg).toContain('\n');
  });

  it('logs nothing when configured', async () => {
    jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
    await logEmailSetupWarning();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('never throws when isConfigured rejects, and logs the message', async () => {
    jest.spyOn(emailService, 'isConfigured').mockRejectedValue(new Error('kaput'));
    await expect(logEmailSetupWarning()).resolves.toBeUndefined();
    expect(JSON.stringify([...warn.mock.calls, ...error.mock.calls])).toContain('kaput');
  });
});
