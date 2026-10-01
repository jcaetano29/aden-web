import { CASTLE_MAP, CLASSES, PARTY_MAX_MEMBERS, PARTY_REWARD_RANGE, getZone, type PartyInvitation } from '@aden/shared';
import { COLORS, FONT_BODY, FONT_DISPLAY, applyButton } from './theme.js';

export interface PartyMember {
  id: string; name: string; level: number; mapId: string;
  hp: number; maxHp: number; mp: number; maxMp: number; dead: boolean;
  className?: string; protectedMs?: number; rallyMs?: number;
}
export interface PartyPanelData {
  selfId: string; partyId: string; leaderId: string;
  members: PartyMember[];
  candidates: { id: string; name: string; level: number }[];
  invitation: PartyInvitation | null;
  selectedAllyId?: string;
  lootMode?: 'free' | 'round_robin';
}
interface Handlers {
  onInvite(id: string): void;
  onRespond(inviterId: string, accept: boolean): void;
  onLeave(): void;
  onKick(id: string): void;
  onSelectAlly?(id: string): void;
  onLootMode?(mode: 'free' | 'round_robin'): void;
}

interface ResourceBar { track: HTMLDivElement; fill: HTMLDivElement; label: HTMLDivElement; }
interface RosterRow {
  location: HTMLDivElement; effects: HTMLDivElement; support: HTMLButtonElement;
  hp: ResourceBar; mp: ResourceBar;
}

const lootLabel = (mode: PartyPanelData['lootMode']): string => mode === 'free' ? 'Libre' : 'Por turnos';

function text(parent: HTMLElement, value: string, style = ''): HTMLDivElement {
  const el = document.createElement('div'); el.textContent = value; el.style.cssText = style; parent.append(el); return el;
}
function button(parent: HTMLElement, label: string, key: string, action: () => void): HTMLButtonElement {
  const el = document.createElement('button'); el.type = 'button'; el.textContent = label;
  el.setAttribute(`data-party-${key}`, ''); applyButton(el); el.style.padding = '5px 10px';
  el.addEventListener('click', action); parent.append(el); return el;
}

/** Separate action and resource renders keep keyboard focus stable during combat. */
export class PartyPanel {
  readonly el = document.createElement('section');
  readonly roster = document.createElement('aside');
  readonly button = document.createElement('button');
  private visible = false;
  private actionsSignature = '';
  private rosterSignature = '';
  private resourcesSignature = '';
  private rosterRows = new Map<string, RosterRow>();
  private lootSummary?: HTMLDivElement;
  private invitationKey = '';

  constructor(private readonly handlers: Handlers) {
    this.el.className = 'aden-panel aden-scroll';
    this.el.setAttribute('aria-label', 'Administrar grupo');
    this.el.style.cssText = `display:none;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(390px,calc(100vw - 28px));max-height:75vh;overflow:auto;box-sizing:border-box;padding:18px;z-index:1100;color:${COLORS.text};font:15px ${FONT_BODY};pointer-events:auto;`;
    this.roster.className = 'aden-panel aden-scroll';
    this.roster.setAttribute('aria-label', 'Miembros del grupo');
    this.roster.style.cssText = `display:none;position:fixed;left:14px;top:58px;width:205px;max-height:45vh;overflow:auto;padding:10px;box-sizing:border-box;z-index:1000;color:${COLORS.text};font:13px ${FONT_BODY};pointer-events:auto;`;
    this.roster.tabIndex = 0;
    this.button.type = 'button'; this.button.textContent = 'Grupo · P'; applyButton(this.button);
    this.button.style.cssText += 'display:none;position:fixed;left:14px;top:14px;padding:7px 14px;z-index:1000;pointer-events:auto;';
    this.button.setAttribute('aria-expanded', 'false');
    this.button.addEventListener('click', () => this.toggle());
    for (const el of [this.el, this.button, this.roster]) {
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('wheel', e => e.stopPropagation());
    }
  }

  mount(parent: HTMLElement): void { parent.append(this.button, this.roster, this.el); }
  toggle(): void { this.setVisible(!this.visible); }
  setVisible(visible: boolean): void {
    this.visible = visible; this.el.style.display = visible ? 'block' : 'none';
    this.button.setAttribute('aria-expanded', String(visible));
  }

  update(data: PartyPanelData): void {
    this.button.style.display = 'block';
    this.button.textContent = data.partyId ? `Grupo ${data.members.length}/${PARTY_MAX_MEMBERS} · P` : 'Grupo · P';
    const inviteKey = data.invitation ? `${data.invitation.inviterId}:${data.invitation.expiresAt}` : '';
    if (inviteKey && inviteKey !== this.invitationKey) this.setVisible(true);
    this.invitationKey = inviteKey;
    const { selectedAllyId: _selectedAllyId, ...actionsData } = data;
    const actionsSignature = JSON.stringify({ ...actionsData, members: data.members.map(({ id, name, level, mapId }) => ({ id, name, level, mapId })) });
    if (actionsSignature !== this.actionsSignature) {
      this.actionsSignature = actionsSignature;
      this.renderActions(data);
    }
    const rosterSignature = JSON.stringify([data.members.map(({ id, name, level }) => ({ id, name, level })), data.leaderId, data.selfId, data.partyId]);
    if (rosterSignature !== this.rosterSignature) {
      this.rosterSignature = rosterSignature;
      this.renderRoster(data);
    }
    const resourcesSignature = JSON.stringify([data.members, data.selectedAllyId, data.lootMode]);
    if (resourcesSignature !== this.resourcesSignature) {
      this.resourcesSignature = resourcesSignature;
      this.updateRoster(data);
    }
  }

  private renderActions(data: PartyPanelData): void {
    this.el.replaceChildren();
    const header = text(this.el, '', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;');
    text(header, 'Compañeros de aventura', `font:17px ${FONT_DISPLAY};color:${COLORS.goldBright};`);
    button(header, 'Cerrar', 'close', () => this.setVisible(false));
    if (data.invitation) {
      const invite = data.invitation;
      const box = text(this.el, `${invite.inviterName} te invita a su grupo.`, 'padding:10px;margin-bottom:12px;border:1px solid #a38446;');
      text(box, 'La invitación vence a los 30 segundos.', `color:${COLORS.textDim};font-size:13px;margin:6px 0;`);
      button(box, 'Aceptar', 'accept', () => this.handlers.onRespond(invite.inviterId, true));
      button(box, 'Rechazar', 'reject', () => this.handlers.onRespond(invite.inviterId, false));
    }
    text(this.el, `Hasta ${PARTY_MAX_MEMBERS} jugadores. EXP repartida (+10% total por compañero elegible, hasta +30%) y objetivos de bajas compartidos entre compañeros vivos a ${PARTY_REWARD_RANGE} unidades del enemigo.`, 'line-height:1.4;margin-bottom:8px;');
    text(this.el, 'En la Cripta todos los presentes cercanos conservan su EXP completa. El botín se recoge del suelo.', `font-size:13px;color:${COLORS.textDim};margin-bottom:8px;`);
    text(this.el, 'Elegí un compañero en la lista del grupo y luego usá Cura Arcana o Guardia a 10 m. Sobre mí limpia la selección. El enemigo seleccionado se conserva. Estas ayudas no funcionan en Castillo.', `font-size:13px;line-height:1.4;color:${COLORS.textDim};margin-bottom:14px;`);
    const canManage = !data.partyId || data.leaderId === data.selfId;
    if (data.partyId) {
      text(this.el, `Botín: ${lootLabel(data.lootMode)}`, `color:${COLORS.goldBright};margin-bottom:6px;`);
      if (canManage) {
        const label = document.createElement('label'); label.textContent = 'Modo de botín ';
        const select = document.createElement('select');
        select.dataset.partyLootMode = ''; select.setAttribute('aria-label', 'Modo de botín');
        select.style.cssText = `padding:5px;color:${COLORS.text};background:${COLORS.ink};border:1px solid ${COLORS.goldDeep};`;
        for (const [value, name] of [['round_robin', 'Por turnos'], ['free', 'Libre']]) {
          const option = document.createElement('option'); option.value = value; option.textContent = name; select.append(option);
        }
        select.value = data.lootMode ?? 'round_robin';
        select.addEventListener('change', () => this.handlers.onLootMode?.(select.value as 'free' | 'round_robin'));
        label.append(select); this.el.append(label);
      }
      text(this.el, data.lootMode === 'free' ? 'Libre: el grupo recoge sus recompensas sin turnos.' : 'Por turnos: cada recompensa se reserva 30 segundos para un compañero elegible.', `font-size:13px;line-height:1.4;color:${COLORS.textDim};margin:6px 0 12px;`);
      for (const member of data.members) {
        const row = text(this.el, '', 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0;');
        text(row, `${member.id === data.leaderId ? '★ ' : ''}${member.name} · Nv. ${member.level} · ${getZone(member.mapId).name}`);
        if (canManage && member.id !== data.selfId) button(row, 'Expulsar', 'kick', () => this.handlers.onKick(member.id));
      }
      button(this.el, 'Salir del grupo', 'leave', () => this.handlers.onLeave());
    } else {
      text(this.el, 'Invitá a alguien de tu mapa para formar un grupo.', 'margin:10px 0;');
    }
    if (canManage && data.members.length < PARTY_MAX_MEMBERS) {
      text(this.el, 'Jugadores disponibles', `margin:16px 0 8px;color:${COLORS.goldBright};`);
      if (!data.candidates.length) text(this.el, 'No hay jugadores disponibles en este mapa.');
      for (const candidate of data.candidates) {
        const row = text(this.el, '', 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin:7px 0;');
        text(row, `${candidate.name} · Nv. ${candidate.level}`);
        const invite = button(row, 'Invitar', 'invite', () => { this.handlers.onInvite(candidate.id); });
        invite.setAttribute('aria-label', `Invitar a ${candidate.name}`);
      }
    } else if (!canManage) text(this.el, 'El líder administra las invitaciones.', 'margin-top:12px;');
  }

  private renderRoster(data: PartyPanelData): void {
    this.roster.replaceChildren(); this.roster.style.display = data.members.length ? 'block' : 'none';
    this.rosterRows.clear(); this.resourcesSignature = '';
    this.lootSummary = text(this.roster, '', `font-size:11px;color:${COLORS.textDim};margin-bottom:8px;`);
    for (const member of data.members) {
      const row = text(this.roster, '', 'margin-bottom:9px;');
      const header = text(row, '', 'display:flex;align-items:center;justify-content:space-between;gap:5px;');
      text(header, `${member.id === data.leaderId ? '★ ' : ''}${member.name} · ${member.level}`, `color:${COLORS.goldBright};overflow-wrap:anywhere;`);
      const isSelf = member.id === data.selfId;
      const support = button(header, isSelf ? 'Sobre mí' : 'Apoyar', isSelf ? 'self' : 'ally', () => this.handlers.onSelectAlly?.(isSelf ? '' : member.id));
      if (!isSelf) support.dataset.partyAlly = member.id;
      support.setAttribute('aria-label', isSelf ? 'Sobre mí: quitar selección de compañero' : `Seleccionar a ${member.name} para apoyo`);
      support.title = 'Elegí un compañero y luego usá una habilidad de apoyo a 10 m.';
      support.style.cssText += 'font-size:11px;flex-shrink:0;padding:3px 5px;';
      const location = text(row, '', `font-size:11px;color:${COLORS.textDim};margin-top:3px;`);
      const bars: ResourceBar[] = [];
      for (const [label, color] of [['Vida', COLORS.hp1], ['Maná', COLORS.mp1]] as const) {
        const track = text(row, '', 'position:relative;height:13px;background:#13110e;margin-top:3px;border-radius:2px;overflow:hidden;');
        track.setAttribute('role', 'progressbar'); track.setAttribute('aria-label', `${label} de ${member.name}`);
        track.setAttribute('aria-valuemin', '0');
        const fill = text(track, '', `height:100%;background:${color};`);
        const valueLabel = text(track, '', 'position:absolute;inset:0;text-align:center;font:10px/13px sans-serif;color:white;text-shadow:0 1px 2px black;');
        bars.push({ track, fill, label: valueLabel });
      }
      const effects = text(row, '', `font-size:11px;margin-top:3px;color:${COLORS.goldBright};`);
      this.rosterRows.set(member.id, { location, effects, support, hp: bars[0], mp: bars[1] });
    }
  }

  private updateRoster(data: PartyPanelData): void {
    const self = data.members.find(member => member.id === data.selfId);
    if (this.lootSummary) this.lootSummary.textContent = `Botín: ${lootLabel(data.lootMode)}`;
    for (const member of data.members) {
      const row = this.rosterRows.get(member.id);
      if (!row) continue;
      const className = CLASSES[member.className ?? '']?.name;
      row.location.textContent = `${className ? `${className} · ` : ''}${member.dead ? 'Muerto' : getZone(member.mapId).name}`;
      const selected = member.id === data.selfId ? !data.selectedAllyId : data.selectedAllyId === member.id;
      row.support.setAttribute('aria-pressed', String(selected));
      row.support.style.borderColor = selected ? COLORS.goldBright : COLORS.goldDeep;
      row.support.disabled = member.id !== data.selfId && (!self || self.dead || self.hp <= 0 || member.dead || member.hp <= 0 || self.mapId !== member.mapId || self.mapId === CASTLE_MAP);
      for (const [bar, value, max] of [[row.hp, member.hp, member.maxHp], [row.mp, member.mp, member.maxMp]] as const) {
        bar.track.setAttribute('aria-valuenow', String(value)); bar.track.setAttribute('aria-valuemax', String(max));
        bar.fill.style.width = `${Math.max(0, Math.min(100, max > 0 ? value / max * 100 : 0))}%`;
        bar.label.textContent = `${value}/${max}`;
      }
      const effects = [];
      if ((member.protectedMs ?? 0) > 0) effects.push(`Protección ${Math.ceil(member.protectedMs! / 1000)} s`);
      if ((member.rallyMs ?? 0) > 0) effects.push(`Furia ${Math.ceil(member.rallyMs! / 1000)} s`);
      row.effects.textContent = effects.join(' · ');
      row.effects.hidden = !effects.length;
    }
  }
}
