"use client";

import React, { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";

const quickActions = ["Brainstorm", "Draft", "Edit", "Research"];

type Message = { role: "user" | "assistant"; content: string; id: string };

export default function Page() {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-paper text-text">
      <ol
        className="m-0 flex flex-1 list-none flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6 lg:px-10 lg:py-8"
        aria-label="Chat messages"
      >
        {messages.length === 0 ? (
          <li className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
            <section className="shell-panel relative w-full overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(134,201,255,0.18),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(217,195,127,0.1),transparent_18%),linear-gradient(135deg,transparent,rgba(134,201,255,0.04))]" />
            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
              <div className="text-center lg:text-left">
                <div className="hero-badge inline-flex rounded-full px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.34em] text-[rgba(237,245,255,0.82)]">
                  Writing companion online
                </div>
                <h1 className="font-display mt-6 text-4xl leading-none text-text sm:text-5xl lg:text-6xl">
                  What realm are you writing toward tonight?
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-muted lg:mx-0 lg:text-lg">
                  Shape a scene, test a voice, or gather your notes without leaving the
                  hush of the stack. The shell stays lightweight; the atmosphere finally
                  matches the work.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className="quick-chip rounded-full px-5 py-2.5 text-sm tracking-[0.16em] text-text"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <aside className="sidebar-card rounded-[1.75rem] p-5 text-left">
                <div className="text-[0.68rem] uppercase tracking-[0.32em] text-text-muted">
                  Entry cadence
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="font-display text-lg text-text">Gather the thread</div>
                    <div className="mt-1 text-sm leading-6 text-text-muted">
                      Start with a premise, a scene beat, or a hard question you need the
                      draft to answer.
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-lg text-text">Keep the lore near</div>
                    <div className="mt-1 text-sm leading-6 text-text-muted">
                      Use the shell to move between ideation, codex context, and review
                      without changing workflows.
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-lg text-text">Refine the voice</div>
                    <div className="mt-1 text-sm leading-6 text-text-muted">
                      Let the interface stay calm while you pressure-test tone, rhythm, and
                      continuity.
                    </div>
                  </div>
                </div>
              </aside>
            </div>
            </section>
          </li>
        ) : (
          messages.map((msg) => (
            <li
              key={msg.id}
              className={`mx-auto w-full max-w-6xl flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-[1.5rem] px-5 py-4 text-base text-text ${
                  msg.role === "user"
                    ? "border border-[rgba(217,195,127,0.28)] bg-[rgba(14,24,38,0.92)] text-right"
                    : "mr-auto border border-[rgba(134,201,255,0.2)] bg-[rgba(8,16,27,0.88)]"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose-shell">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </li>
          ))
        )}
      </ol>

      <div className="composer-panel shrink-0 border-t border-border px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <div className="mx-auto flex w-full max-w-6xl gap-3 items-end">
          {/* Model settings icon — ghostly opacity treatment */}
          <button
            type="button"
            className="shrink-0 rounded-lg p-2 opacity-50 transition-opacity hover:opacity-100"
            aria-label="Model settings"
          >
            <svg className="h-5 w-5 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path
                fillRule="evenodd"
                d="M12 3a9 9 0 110 18 9 9 0 010-18zm0-2C6.477 1 2 5.477 2 12s4.477 11 10 11 10-4.477 10-10S17.523 1 12 1z"
              />
            </svg>
          </button>

          {/* Textarea wrapper — relative container for the floating send button */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              className="composer-field font-body w-full resize-none rounded-[1.6rem] border border-transparent px-4 py-3 pb-10 text-base leading-loose text-text outline-none"
              placeholder="Ask your AI for the next clue, draft, or revision pass"
              rows={1}
              value={value}
              onChange={handleChange}
              aria-label="Message input"
            />

            {/* Floating send icon — absolute bottom-right inside the textarea */}
            <button
              type="button"
              className="absolute bottom-2 right-2 rounded-full p-2 opacity-50 transition-opacity hover:opacity-100"
              aria-label="Send message"
              onClick={() => {
                const trimmed = value.trim();
                if (!trimmed) return;
                setMessages((prev) => [
                  ...prev,
                  { role: "user", content: trimmed, id: crypto.randomUUID() },
                ]);
                setValue("");
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                }
              }}
            >
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19V5m0 0l-7 7m7-7l7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
