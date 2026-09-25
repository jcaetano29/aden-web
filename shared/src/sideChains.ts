import { BOUNTIES, BOUNTY_ORDER } from './bounties.js';
import { VEIL_CONTRACTS, VEIL_CONTRACTS_COMPLETE } from './veilContracts.js';

export interface SideChainStep {
  id: string;
  title: string;
  intro: string;
  done: string;
  objective: 'kill' | 'interact';
  /** kill: templateId ('' = cualquier enemigo). interact: id del objeto. */
  targetId: string;
  /** interact: mapa donde cuenta el objeto. */
  mapId?: string;
  amount: number;
  rewardExp: number;
  rewardGold: number;
  rewardItemId?: string;
  rewardQty?: number;
}

export interface SideChainDef {
  id: string;
  npcId: string;
  /** sequence: termina en completeId. repeatable: vuelve al primer paso. */
  kind: 'sequence' | 'repeatable';
  minLevel: number;
  /** true: el servidor avisa al aceptar, cumplir y entregar. false: el cliente arma su propio diálogo. */
  announce: boolean;
  steps: readonly SideChainStep[];
  completeId?: string;
  /** Se agrega al aviso de objetivo cumplido. */
  returnHint?: string;
}

export const SIDE_CHAINS: readonly SideChainDef[] = [
  { id: 'varek', npcId: 'captain', kind: 'repeatable', minLevel: 0, announce: false,
    steps: BOUNTY_ORDER.map(id => {
      const b = BOUNTIES[id];
      return { id: b.id, title: b.title, intro: '', done: '', objective: 'kill' as const, targetId: b.mobTemplateId,
        amount: b.amount, rewardExp: b.rewardExp, rewardGold: b.rewardGold };
    }) },
  { id: 'boren', npcId: 'boren', kind: 'sequence', minLevel: 10, announce: true,
    completeId: VEIL_CONTRACTS_COMPLETE, returnHint: 'Volvé con Boren en las Marismas.',
    steps: VEIL_CONTRACTS.map(c => ({ id: c.id, title: c.title, intro: c.intro, done: c.done, objective: 'interact' as const,
      targetId: c.objectId, mapId: c.mapId, amount: 1, rewardExp: 0, rewardGold: c.rewardGold,
      rewardItemId: c.rewardItemId, rewardQty: c.rewardQty })) },
];

export function getSideChain(id: string): SideChainDef | undefined {
  return SIDE_CHAINS.find(c => c.id === id);
}

export function sideChainForNpc(npcId: string): SideChainDef | undefined {
  return SIDE_CHAINS.find(c => c.npcId === npcId);
}

export function sideChainStep(chain: SideChainDef, stepId: string): SideChainStep | undefined {
  return chain.steps.find(s => s.id === stepId);
}

/** Paso siguiente: vuelve al primero si es repetible; completeId al terminar una secuencia. */
export function nextSideChainStep(chain: SideChainDef, stepId: string): string {
  if (stepId === chain.completeId) return stepId;
  const next = chain.steps[chain.steps.findIndex(s => s.id === stepId) + 1];
  if (next) return next.id;
  return chain.kind === 'repeatable' ? chain.steps[0].id : chain.completeId ?? chain.steps[0].id;
}
