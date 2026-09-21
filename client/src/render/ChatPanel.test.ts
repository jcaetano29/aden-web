// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatPanel } from './ChatPanel.js';
import { SkillInput } from '../input/SkillInput.js';
import type { ChatMessage } from '@aden/shared';

const COMPACT_QUERY = '(max-width: 900px), (max-height: 500px)';
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
const originalResizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
const panels: ChatPanel[] = [];
afterEach(() => {
  panels.splice(0).forEach(panel => panel.dispose());
  document.body.innerHTML = '';
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
  else Reflect.deleteProperty(window, 'matchMedia');
  if (originalResizeObserver) Object.defineProperty(globalThis, 'ResizeObserver', originalResizeObserver);
  else Reflect.deleteProperty(globalThis, 'ResizeObserver');
});
function installCompactMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const media = {
    media: COMPACT_QUERY,
    get matches() { return matches; },
    onchange: null,
    addEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') listeners.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') listeners.delete(listener);
    }),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(() => true),
  } as unknown as MediaQueryList;
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => {
    expect(query).toBe(COMPACT_QUERY); return media;
  }) });
  return {
    media,
    emit(next: boolean) {
      matches = next;
      const event = { matches, media: COMPACT_QUERY } as MediaQueryListEvent;
      listeners.forEach(listener => listener(event));
    },
  };
}
function setup() {
  const send = vi.fn(() => true);
  const panel = new ChatPanel(send);
  panels.push(panel); panel.mount(); panel.setConnected(true, 'self');
  const input = panel.el.querySelector<HTMLInputElement>('[data-chat-input]')!;
  return { panel, input, send };
}
const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'one', channel: 'local', text: 'Hola', senderId: 'other', senderName: 'Beto', mapId: 'pueblo', timestamp: 10000, ...overrides,
});
function key(target: EventTarget, key: string, extra = {}) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
}

describe('ChatPanel', () => {
  it('focuses with Enter, sends with Enter and displays only authoritative echoes', () => {
    const { panel, input, send } = setup();
    key(document.body, 'Enter'); expect(document.activeElement).toBe(input);
    input.value = ' Hola ';
    key(input, 'Enter');
    expect(send).toHaveBeenCalledWith({ channel: 'local', text: 'Hola' });
    expect(panel.el.querySelectorAll('[data-chat-message]')).toHaveLength(0);
    expect(input.value).toBe(' Hola '); // Preserve until server accepts.
    panel.receive(message({ senderId: 'self', text: 'Hola' }));
    expect(input.value).toBe('');
    expect(panel.el.querySelectorAll('[data-chat-message]')).toHaveLength(1);
    expect(document.activeElement).not.toBe(input);
  });

  it('does not fire skills or other gameplay hotkeys while typing or canceling', () => {
    const { panel, input } = setup();
    const skills: string[] = [];
    const skillInput = new SkillInput(id => skills.push(id)); skillInput.setSkills(['fireball']); skillInput.attach(document.body);
    const hotkeys = vi.fn(); document.body.addEventListener('keydown', hotkeys);
    try {
      key(document.body, 'Enter'); hotkeys.mockClear();
      input.value = 'grupo 1';
      for (const value of ['1', ' ', 'g', 'i', 'q', 'Escape']) key(input, value);
      expect(skills).toEqual([]); expect(hotkeys).not.toHaveBeenCalled();
      expect(input.value).toBe('grupo 1'); expect(document.activeElement).not.toBe(input);
      const select = panel.el.querySelector<HTMLSelectElement>('select')!;
      select.focus(); key(select, ' '); expect(skills).toEqual([]);
    } finally { document.body.removeEventListener('keydown', hotkeys); }
  });

  it('preserves drafts on rejection and disconnect, and blocks unavailable sends', () => {
    const { panel, input, send } = setup();
    input.focus(); input.value = '/g Busco grupo'; key(input, 'Enter');
    panel.showError({ code: 'rate_limited', text: 'Esperá 3 s.' });
    expect(input.value).toBe('/g Busco grupo');
    expect(panel.el.textContent).toContain('Esperá 3 s.');
    panel.setConnected(false);
    expect(input.disabled).toBe(true);
    key(document.body, 'Enter');
    expect(send).toHaveBeenCalledTimes(1);
    expect(panel.el.textContent).toContain('Desconectado');
    panel.setConnected(true, 'self');
    expect(input.value).toBe('/g Busco grupo');
  });

  it('supports channel selection and commands, rejecting empty or unknown commands', () => {
    const { panel, input, send } = setup();
    const select = panel.el.querySelector<HTMLSelectElement>('select')!;
    select.value = 'global'; select.dispatchEvent(new Event('change'));
    input.value = '/s Hola vecinos'; key(input, 'Enter');
    expect(send).toHaveBeenLastCalledWith({ channel: 'local', text: 'Hola vecinos' });
    panel.receive(message({ senderId: 'self', text: 'Hola vecinos' }));
    input.value = '/g ¡Hola, server!'; key(input, 'Enter');
    expect(send).toHaveBeenLastCalledWith({ channel: 'global', text: '¡Hola, server!' });
    panel.receive(message({ id: 'two', senderId: 'self', channel: 'global', text: '¡Hola, server!' }));
    for (const invalid of ['/ban alguien', '/g', '   ', 'a'.repeat(241), '\u0344'.repeat(240)]) { input.value = invalid; key(input, 'Enter'); }
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('renders names and messages as text, filters received messages and bounds history', () => {
    const { panel } = setup();
    panel.receive(message({ senderName: '<img src=x>', text: '<script>alert(1)</script>' }));
    expect(panel.el.querySelector('img, script')).toBeNull();
    expect(panel.el.textContent).toContain('<script>alert(1)</script>');
    panel.receive(message({ id: 'global', channel: 'global', text: 'Global visible' }));
    panel.el.querySelector<HTMLButtonElement>('[data-chat-filter=global]')!.click();
    expect(panel.el.querySelector('[role=log]')!.textContent).toContain('Global visible');
    expect(panel.el.querySelector('[role=log]')!.textContent).not.toContain('alert');
    panel.el.querySelector<HTMLButtonElement>('[data-chat-filter=all]')!.click();
    for (let i = 0; i < 101; i++) panel.receive(message({ id: String(i), text: `mensaje ${i}` }));
    expect(panel.el.querySelectorAll('[data-chat-message]')).toHaveLength(100);
    expect(panel.el.querySelector('[data-chat-message]')!.textContent).toContain('mensaje 1');
  });

  it('keeps the reader scroll position and reports new messages while minimized', () => {
    const { panel } = setup();
    const log = panel.el.querySelector<HTMLElement>('[role=log]')!;
    Object.defineProperties(log, { scrollHeight: { value: 1000 }, clientHeight: { value: 120 } });
    log.scrollTop = 240;
    panel.receive(message()); expect(log.scrollTop).toBe(240);
    panel.el.querySelector<HTMLButtonElement>('[data-chat-toggle]')!.click();
    panel.receive(message({ id: 'two' }));
    expect(panel.el.querySelector('[data-chat-toggle]')!.textContent).toContain('1');
    key(document.body, 'Enter');
    expect(panel.el.querySelector('[data-chat-toggle]')!.getAttribute('aria-expanded')).toBe('true');
  });

  it('does not steal Enter from another form, modifiers or text composition', () => {
    const { input, send } = setup();
    const other = document.createElement('input'); document.body.append(other); other.focus();
    key(other, 'Enter'); expect(document.activeElement).toBe(other);
    other.blur(); key(document.body, 'Enter', { ctrlKey: true }); expect(document.activeElement).not.toBe(input);
    input.focus(); input.value = 'hola'; key(input, 'Enter', { isComposing: true });
    expect(send).not.toHaveBeenCalled();
  });

  it('starts minimized in compact view and keeps the expansion chosen with Enter', () => {
    const viewport = installCompactMedia(true);
    const { panel, input } = setup();
    const toggle = panel.el.querySelector<HTMLButtonElement>('[data-chat-toggle]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    key(document.body, 'Enter');
    expect(document.activeElement).toBe(input);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    input.value = 'Busco grupo';

    viewport.emit(false);
    viewport.emit(true);
    expect(input.value).toBe('Busco grupo');
    expect(document.activeElement).toBe(input);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps explicit toggle and filter choices while the viewport changes', () => {
    const viewport = installCompactMedia(true);
    const { panel } = setup();
    const toggle = panel.el.querySelector<HTMLButtonElement>('[data-chat-toggle]')!;
    panel.el.querySelector<HTMLButtonElement>('[data-chat-filter=global]')!.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    viewport.emit(false);
    viewport.emit(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    viewport.emit(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('reacts automatically only before a draft or explicit expansion choice', () => {
    const viewport = installCompactMedia(false);
    const { panel, input } = setup();
    const toggle = panel.el.querySelector<HTMLButtonElement>('[data-chat-toggle]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    viewport.emit(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    input.value = 'No cierres esto';
    viewport.emit(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(input.value).toBe('No cierres esto');
  });

  it('cleans up viewport and HUD observers on dispose', () => {
    const viewport = installCompactMedia(true);
    const disconnect = vi.fn();
    const observe = vi.fn();
    class TestResizeObserver {
      constructor(_callback: ResizeObserverCallback) {}
      observe = observe; unobserve = vi.fn(); disconnect = disconnect;
    }
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: TestResizeObserver });
    const hud = document.createElement('div'); hud.dataset.playerHud = ''; document.body.append(hud);
    const { panel } = setup();
    panel.dispose();
    expect(viewport.media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(observe).toHaveBeenCalledWith(hud);
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
