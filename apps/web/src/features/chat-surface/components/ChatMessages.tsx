import ReactMarkdown from "react-markdown";
import type { CSSProperties } from "react";

import type { ChatMessage } from "../types/ChatMessage";

type ChatMessagesProps = {
  messages: ChatMessage[];
  onQuickAction: (action: string) => void;
};

const quickActions = ["Brainstorm", "Draft", "Edit", "Research"];

export function ChatMessages({ messages, onQuickAction }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <li className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
        <section className="shell-panel relative w-full overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="text-center lg:text-left">
              <div className="hero-badge inline-flex rounded-full px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.34em] text-[rgba(237,245,255,0.82)]">
                Writing companion online
              </div>
              <h1 className="font-display mt-6 text-4xl leading-none text-text sm:text-5xl lg:text-6xl">
                What realm are you writing toward tonight?
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-muted lg:mx-0 lg:text-lg">
                Shape a scene, test a voice, or gather your notes without leaving the hush of
                the stack. The shell stays lightweight; the atmosphere finally matches the
                work.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="quick-chip tactile-press transition-spring rounded-full px-5 py-2.5 text-sm tracking-[0.16em] text-text"
                    onClick={() => onQuickAction(action)}
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
                    Start with a premise, a scene beat, or a hard question you need the draft
                    to answer.
                  </div>
                </div>
                <div>
                  <div className="font-display text-lg text-text">Keep the lore near</div>
                  <div className="mt-1 text-sm leading-6 text-text-muted">
                    Use the shell to move between ideation, codex context, and review without
                    changing workflows.
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
    );
  }

  return (
    <>
      {messages.map((message, index) => (
        <li
          key={message.id}
          style={{ "--stagger": index } as CSSProperties}
          className={`stagger-fade-up mx-auto flex w-full max-w-6xl ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-[1.5rem] px-5 py-4 text-base text-text ${
              message.role === "user"
                ? "border border-white/10 bg-white/[0.08] text-right backdrop-blur-md"
                : "mr-auto border border-white/8 bg-white/[0.05] backdrop-blur-md"
            }`}
          >
            {message.role === "user" ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose-shell">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>
        </li>
      ))}
    </>
  );
}
