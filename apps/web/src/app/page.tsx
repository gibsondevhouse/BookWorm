"use client";

export default function Page() {
  return (
    <div className="flex h-full w-full flex-col bg-paper">
      {/* Message List / Empty State */}
      <ol
        className="flex-1 overflow-y-auto list-none m-0 p-6 flex flex-col gap-4"
        aria-label="Chat messages"
      >
        <li className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Greeting */}
          <div className="mb-8">
            <h1 className="mb-6 text-5xl font-serif text-text-muted">
              What are you writing today?
            </h1>

            {/* Quick Action Chips */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button className="rounded-full border border-border bg-white px-4 py-2 text-sm text-text hover:bg-subtle">
                Brainstorm
              </button>
              <button className="rounded-full border border-border bg-white px-4 py-2 text-sm text-text hover:bg-subtle">
                Draft
              </button>
              <button className="rounded-full border border-border bg-white px-4 py-2 text-sm text-text hover:bg-subtle">
                Edit
              </button>
              <button className="rounded-full border border-border bg-white px-4 py-2 text-sm text-text hover:bg-subtle">
                Research
              </button>
            </div>
          </div>
        </li>
      </ol>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border bg-paper px-6 py-4">
        <div className="flex gap-3 items-end">
          {/* Model/Settings Selector */}
          <button
            className="shrink-0 rounded-lg p-2 hover:bg-subtle"
            aria-label="Model settings"
          >
            <svg
              className="h-5 w-5 text-text-muted"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path
                fillRule="evenodd"
                d="M12 3a9 9 0 110 18 9 9 0 010-18zm0-2C6.477 1 2 5.477 2 12s4.477 11 10 11 10-4.477 10-10S17.523 1 12 1z"
              />
            </svg>
          </button>

          {/* Textarea */}
          <textarea
            className="flex-1 resize-none rounded-2xl border border-border bg-white px-4 py-3 font-serif text-base text-text outline-none focus:border-primary focus:ring-1 focus:ring-subtle"
            placeholder="Ask your AI…"
            rows={1}
            aria-label="Message input"
          />

          {/* Send Button */}
          <button
            type="button"
            className="shrink-0 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-dark"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
