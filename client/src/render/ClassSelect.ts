import { CLASSES, CLASS_ORDER, feminineClassName, type CharacterGender } from '@aden/shared';
import type { CharacterFactory } from './CharacterFactory.js';
import { HeroPreview } from './HeroPreview.js';
import './ClassSelect.css';

const ROLES: Record<string, string> = {
  knight: 'Escudo de la vanguardia. Mucha vida y defensa.',
  mage: 'Fuego y escarcha. Daño mágico y control.',
  barbarian: 'Fuerza implacable. Combate cuerpo a cuerpo.',
  rogue: 'Acero entre las sombras. Velocidad y precisión.',
  ranger: 'Ataque a distancia. Dominio del terreno.',
};
const GLYPHS: Record<string, string> = { knight: '♜', mage: '✧', barbarian: '⚔', rogue: '◆', ranger: '➶' };
export type LoginMode = 'login' | 'create';
export interface LoginResult { name: string; className: string; password: string; mode: LoginMode; gender: CharacterGender }

export class ClassSelect {
  private readonly root = document.createElement('div');
  private resolver: ((v: LoginResult) => void) | null = null;
  private selected = 'knight';
  private gender: CharacterGender = 'male';
  private mode: LoginMode = 'login';
  private readonly nameInput: HTMLInputElement;
  private readonly passwordInput: HTMLInputElement;
  private readonly errorDiv: HTMLDivElement;
  private readonly enterBtn: HTMLButtonElement;
  private readonly creation: HTMLElement;
  private readonly caption: HTMLElement;
  private readonly cards = new Map<string, HTMLButtonElement>();
  private readonly preview?: HeroPreview;
  private focusTimer?: ReturnType<typeof setTimeout>;
  private validationVisible = false;
  private readonly refreshFromField = () => this.refreshValidation();
  private readonly refreshFromWindow = () => {
    if (!this.root.hidden) this.refreshValidation();
  };

  constructor(parent: HTMLElement = document.body, factory?: CharacterFactory) {
    this.root.className = 'character-select aden-scroll';
    this.root.hidden = true;
    this.root.innerHTML = `
      <header class="character-brand"><h1>ADEN</h1><p>El asedio de Aden</p></header>
      <div class="character-tabs" role="tablist" aria-label="Acceso">
        <button type="button" role="tab" data-mode="login">Entrar</button>
        <button type="button" role="tab" data-mode="create">Crear personaje</button>
      </div>
      <div class="character-layout">
        <section class="character-creation" aria-label="Diseño del personaje">
          <div class="character-stage"><div class="character-canvas"></div>
            <div class="character-caption" aria-live="polite"></div>
            <div class="character-rotate"><button type="button" aria-label="Girar a la izquierda">↶</button><span>Girá tu personaje</span><button type="button" aria-label="Girar a la derecha">↷</button></div>
          </div>
          <fieldset class="character-gender"><legend>Apariencia</legend>
            <label><input type="radio" name="character-gender" value="male" checked> Masculino</label>
            <label><input type="radio" name="character-gender" value="female"> Femenino</label>
          </fieldset>
          <p class="character-hint">Mismas habilidades y atributos en ambas apariencias.</p>
        </section>
        <form class="character-form" novalidate>
          <div class="character-class-picker"><h2>Elegí tu clase</h2><div class="character-classes" role="group" aria-label="Clase"></div></div>
          <div class="character-credentials">
            <label>Nombre del personaje<input type="text" maxlength="16" autocomplete="username" placeholder="Tu nombre en Aden" required></label>
            <label>Contraseña<input type="password" minlength="4" maxlength="40" autocomplete="current-password" placeholder="Al menos 4 caracteres" required></label>
          </div>
          <div class="character-error" role="alert"></div>
          <button type="submit" class="character-enter">Entrar a Aden</button>
        </form>
      </div>
      <section class="character-guide" aria-labelledby="character-guide-title">
        <h2 id="character-guide-title">Cómo jugar</h2>
        <p class="character-guide-intro">Movete con el mouse y usá el teclado para combatir y abrir tus paneles.</p>
        <div class="character-guide-columns">
          <div>
            <h3>Mouse</h3>
            <dl class="character-guide-mouse">
              <div><dt>Clic en el suelo</dt><dd>Caminá hasta ese lugar.</dd></div>
              <div><dt>Clic en un enemigo</dt><dd>Seleccionalo como objetivo. Lo atacás automáticamente cuando está a tu alcance.</dd></div>
              <div><dt>Clic en un personaje del pueblo</dt><dd>Acercate para hablar, aceptar misiones o comprar.</dd></div>
              <div><dt>Clic en un objeto</dt><dd>Recogé botín del suelo o interactuá con cofres, barriles y santuarios al acercarte.</dd></div>
            </dl>
          </div>
          <div>
            <h3>Combate</h3>
            <dl class="character-guide-keys">
              <div><dt><kbd>1</kbd> a <kbd>6</kbd></dt><dd>Usar las habilidades de tu barra.</dd></div>
              <div><dt><kbd>Espacio</kbd></dt><dd>Usar la primera habilidad de tu barra.</dd></div>
              <div><dt><kbd>Q</kbd></dt><dd>Usar una poción de vida si tenés una y te falta salud.</dd></div>
            </dl>
            <p class="character-guide-note">Para las habilidades de ataque, seleccioná un enemigo y acercate. Revisá tu maná y esperá a que la habilidad esté lista otra vez.</p>
          </div>
          <div>
            <h3>Paneles y sonido</h3>
            <dl class="character-guide-keys">
              <div><dt><kbd>I</kbd></dt><dd>Inventario y equipo</dd></div>
              <div><dt><kbd>C</kbd></dt><dd>Atributos del personaje</dd></div>
              <div><dt><kbd>M</kbd></dt><dd>Mapa y viajes</dd></div>
              <div><dt><kbd>P</kbd></dt><dd>Grupo (party)</dd></div>
              <div><dt><kbd>G</kbd></dt><dd>Clan (guild)</dd></div>
              <div><dt><kbd>T</kbd></dt><dd>Progreso, logros y misión diaria</dd></div>
              <div><dt><kbd>L</kbd></dt><dd>Clasificación de jugadores y clanes</dd></div>
              <div><dt><kbd>N</kbd></dt><dd>Silenciar o activar el sonido</dd></div>
              <div><dt><kbd>Enter</kbd></dt><dd>Escribir y enviar en el chat. Cerca habla con vecinos; Global con todo el servidor.</dd></div>
            </dl>
            <p class="character-guide-note">Volvé a pulsar la misma tecla para cerrar un panel. <kbd>Esc</kbd> sale del chat o cierra el grupo. En el chat, usá /g para Global y /s para Cerca.</p>
          </div>
        </div>
        <p class="character-guide-tip"><strong>Tu primera misión:</strong> al entrar, hablá con el Anciano del pueblo para comenzar la aventura.</p>
      </section>`;
    this.creation = this.root.querySelector('.character-creation')!;
    this.caption = this.root.querySelector('.character-caption')!;
    this.nameInput = this.root.querySelector('input[type="text"]')!;
    this.passwordInput = this.root.querySelector('input[type="password"]')!;
    this.errorDiv = this.root.querySelector('.character-error')!;
    this.enterBtn = this.root.querySelector('.character-enter')!;
    for (const id of CLASS_ORDER) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.class = id;
      button.innerHTML = `<span class="character-glyph" aria-hidden="true">${GLYPHS[id]}</span><span><strong></strong><small>${ROLES[id]}</small></span>`;
      button.addEventListener('click', () => { this.selected = id; this.refreshAppearance(); });
      this.cards.set(id, button);
      this.root.querySelector('.character-classes')!.append(button);
    }
    this.root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => {
      button.addEventListener('click', () => this.setMode(button.dataset.mode as LoginMode));
    });
    this.root.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(input => {
      input.addEventListener('change', () => { this.gender = input.value as CharacterGender; this.refreshAppearance(); });
    });
    this.root.querySelector('form')!.addEventListener('submit', event => { event.preventDefault(); this.confirm(); });
    for (const input of [this.nameInput, this.passwordInput]) {
      input.addEventListener('input', this.refreshFromField);
      input.addEventListener('change', this.refreshFromField);
    }
    window.addEventListener('focus', this.refreshFromWindow);
    window.addEventListener('pageshow', this.refreshFromWindow);
    parent.append(this.root);
    if (factory) {
      try { this.preview = new HeroPreview(this.root.querySelector('.character-canvas')!, factory); }
      catch { this.root.querySelector('.character-canvas')!.textContent = 'Vista previa 3D no disponible.'; }
    }
    this.root.querySelectorAll<HTMLButtonElement>('.character-rotate button').forEach((button, i) => {
      button.addEventListener('click', () => this.preview?.rotate(i === 0 ? -Math.PI / 4 : Math.PI / 4));
    });
    this.refreshAppearance(); this.setMode('login');
  }

  private setMode(mode: LoginMode) {
    this.mode = mode;
    this.root.dataset.mode = mode;
    this.creation.hidden = mode !== 'create';
    this.root.querySelector<HTMLElement>('.character-class-picker')!.hidden = mode !== 'create';
    this.root.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-selected', String((button as HTMLElement).dataset.mode === mode)));
    this.passwordInput.autocomplete = mode === 'create' ? 'new-password' : 'current-password';
    this.preview?.setVisible(mode === 'create' && !this.root.hidden);
    this.validationVisible = false;
    this.errorDiv.textContent = ''; this.refreshValidation();
  }

  private refreshAppearance() {
    for (const [id, button] of this.cards) {
      button.setAttribute('aria-pressed', String(id === this.selected));
      button.querySelector('strong')!.textContent = this.gender === 'female' ? feminineClassName(id, CLASSES[id].name) : CLASSES[id].name;
    }
    this.caption.textContent = this.cards.get(this.selected)!.querySelector('strong')!.textContent;
    this.preview?.show(this.selected, this.gender);
  }

  private validationError() {
    const name = this.nameInput.value.trim();
    if (!name) return 'Ingresá el nombre de tu personaje.';
    if (name.length > this.nameInput.maxLength) return `El nombre puede tener hasta ${this.nameInput.maxLength} caracteres.`;
    if (this.passwordInput.value.length < this.passwordInput.minLength) return `La contraseña debe tener al menos ${this.passwordInput.minLength} caracteres.`;
    if (this.passwordInput.value.length > this.passwordInput.maxLength) return `La contraseña puede tener hasta ${this.passwordInput.maxLength} caracteres.`;
    return '';
  }

  private refreshValidation() {
    this.enterBtn.textContent = this.mode === 'login' ? 'Entrar a Aden' : 'Crear personaje';
    this.enterBtn.disabled = false;
    this.enterBtn.removeAttribute('aria-disabled');
    if (!this.validationVisible) {
      this.nameInput.removeAttribute('aria-invalid');
      this.passwordInput.removeAttribute('aria-invalid');
      return;
    }
    const error = this.validationError();
    this.errorDiv.textContent = error;
    const nameLength = this.nameInput.value.trim().length;
    const passwordLength = this.passwordInput.value.length;
    if (nameLength === 0 || nameLength > this.nameInput.maxLength) this.nameInput.setAttribute('aria-invalid', 'true');
    else this.nameInput.removeAttribute('aria-invalid');
    if (passwordLength < this.passwordInput.minLength || passwordLength > this.passwordInput.maxLength) this.passwordInput.setAttribute('aria-invalid', 'true');
    else this.passwordInput.removeAttribute('aria-invalid');
  }

  private confirm() {
    if (!this.resolver) return;
    const name = this.nameInput.value.trim(), password = this.passwordInput.value;
    this.validationVisible = true;
    this.refreshValidation();
    if (this.validationError()) return;
    const resolve = this.resolver;
    this.resolver = null;
    this.root.hidden = true; this.preview?.setVisible(false);
    resolve({ name, password, mode: this.mode, className: this.mode === 'create' ? this.selected : '', gender: this.gender });
  }

  async create(errorMsg = ''): Promise<LoginResult> {
    return new Promise(resolve => {
      this.resolver = resolve; this.validationVisible = false; this.errorDiv.textContent = errorMsg; this.passwordInput.value = '';
      this.root.hidden = false; this.preview?.setVisible(this.mode === 'create'); this.refreshValidation();
      clearTimeout(this.focusTimer);
      this.focusTimer = setTimeout(() => (this.nameInput.value ? this.passwordInput : this.nameInput).focus(), 50);
    });
  }

  remove() {
    clearTimeout(this.focusTimer);
    window.removeEventListener('focus', this.refreshFromWindow);
    window.removeEventListener('pageshow', this.refreshFromWindow);
    this.preview?.dispose();
    this.root.remove();
  }
}
