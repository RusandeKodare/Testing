import axios from 'axios';
import { getLogger } from '../utils/logger';

const logger = getLogger('email-notifications');

export interface EmailChangeNotificationParams {
  userId: number;
  newEmail: string;
}

export interface EmailNotificationService {
  sendEmailChangeNotification(params: EmailChangeNotificationParams): Promise<void>;
}

class NoopEmailNotificationService implements EmailNotificationService {
  async sendEmailChangeNotification(_params: EmailChangeNotificationParams): Promise<void> {
    return Promise.resolve();
  }
}

class ResendEmailNotificationService implements EmailNotificationService {
  private readonly apiKey: string;
  private readonly fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmailChangeNotification(params: EmailChangeNotificationParams): Promise<void> {
    const subject = 'Your account email was updated';
    const text = [
      'Your email address was updated successfully.',
      '',
      `New email: ${params.newEmail}`,
      '',
      'If you did not perform this change, contact support immediately.'
    ].join('\n');

    const html = [
      '<p>Your email address was updated successfully.</p>',
      `<p><strong>New email:</strong> ${params.newEmail}</p>`,
      '<p>If you did not perform this change, contact support immediately.</p>'
    ].join('');

    await axios.post(
      'https://api.resend.com/emails',
      {
        from: this.fromEmail,
        to: [params.newEmail],
        subject,
        text,
        html
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    logger.info({ userId: params.userId, to: params.newEmail }, 'Email update notification sent');
  }
}

export function createEmailNotificationServiceFromEnv(): EmailNotificationService {
  const enabled = String(process.env.EMAIL_NOTIFICATIONS_ENABLED || '').toLowerCase() === 'true';
  const apiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.RESEND_FROM_EMAIL || '';

  if (!enabled) {
    logger.info('Email notifications disabled');
    return new NoopEmailNotificationService();
  }

  if (!apiKey || !fromEmail) {
    logger.warn('Email notifications enabled but RESEND_API_KEY or RESEND_FROM_EMAIL is missing');
    return new NoopEmailNotificationService();
  }

  return new ResendEmailNotificationService(apiKey, fromEmail);
}
