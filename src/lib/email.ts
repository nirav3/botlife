import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const from = process.env.EMAIL_FROM || 'BodLife <onboarding@resend.dev>';

  if (!resend) {
    // No API key configured (e.g. local dev) — log instead of silently
    // dropping the email so the link is still reachable while testing.
    console.warn(`[email] RESEND_API_KEY not set — would have emailed a reset link to ${to}: ${resetUrl}`);
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Reset your BodLife password',
    html: `
      <p>We received a request to reset your BodLife password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 15 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `,
  });

  if (error) {
    // Don't throw: forgotPassword must respond identically whether or not
    // the email actually went out, so we never leak account existence
    // through error behavior. Log server-side for ops visibility instead.
    console.error('[email] Failed to send password reset email:', error);
  }
}
