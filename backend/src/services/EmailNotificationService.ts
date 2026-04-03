import axios from 'axios';
import { getLogger } from '../utils/logger';

const logger = getLogger('email-notifications');

export interface EmailChangeNotificationParams {
  userId: number;
  username: string;
  newEmail: string;
  previousEmail?: string | null;
  changedAtIso: string;
  ipAddress?: string;
  userAgent?: string;
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
  private readonly supportEmail: string;

  constructor(apiKey: string, fromEmail: string, supportEmail?: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.supportEmail = supportEmail || fromEmail;
  }

  async sendEmailChangeNotification(params: EmailChangeNotificationParams): Promise<void> {
    const subject = 'Email change confirmed for your account';
    const previousEmail = params.previousEmail || 'Not previously set';
    const ipAddress = params.ipAddress || 'Unknown';
    const userAgent = params.userAgent || 'Unknown';

    const text = [
      `Hey ${params.username}, you have successfully changed your email.`,
      '',
      `Username: ${params.username}`,
      `Previous email: ${previousEmail}`,
      `New email: ${params.newEmail}`,
      `Changed at (UTC): ${params.changedAtIso}`,
      `IP address: ${ipAddress}`,
      `User agent: ${userAgent}`,
      '',
      `If this was not you, contact support immediately at ${this.supportEmail}.`
    ].join('\n');

    const html = [
      '<div style="font-family:Segoe UI,Tahoma,Arial,sans-serif;line-height:1.5;color:#1f2937;max-width:640px;margin:0 auto;padding:18px;border:1px solid #e5e7eb;border-radius:12px;">',
      `<h2 style="margin:0 0 8px 0;color:#0f172a;">Hey ${params.username}, you have successfully changed your email</h2>`,
      '<p style="margin:0 0 16px 0;color:#334155;">This is a security confirmation for your account settings update.</p>',
      '<h3 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">Security Activity Log</h3>',
      '<table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;">',
      '<tr><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;"><strong>Username</strong></td>',
      `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${params.username}</td></tr>`,
      '<tr><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;"><strong>Previous Email</strong></td>',
      `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${previousEmail}</td></tr>`,
      '<tr><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;"><strong>New Email</strong></td>',
      `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${params.newEmail}</td></tr>`,
      '<tr><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;"><strong>Changed At (UTC)</strong></td>',
      `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${params.changedAtIso}</td></tr>`,
      '<tr><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;"><strong>IP Address</strong></td>',
      `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${ipAddress}</td></tr>`,
      '<tr><td style="padding:8px 10px;"><strong>User Agent</strong></td>',
      `<td style="padding:8px 10px;">${userAgent}</td></tr>`,
      '</table>',
      `<p style="margin:16px 0 0 0;">If this was not you, contact support immediately at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a>.</p>`,
      '</div>'
    ].join('');

    const response = await axios.post(
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

    logger.info(
      { userId: params.userId, to: params.newEmail, messageId: response.data?.id || null },
      'Email update notification sent'
    );
  }
}

export function createEmailNotificationServiceFromEnv(): EmailNotificationService {
  const enabled = String(process.env.EMAIL_NOTIFICATIONS_ENABLED || '').toLowerCase() === 'true';
  const apiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.RESEND_FROM_EMAIL || '';
  const supportEmail = process.env.SUPPORT_EMAIL || '';

  if (!enabled) {
    logger.info('Email notifications disabled');
    return new NoopEmailNotificationService();
  }

  if (!apiKey || !fromEmail) {
    logger.warn('Email notifications enabled but RESEND_API_KEY or RESEND_FROM_EMAIL is missing');
    return new NoopEmailNotificationService();
  }

  return new ResendEmailNotificationService(apiKey, fromEmail, supportEmail);
}
