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
        <form class="character-form">
          <div class="character-class-picker"><h2>Elegí tu clase</h2><div class="character-classes" role="group" aria-label="Clase"></div></div>
          <div class="character-credentials">
            <label>Nombre del personaje<input type="text" maxlength="16" autocomplete="username" placeholder="Tu nombre en Aden" required></label>
            <label>Contraseña<input type="password" minlength="4" maxlength="40" autocomplete="current-password" placeholder="Al menos 4 caracteres" required></label>
          </div>
          <div class="character-error" role="alert"></div>
          <button type="submit" class="character-enter">Entrar a Aden</button>
        </form>
      </div>`;
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
    this.nameInput.addEventListener('input', () => this.refreshButton());
    this.passwordInput.addEventListener('input', () => this.refreshButton());
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
    this.errorDiv.textContent = ''; this.refreshButton();
  }

  private refreshAppearance() {
    for (const [id, button] of this.cards) {
      button.setAttribute('aria-pressed', String(id === this.selected));
      button.querySelector('strong')!.textContent = this.gender === 'female' ? feminineClassName(id, CLASSES[id].name) : CLASSES[id].name;
    }
    this.caption.textContent = this.cards.get(this.selected)!.querySelector('strong')!.textContent;
    this.preview?.show(this.selected, this.gender);
  }

  private refreshButton() {
    this.enterBtn.textContent = this.mode === 'login' ? 'Entrar a Aden' : 'Crear personaje';
    this.enterBtn.disabled = !this.nameInput.value.trim() || this.passwordInput.value.length < 4;
  }

  private confirm() {
    if (!this.resolver) return;
    const name = this.nameInput.value.trim(), password = this.passwordInput.value;
    if (!name || password.length < 4) return;
    this.resolver({ name, password, mode: this.mode, className: this.mode === 'create' ? this.selected : '', gender: this.gender });
    this.root.hidden = true; this.preview?.setVisible(false); this.resolver = null;
  }

  async create(errorMsg = ''): Promise<LoginResult> {
    return new Promise(resolve => {
      this.resolver = resolve; this.errorDiv.textContent = errorMsg; this.passwordInput.value = '';
      this.root.hidden = false; this.preview?.setVisible(this.mode === 'create'); this.refreshButton();
      clearTimeout(this.focusTimer);
      this.focusTimer = setTimeout(() => (this.nameInput.value ? this.passwordInput : this.nameInput).focus(), 50);
    });
  }

  remove() { clearTimeout(this.focusTimer); this.preview?.dispose(); this.root.remove(); }
}
