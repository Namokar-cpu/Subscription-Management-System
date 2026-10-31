import { env } from '../../config/env';
import { HttpError } from '../../common/errors';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export async function sendVerificationEmail(input: { to: string; name: string; verificationUrl: string }) {
  if (!env.RESEND_API_KEY) throw new HttpError(503, 'Email delivery is not configured on this server.');

  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(input.verificationUrl);
  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.to],
        subject: 'Verify your Brightloop account',
        html: `<p>Hello ${safeName},</p><p>Verify your email address to activate your Brightloop account.</p><p><a href="${safeUrl}">Verify email</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>`,
        text: `Hello ${input.name},\n\nVerify your Brightloop account using this link (expires in 24 hours):\n${input.verificationUrl}\n\nIf you did not create this account, ignore this email.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError(502, 'Could not reach the email provider. Please try again.');
  }

  if (!response.ok) {
    console.error('Resend rejected an email request with status', response.status);
    throw new HttpError(502, 'Email delivery failed. Check the sender address and Resend configuration.');
  }
}
