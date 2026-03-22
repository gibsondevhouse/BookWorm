import type { Attachment } from "./Attachment";
import type { ChatMode } from "./ChatMode";
import type { Connector } from "./Connector";

export interface ComposerProps {
  onSubmit: (payload: {
    text: string;
    attachments: Attachment[];
    connectors: Connector[];
    mode: ChatMode;
    transcript: string;
  }) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  allowedFileTypes?: string[];
  maxFileSizeBytes?: number;
  maxFiles?: number;
  initialConnectors?: Connector[];
  initialModes?: ChatMode[];
  quickActionSeed?: string;
  onQuickActionSeedApplied?: () => void;
}
