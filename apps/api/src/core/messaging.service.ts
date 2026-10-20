import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

/** Transactional email over SMTP (Mailpit in dev; SES SMTP or Resend in production). */
@Injectable()
export class MailerService {
  private readonly logger = new Logger('Mailer');
  private readonly transport: Transporter | null = env().SMTP_URL ? nodemailer.createTransport(env().SMTP_URL) : null;

  async send(to: string, subject: string, text: string, link?: string) {
    if (!this.transport) {
      this.logger.log(`[email to ${to}] ${subject}\n${text}`);
      return;
    }
    const url = link ? `${env().WEB_ORIGIN}${link}` : null;
    const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#111">
      <p style="white-space:pre-line;font-size:16px;line-height:1.5">${escapeHtml(text)}</p>
      ${url ? `<p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;text-decoration:none">Open</a></p>` : ''}
      <p style="color:#777;font-size:12px">You're getting this because of your notification settings. Change them any time under Settings.</p>
    </div>`;
    await this.transport.sendMail({
      from: env().MAIL_FROM,
      to,
      subject,
      text: url ? `${text}\n\n${url}` : text,
      html,
    });
  }
}

/**
 * WhatsApp Cloud API. Only pre-approved templates, only to users who opted in.
 * Without credentials (dev) messages are logged instead of sent.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger('WhatsApp');

  async sendTemplate(to: string, template: string, params: string[]) {
    const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = env();
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      this.logger.log(`[whatsapp to ${to}] template=${template} params=${JSON.stringify(params)}`);
      return;
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: template,
          language: { code: 'en' },
          components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
