import { ATTRIBUTES, ATTRIBUTE_LABELS, ATTRIBUTE_EFFECTS, expToNextLevel, MAX_LEVEL, type Attribute } from "@aden/shared";
import { FONT_DISPLAY } from './theme.js';
import './StatsPanel.css';

export interface StatsView {
  statPoints: number;
  str: number;
  agi: number;
  vit: number;
  ene: number;
  pAtk: number;
  pDef: number;
  maxHp: number;
  maxMp: number;
  level?: number;
  exp?: number;
  hp?: number;
  mp?: number;
}

/** Panel de atributos (C). Cada + solicita un punto; el servidor valida y sincroniza. */
export class StatsPanel {
  private readonly root: HTMLDivElement;
  private readonly pointsLabel: HTMLSpanElement;
  private readonly levelLabel: HTMLSpanElement;
  private readonly experience: HTMLDivElement;
  private readonly help: HTMLParagraphElement;
  private readonly rows = new Map<Attribute, {
    value: HTMLSpanElement; btn: HTMLButtonElement; derived: HTMLDivElement;
  }>();
  private visible = false;
  private lastSig = '';

  constructor(private readonly onAllocate: (attr: Attribute) => void, parent: HTMLElement = document.body) {
    this.root = document.createElement('div');
    this.root.className = 'stats-panel';
    this.root.style.display = 'none';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Atributos del personaje');

    const header = document.createElement('div');
    header.className = 'stats-heading';
    const title = document.createElement('h2');
    title.textContent = 'Atributos';
    title.style.fontFamily = FONT_DISPLAY;
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'stats-close'; close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar atributos');
    close.addEventListener('click', () => this.close());
    header.append(title, close); this.root.appendChild(header);

    const summary = document.createElement('div'); summary.className = 'stats-summary';
    const overview = document.createElement('div'); overview.className = 'stats-overview';
    this.levelLabel = document.createElement('span'); this.levelLabel.textContent = 'Nivel: —';
    const points = document.createElement('span'); points.className = 'stats-points';
    points.append('Puntos: ');
    this.pointsLabel = document.createElement('span'); this.pointsLabel.dataset.pts = '';
    this.pointsLabel.textContent = '0'; points.appendChild(this.pointsLabel);
    points.setAttribute('aria-live', 'polite');
    overview.append(this.levelLabel, points);
    this.experience = document.createElement('div'); this.experience.className = 'stats-experience';
    this.help = document.createElement('p'); this.help.className = 'stats-help';
    this.help.textContent = 'Subí de nivel para conseguir puntos de atributo.';
    summary.append(overview, this.experience, this.help); this.root.appendChild(summary);

    const list = document.createElement('div'); list.className = 'stats-list';
    for (const attr of ATTRIBUTES) {
      const section = document.createElement('section'); section.className = 'stats-attribute';
      section.dataset.attribute = attr;
      section.setAttribute('aria-label', ATTRIBUTE_LABELS[attr]);
      const row = document.createElement('div'); row.className = 'stats-attribute-bar';
      const label = document.createElement('h3'); label.textContent = ATTRIBUTE_LABELS[attr];
      const value = document.createElement('span'); value.dataset.val = ''; value.className = 'stats-value'; value.textContent = '0';
      const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = '+';
      btn.className = 'stats-add'; btn.disabled = true;
      btn.setAttribute('aria-label', 'Aumentar ' + ATTRIBUTE_LABELS[attr]);
      btn.title = 'Sin puntos disponibles';
      btn.addEventListener('click', () => this.onAllocate(attr));
      row.append(label, value, btn);
      const derived = document.createElement('div'); derived.className = 'stats-derived';
      const effect = document.createElement('div'); effect.className = 'stats-effect';
      effect.textContent = ATTRIBUTE_EFFECTS[attr] + ' por punto';
      section.append(row, derived, effect); list.appendChild(section);
      this.rows.set(attr, { value, btn, derived });
    }
    this.root.appendChild(list);
    const footer = document.createElement('div'); footer.className = 'stats-footer';
    footer.textContent = 'Cada + asigna un punto';
    const shortcut = document.createElement('span'); shortcut.textContent = '[C] Cerrar';
    footer.appendChild(shortcut); this.root.appendChild(footer);
    parent.appendChild(this.root);
  }

  update(v: StatsView): void {
    // Sólo los campos visibles: otros cambios del snapshot no invalidan el panel.
    const sig = [v.statPoints, v.str, v.agi, v.vit, v.ene, v.pAtk, v.pDef,
      v.maxHp, v.maxMp, v.level, v.exp, v.hp, v.mp].join('|');
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.pointsLabel.textContent = String(v.statPoints);
    this.levelLabel.textContent = 'Nivel: ' + (v.level ?? '—');
    this.experience.textContent = v.level === undefined || v.exp === undefined ? ''
      : v.level >= MAX_LEVEL ? 'Nivel máximo alcanzado'
      : 'Experiencia: ' + v.exp + ' / ' + expToNextLevel(v.level);
    this.help.textContent = v.statPoints > 0 ? 'Elegí un atributo para asignar tus puntos.'
      : 'Sin puntos disponibles. Subí de nivel para conseguir más.';
    const derived: Record<Attribute, string> = {
      str: 'Ataque: ' + v.pAtk,
      agi: 'Defensa: ' + v.pDef,
      vit: v.hp === undefined ? 'Vida máxima: ' + v.maxHp : 'Vida: ' + v.hp + ' / ' + v.maxHp,
      ene: v.mp === undefined ? 'Maná máximo: ' + v.maxMp : 'Maná: ' + v.mp + ' / ' + v.maxMp,
    };
    for (const attr of ATTRIBUTES) {
      const row = this.rows.get(attr)!;
      row.value.textContent = String(v[attr]);
      row.derived.textContent = derived[attr];
      row.btn.disabled = v.statPoints <= 0;
      row.btn.title = row.btn.disabled ? 'Sin puntos disponibles' : 'Asignar 1 punto: ' + ATTRIBUTE_EFFECTS[attr];
    }
  }

  open(): void { this.visible = true; this.root.style.display = ''; }
  close(): void { this.visible = false; this.root.style.display = 'none'; }
  toggle(): void { this.visible ? this.close() : this.open(); }
  isOpen(): boolean { return this.visible; }
}
