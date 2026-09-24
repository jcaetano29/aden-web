import { cryptStory, dungeonObjective, getQuest, getZone, getWorldObject, getNpc, CRYPT_ROOMS, CRYPT_SEALS, CRYPT_BOSS } from "@aden/shared";
import { VEIL_COMPLETE, MEMORY_COMPLETE, getVeilContract } from '@aden/shared';

export interface AdventureState {
  questId: string; questProgress: number; mapId: string;
  dungeonStage?: number; dungeonKills?: number;
  veilContractId?: string; veilContractProgress?: number;
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
  if (state.questId === VEIL_COMPLETE) return { title: 'El camino recuperado', hint: 'Hablá con Maera en el puesto de las Marismas para iniciar la expedición al Monasterio de la Vigilia (nivel 12).', marker: state.mapId === 'marismas' ? {...getNpc('maera'),label:'Nueva expedición'} : undefined };
  if (state.questId === MEMORY_COMPLETE) return { title: 'La Memoria del Velo · completada', hint: 'El Prior cayó y los cautivos recuperaron sus nombres. Conservá el relicario de Iria y continuá explorando Aden.' };
  if (state.questId === "campaign_complete") return { title: "Campaña completada · Acto I", hint: "Derrotaste a Nihil. Hablá con Rowan en Aden para iniciar la expedición a las Marismas (nivel 10).", marker: state.mapId === 'pueblo' ? {...getNpc('elder'),label:'Nueva expedición'} : undefined };
  if (!state.questId) return { title: "Tu aventura empieza aquí", hint: "Hablá con el Anciano en la plaza para aceptar tu primera misión.", marker: state.mapId === "pueblo" ? { ...getNpc("elder"), label: "Anciano" } : undefined };
  try {
    const q = getQuest(state.questId);
    const receiver = getNpc(q.returnNpcId ?? 'elder');
    if (state.questProgress >= q.amount) return { title: "Recompensa disponible", hint: `Volvé con ${receiver.name} en ${getZone(receiver.mapId ?? 'pueblo').name} para entregar tu misión. Usá M para viajar.`, marker: state.mapId === receiver.mapId ? { ...receiver, label: "Entregar" } : undefined };
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
  private readonly contract = document.createElement('div');
  constructor(parent: HTMLElement = document.body) {
    this.root.dataset.adventureTracker = "";
    this.root.style.cssText = "position:fixed;right:12px;top:272px;width:min(260px,28vw);padding:13px 15px;background:linear-gradient(135deg,rgba(19,24,31,.92),rgba(12,13,18,.88));border:1px solid #655434;border-left:3px solid #d1ab63;border-radius:4px;color:#e6dfcf;z-index:1000;pointer-events:none;font:13px/1.5 Georgia,serif;box-sizing:border-box;box-shadow:0 5px 20px #0005;";
    this.title.style.cssText = "color:#f4cb82;font-weight:bold;margin-bottom:6px;font-size:14px";
    this.hint.style.cssText = "color:#d0cec6;font:12px/1.5 system-ui,sans-serif";
    this.story.style.cssText = "margin-top:10px;padding-top:8px;border-top:1px solid #655434;color:#d9bd8c;font:italic 12px/1.5 Georgia,serif";
    this.story.hidden = true;
    this.root.style.maxHeight = 'calc(100dvh - 296px)';
    this.root.style.overflowY = 'auto';
    this.root.style.pointerEvents = 'auto';
    this.root.append(this.title, this.hint, this.story); parent.appendChild(this.root);
    this.contract.style.cssText='margin-top:10px;padding-top:8px;border-top:1px solid #655434;color:#bfc8bd;font:11px/1.5 system-ui,sans-serif';
    this.contract.hidden=true;this.root.appendChild(this.contract);
  }
  update(state: AdventureState): ObjectiveMarker | undefined {
    const guide = adventureGuide(state);
    if (this.title.textContent !== guide.title) this.title.textContent = guide.title;
    if (this.hint.textContent !== guide.hint) this.hint.textContent = guide.hint;
    if (this.story.textContent !== (guide.story ?? '')) this.story.textContent = guide.story ?? '';
    this.story.hidden = !guide.story;
    const errand=getVeilContract(state.veilContractId??'');
    const errandText=errand?`Boren · ${errand.title}\n${(state.veilContractProgress??0)>=1?'Listo para entregar. Volvé al puesto de las Marismas.':errand.intro}`:'';
    this.contract.hidden=!errand;
    if(this.contract.textContent!==errandText)this.contract.textContent=errandText;
    return guide.marker;
  }
}
