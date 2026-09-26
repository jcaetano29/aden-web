import { QUEST_ORDER, CAMPAIGN_COMPLETE } from './act1.js';
import { VEIL_QUEST_ORDER, VEIL_COMPLETE } from './veil.js';
import { MONASTERY_QUEST_ORDER, MEMORY_COMPLETE } from './monastery.js';
import { MINES_QUEST_ORDER, MINES_COMPLETE } from './mines.js';

/** Cómo se ofrece un capítulo desde el estado final del anterior. */
export interface ChapterStart {
  /** completeId del capítulo anterior. */
  after: string;
  /** NPC que lo ofrece. */
  npcId: string;
  minLevel: number;
  lockedText: string;
  startedText: string;
}

export interface ChapterDef {
  id: string;
  questOrder: readonly string[];
  completeId: string;
  /** Título y texto que muestra el diario al cerrar el capítulo. */
  completeTitle: string;
  completeText: string;
  /** null = capítulo inicial: Rowan lo entrega a un personaje sin misión. */
  start: ChapterStart | null;
  /** Mapas que exigen haber llegado a cierto punto de la campaña. */
  mapGates?: Record<string, { from: string; text: string }>;
}

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 'act1', questOrder: QUEST_ORDER, completeId: CAMPAIGN_COMPLETE, start: null,
    completeTitle: 'Campaña completada · Acto I', completeText: 'Derrotaste a Nihil.' },
  { id: 'veil', questOrder: VEIL_QUEST_ORDER, completeId: VEIL_COMPLETE,
    completeTitle: 'El camino recuperado', completeText: 'Recuperaste el paso de las Marismas.',
    start: { after: CAMPAIGN_COMPLETE, npcId: 'elder', minLevel: 10,
      lockedText: 'La expedición a las Marismas requiere nivel 10.',
      startedText: 'Nueva expedición: viajá a las Marismas y encontrá a Maera.' } },
  { id: 'memory', questOrder: MONASTERY_QUEST_ORDER, completeId: MEMORY_COMPLETE,
    completeTitle: 'La Memoria del Velo · completada', completeText: 'El Prior cayó y los cautivos recuperaron sus nombres. Iria conserva los testimonios para que Aden no vuelva a olvidar.',
    start: { after: VEIL_COMPLETE, npcId: 'maera', minLevel: 12,
      lockedText: 'La expedición al Monasterio requiere nivel 12.',
      startedText: 'Nueva expedición: encontrá a Iria en el Monasterio de la Vigilia.' },
    mapGates: { monasterio: { from: VEIL_COMPLETE, text: 'Recuperá el paso de las Marismas y hablá con Maera antes de viajar al Monasterio.' } } },
  { id: 'mines', questOrder: MINES_QUEST_ORDER, completeId: MINES_COMPLETE,
    completeTitle: 'Las Minas de Hierro Negro · completadas',
    completeText: 'Halden cayó y confesó lo que despertó bajo la montaña. La Fragua de los Primeros espera: pronto se abrirá el camino.',
    start: { after: MEMORY_COMPLETE, npcId: 'smith', minLevel: 15,
      lockedText: 'La expedición a las Minas requiere nivel 15.',
      startedText: 'Nueva expedición: viajá a las Minas de Hierro Negro y encontrá a Brenna.' },
    mapGates: { minas: { from: 'f_arrival', text: 'Hablá con Dorne en Aden antes de bajar a las Minas de Hierro Negro.' } } },
];

/** Secuencia global: misiones de cada capítulo seguidas de su estado final. */
const SEQUENCE: readonly string[] = CHAPTERS.flatMap(c => [...c.questOrder, c.completeId]);

/** Posición de un questId en la campaña completa; -1 si no pertenece a ella. */
export function campaignIndex(questId: string): number {
  return SEQUENCE.indexOf(questId);
}

/** ¿El jugador ya llegó (o pasó) a `gate` en la campaña? */
export function questReached(questId: string, gate: string): boolean {
  const at = campaignIndex(questId), need = campaignIndex(gate);
  return at >= 0 && need >= 0 && at >= need;
}

export function isChapterComplete(questId: string): boolean {
  return CHAPTERS.some(c => c.completeId === questId);
}

/** Capítulo que se ofrece desde este estado final, o null. */
export function chapterAfter(completeId: string): ChapterDef | null {
  return CHAPTERS.find(c => c.start?.after === completeId) ?? null;
}

/** Siguiente misión de la campaña; un estado final se queda donde está. */
export function nextQuestId(current: string): string {
  if (isChapterComplete(current)) return current;
  for (const c of CHAPTERS) {
    const i = c.questOrder.indexOf(current);
    if (i >= 0) return c.questOrder[i + 1] ?? c.completeId;
  }
  return CHAPTERS[0].questOrder[0];
}

/** Restricción de campaña para viajar a un mapa (null = sin restricción). */
export function mapGate(mapId: string): { from: string; text: string } | null {
  for (const c of CHAPTERS) {
    const gate = c.mapGates?.[mapId];
    if (gate) return gate;
  }
  return null;
}
