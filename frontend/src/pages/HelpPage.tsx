import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

interface Step {
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    title: "Signing in",
    body: "Use the email address and password you registered with to log in. If you ever forget your password, ask whoever set up your account to reset it for you.",
  },
  {
    title: "This Month page",
    body: "This is your home base. Every month the club host sets up a new page here with book suggestions and possible meeting dates. Everything happens on this one screen — no need to go anywhere else during the month.",
  },
  {
    title: "Book Proposals",
    body: "The host adds books for the group to consider. You'll see the title, author, and sometimes a cover photo. If a title is a purple link, you can click it to read more about the book on the web.",
  },
  {
    title: "Meeting Dates",
    body: "The host also adds a few possible dates for your meetup. Your job is to tick the ones you're free on so the group can find the best day for everyone.",
  },
  {
    title: "Voting",
    body: 'When the host opens voting you\'ll see a "Your Vote" section. Drag the books into your preferred order (favourite at the top) and tick all the dates you can make. Hit "Submit Vote" when you\'re done — you won\'t be able to change it afterwards, so take your time.',
  },
  {
    title: "Results",
    body: "Once the host is ready, they'll announce the winner. You'll see how the group ranked the books and which date had the most takers, plus a banner at the top showing the chosen book and meeting time.",
  },
  {
    title: "Archive",
    body: "Every past month lives in the Archive, accessible from the top menu. You can look back at previous picks and results any time.",
  },
  {
    title: "Your Profile",
    body: "Click your name in the top menu to update your display name, mailing address, or password. Your address is shown to other members on the home page when you are the host.",
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const feedback = useMutation<unknown, Error, string>({
    mutationFn: (msg) => api.post("/feedback", { message: msg }),
    onSuccess: () => {
      setSubmitted(true);
      setMessage("");
    },
  });

  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim()) feedback.mutate(message.trim());
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">How to use Book Club</h1>
        <p className="text-gray-500 text-sm">
          New here? Click any section below to learn more.
        </p>
      </div>

      {/* Accordion steps */}
      <div className="card divide-y divide-gray-100 !p-0 overflow-hidden">
        {steps.map((step, i) => (
          <div key={i}>
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="font-medium text-sm">
                {i + 1}. {step.title}
              </span>
              <span className="text-gray-400 text-lg leading-none">
                {open === i ? "−" : "+"}
              </span>
            </button>
            {open === i && (
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                {step.body}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick reference */}
      <div className="card space-y-3">
        <h2 className="text-base font-semibold">Quick tips</h2>
        <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
          <li>
            You can only submit your vote once, so review your choices before
            hitting the button.
          </li>
          <li>Only the host can add or remove books and dates.</li>
          <li>
            If something looks broken or confusing, use the feedback form below
            to let us know.
          </li>
        </ul>
      </div>

      {/* Feedback */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-base font-semibold">
            Suggestions &amp; Feedback
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Got an idea for a new feature, or something that confused you? We'd
            love to hear it.
          </p>
        </div>
        {submitted ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Thanks for your feedback! We appreciate it.
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            <textarea
              className="input min-h-[100px] resize-y"
              placeholder="e.g. It would be great if I could see who voted for which book…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            {feedback.isError && (
              <p className="error-text">{feedback.error.message}</p>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={feedback.isPending || !message.trim()}
            >
              {feedback.isPending ? "Sending…" : "Send Feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
