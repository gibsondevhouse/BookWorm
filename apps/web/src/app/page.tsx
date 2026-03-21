"use client";

export default function Page() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-gradient-to-b from-[#f8f4ea] to-[#efe8dc]">
      {/* Message List / Empty State */}
      <ol
        className="flex-1 overflow-y-auto list-none m-0 p-6 flex flex-col gap-4 min-h-0"
        aria-label="Chat messages"
      >
        <li className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-normal text-muted italic mb-6">
              What are you writing today?
            </h1>

            {/* Quick Action Chips */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button className="px-4 py-2 bg-white border border-border rounded-full text-sm text-ink hover:bg-subtle transition-colors cursor-default">
                Brainstorm
              </button>
              <button className="px-4 py-2 bg-white border border-border rounded-full text-sm text-ink hover:bg-subtle transition-colors cursor-default">
                Draft
              </button>
              <button className="px-4 py-2 bg-white border border-border rounded-full text-sm text-ink hover:bg-subtle transition-colors cursor-default">
                Edit
              </button>
              <button className="px-4 py-2 bg-white border border-border rounded-full text-sm text-ink hover:bg-subtle transition-colors cursor-default">
                Research
              </button>
            </div>
          </div>
        </li>
      </ol>

      {/* Input Area */}
      <div className="border-t border-border bg-surface flex-shrink-0 px-6 py-4">
        <div className="flex gap-3 items-flex-end">
          {/* Model/Settings Selector */}
          <button
            className="p-2 hover:bg-subtle rounded-lg transition-colors flex-shrink-0"
            aria-label="Model settings"
            title="Model settings"
          >
            <svg
              className="w-5 h-5 text-muted"
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
            className="flex-1 resize-none border border-border rounded-2xl px-4 py-3 font-serif text-base text-ink bg-white outline-none focus:border-accent focus:ring-2 focus:ring-[rgba(148,95,45,0.15)] focus:ring-offset-0 transition-all"
            placeholder="Ask your AI writing partner…"
            rows={1}
            aria-label="Message input"
          />

          {/* Send Button */}
          <button
            type="button"
            className="px-6 py-3 rounded-2xl bg-accent text-white font-serif font-bold text-sm hover:bg-[#7f4f24] transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
