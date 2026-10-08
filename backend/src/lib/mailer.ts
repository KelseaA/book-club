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

/** Greet by first name — "Hi Kelsea", not "Hi Kelsea Anderson" */
function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0];
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

  const firstName = firstNameOf(opts.name);

  await transporter.sendMail({
    from: `"Book Club" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: "Reset Your Book Club Password",
    text: `Hi ${firstName},\n\nUse this link to set a new password. It works once and expires in 1 hour:\n\n${opts.link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `
      <p>Hi ${escapeHtml(firstName)},</p>
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
    subject: `New Feedback From ${opts.fromName}`,
    text: `${opts.fromName} (${opts.fromEmail}) submitted feedback:\n\n${opts.message}`,
    html: `
      <p><strong>${escapeHtml(opts.fromName)}</strong> (<a href="mailto:${escapeHtml(opts.fromEmail)}">${escapeHtml(opts.fromEmail)}</a>) submitted feedback:</p>
      <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#333">${escapeHtml(opts.message).replace(/\n/g, "<br>")}</blockquote>
    `,
  });
}

/**
 * Sends one notification email. Without email configured it only logs (in
 * development) so notifications can be tried locally without sending mail.
 */
async function sendNotification(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[mailer] Email not configured. Would send "${opts.subject}" to ${opts.to}`,
      );
    }
    return;
  }
  await transporter.sendMail({
    from: `"Book Club" <${process.env.GMAIL_USER}>`,
    ...opts,
  });
}

// Shown at the bottom of every notification
const OPT_OUT_TEXT =
  "You're getting this because email notifications are on in your Book Club profile. Turn them off there anytime.";

export function sendVotingOpenEmail(opts: {
  to: string;
  name: string;
  hostName: string;
  link: string;
}) {
  const firstName = firstNameOf(opts.name);
  return sendNotification({
    to: opts.to,
    subject: "Voting Is Open For The Next Book Club Meeting",
    text: `Hi ${firstName},\n\n${opts.hostName} has opened voting for the next meeting. Rank the books and pick the dates you can make:\n\n${opts.link}\n\n${OPT_OUT_TEXT}`,
    html: `
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>${escapeHtml(opts.hostName)} has opened voting for the next meeting. Rank the books and pick the dates you can make.</p>
      <p><a href="${escapeHtml(opts.link)}">Vote now</a></p>
      <p style="color:#666;font-size:12px">${OPT_OUT_TEXT}</p>
    `,
  });
}

export function sendMeetingAnnouncedEmail(opts: {
  to: string;
  name: string;
  bookTitle: string;
  bookAuthor: string;
  when: string;
  hostName: string;
  location: string | null;
  link: string;
}) {
  const firstName = firstNameOf(opts.name);
  const where = opts.location
    ? `${opts.hostName}'s — ${opts.location}`
    : `${opts.hostName}'s`;
  return sendNotification({
    to: opts.to,
    subject: `Next Book Club: ${opts.bookTitle}`,
    text: `Hi ${firstName},\n\nThe votes are in! We're reading ${opts.bookTitle} by ${opts.bookAuthor}.\n\nWhen: ${opts.when}\nWhere: ${where}\n\nSee the results:\n${opts.link}\n\n${OPT_OUT_TEXT}`,
    html: `
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>The votes are in! We're reading <strong>${escapeHtml(opts.bookTitle)}</strong> by ${escapeHtml(opts.bookAuthor)}.</p>
      <p><strong>When:</strong> ${escapeHtml(opts.when)}<br><strong>Where:</strong> ${escapeHtml(where)}</p>
      <p><a href="${escapeHtml(opts.link)}">See the results</a></p>
      <p style="color:#666;font-size:12px">${OPT_OUT_TEXT}</p>
    `,
  });
}
