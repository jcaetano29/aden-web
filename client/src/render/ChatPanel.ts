import {
  CHAT_HISTORY_LIMIT, CHAT_LOCAL_RANGE, CHAT_MAX_LENGTH, normalizeChatText,
  type ChatChannel, type ChatSendMessage, type ChatMessage, type ChatErrorEvent,
} from '@aden/shared';
import './ChatPanel.css';

type ChatFilter = ChatChannel | 'all';
const labels = { local: 'Cerca', global: 'Global', all: 'Todos' };

export class ChatPanel {
  readonly el = document.createElement('section');
  private readonly log = document.createElement('div');
  private readonly input = document.createElement('input');
  private readonly channel = document.createElement('select');
  private readonly send = document.createElement('button');
  private readonly toggle = document.createElement('button');
  private readonly content = document.createElement('div');
  private readonly status = document.createElement('div');
  private readonly counter = document.createElement('span');
  private readonly filters = new Map<ChatFilter, HTMLButtonElement>();
  private readonly messages: ChatMessage[] = [];
  private filter: ChatFilter = 'all';
  private connected = false;
  private selfId = '';
  private unread = 0;
  private pending: { draft: string; message: ChatSendMessage } | null = null;
  private pendingTimer?: ReturnType<typeof setTimeout>;
  private hudObserver?: ResizeObserver;

  private readonly openFromKeyboard = (event: KeyboardEvent) => {
    if (event.target instanceof Node && this.el.contains(event.target)) return;
    if (!this.connected || event.defaultPrevented || event.key !== 'Enter' || event.repeat ||
        event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    const active = document.activeElement;
    if (active instanceof Element && active.closest('input,textarea,select,button,a,[contenteditable], [role="dialog"]')) return;
    event.preventDefault(); event.stopPropagation();
    this.setExpanded(true); this.input.focus();
  };

  constructor(private readonly onSend: (message: ChatSendMessage) => boolean) {
    this.el.className = 'aden-chat'; this.el.dataset.chatPanel = '';
    this.el.setAttribute('aria-label', 'Chat del servidor');
    const header = document.createElement('header'); header.className = 'aden-chat-header';
    const title = document.createElement('strong'); title.textContent = 'Chat';
    const filters = document.createElement('div'); filters.className = 'aden-chat-filters';
    filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', 'Filtrar mensajes');
    for (const filter of ['all', 'local', 'global'] as const) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = labels[filter]; button.dataset.chatFilter = filter;
      button.setAttribute('aria-pressed', String(filter === this.filter));
      button.addEventListener('click', () => {
        this.filter = filter;
        this.filters.forEach((el, key) => el.setAttribute('aria-pressed', String(key === filter)));
        this.renderHistory(); this.setExpanded(true);
      });
      this.filters.set(filter, button); filters.append(button);
    }
    this.toggle.type = 'button'; this.toggle.dataset.chatToggle = '';
    this.toggle.setAttribute('aria-controls', 'aden-chat-content');
    this.toggle.addEventListener('click', () => this.setExpanded(this.content.hidden));
    header.append(title, filters, this.toggle);
    this.content.id = 'aden-chat-content';
    this.log.className = 'aden-chat-log'; this.log.setAttribute('role', 'log');
    this.log.setAttribute('aria-label', 'Mensajes de chat'); this.log.setAttribute('aria-live', 'polite');
    this.log.setAttribute('aria-relevant', 'additions'); this.log.tabIndex = 0;
    const form = document.createElement('form'); form.className = 'aden-chat-compose';
    form.addEventListener('submit', event => { event.preventDefault(); this.submit(); });
    this.channel.setAttribute('aria-label', 'Canal de envío');
    for (const channel of ['local', 'global'] as const) {
      const option = document.createElement('option'); option.value = channel; option.textContent = labels[channel];
      this.channel.append(option);
    }
    this.channel.addEventListener('change', () => {
      if (!this.pending) this.status.textContent = this.channel.value === 'local'
        ? `Mismo mapa · hasta ${CHAT_LOCAL_RANGE} unidades` : 'Todos los jugadores del servidor';
    });
    this.input.type = 'text'; this.input.dataset.chatInput = ''; this.input.autocomplete = 'off';
    this.input.maxLength = CHAT_MAX_LENGTH + 8; // Allow a command prefix in addition to message text.
    this.input.setAttribute('aria-label', 'Mensaje de chat');
    this.input.placeholder = 'Enter para hablar…';
    this.input.addEventListener('input', () => this.updateCounter());
    this.send.type = 'submit'; this.send.textContent = 'Enviar'; this.send.setAttribute('aria-label', 'Enviar mensaje');
    form.append(this.channel, this.input, this.send);
    this.status.className = 'aden-chat-status'; this.status.setAttribute('role', 'status');
    const footer = document.createElement('footer'); footer.className = 'aden-chat-footer';
    const help = document.createElement('span'); help.textContent = '/g Global · /s Cerca · Esc salir';
    footer.append(help, this.counter);
    this.content.append(this.log, form, this.status, footer); this.el.append(header, this.content);
    // Stop before the body's combat/movement listeners, including select and button keystrokes.
    this.el.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      } else if (event.target === this.input && event.key === 'Enter') {
        event.preventDefault();
        if (!event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) this.submit();
      }
    });
    for (const type of ['click', 'pointerdown', 'pointermove', 'wheel']) {
      this.el.addEventListener(type, event => event.stopPropagation());
    }
    this.setExpanded(true); this.setConnected(false); this.updateCounter(); this.renderHistory();
  }

  mount(parent: HTMLElement = document.body): void {
    parent.append(this.el);
    document.addEventListener('keydown', this.openFromKeyboard, true);
    const hud = document.querySelector<HTMLElement>('[data-player-hud]');
    if (hud && typeof ResizeObserver !== 'undefined') {
      const position = () => { this.el.style.bottom = `${hud.offsetHeight + 26}px`; };
      this.hudObserver = new ResizeObserver(position); this.hudObserver.observe(hud); position();
    }
  }

  setConnected(connected: boolean, selfId = this.selfId): void {
    this.connected = connected; this.selfId = selfId;
    this.input.disabled = !connected; this.channel.disabled = !connected;
    if (!connected) this.clearPending();
    this.send.disabled = !connected || this.pending !== null;
    this.status.dataset.error = String(!connected);
    this.status.textContent = connected ? `Cerca: mismo mapa · hasta ${CHAT_LOCAL_RANGE} unidades` : 'Desconectado · Volvé a entrar para conversar.';
  }

  receive(message: ChatMessage): void {
    if (this.messages.some(previous => previous.id === message.id)) return;
    if (message.senderId === this.selfId && this.pending &&
        message.channel === this.pending.message.channel && message.text === this.pending.message.text) {
      if (this.input.value === this.pending.draft) this.input.value = '';
      this.clearPending(); this.updateCounter(); this.status.textContent = '';
    }
    const follow = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 32;
    const scrollTop = this.log.scrollTop;
    this.messages.push(message);
    const removed = this.messages.length > CHAT_HISTORY_LIMIT ? this.messages.shift() : undefined;
    let removedHeight = 0;
    if (removed) {
      const row = Array.from(this.log.children).find(child => (child as HTMLElement).dataset.chatMessage === removed.id) as HTMLElement | undefined;
      if (row) { removedHeight = row.offsetHeight; row.remove(); }
    }
    if (this.filter === 'all' || this.filter === message.channel) {
      this.log.querySelector('[data-chat-empty]')?.remove();
      this.log.append(this.messageRow(message));
    }
    this.ensureEmpty();
    this.log.scrollTop = follow ? this.log.scrollHeight : Math.max(0, scrollTop - removedHeight);
    if (this.content.hidden) { this.unread++; this.updateToggle(); }
  }

  showError(error: ChatErrorEvent): void {
    this.clearPending(); this.status.dataset.error = 'true'; this.status.textContent = error.text;
  }

  private submit(): void {
    if (!this.connected || this.pending) return;
    const draft = this.input.value;
    let text = draft.trim();
    let channel = this.channel.value as ChatChannel;
    if (text.startsWith('/')) {
      const match = /^\/(g|global|s|local|cerca)(?:\s+|$)/i.exec(text);
      if (!match) { this.showError({ code: 'invalid_message', text: 'Usá /g para Global o /s para Cerca.' }); return; }
      channel = ['g', 'global'].includes(match[1].toLowerCase()) ? 'global' : 'local';
      text = text.slice(match[0].length);
    }
    if (text.length > CHAT_MAX_LENGTH) { this.showError({ code: 'invalid_message', text: `Máximo ${CHAT_MAX_LENGTH} caracteres por mensaje.` }); return; }
    text = normalizeChatText(text);
    if (text.length > CHAT_MAX_LENGTH) { this.showError({ code: 'invalid_message', text: `Máximo ${CHAT_MAX_LENGTH} caracteres por mensaje.` }); return; }
    if (!text) return;
    this.pending = { draft, message: { channel, text } };
    this.send.disabled = true;
    this.status.dataset.error = 'false'; this.status.textContent = `Enviando a ${labels[channel]}…`;
    if (!this.onSend({ channel, text })) { this.setConnected(false); return; }
    this.input.blur();
    this.pendingTimer = setTimeout(() => this.showError({ code: 'unavailable', text: 'No llegó la confirmación del servidor. Tu borrador sigue disponible.' }), 10000);
  }

  private clearPending(): void {
    clearTimeout(this.pendingTimer); this.pendingTimer = undefined; this.pending = null;
    this.send.disabled = !this.connected;
  }

  private updateCounter(): void {
    const text = this.input.value.replace(/^\/(g|global|s|local|cerca)(?:\s+|$)/i, '');
    this.counter.textContent = `${text.length}/${CHAT_MAX_LENGTH}`;
  }

  private messageRow(message: ChatMessage): HTMLElement {
    const row = document.createElement('div'); row.className = 'aden-chat-message';
    row.dataset.chatMessage = message.id; row.dataset.channel = message.channel;
    const time = document.createElement('time'); time.dateTime = new Date(message.timestamp).toISOString();
    time.textContent = new Date(message.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const channel = document.createElement('span'); channel.className = 'aden-chat-channel'; channel.textContent = `[${labels[message.channel]}]`;
    const name = document.createElement('strong'); name.textContent = `${message.senderName}: `;
    const text = document.createElement('span'); text.textContent = message.text;
    row.append(time, ' ', channel, ' ', name, text); return row;
  }

  private renderHistory(): void {
    this.log.replaceChildren(...this.messages.filter(message => this.filter === 'all' || message.channel === this.filter).map(message => this.messageRow(message)));
    this.ensureEmpty(); this.log.scrollTop = this.log.scrollHeight;
  }

  private ensureEmpty(): void {
    if (this.log.childElementCount) return;
    const empty = document.createElement('p'); empty.dataset.chatEmpty = ''; empty.className = 'aden-chat-empty';
    empty.textContent = 'Saludá a los aventureros. Elegí Cerca o Global para empezar a conversar.'; this.log.append(empty);
  }

  private setExpanded(expanded: boolean): void {
    this.content.hidden = !expanded;
    if (expanded) this.unread = 0;
    this.updateToggle();
  }

  private updateToggle(): void {
    this.toggle.textContent = this.content.hidden ? `Abrir${this.unread ? ` (${this.unread})` : ''}` : '−';
    this.toggle.setAttribute('aria-label', this.content.hidden ? `Abrir chat${this.unread ? `, ${this.unread} mensajes nuevos` : ''}` : 'Minimizar chat');
    this.toggle.setAttribute('aria-expanded', String(!this.content.hidden));
  }

  dispose(): void {
    this.clearPending(); this.hudObserver?.disconnect();
    document.removeEventListener('keydown', this.openFromKeyboard, true); this.el.remove();
  }
}
