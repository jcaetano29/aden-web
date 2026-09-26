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
  /** Texto al terminar toda la secuencia. */
  finishedText?: string;
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
    finishedText: 'Los viajeros tienen provisiones, su familia tiene noticias y los carros están reparados. Gracias por ayudarlos a regresar.',
    steps: VEIL_CONTRACTS.map(c => ({ id: c.id, title: c.title, intro: c.intro, done: c.done, objective: 'interact' as const,
      targetId: c.objectId, mapId: c.mapId, amount: 1, rewardExp: 0, rewardGold: c.rewardGold,
      rewardItemId: c.rewardItemId, rewardQty: c.rewardQty })) },
  { id: 'tobias', npcId: 'tobias', kind: 'sequence', minLevel: 15, announce: true, completeId: 'tobias_complete',
    returnHint: 'Volvé con Tobías en el campamento minero.',
    finishedText: 'La cuadrilla tiene provisiones, el diario está con Brenna y el martillo vuelve a Aden. Gracias por cuidar a los míos.',
    steps: [
      { id: 't_supplies', title: 'Carga perdida en el tajo', objective: 'interact', targetId: 'tobias_crate', mapId: 'minas', amount: 1, rewardExp: 0, rewardGold: 300, rewardItemId: 'greater_potion', rewardQty: 3,
        intro: 'Una carretilla de provisiones quedó volcada en el tajo oeste (1452, 160). Recuperá lo que puedas y traémelo al campamento.',
        done: 'Pan, aceite y vendas. Con esto la cuadrilla aguanta otra semana ahí abajo. Llevate estas pociones.' },
      { id: 't_diary', title: 'El diario del minero', objective: 'interact', targetId: 'tobias_diary', mapId: 'minas', amount: 1, rewardExp: 0, rewardGold: 450, rewardItemId: 'greater_potion', rewardQty: 3,
        intro: 'Un minero perdió su diario en la galería este (1548, 128). Anotaba dónde se oían los martillos. Traémelo.',
        done: 'Anotó lo mismo cada noche: «el martillo suena bajo la Puerta». Brenna tiene que leer esto. Tomá tu paga.' },
      { id: 't_hammer', title: 'El martillo de la Hermandad', objective: 'interact', targetId: 'tobias_hammer', mapId: 'minas', amount: 1, rewardExp: 0, rewardGold: 600, rewardItemId: 'miner_amulet', rewardQty: 1,
        intro: 'El martillo ceremonial de la Hermandad quedó cerca de la Puerta de la Fragua, al oeste (1478, 98). No lo dejes en manos de las armaduras.',
        done: 'Es el martillo con el que Halden tomaba juramento a sus aprendices. Dorne lo va a querer de vuelta. Tomá este amuleto: lo llevaba cada minero de la cuadrilla.' },
    ] },
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
