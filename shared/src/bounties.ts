/**
 * Contratos (bounties) del Capitán de la Guardia (Etapa 20): una segunda vía de
 * misiones REPETIBLE, en paralelo a la campaña principal del Anciano. Son cacerías
 * simples sobre los enemigos que ya existen, escaladas por zona. A diferencia de la
 * campaña (lineal, 6 quests), los contratos ROTAN en bucle: al entregar uno, el
 * Capitán ofrece el siguiente, para siempre. Se otorgan/entregan hablando con él;
 * el progreso se cuenta al matar. Estado en PlayerState.bountyId/bountyProgress.
 */

export interface Bounty {
  id: string;
  title: string;
  /** "" = cualquier enemigo cuenta; si no, sólo ese templateId. */
  mobTemplateId: string;
  amount: number;
  rewardExp: number;
  rewardGold: number;
}

export const BOUNTIES: Record<string, Bounty> = {
  b_forest: {
    id: "b_forest",
    title: "Limpieza del Bosque",
    mobTemplateId: "skeleton_minion",
    amount: 8,
    rewardExp: 90,
    rewardGold: 45,
  },
  b_warriors: {
    id: "b_warriors",
    title: "Vieja Guardia",
    mobTemplateId: "skeleton_warrior",
    amount: 6,
    rewardExp: 180,
    rewardGold: 85,
  },
  b_crypt: {
    id: "b_crypt",
    title: "Ecos de la Cripta",
    mobTemplateId: "crypt_minion",
    amount: 7,
    rewardExp: 300,
    rewardGold: 140,
  },
  b_hunt: {
    id: "b_hunt",
    title: "Contrato Abierto",
    mobTemplateId: "",
    amount: 15,
    rewardExp: 260,
    rewardGold: 120,
  },
  b_ash: {
    id: "b_ash",
    title: "Fuego del Yermo",
    mobTemplateId: "ash_minion",
    amount: 6,
    rewardExp: 560,
    rewardGold: 260,
  },
};

export const BOUNTY_ORDER: string[] = ["b_forest", "b_warriors", "b_crypt", "b_hunt", "b_ash"];

export function getBounty(id: string): Bounty {
  const b = BOUNTIES[id];
  if (!b) throw new Error(`getBounty: contrato desconocido ${id}`);
  return b;
}

export function firstBountyId(): string {
  return BOUNTY_ORDER[0];
}

/** El siguiente contrato en la rotación (vuelve al primero tras el último). */
export function nextBountyId(current: string): string {
  const idx = BOUNTY_ORDER.indexOf(current);
  if (idx === -1) return BOUNTY_ORDER[0];
  return BOUNTY_ORDER[(idx + 1) % BOUNTY_ORDER.length];
}
