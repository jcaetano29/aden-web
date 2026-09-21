import { describe, expect, it } from 'vitest';
import { ChatSystem } from './ChatSystem.js';

describe('ChatSystem authority and cooldowns', () => {
  const player = { name: 'Ana', mapId: 'pueblo', x: 0, z: 0, loaded: true };
  const global = { channel: 'global', text: 'Hola' };
  const local = { channel: 'local', text: 'Hola' };

  it('enforces both cooldowns at their boundary and releases disconnected sessions', () => {
    let now = 10000;
    const chat = new ChatSystem(() => now);
    expect(chat.submit('a', player, global)).toHaveProperty('message');
    now += 999;
    expect(chat.submit('a', player, local)).toHaveProperty('error.code', 'rate_limited');
    now += 1;
    expect(chat.submit('a', player, local)).toHaveProperty('message');
    now += 1999;
    expect(chat.submit('a', player, global)).toHaveProperty('error.code', 'rate_limited');
    now += 1;
    expect(chat.submit('a', player, global)).toHaveProperty('message');
    chat.remove('a');
    expect(chat.submit('a', player, local)).toHaveProperty('message');
  });

  it('does not authorize missing or loading characters or trust supplied identity', () => {
    const chat = new ChatSystem(() => 10000);
    expect(chat.submit('a', undefined, global)).toHaveProperty('error');
    expect(chat.submit('a', { ...player, loaded: false }, global)).toHaveProperty('error');
    const result = chat.submit('a', player, { ...global, senderName: 'Admin', senderId: 'b', timestamp: 0 });
    expect(result).toHaveProperty('message.senderName', 'Ana');
    expect(result).toHaveProperty('message.senderId', 'a');
    expect(result).toHaveProperty('message.timestamp', 10000);
  });

  it('applies the length limit after Unicode normalization without consuming cooldown', () => {
    const chat = new ChatSystem(() => 10000);
    // Each U+0344 expands to two combining marks under NFC.
    expect(chat.submit('a', player, { ...local, text: '\u0344'.repeat(240) })).toHaveProperty('error.code', 'invalid_message');
    expect(chat.submit('a', player, local)).toHaveProperty('message');
  });
});
