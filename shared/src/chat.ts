export const CHAT_LOCAL_RANGE = 25;
export const CHAT_MAX_LENGTH = 240;
export const CHAT_HISTORY_LIMIT = 100;
export const CHAT_INTERVAL_MS = 1000;
export const CHAT_GLOBAL_INTERVAL_MS = 3000;

export type ChatChannel = 'local' | 'global';

export interface ChatSendMessage {
  channel: ChatChannel;
  text: string;
}

export interface ChatMessage extends ChatSendMessage {
  id: string;
  senderId: string;
  senderName: string;
  mapId: string;
  timestamp: number;
}

export interface ChatErrorEvent {
  code: 'invalid_message' | 'not_ready' | 'rate_limited' | 'unavailable';
  text: string;
  retryAfterMs?: number;
}

/** Single-line text; strip invisible direction/control characters, preserve emoji joiners. */
export function normalizeChatText(text: string): string {
  return text.normalize('NFC')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ').trim();
}
