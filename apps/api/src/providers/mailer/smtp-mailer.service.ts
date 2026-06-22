/**
 * SmtpMailerService — local SMTP implementation backed by nodemailer.
 *
 * AWS swap point: replace this with an SES adapter that calls
 * `@aws-sdk/client-ses`; the IMailerService interface remains unchanged,
 * so no feature code needs to change.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { IMailerService, SendMailOptions } from './mailer.interface';

@Injectable()
export class SmtpMailerService implements IMailerService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST') || 'localhost';
    const port = parseInt(this.config.get<string>('SMTP_PORT') || '1025', 10);
    this.from = this.config.get<string>('MAIL_FROM') || 'noreply@perf-tracker.local';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
    });
  }

  async sendMail(opts: SendMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
  }
}
