import {CharacterCustomizer} from './CharacterCustomizer.js';
import { CLASSES, CLASS_ORDER, feminineClassName, defaultAppearance, type CharacterAppearanceV1, type CharacterGender } from '@aden/shared';
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
export interface LoginResult { name: string; className: string; password: string; mode: LoginMode; gender: CharacterGender; appearance?:CharacterAppearanceV1 }

export type CharacterPreview=Pick<HeroPreview,'show'|'rotate'|'zoom'|'focus'|'setVisible'|'dispose'>;
export interface ClassSelectOptions {loadAssets?:()=>Promise<void>;createPreview?:(host:HTMLElement,factory:CharacterFactory)=>CharacterPreview}
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
  private preview?:CharacterPreview;
  private readonly customizer:CharacterCustomizer;
  private readonly assetStatus:HTMLElement;
  private readonly retry:HTMLButtonElement;
  private assetsReady=false;private loading=false;private removed=false;
  private assetsResolved!:()=>void;
  readonly ready=new Promise<void>(resolve=>{this.assetsResolved=resolve;});
  private focusTimer?: ReturnType<typeof setTimeout>;

  constructor(parent: HTMLElement = document.body, private readonly factory?:CharacterFactory, private readonly options:ClassSelectOptions={}) {
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
          <div class="character-camera" aria-label="Encuadre"><button type="button" data-focus="body" aria-pressed="true">Cuerpo</button><button type="button" data-focus="face" aria-pressed="false">Rostro</button><button type="button" data-zoom="-180" aria-label="Acercar">+</button><button type="button" data-zoom="180" aria-label="Alejar">−</button></div><p class="character-hint">Mismas habilidades y atributos en ambas apariencias.</p>
        </section>
        <form class="character-form">
          <div class="character-class-picker"><h2>Elegí tu clase</h2><div class="character-classes" role="group" aria-label="Clase"></div><div class="character-cosmetics"></div></div>
          <div class="character-credentials">
            <label>Nombre del personaje<input type="text" maxlength="16" autocomplete="username" placeholder="Tu nombre en Aden" required></label>
            <label>Contraseña<input type="password" minlength="4" maxlength="40" autocomplete="current-password" placeholder="Al menos 4 caracteres" required></label>
          </div>
          <p class="character-assets" role="status">Cargando personajes…</p><button class="character-retry" type="button" hidden>Reintentar carga</button><div class="character-error" role="alert"></div>
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
              <div><dt><kbd>R</kbd></dt><dd>Trade de oro y objetos con jugadores cercanos</dd></div>
              <div><dt><kbd>G</kbd></dt><dd>Clan (guild)</dd></div>
              <div><dt><kbd>T</kbd></dt><dd>Progreso, logros y misión diaria</dd></div>
              <div><dt><kbd>L</kbd></dt><dd>Clasificación de jugadores y clanes</dd></div>
              <div><dt><kbd>N</kbd></dt><dd>Silenciar o activar el sonido</dd></div>
              <div><dt><kbd>Enter</kbd></dt><dd>Escribir y enviar en el chat. Cerca habla con vecinos; Global con todo el servidor.</dd></div>
            </dl>
            <p class="character-guide-note">Volvé a pulsar la misma tecla para cerrar un panel. <kbd>Esc</kbd> sale del chat o cierra el grupo y el trade. En el inventario podés tirar objetos al suelo. En el chat, usá /g para Global y /s para Cerca.</p>
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
    this.assetStatus=this.root.querySelector('.character-assets')!;this.retry=this.root.querySelector('.character-retry')!;this.retry.addEventListener('click',()=>void this.loadAssets());
    this.customizer=new CharacterCustomizer(this.root.querySelector('.character-cosmetics')!,defaultAppearance('knight','male'),()=>this.refreshAppearance());
    for (const id of CLASS_ORDER) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.class = id;
      button.innerHTML = `<span class="character-glyph" aria-hidden="true">${GLYPHS[id]}</span><span><strong></strong><small>${ROLES[id]}</small></span>`;
      button.addEventListener('click', () => { this.selected = id; this.customizer.setClass(id);this.refreshAppearance(); });
      this.cards.set(id, button);
      this.root.querySelector('.character-classes')!.append(button);
    }
    this.root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => {
      button.addEventListener('click', () => this.setMode(button.dataset.mode as LoginMode));
    });
    this.root.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(input => {
      input.addEventListener('change', () => { this.gender = input.value as CharacterGender;this.customizer.setGender(this.gender); this.refreshAppearance(); });
    });
    this.root.querySelector('form')!.addEventListener('submit', event => { event.preventDefault(); this.confirm(); });
    this.nameInput.addEventListener('input', () => this.refreshButton());
    this.passwordInput.addEventListener('input', () => this.refreshButton());
    parent.append(this.root);
    this.root.querySelectorAll<HTMLButtonElement>('.character-rotate button').forEach((button, i) => {
      button.addEventListener('click', () => this.preview?.rotate(i === 0 ? -Math.PI / 4 : Math.PI / 4));
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(b=>b.addEventListener('click',()=>{this.preview?.focus(b.dataset.focus as 'body'|'face');this.root.querySelectorAll('[data-focus]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));}));
    this.root.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(b=>b.addEventListener('click',()=>this.preview?.zoom(Number(b.dataset.zoom))));
    this.refreshAppearance(); this.setMode('login');void this.loadAssets();
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
    if(this.assetsReady&&this.preview){try{this.preview.show(this.selected,this.customizer.value);}catch(error){this.assetsReady=false;this.assetStatus.textContent=error instanceof Error?error.message:'No se pudo mostrar el personaje.';this.retry.hidden=false;}}
    this.refreshButton();
  }

  private refreshButton() {
    this.enterBtn.textContent = this.mode === 'login' ? 'Entrar a Aden' : 'Crear personaje';
    this.enterBtn.disabled = !this.nameInput.value.trim() || this.passwordInput.value.length < 4 || !this.assetsReady || (this.mode==='create'&&!this.preview);
  }

  private confirm() {
    if (!this.resolver||!this.assetsReady||(this.mode==='create'&&!this.preview)) return;
    const name = this.nameInput.value.trim(), password = this.passwordInput.value;
    if (!name || password.length < 4) return;
    this.resolver({ name, password, mode: this.mode, className: this.mode === 'create' ? this.selected : '', gender: this.gender, ...(this.mode==='create'?{appearance:this.customizer.value}:{}) });
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

  private async loadAssets(){
    if(this.loading||this.removed)return;this.loading=true;this.assetsReady=false;this.retry.hidden=true;this.assetStatus.textContent='Cargando personajes y mundo…';this.refreshButton();
    try {
      if(!this.factory)throw Error('No se pudieron preparar los personajes.');
      await (this.options.loadAssets?.()??this.factory.preloadHeroes());if(this.removed)return;
      if(!this.preview)this.preview=(this.options.createPreview??((host,factory)=>new HeroPreview(host,factory)))(this.root.querySelector('.character-canvas')!,this.factory);
      this.assetsReady=true;this.refreshAppearance();if(!this.assetsReady)throw Error(this.assetStatus.textContent??'Error de vista previa');
      this.preview.setVisible(this.mode==='create'&&!this.root.hidden);this.assetStatus.textContent='Personajes listos';this.retry.hidden=true;this.assetsResolved();
    }catch(error){if(this.removed)return;this.assetsReady=false;this.assetStatus.textContent=error instanceof Error?error.message:'No se pudieron cargar los personajes.';this.retry.hidden=false;}
    finally{this.loading=false;if(!this.removed)this.refreshButton();}
  }
  remove() {this.removed=true;this.customizer.dispose(); clearTimeout(this.focusTimer); this.preview?.dispose(); this.root.remove(); }
}
