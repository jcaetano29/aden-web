export const TRADE_RANGE = 5;
export const TRADE_INVITE_MS = 30_000;
export const TRADE_SESSION_MS = 120_000;
export const TRADE_MAX_ITEMS = 20;
export const TRANSFER_MAX_QTY = 10_000;

export interface TradeItem { itemTemplateId: string; qty: number; }
export interface TradeOffer { gold: number; items: TradeItem[]; }
export interface TradeParticipant {
  id: string;
  name: string;
  offer: TradeOffer;
  confirmed: boolean;
}
/** Private, authoritative snapshot delivered only to the two participants. */
export interface TradeSnapshot {
  id: string;
  inviterId: string;
  phase: 'invited' | 'active';
  revision: number;
  expiresAt: number;
  participants: [TradeParticipant, TradeParticipant];
}
