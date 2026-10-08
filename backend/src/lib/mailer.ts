import nodemailer from "nodemailer";

// Reuse a single transporter for the lifetime of the process
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  link: string;
}) {
  if (!emailConfigured()) {
    // Without email, local development would have no way to get the link.
    // Never log it in production, where logs may be seen by others.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[mailer] Email not configured. Reset link: ${opts.link}`);
    } else {
      console.warn("[mailer] Email not configured. Skipping reset email.");
    }
    return;
  }

  await transporter.sendMail({
    from: `"Book Club" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: "Reset your Book Club password",
    text: `Hi ${opts.name},\n\nUse this link to set a new password. It works once and expires in 1 hour:\n\n${opts.link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `
      <p>Hi ${escapeHtml(opts.name)},</p>
      <p>Use this link to set a new password. It works once and expires in 1 hour:</p>
      <p><a href="${escapeHtml(opts.link)}">Reset my password</a></p>
      <p style="color:#666">If you didn't ask for this, you can ignore this email.</p>
    `,
  });
}

export async function sendFeedbackEmail(opts: {
  fromName: string;
  fromEmail: string;
  message: string;
}) {
  const to = process.env.FEEDBACK_TO_EMAIL;
  if (!to || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    // Email not configured — log and continue silently so the app still works
    console.warn("[mailer] Email not configured. Skipping feedback email.");
    return;
  }

  await transporter.sendMail({
    from: `"Book Club" <${process.env.GMAIL_USER}>`,
    to,
    subject: `New feedback from ${opts.fromName}`,
    text: `${opts.fromName} (${opts.fromEmail}) submitted feedback:\n\n${opts.message}`,
    html: `
      <p><strong>${escapeHtml(opts.fromName)}</strong> (<a href="mailto:${escapeHtml(opts.fromEmail)}">${escapeHtml(opts.fromEmail)}</a>) submitted feedback:</p>
      <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#333">${escapeHtml(opts.message).replace(/\n/g, "<br>")}</blockquote>
    `,
  });
}
