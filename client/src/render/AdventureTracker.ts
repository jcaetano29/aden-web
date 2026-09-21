import { cryptStory, dungeonObjective, getQuest, getZone, getWorldObject, getNpc, CRYPT_ROOMS, CRYPT_SEALS, CRYPT_BOSS } from "@aden/shared";
import "./GameLayout.css";

export interface AdventureState {
  questId: string; questProgress: number; mapId: string;
  dungeonStage?: number; dungeonKills?: number;
}
export interface ObjectiveMarker { x: number; z: number; label: string; }

export function adventureGuide(state: AdventureState): { title: string; hint: string; story?: string; marker?: ObjectiveMarker } {
  if (state.mapId === "cripta") {
    const stage = state.dungeonStage ?? 0;
    const locations = [
      { ...CRYPT_ROOMS[1], label: "Cámara del Despertar" }, { ...CRYPT_SEALS[0], label: "Primera llama" },
      { ...CRYPT_ROOMS[2], label: "Fragua de las Bestias" }, { ...CRYPT_SEALS[1], label: "Segunda llama" },
      { ...CRYPT_BOSS, label: "Custodio" },
    ];
    return {
      title: stage >= 5 ? "Cripta conquistada" : `Cripta · paso ${stage + 1} de 5`,
      hint: dungeonObjective(stage, state.dungeonKills ?? 0) + (stage === 2 || stage === 4 ? " Salí del círculo rojo antes del impacto." : "") +
        (stage >= 5 ? " Abrí M para volver al pueblo. Se abre una nueva expedición cuando todos salen." : " Los enemigos derrotados no reaparecen. El avance es compartido; sólo se reinicia cuando no queda nadie dentro. Al morir volvés al pueblo; podés reingresar y sumarte al avance actual."),
      marker: locations[stage],
      story: state.questId === 'q_crypt' ? cryptStory(stage) : undefined,
    };
  }
  if (state.questId === "campaign_complete") return { title: "Campaña completada", hint: "Derrotaste a Nihil. Hablá con la gente de Aden, aceptá contratos de Varek o volvé a la Cripta por sus recompensas." };
  if (!state.questId) return { title: "Tu aventura empieza aquí", hint: "Hablá con el Anciano en la plaza para aceptar tu primera misión.", marker: state.mapId === "pueblo" ? { ...getNpc("elder"), label: "Anciano" } : undefined };
  try {
    const q = getQuest(state.questId);
    if (state.questProgress >= q.amount) return { title: "Recompensa disponible", hint: "Volvé al Anciano en el pueblo para entregar tu misión. Usá M para viajar.", marker: state.mapId === "pueblo" ? { ...getNpc("elder"), label: "Entregar" } : undefined };
    const zone = q.mapId ? getZone(q.mapId) : undefined;
    let marker: ObjectiveMarker | undefined;
    if (q.mapId === state.mapId && q.targetId && q.objective === "interact") {
      try { const object = getWorldObject(q.targetId); marker = { x: object.x, z: object.z, label: "Objetivo" }; } catch { /* Optional target isn't a world object. */ }
    }
    if (!marker && zone?.id === state.mapId) marker = { ...zone.center, label: "Zona de misión" };
    return { title: q.title, hint: `${q.hint ?? q.intro}${zone && zone.id !== state.mapId ? ` Abrí M y viajá a ${zone.name} (nivel ${zone.levelReq}).` : ""}`, marker };
  } catch { return { title: "Aventura", hint: "Hablá con el Anciano para conocer tu próximo objetivo." }; }
}

/** Persistent next-step guidance, deliberately independent of the combat HUD. */
export class AdventureTracker {
  private readonly root = document.createElement("aside");
  private readonly title = document.createElement("div");
  private readonly hint = document.createElement("div");
  private readonly story = document.createElement("div");
  constructor(parent: HTMLElement = document.body) {
    this.root.dataset.adventureTracker = "";
    this.root.className = "aden-adventure-tracker";
    this.root.tabIndex = 0;
    this.root.setAttribute("aria-label", "Objetivo de aventura");
    this.root.style.cssText = "background:linear-gradient(135deg,rgba(19,24,31,.92),rgba(12,13,18,.88));border:1px solid #655434;border-left:3px solid #d1ab63;border-radius:4px;color:#e6dfcf;pointer-events:auto;font:13px/1.5 Georgia,serif;box-shadow:0 5px 20px #0005;";
    this.title.style.cssText = "color:#f4cb82;font-weight:bold;margin-bottom:6px;font-size:14px";
    this.hint.style.cssText = "color:#d0cec6;font:12px/1.5 system-ui,sans-serif";
    this.story.style.cssText = "margin-top:10px;padding-top:8px;border-top:1px solid #655434;color:#d9bd8c;font:italic 12px/1.5 Georgia,serif";
    this.story.hidden = true;
    this.root.append(this.title, this.hint, this.story); parent.appendChild(this.root);
  }
  update(state: AdventureState): ObjectiveMarker | undefined {
    const guide = adventureGuide(state);
    if (this.title.textContent !== guide.title) this.title.textContent = guide.title;
    if (this.hint.textContent !== guide.hint) this.hint.textContent = guide.hint;
    if (this.story.textContent !== (guide.story ?? '')) this.story.textContent = guide.story ?? '';
    this.story.hidden = !guide.story;
    return guide.marker;
  }
}
