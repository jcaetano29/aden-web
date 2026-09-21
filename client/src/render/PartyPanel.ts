import { PARTY_MAX_MEMBERS, PARTY_REWARD_RANGE, getZone, type PartyInvitation } from '@aden/shared';
import { COLORS, FONT_BODY, FONT_DISPLAY, applyButton } from './theme.js';

export interface PartyMember {
  id: string; name: string; level: number; mapId: string;
  hp: number; maxHp: number; mp: number; maxMp: number; dead: boolean;
}
export interface PartyPanelData {
  selfId: string; partyId: string; leaderId: string;
  members: PartyMember[];
  candidates: { id: string; name: string; level: number }[];
  invitation: PartyInvitation | null;
}
interface Handlers {
  onInvite(id: string): void;
  onRespond(inviterId: string, accept: boolean): void;
  onLeave(): void;
  onKick(id: string): void;
}

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
  private invitationKey = '';

  constructor(private readonly handlers: Handlers) {
    this.el.className = 'aden-panel aden-scroll';
    this.el.setAttribute('aria-label', 'Administrar party');
    this.el.style.cssText = `display:none;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(390px,calc(100vw - 28px));max-height:75vh;overflow:auto;box-sizing:border-box;padding:18px;z-index:1100;color:${COLORS.text};font:15px ${FONT_BODY};pointer-events:auto;`;
    this.roster.className = 'aden-panel aden-scroll';
    this.roster.setAttribute('aria-label', 'Miembros de party');
    this.roster.style.cssText = `display:none;position:fixed;left:14px;top:58px;width:205px;max-height:45vh;overflow:auto;padding:10px;box-sizing:border-box;z-index:1000;color:${COLORS.text};font:13px ${FONT_BODY};pointer-events:auto;`;
    this.roster.tabIndex = 0;
    this.button.type = 'button'; this.button.textContent = 'Party · P'; applyButton(this.button);
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
    this.button.textContent = data.partyId ? `Party ${data.members.length}/${PARTY_MAX_MEMBERS} · P` : 'Party · P';
    const inviteKey = data.invitation ? `${data.invitation.inviterId}:${data.invitation.expiresAt}` : '';
    if (inviteKey && inviteKey !== this.invitationKey) this.setVisible(true);
    this.invitationKey = inviteKey;
    const actionsSignature = JSON.stringify({ ...data, members: data.members.map(({ id, name, level, mapId }) => ({ id, name, level, mapId })) });
    if (actionsSignature !== this.actionsSignature) {
      this.actionsSignature = actionsSignature;
      this.renderActions(data);
    }
    const rosterSignature = JSON.stringify([data.members, data.leaderId]);
    if (rosterSignature !== this.rosterSignature) {
      this.rosterSignature = rosterSignature;
      this.renderRoster(data);
    }
  }

  private renderActions(data: PartyPanelData): void {
    this.el.replaceChildren();
    const header = text(this.el, '', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;');
    text(header, 'Compañeros de aventura', `font:17px ${FONT_DISPLAY};color:${COLORS.goldBright};`);
    button(header, 'Cerrar', 'close', () => this.setVisible(false));
    if (data.invitation) {
      const invite = data.invitation;
      const box = text(this.el, `${invite.inviterName} te invita a su party.`, 'padding:10px;margin-bottom:12px;border:1px solid #a38446;');
      text(box, 'La invitación vence a los 30 segundos.', `color:${COLORS.textDim};font-size:13px;margin:6px 0;`);
      button(box, 'Aceptar', 'accept', () => this.handlers.onRespond(invite.inviterId, true));
      button(box, 'Rechazar', 'reject', () => this.handlers.onRespond(invite.inviterId, false));
    }
    text(this.el, `Hasta ${PARTY_MAX_MEMBERS} jugadores. EXP repartida y objetivos de bajas compartidos entre compañeros vivos a ${PARTY_REWARD_RANGE} unidades del enemigo.`, 'line-height:1.4;margin-bottom:8px;');
    text(this.el, 'En la Cripta todos los presentes cercanos conservan su EXP completa. El botín se recoge del suelo.', `font-size:13px;color:${COLORS.textDim};margin-bottom:14px;`);
    const canManage = !data.partyId || data.leaderId === data.selfId;
    if (data.partyId) {
      for (const member of data.members) {
        const row = text(this.el, '', 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0;');
        text(row, `${member.id === data.leaderId ? '★ ' : ''}${member.name} · Nv. ${member.level} · ${getZone(member.mapId).name}`);
        if (canManage && member.id !== data.selfId) button(row, 'Expulsar', 'kick', () => this.handlers.onKick(member.id));
      }
      button(this.el, 'Salir de la party', 'leave', () => this.handlers.onLeave());
    } else {
      text(this.el, 'Invitá a alguien de tu mapa para formar una party.', 'margin:10px 0;');
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
    for (const member of data.members) {
      const row = text(this.roster, '', 'margin-bottom:9px;');
      text(row, `${member.id === data.leaderId ? '★ ' : ''}${member.name} · ${member.level}`, `color:${COLORS.goldBright};`);
      text(row, member.dead ? 'Muerto' : getZone(member.mapId).name, `font-size:11px;color:${COLORS.textDim};`);
      for (const [label, value, max, color] of [['Vida', member.hp, member.maxHp, COLORS.hp1], ['Maná', member.mp, member.maxMp, COLORS.mp1]] as const) {
        const track = text(row, '', 'position:relative;height:13px;background:#13110e;margin-top:3px;border-radius:2px;overflow:hidden;');
        track.setAttribute('role', 'progressbar'); track.setAttribute('aria-label', `${label} de ${member.name}`);
        track.setAttribute('aria-valuenow', String(value)); track.setAttribute('aria-valuemax', String(max)); track.setAttribute('aria-valuemin', '0');
        text(track, '', `height:100%;width:${Math.max(0, Math.min(100, max > 0 ? value / max * 100 : 0))}%;background:${color};`);
        text(track, `${value}/${max}`, 'position:absolute;inset:0;text-align:center;font:10px/13px sans-serif;color:white;text-shadow:0 1px 2px black;');
      }
    }
  }
}
