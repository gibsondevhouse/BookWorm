"use client";

import { useCallback, useState } from "react";

import { ChatMessages } from "../features/chat-surface/components/ChatMessages";
import { Composer } from "../features/chat-surface/composer/components/Composer";
import type { ComposerProps } from "../features/chat-surface/composer/types/ComposerProps";
import type { ChatMessage } from "../features/chat-surface/types/ChatMessage";

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickActionSeed, setQuickActionSeed] = useState("");

  const handleQuickAction = useCallback((action: string): void => {
    setQuickActionSeed(action);
  }, []);

  const handleComposerSubmit = useCallback(
    (payload: Parameters<ComposerProps["onSubmit"]>[0]): void => {
      const segments: string[] = [];
      if (payload.text) {
        segments.push(payload.text);
      }

      if (payload.attachments.length > 0) {
        const files = payload.attachments.map((file) => file.name).join(", ");
        segments.push(`Attachments: ${files}`);
      }

      if (payload.connectors.length > 0) {
        const connectors = payload.connectors.map((connector) => connector.label).join(", ");
        segments.push(`Connectors: ${connectors}`);
      }

      segments.push(`Mode: ${payload.mode.label}`);

      const content = segments.join("\n\n");
      if (!content) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", content, id: crypto.randomUUID() },
      ]);
    },
    [],
  );

  return (
    <div className="relative flex h-full w-full flex-col bg-paper text-text">
      <ol
        className="m-0 flex flex-1 list-none flex-col gap-4 overflow-y-auto px-4 py-5 pb-52 sm:px-6 sm:pb-56 lg:px-10 lg:py-8 lg:pb-60"
        aria-label="Chat messages"
      >
        <ChatMessages messages={messages} onQuickAction={handleQuickAction} />
      </ol>

      <Composer
        onSubmit={handleComposerSubmit}
        quickActionSeed={quickActionSeed}
        onQuickActionSeedApplied={() => setQuickActionSeed("")}
      />
    </div>
  );
}
