import { MEMORY_ANCHORS } from './monastery.js';

export type HazardShape = 'circle' | 'cone';

export interface HazardPattern {
  shape: HazardShape;
  /** Círculos: 'target' se fija sobre el objetivo al iniciar el aviso; 'self' sobre el jefe. El cono siempre nace en el jefe. */
  anchor: 'target' | 'self';
  radius: number;
  /** Solo cono: apertura total en grados. */
  angleDeg?: number;
  windupMs: number;
  /** Multiplicador de daño del impacto sobre el ataque del jefe. */
  power: number;
  /** Canalización: marca `channeling` mientras dura el aviso. */
  channel?: boolean;
  /** Objetos del mapa que cortan la canalización. */
  interruptObjects?: readonly string[];
  interruptCooldownMs?: number;
  interruptStunMs?: number;
  interruptTexts?: { success: string; tooWeak: string; idle: string };
}

export interface EncounterSummon {
  templateId: string;
  /** Una vez por intento, al bajar de este porcentaje de vida (0..1). */
  atHpPct?: number;
  count?: number;
  /** Periódico: cada `everyMs` desde cada objeto activo de `fromObjects`. */
  everyMs?: number;
  fromObjects?: readonly string[];
  /** Tope de invocaciones vivas (por objeto si es periódico; total si es por vida). */
  maxAlive: number;
}

export interface EncounterDef {
  templateId: string;
  aggroRadius: number;
  /** Espera tras cada impacto. */
  cooldownMs: number;
  /** Se alternan según la cantidad de ataques ya lanzados. */
  patterns: readonly HazardPattern[];
  /** Con media vida o menos: reemplaza la espera y/o los patrones. */
  belowHalf?: { cooldownMs?: number; patterns?: readonly HazardPattern[] };
  summons?: readonly EncounterSummon[];
  /** Solo pueden pelearlo quienes llegaron a esta misión o más allá. */
  requiresQuest?: string;
}

const circle = (radius: number, windupMs: number, power: number): HazardPattern => ({ shape: 'circle', anchor: 'target', radius, windupMs, power });
const heavy = (templateId: string): EncounterDef => ({ templateId, aggroRadius: 14, cooldownMs: 9000, patterns: [circle(5, 2000, 2.2)] });

export const ENCOUNTERS: Record<string, EncounterDef> = {
  crypt_warden: { templateId: 'crypt_warden', aggroRadius: 14, cooldownMs: 7000, patterns: [circle(6, 1600, 2.2)] },
  crypt_behemoth: heavy('crypt_behemoth'),
  veil_guardian: heavy('veil_guardian'),
  memory_jailer: heavy('memory_jailer'),
  skeleton_king: { templateId: 'skeleton_king', aggroRadius: 14, cooldownMs: 8000, patterns: [circle(6, 1800, 2.8)], belowHalf: { cooldownMs: 5000 } },
  memory_prior: {
    templateId: 'memory_prior', aggroRadius: 14, cooldownMs: 6000, requiresQuest: 'a2_prior',
    patterns: [circle(6, 1800, 2.4)],
    belowHalf: { patterns: [circle(6, 1800, 2.4), {
      shape: 'circle', anchor: 'self', radius: 14, windupMs: 6000, power: 3.2, channel: true,
      interruptObjects: MEMORY_ANCHORS, interruptCooldownMs: 9000, interruptStunMs: 3000,
      interruptTexts: {
        success: 'Vínculo roto. ¡El Prior quedó expuesto!',
        tooWeak: 'El vínculo supera tu poder actual.',
        idle: 'Anclaje examinado. Activá uno durante la canalización del Prior.',
      },
    }] },
  },
};

export function getEncounter(templateId: string): EncounterDef | undefined {
  return ENCOUNTERS[templateId];
}

/** Canalización que un objeto puede interrumpir (y de qué jefe). */
export function encounterInterruptFor(objectId: string): { templateId: string; pattern: HazardPattern } | null {
  for (const def of Object.values(ENCOUNTERS)) {
    for (const pattern of [...def.patterns, ...(def.belowHalf?.patterns ?? [])]) {
      if (pattern.channel && pattern.interruptObjects?.includes(objectId)) return { templateId: def.templateId, pattern };
    }
  }
  return null;
}
