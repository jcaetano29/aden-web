import { randomUUID } from 'node:crypto';
import {
  CHAT_MAX_LENGTH, CHAT_INTERVAL_MS, CHAT_GLOBAL_INTERVAL_MS, normalizeChatText,
  type ChatMessage, type ChatErrorEvent,
} from '@aden/shared';

interface ChatPlayer {
  name: string;
  mapId: string;
  loaded: boolean;
}

type ChatResult = { message: ChatMessage } | { error: ChatErrorEvent };

/** Validates intent; identity and cooldowns are owned by the server. */
export class ChatSystem {
  private readonly limits = new Map<string, { nextAt: number; globalAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  submit(senderId: string, player: ChatPlayer | undefined, payload: unknown): ChatResult {
    if (!player?.loaded) return { error: { code: 'not_ready', text: 'Esperá a que termine de cargar tu personaje.' } };
    const data = payload as { channel?: unknown; text?: unknown } | null;
    if (!data || (data.channel !== 'local' && data.channel !== 'global') ||
        typeof data.text !== 'string' || data.text.length > CHAT_MAX_LENGTH) {
      return { error: { code: 'invalid_message', text: `Elegí Cerca o Global y escribí hasta ${CHAT_MAX_LENGTH} caracteres.` } };
    }
    const text = normalizeChatText(data.text);
    if (text.length > CHAT_MAX_LENGTH) return { error: { code: 'invalid_message', text: `Máximo ${CHAT_MAX_LENGTH} caracteres por mensaje.` } };
    if (!text) return { error: { code: 'invalid_message', text: 'Escribí un mensaje antes de enviar.' } };
    const timestamp = this.now();
    const previous = this.limits.get(senderId);
    const nextAt = Math.max(previous?.nextAt ?? 0, data.channel === 'global' ? previous?.globalAt ?? 0 : 0);
    if (timestamp < nextAt) {
      const retryAfterMs = nextAt - timestamp;
      return { error: { code: 'rate_limited', text: `Esperá ${Math.ceil(retryAfterMs / 1000)} s para enviar otro mensaje.`, retryAfterMs } };
    }
    this.limits.set(senderId, {
      nextAt: timestamp + CHAT_INTERVAL_MS,
      globalAt: data.channel === 'global' ? timestamp + CHAT_GLOBAL_INTERVAL_MS : previous?.globalAt ?? 0,
    });
    return { message: { id: randomUUID(), channel: data.channel, text, senderId, senderName: player.name, mapId: player.mapId, timestamp } };
  }

  remove(senderId: string): void { this.limits.delete(senderId); }
}
