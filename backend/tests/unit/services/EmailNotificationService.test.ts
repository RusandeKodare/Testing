import axios from 'axios';
import { createEmailNotificationServiceFromEnv } from '../../../src/services/EmailNotificationService';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EmailNotificationService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends rich confirmation email through Resend when enabled', async () => {
    process.env.EMAIL_NOTIFICATIONS_ENABLED = 'true';
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESEND_FROM_EMAIL = 'no-reply@example.com';
    process.env.SUPPORT_EMAIL = 'support@example.com';

    mockedAxios.post.mockResolvedValue({ data: { id: 'msg_123' } } as any);

    const service = createEmailNotificationServiceFromEnv();

    await service.sendEmailChangeNotification({
      userId: 10,
      username: 'alice',
      previousEmail: 'old@example.com',
      newEmail: 'new@example.com',
      changedAtIso: '2026-04-03T10:00:00.000Z',
      ipAddress: '127.0.0.1',
      userAgent: 'jest-test-agent'
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        from: 'no-reply@example.com',
        to: ['new@example.com'],
        subject: 'Email change confirmed for your account',
        text: expect.stringContaining('Hey alice, you have successfully changed your email.'),
        html: expect.stringContaining('Security Activity Log')
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key'
        })
      })
    );
  });

  it('does not send email when notifications are disabled', async () => {
    process.env.EMAIL_NOTIFICATIONS_ENABLED = 'false';

    const service = createEmailNotificationServiceFromEnv();

    await service.sendEmailChangeNotification({
      userId: 10,
      username: 'alice',
      previousEmail: 'old@example.com',
      newEmail: 'new@example.com',
      changedAtIso: '2026-04-03T10:00:00.000Z'
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
