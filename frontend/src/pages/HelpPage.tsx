import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

interface Step {
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    title: "This Month page",
    body: "Your home base. The host sets up book proposals and possible meeting dates here, then opens voting when ready. Everything for the current month happens on this one screen.",
  },
  {
    title: "The host role",
    body: "Any member can reassign the host using the selector at the top of This Month page. The host is the only person who can add, edit, or remove book proposals and dates, and they're the ones who open voting, reveal results, and finalize the month.",
  },
  {
    title: "Book Proposals",
    body: 'The host can add up to 5 books for the group to consider. Click "+ Add Book" and start typing a title — suggestions from Open Library appear automatically. Selecting one fills in the author, cover image, and genres for you. You can also fill everything in manually or leave any field blank. Titles with a link can be clicked to read more about the book. The host can edit any proposal or remove it (as long as no one has voted yet).',
  },
  {
    title: "Meeting Dates",
    body: "The host adds a few possible dates for the meetup. Like books, dates can be edited or removed before voting opens.",
  },
  {
    title: "Opening Voting",
    body: 'Once the host is happy with the proposals, they click "Open Voting for All Members." After that, no more changes to books or dates can be made and every member can submit their ballot.',
  },
  {
    title: "Voting",
    body: 'In the "Your Vote" section, drag the books into your preferred order (favourite at the top) and tick all the dates you\'re available. Hit "Submit Vote" when you\'re done — your vote is locked after submission and cannot be changed.',
  },
  {
    title: "Results",
    body: 'The host can see results as votes come in. When they\'re ready to share, they click "Reveal Results" to make them visible to everyone. Results show how the group ranked each book and which dates had the most availability. The host then picks the winning book and meeting date to finalize the month.',
  },
  {
    title: "Archive",
    body: "Every past month lives in the Archive, accessible from the top menu. You can browse previous picks, results, and meeting details any time.",
  },
  {
    title: "Your Profile",
    body: "Click your name in the top menu to update your display name, home address, or password. Your address is shown to other members on the dashboard when you are the host for that month.",
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
