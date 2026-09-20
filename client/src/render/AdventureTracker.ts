import { dungeonObjective, getQuest, getZone, getWorldObject, getNpc } from "@aden/shared";

export interface AdventureState {
  questId: string; questProgress: number; mapId: string;
  dungeonStage?: number; dungeonKills?: number;
}
export interface ObjectiveMarker { x: number; z: number; label: string; }

export function adventureGuide(state: AdventureState): { title: string; hint: string; marker?: ObjectiveMarker } {
  if (state.mapId === "cripta") {
    const stage = state.dungeonStage ?? 0;
    const locations = [
      { x: 900, z: 28, label: "Acólitos" }, { x: 890, z: 15, label: "Primera llama" },
      { x: 900, z: 0, label: "Guardias" }, { x: 910, z: -12, label: "Segunda llama" },
      { x: 900, z: -37, label: "Custodio" },
    ];
    return {
      title: stage >= 5 ? "Cripta conquistada" : `Cripta · paso ${stage + 1} de 5`,
      hint: dungeonObjective(stage, state.dungeonKills ?? 0) + (stage === 4 ? " Salí del círculo rojo antes del impacto." : "") +
        (stage >= 5 ? " Abrí M para volver al pueblo. Salir reinicia la expedición." : " Salir o morir reinicia la expedición."),
      marker: locations[stage],
    };
  }
  if (state.questId === "campaign_complete") return { title: "Campaña completada", hint: "Aden está a salvo. Podés repetir la cripta por sus recompensas o explorar nuevas regiones con M." };
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
  constructor(parent: HTMLElement = document.body) {
    this.root.dataset.adventureTracker = "";
    this.root.style.cssText = "position:fixed;right:12px;top:216px;width:min(260px,28vw);padding:13px 15px;background:linear-gradient(135deg,rgba(19,24,31,.92),rgba(12,13,18,.88));border:1px solid #655434;border-left:3px solid #d1ab63;border-radius:4px;color:#e6dfcf;z-index:1000;pointer-events:none;font:13px/1.5 Georgia,serif;box-sizing:border-box;box-shadow:0 5px 20px #0005;";
    this.title.style.cssText = "color:#f4cb82;font-weight:bold;margin-bottom:6px;font-size:14px";
    this.hint.style.cssText = "color:#d0cec6;font:12px/1.5 system-ui,sans-serif";
    this.root.append(this.title, this.hint); parent.appendChild(this.root);
  }
  update(state: AdventureState): ObjectiveMarker | undefined {
    const guide = adventureGuide(state);
    if (this.title.textContent !== guide.title) this.title.textContent = guide.title;
    if (this.hint.textContent !== guide.hint) this.hint.textContent = guide.hint;
    return guide.marker;
  }
}
