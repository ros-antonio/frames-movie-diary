import nodemailer from 'nodemailer';
import { config } from '../config.js';

function normalizeBaseUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  isPasswordResetDeliveryConfigured() {
    return Boolean(config.appBaseUrl && config.smtpHost && config.smtpPort && config.smtpFrom);
  }

  private getTransporter() {
    if (!this.isPasswordResetDeliveryConfigured()) {
      throw new Error('SMTP email delivery is not configured');
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost!,
        port: config.smtpPort!,
        secure: config.smtpSecure,
        auth: config.smtpUser && config.smtpPass
          ? {
            user: config.smtpUser,
            pass: config.smtpPass,
          }
          : undefined,
      });
    }

    return this.transporter;
  }

  async sendPasswordResetEmail(input: { to: string; resetToken: string; expiresAt: Date }) {
    if (!this.isPasswordResetDeliveryConfigured()) {
      return;
    }

    const resetUrl = `${normalizeBaseUrl(config.appBaseUrl!)}/reset-password?token=${encodeURIComponent(input.resetToken)}`;

    await this.getTransporter().sendMail({
      from: config.smtpFrom!,
      to: input.to,
      subject: 'Reset your Frames Movie Diary password',
      text: [
        'A password reset was requested for your Frames Movie Diary account.',
        '',
        `Use this link to choose a new password: ${resetUrl}`,
        '',
        `This link expires at ${input.expiresAt.toISOString()}.`,
        'If you did not request this reset, you can ignore this email.',
      ].join('\n'),
      html: [
        '<p>A password reset was requested for your Frames Movie Diary account.</p>',
        `<p><a href="${resetUrl}">Reset your password</a></p>`,
        `<p>This link expires at <strong>${input.expiresAt.toISOString()}</strong>.</p>`,
        '<p>If you did not request this reset, you can ignore this email.</p>',
      ].join(''),
    });
  }
}

export const emailService = new EmailService();
