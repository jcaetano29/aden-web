import { getItem, sideChainStep, type SideChainDef } from '@aden/shared';

export interface SideChainDialog { text: string; actionLabel: string; send: boolean }

/** Diálogo de un encargo según el progreso del jugador (sin entrada = nunca lo aceptó). */
export function sideChainDialog(chain: SideChainDef, entry: { id: string; progress: number } | undefined): SideChainDialog {
  // Un encargo repetible no tiene completeId: sólo una secuencia puede estar terminada.
  const finished = !!chain.completeId && entry?.id === chain.completeId;
  const step = entry ? sideChainStep(chain, entry.id) : chain.steps[0];
  if (finished || !step) return { text: chain.finishedText ?? '', actionLabel: 'Gracias', send: false };
  const ready = !!entry && entry.progress >= step.amount;
  const reward = `Recompensa: ${step.rewardGold} oro${step.rewardItemId ? ` y ${step.rewardQty ?? 1} ${getItem(step.rewardItemId).name}` : ''}.`;
  return {
    text: `${step.title}\n\n${ready ? step.done : step.intro}\n\n${reward}`,
    actionLabel: ready ? 'Entregar encargo' : entry ? 'Seguir buscando' : 'Aceptar encargo',
    send: !entry || ready,
  };
}
