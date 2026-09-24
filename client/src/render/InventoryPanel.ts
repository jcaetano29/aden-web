import {
  getItem,
  EQUIP_SLOTS,
  SLOT_LABELS,
  RARITY_COLORS,
  RARITY_LABELS,
  QUALITY_LABELS,
  EXCELLENT_LABELS,
  offensiveOptions,
  canEquipItem,
  CLASSES,
  TRANSFER_MAX_QTY,
  type EquipSlot,
} from "@aden/shared";
import { FONT_DISPLAY } from "./theme.js";
import { compareEquipment, type ComparisonContext } from './EquipmentComparison.js';
import "./InventoryPanel.css";
import { itemIcon } from './ItemModels.js';

export interface InventoryPanelCallbacks {
  onUseItem?: (itemTemplateId: string, targetItemId?: string) => void;
  onEquip?: (itemTemplateId: string) => void;
  onUnequip?: (slot: string) => void;
  onDrop?: (itemTemplateId: string, qty: number) => void;
}

export interface InventoryView {
  entries: { itemTemplateId: string; qty: number; name: string }[];
  /** slot → itemTemplateId equipado. */
  equipment: Record<string, string>;
  /** Stats de combate efectivos (base + equipo) para el encabezado. */
  stats: { pAtk: number; pDef: number };
  /** Optional for compatibility with callers that do not validate equipment locally. */
  className?: string;
  level?: number;
  attributes?: ComparisonContext['attributes'];
}

/**
 * Equipo distribuido por posición corporal, grilla de objetos y ficha de selección.
 * Sólo refleja el estado sincronizado: el servidor valida todas las acciones.
 * La firma evita redibujar cada frame y conserva la selección entre actualizaciones.
 */
export class InventoryPanel {
  private readonly root: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private visible = false;
  private readonly cb: InventoryPanelCallbacks;
  private lastSig = "";
  private selected = "";
  private minimapObserver?: ResizeObserver;

  constructor(parent: HTMLElement = document.body, cb: InventoryPanelCallbacks = {}) {
    this.cb = cb;
    this.root = document.createElement("div");
    this.root.className = "inventory-panel";
    this.root.style.display = 'none';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Inventario y equipo');
    const heading = document.createElement('div');
    heading.className = 'inventory-heading';
    const title = document.createElement('h2');
    title.textContent = 'Inventario';
    title.style.fontFamily = FONT_DISPLAY;
    const close = document.createElement('button');
    close.className = 'inventory-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar inventario');
    close.addEventListener('click', () => this.toggle());
    heading.append(title, close);
    this.root.appendChild(heading);
    this.body = document.createElement('div');
    this.root.appendChild(this.body);

    parent.appendChild(this.root);
    this.observeMinimap();
  }

  private observeMinimap() {
    const minimap = this.root.parentElement?.querySelector<HTMLElement>('.aden-minimap');
    if (!minimap) return;
    const position = () => this.root.style.setProperty('--inventory-minimap-bottom', `${Math.ceil(minimap.getBoundingClientRect().bottom + 12)}px`);
    position();
    if (typeof ResizeObserver !== 'undefined') {
      this.minimapObserver = new ResizeObserver(position);
      this.minimapObserver.observe(minimap);
    }
  }

  /** Alterna la visibilidad del panel. */
  toggle() {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? "" : "none";
    if (this.visible) {
      this.lastSig = '';
      if (!this.minimapObserver) this.observeMinimap();
    }
  }

  private sig(view: InventoryView): string {
    return JSON.stringify(view);
  }

  private makeBtn(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = 'inventory-action';
    btn.addEventListener("mouseenter", () => { btn.style.filter = "brightness(1.12)"; });
    btn.addEventListener("mouseleave", () => { btn.style.filter = "none"; });
    btn.addEventListener("click", onClick);
    return btn;
  }

  private equipmentTargets(view: InventoryView): { id: string; name: string }[] {
    const ids = [
      ...view.entries.map((entry) => entry.itemTemplateId),
      ...EQUIP_SLOTS.map((slot) => view.equipment[slot]).filter(Boolean),
    ];
    const seen = new Set<string>();
    const out: { id: string; name: string }[] = [];
    for (const id of ids) {
      if (!id || seen.has(id)) continue;
      try {
        const item = getItem(id);
        if (item.type !== "equipment") continue;
        seen.add(id);
        out.push({ id, name: item.name });
      } catch { /* invalid synchronized entry */ }
    }
    return out;
  }

  private equipReason(itemId: string, view: InventoryView): string {
    const className = view.className;
    const level = view.level;
    if (!className || level === undefined || canEquipItem(itemId, className, level, view.equipment)) return "";
    const item = getItem(itemId);
    const classLabel = CLASSES[className]?.name ?? className;
    if (item.classes && !item.classes.includes(className)) return `No apto para ${classLabel}`;
    if (level < (item.requiredLevel ?? 1)) return `Requiere nivel ${item.requiredLevel ?? 1}`;
    if (item.hands === "2H" && view.equipment.shield) return "Quitá el escudo";
    if (item.slot === "shield" && view.equipment.weapon && getItem(view.equipment.weapon).hands === "2H") return "Quitá el arma a dos manos";
    return "No se puede equipar";
  }

  private details(itemId: string, setCounts: Map<string, number>): HTMLDivElement {
    const item = getItem(itemId);
    const details = document.createElement("div");
    details.className = 'inventory-details';
    const facts: string[] = [];
    if (item.type === "equipment") {
      const quality = item.options?.quality ?? "normal";
      facts.push(`Calidad: ${item.allowedQualities ? QUALITY_LABELS[quality] : RARITY_LABELS[item.rarity??'common']}`);
      const bonuses=item.bonuses;
      if(bonuses?.pAtk)facts.push(`Ataque +${bonuses.pAtk}`);
      if(bonuses?.pDef)facts.push(`Defensa +${bonuses.pDef}`);
      if(bonuses?.maxHp)facts.push(`Vida +${bonuses.maxHp}`);
      if(bonuses?.maxMp)facts.push(`Maná +${bonuses.maxMp}`);
      if (item.requiredLevel !== undefined) facts.push(`Nivel ${item.requiredLevel}`);
      if (item.hands) facts.push(item.hands === "1H" ? "1 mano" : "2 manos");
      if (item.classes?.length) facts.push(item.classes.map((id) => CLASSES[id]?.name ?? id).join(", "));
      if (item.options?.luck) facts.push("Suerte");
      if (item.options?.skill) facts.push("Habilidad");
      if (item.options?.additional) facts.push(`Adicional +${item.options.additional}`);
      const labels = EXCELLENT_LABELS[offensiveOptions(item) ? "offensive" : "defensive"];
      for (const option of item.options?.excellent ?? []) if (labels[option]) facts.push(labels[option]);
      if (item.setId) facts.push(`Conjunto ${item.setId.replaceAll("_", " ")}: ${setCounts.get(item.setId) ?? 0} piezas`);
    }
    const meta = document.createElement("div");
    meta.textContent = facts.join(" · ");
    details.appendChild(meta);
    if (item.description) {
      const description = document.createElement("div");
      description.textContent = item.description;
      description.style.marginTop = "2px";
      details.appendChild(description);
    }
    return details;
  }

  private comparison(id: string, view: InventoryView): HTMLElement | null {
    const context = view.className && view.level !== undefined && view.attributes
      ? { className: view.className, level: view.level, attributes: view.attributes } : undefined;
    const result = compareEquipment(id, view.equipment, context);
    if (!result) return null;
    const section = document.createElement('section');
    section.className = 'inventory-comparison';
    section.setAttribute('aria-label', 'Comparación con el equipo actual');
    const title = document.createElement('div');
    title.className = 'inventory-comparison-title';
    title.textContent = 'Equipado: ' + (result.current?.name ?? 'Ranura vacía');
    const verdict = document.createElement('strong');
    verdict.className = 'inventory-verdict';
    verdict.dataset.verdict = result.verdict;
    verdict.textContent = ({ better: 'Mejor', worse: 'Peor', equal: 'Igual', mixed: 'Ventajas y desventajas' })[result.verdict];
    section.append(title, verdict);
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Estadística</th><th>Actual</th><th>Con este</th><th>Cambio</th></tr></thead>';
    const body = document.createElement('tbody');
    const labels = { pAtk: 'Ataque', pDef: 'Defensa', maxHp: 'Vida máx.', maxMp: 'Maná máx.' } as const;
    for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
      const row = document.createElement('tr');
      const label = document.createElement('th'); label.scope = 'row'; label.textContent = labels[key]; row.appendChild(label);
      for (const value of [result.before[key], result.after[key]]) {
        const cell = document.createElement('td'); cell.textContent = String(value); row.appendChild(cell);
      }
      const delta = document.createElement('td');
      delta.dataset.delta = key;
      delta.className = result.delta[key] > 0 ? 'inventory-gain' : result.delta[key] < 0 ? 'inventory-loss' : '';
      delta.textContent = (result.delta[key] > 0 ? '+' : '') + result.delta[key]; row.appendChild(delta);
      body.appendChild(row);
    }
    table.appendChild(body); section.appendChild(table);
    const note = document.createElement('p'); note.className = 'inventory-hint';
    note.textContent = (result.fullStats ? 'Estadísticas del personaje' : 'Bonificaciones del equipo') + ', incluidos conjuntos. La valoración considera estas cuatro estadísticas; revisá también las opciones especiales.';
    section.appendChild(note);
    return section;
  }

  update(view: InventoryView) {
    if (!this.visible) return;
    const sig = this.sig(view);
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    const focusedKey = this.root.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)?.dataset.selectionKey : undefined;
    this.body.replaceChildren();
    const setCounts = new Map<string, number>();
    const entries = view.entries.filter(entry => {
      try { getItem(entry.itemTemplateId); return entry.qty > 0; } catch { return false; }
    });
    const equipped = EQUIP_SLOTS.filter(slot => {
      try { return !!view.equipment[slot] && !!getItem(view.equipment[slot]); } catch { return false; }
    });
    for (const slot of equipped) {
      const set = getItem(view.equipment[slot]).setId;
      if (set) setCounts.set(set, (setCounts.get(set) ?? 0) + 1);
    }
    const keys = [...entries.map(e => 'item:' + e.itemTemplateId), ...equipped.map(slot => 'slot:' + slot)];
    if (!keys.includes(this.selected)) this.selected = keys[0] ?? '';
    const stats = document.createElement('div');
    stats.className = 'inventory-stats';
    for (const text of ['Ataque ' + view.stats.pAtk, 'Defensa ' + view.stats.pDef]) {
      const stat = document.createElement('span'); stat.textContent = text; stats.appendChild(stat);
    }
    this.body.appendChild(stats);

    const select = (key: string) => {
      this.selected = key;
      this.lastSig = '';
      this.update(view);
      this.body.querySelectorAll<HTMLButtonElement>('[data-selection-key]').forEach(button => {
        if (button.dataset.selectionKey === key) button.focus({ preventScroll: true });
      });
    };
    const equipment = document.createElement('div');
    equipment.className = 'inventory-equipment';
    equipment.setAttribute('aria-label', 'Equipo');
    for (const slot of EQUIP_SLOTS) {
      const button = document.createElement('button');
      button.className = 'inventory-slot';
      button.dataset.equipSlot = slot;
      button.dataset.selectionKey = 'slot:' + slot;
      button.setAttribute('aria-pressed', String(this.selected === 'slot:' + slot));
      const id = equipped.includes(slot) ? view.equipment[slot] : '';
      if (id) button.appendChild(itemIcon(id));
      else button.appendChild(this.slotSilhouette(slot));
      const label = document.createElement('span');
      label.className = 'inventory-slot-label';
      label.textContent = SLOT_LABELS[slot];
      button.appendChild(label);
      button.title = id ? SLOT_LABELS[slot] + ': ' + getItem(id).name : SLOT_LABELS[slot] + ': vacío';
      button.setAttribute('aria-label', button.title);
      button.disabled = !id;
      button.addEventListener('click', () => select('slot:' + slot));
      equipment.appendChild(button);
    }
    this.body.appendChild(equipment);
    for (const [set, count] of setCounts) {
      const line = document.createElement('div');
      line.className = 'inventory-set';
      line.textContent = 'Conjunto ' + set.replaceAll('_', ' ') + ': ' + count + ' piezas';
      this.body.appendChild(line);
    }
    const heading = document.createElement('div');
    heading.className = 'inventory-section-label';
    const label = document.createElement('span'); label.textContent = 'Objetos';
    const count = document.createElement('span'); count.textContent = entries.length + (entries.length === 1 ? ' objeto' : ' objetos');
    heading.append(label, count); this.body.appendChild(heading);
    const grid = document.createElement('div');
    grid.className = 'inventory-grid';
    grid.setAttribute('aria-label', 'Objetos del inventario');
    for (const entry of entries) {
      const button = document.createElement('button');
      button.className = 'inventory-cell';
      button.dataset.inventoryItem = entry.itemTemplateId;
      button.dataset.selectionKey = 'item:' + entry.itemTemplateId;
      button.setAttribute('aria-pressed', String(this.selected === 'item:' + entry.itemTemplateId));
      button.title = entry.name + (entry.qty > 1 ? ' ×' + entry.qty : '');
      button.setAttribute('aria-label', button.title);
      button.appendChild(itemIcon(entry.itemTemplateId));
      if (entry.qty > 1) {
        const qty = document.createElement('span'); qty.className = 'inventory-quantity'; qty.textContent = String(entry.qty); button.appendChild(qty);
      }
      button.addEventListener('click', () => select('item:' + entry.itemTemplateId));
      grid.appendChild(button);
    }
    const cells = Math.max(64, Math.ceil(entries.length / 8) * 8);
    for (let i = entries.length; i < cells; i++) {
      const empty = document.createElement('div'); empty.className = 'inventory-empty-cell'; empty.setAttribute('aria-hidden', 'true'); grid.appendChild(empty);
    }
    this.body.appendChild(grid);
    const inspector = document.createElement('div');
    inspector.className = 'inventory-inspector';
    inspector.setAttribute('aria-label', 'Objeto seleccionado');
    const slot = this.selected.startsWith('slot:') ? this.selected.slice(5) : '';
    const id = slot ? view.equipment[slot] : this.selected.slice(5);
    if (id) {
      const item = getItem(id);
      const name = document.createElement('div');
      name.className = 'inventory-inspector-name'; name.textContent = item.name;
      name.style.color = RARITY_COLORS[item.rarity ?? 'common'];
      inspector.append(name, this.details(id, setCounts));
      if (!slot && item.type === 'equipment') {
        const comparison = this.comparison(id, view);
        if (comparison) inspector.appendChild(comparison);
      }
      const actions = document.createElement('div'); actions.className = 'inventory-actions';
      if (slot) actions.appendChild(this.makeBtn('Quitar', () => this.cb.onUnequip?.(slot)));
      else if (item.type === 'equipment') {
        const reason = this.equipReason(id, view);
        const equip = this.makeBtn(reason ? 'Equipar · ' + reason : 'Equipar', () => this.cb.onEquip?.(id));
        equip.disabled = !!reason;
        if (reason) { equip.title = reason; equip.style.opacity = '0.5'; equip.style.cursor = 'not-allowed'; }
        actions.appendChild(equip);
      } else if (item.type === 'consumable' && item.category === 'joya') {
        const target = document.createElement('select');
        target.dataset.jewelTarget = '';
        target.title = 'Objeto que recibirá la mejora';
        target.setAttribute('aria-label', target.title);
        target.style.cssText = 'font-size:12px;background:#171b16;color:#ddceb0;border:1px solid #75694c;pointer-events:auto;padding:3px;';
        for (const option of this.equipmentTargets(view)) {
          const el = document.createElement('option'); el.value = option.id; el.textContent = option.name; target.appendChild(el);
        }
        const use = this.makeBtn('Usar', () => this.cb.onUseItem?.(id, target.value));
        use.disabled = target.options.length === 0;
        if (use.disabled) { use.textContent = 'Sin objetivo'; use.style.opacity = '0.5'; }
        actions.append(target, use);
      } else if (item.type === 'consumable' && (item.heal || item.mana || item.useEffect || item.learnSkill)) {
        actions.appendChild(this.makeBtn('Usar', () => this.cb.onUseItem?.(id)));
      }
      inspector.appendChild(actions);
      if (!slot && item.type !== 'currency') {
        const available = entries.find(entry => entry.itemTemplateId === id)?.qty ?? 0;
        const dropActions = document.createElement('div'); dropActions.className = 'inventory-drop-actions';
        const label = document.createElement('label'); label.textContent = 'Cantidad a tirar ';
        const qty = document.createElement('input'); qty.type = 'number'; qty.min = '1'; qty.max = String(Math.min(available, TRANSFER_MAX_QTY)); qty.step = '1'; qty.value = '1';
        qty.dataset.dropQty = ''; qty.setAttribute('aria-label', 'Cantidad a tirar'); label.append(qty);
        const confirmation = document.createElement('div'); confirmation.className = 'inventory-drop-confirmation'; confirmation.setAttribute('role', 'status');
        const drop = this.makeBtn('Tirar al suelo', () => {
          const amount = qty.valueAsNumber;
          if (!Number.isSafeInteger(amount) || amount < 1 || amount > Math.min(available, TRANSFER_MAX_QTY)) { qty.reportValidity(); return; }
          confirmation.replaceChildren();
          const warning = document.createElement('p'); warning.textContent = `${item.name} ×${amount}: cualquiera podrá recogerlo. Desaparece del suelo en 60 segundos.`;
          const confirm = this.makeBtn(`Confirmar: tirar ×${amount}`, () => { this.cb.onDrop?.(id, amount); confirmation.replaceChildren(); }); confirm.dataset.dropConfirm = '';
          const cancel = this.makeBtn('Cancelar', () => confirmation.replaceChildren());
          confirmation.append(warning, confirm, cancel);
        });
        drop.dataset.dropItem = '';
        qty.addEventListener('input', () => confirmation.replaceChildren());
        dropActions.append(label, drop, confirmation); inspector.append(dropActions);
      }
    } else inspector.textContent = 'Inventario vacío. Recogé objetos para verlos aquí.';
    this.body.appendChild(inspector);
    const hint = document.createElement('p'); hint.className = 'inventory-hint';
    hint.textContent = 'Seleccioná un objeto para ver sus atributos. [I] Cerrar';
    this.body.appendChild(hint);
    const loot = document.createElement('p'); loot.className = 'inventory-hint';
    loot.textContent = 'Botín público: acercate o hacé clic. Lo recoge el primer jugador vivo en alcance.';
    this.body.appendChild(loot);
    if (focusedKey) this.body.querySelectorAll<HTMLButtonElement>('[data-selection-key]').forEach(button => {
      if (button.dataset.selectionKey === focusedKey) button.focus({ preventScroll: true });
    });
  }

  private slotSilhouette(slot: EquipSlot): SVGSVGElement {
    const paths: Record<EquipSlot, string> = {
      weapon: 'M17 3 7 23l4 2L22 5ZM5 21l9 5M9 25l-3 6',
      shield: 'M6 5 16 2l10 3v11c0 7-10 14-10 14S6 23 6 16ZM16 5v22',
      helmet: 'M6 25V13a10 10 0 0 1 20 0v12l-7 3v-9h-6v9ZM7 14h18',
      armor: 'm10 3-8 7 5 6 4-3-2 16h14l-2-16 4 3 5-6-8-7-6 4Z',
      pants: 'M8 3h16l2 26h-8l-2-16-2 16H6ZM8 8h16',
      boots: 'M7 4h7v17l-3 7H2v-6l5-3ZM21 4h7v17l-3 7h-9v-6l5-3Z',
      gloves: 'm7 28-4-11 3-2 3 4V5h3v10-12h3v12-10h3v12-8h3v13l-4 6Z',
      accessory: 'M6 4c-4 19 24 19 20 0M12 23l4-4 4 4-4 7Z',
      ring: 'M24 19a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM11 7l5-5 5 5-5 6Z',
      wings: 'M16 26C9 12 3 29 2 5l14 11L30 5c-1 24-7 7-14 21ZM16 16v12',
      pet: 'm7 12-3-9 10 5h4l10-5-3 9 2 9-11 9L5 21ZM9 16h4m6 0h4m-10 7h6',
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('inventory-slot-symbol');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', paths[slot]); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5');
    svg.appendChild(path); return svg;
  }

  remove() {
    this.minimapObserver?.disconnect();
    this.root.remove();
  }
}

/** Re-export para consumidores que sólo importan el tipo de slot desde acá. */
export type { EquipSlot };
