import { env } from '../config/env';

export async function sendActivationEmail(to: string, activationToken: string, firstName: string): Promise<void> {
  const activationUrl = `${env.CLIENT_ORIGIN}/activate?email=${encodeURIComponent(to)}&code=${encodeURIComponent(activationToken)}`;

  const payload = {
    sender: { email: env.BREVO_FROM_EMAIL || env.BREVO_USER || env.SMTP_FROM || 'no-reply@platform.org', name: env.EMAIL_FROM_NAME },
    to: [{ email: to }],
    subject: 'Activate your assessment account',
    textContent: `Hello ${firstName},\n\nWelcome to ${env.EMAIL_FROM_NAME}. Please activate your account using the following link:\n${activationUrl}\n\nThis link is valid for 7 days.`,
    htmlContent: `<p>Hello <strong>${firstName}</strong>,</p><p>Welcome to <strong>${env.EMAIL_FROM_NAME}</strong>. Please activate your assessment account by clicking the link below:</p><p><a href="${activationUrl}"><strong>Activate Your Account</strong></a></p><p>Or copy this link into your browser:<br><code>${activationUrl}</code></p><p>This activation link is valid for 7 days.</p>`
  };

  if (env.EMAIL_PROVIDER_URL && env.EMAIL_PROVIDER_TOKEN) {
    const response = await fetch(env.EMAIL_PROVIDER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.EMAIL_PROVIDER_TOKEN}` },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Email provider rejected dispatch with status ${response.status}`);
    return;
  }

  if (env.BREVO_API_KEY && (env.BREVO_FROM_EMAIL || env.BREVO_USER)) {
    const fromEmail = env.BREVO_FROM_EMAIL || env.BREVO_USER || 'no-reply@platform.org';
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'api-key': env.BREVO_API_KEY
      },
      body: JSON.stringify({ ...payload, sender: { email: fromEmail, name: env.EMAIL_FROM_NAME } })
    });

    if (!response.ok) {
      throw new Error(`Email provider rejected dispatch with status ${response.status}`);
    }
    return;
  }

  throw new Error('Email provider is not configured; invitation was not dispatched');
}
