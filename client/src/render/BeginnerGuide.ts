import { getQuest, QUEST_ORDER } from '@aden/shared';
import type { AdventureState } from './AdventureTracker.js';
import './BeginnerGuide.css';

export interface BeginnerState extends AdventureState {
  level?: number; hp?: number; maxHp?: number; statPoints?: number; dead?: boolean;
}
interface Lesson { id: string; title: string; text: string; control: string; }

/** The handbook and contextual tips share one source of instructions. */
const LESSONS: Lesson[] = [
  { id: 'npc', title: 'Tu primer encuentro', control: 'Clic en el suelo · Clic en Rowan', text: 'En el pueblo, hacé clic en el suelo para caminar hacia el Anciano Rowan, junto a la fuente. Si saliste, volvé al pueblo con M. Buscá el ! amarillo y su marcador en el minimapa. Cuando estés cerca, hacé clic en él y aceptá la misión en el diálogo. Los NPC son los personajes que te dan misiones, venden o te ayudan.' },
  { id: 'travel', title: 'Salí del pueblo', control: 'M · Mapa y viajes', text: 'Abrí el mapa con M y elegí Bosque de Umbra. Cada destino indica su nivel necesario. El panel de aventura te recuerda qué buscar; el marcador del minimapa señala tu objetivo. Podés volver al pueblo desde el mismo mapa.' },
  { id: 'combat', title: 'Tu primer combate', control: 'Clic en un enemigo · 1 o Espacio', text: 'Caminá cerca de un Explorador Óseo y hacé clic en él para seleccionarlo. Atacás automáticamente cuando está a tu alcance. Usá 1 o Espacio para la primera habilidad; las teclas 1 a 6 corresponden a tu barra. Las habilidades consumen maná y necesitan tiempo para volver a usarse.' },
  { id: 'rewards', title: 'Terminaste: cobrá tu recompensa', control: 'M · Pueblo · Clic en Rowan', text: 'Completar el contador no entrega la recompensa por sí solo. Volvé al pueblo, acercate a Rowan y hacé clic en él: el ✓ verde indica que podés entregar la misión. Confirmá la acción del diálogo para recibir experiencia, oro y, en algunas misiones, equipo.' },
  { id: 'equipment', title: 'Probá tu nuevo equipo', control: 'I · Inventario', text: 'Rowan te entregó un chaleco al completar tu primera misión. Abrí I, elegí el objeto y usá Equipar. Compará sus atributos con lo que llevás puesto. El equipo en la mochila no te da sus mejoras hasta que lo equipás.' },
  { id: 'objects', title: 'No todo se resuelve luchando', control: 'Acercate · Clic en el objeto', text: 'Los cofres, barriles y santuarios también se pueden usar. Buscá el cofre de provisiones señalado en el minimapa, caminá hasta él y hacé clic. Para recoger botín del suelo, hacé clic en el objeto: tu personaje se acerca para recogerlo.' },
  { id: 'shrine', title: 'Una ayuda para el camino', control: 'Clic en el santuario', text: 'Acercate al santuario marcado y hacé clic para activarlo. Su bendición aumenta tu ataque durante 30 segundos; podés renovarla cuando esté disponible. Mirá el objetivo de la misión para saber cuándo volver con Rowan.' },
  { id: 'recovery', title: 'Cuidá tu vida y tu maná', control: 'Q · Poción de vida', text: 'Si te falta vida y tenés una poción, Q inicia una recuperación gradual. Esperá su recarga antes de tomar otra. Las pociones de maná se usan desde I. Comprá provisiones a Bram; Elenya puede restaurar vida y maná a cambio de oro en el pueblo.' },
  { id: 'stats', title: 'Hacé crecer a tu personaje', control: 'C · Atributos', text: 'Al subir de nivel recibís puntos de atributo. Abrí C, revisá qué mejora cada atributo y repartí tus puntos. Las nuevas habilidades aparecen en tu barra según tu clase y nivel; algunas también se obtienen de tomos o armas.' },
  { id: 'skills', title: 'Conocé tu barra de habilidades', control: '1–6 · Habilidades', text: 'Revisá las habilidades disponibles en tu barra y su coste de maná. Para atacar necesitás un enemigo seleccionado y dentro de alcance. Si usás arco o ballesta, llevá la munición correspondiente; Bram vende provisiones. Las habilidades de equipo cambian al cambiar de arma.' },
  { id: 'boss', title: 'Los golpes de los jefes', control: 'Clic en el suelo · Salí del área roja', text: 'Revisá tu equipo en I y llevá pociones antes de enfrentar al Alfa de Umbra o a otros jefes. Los círculos y áreas rojas anuncian un golpe: caminá fuera antes del impacto. Podés seguir luchando después de esquivar; no hace falta quedarte quieto para mantener un objetivo.' },
  { id: 'services', title: 'El pueblo también te hace más fuerte', control: 'Clic en los NPC del pueblo', text: 'Bram vende pociones y munición. Dorne ofrece equipo y te orienta sobre la fragua. Elenya restaura vida y maná por oro. Varek propone contratos opcionales. Acercate a la plaza y hacé clic en cada uno para conocer sus servicios.' },
  { id: 'social', title: 'Aventurate en compañía', control: 'P · Grupo   1–6 · Habilidades   Enter · Chat', text: 'Abrí P para invitar jugadores a tu grupo. Elegí un compañero vivo en la lista del grupo y luego usá Cura Arcana o Guardia para ayudarlo a 10 m, en el mismo mapa. Tu enemigo seleccionado se conserva. Sobre mí limpia la selección para volver al apoyo propio. La lista muestra clases, Protección y Furia; estas ayudas no funcionan en Castillo. El líder elige el botín Por turnos o Libre: Por turnos reserva cada recompensa durante 30 segundos para un compañero elegible. Enter abre el chat: Cerca habla con vecinos y Global con todo el servidor. R permite intercambiar oro y objetos con jugadores cercanos; revisá la oferta antes de confirmarla. G abre los clanes y L la clasificación.' },
  { id: 'dungeon', title: 'La Cripta, paso a paso', control: 'Seguí el objetivo · Activá los sellos', text: 'La Cripta es una expedición compartida. Despejá cada sala y hacé clic en su sello para avanzar. Los enemigos derrotados no reaparecen durante la expedición. Al morir volvés al pueblo y podés reingresar; el avance se reinicia cuando no queda nadie dentro.' },
  { id: 'progress', title: 'Más allá de las primeras misiones', control: 'T · Progreso   M · Destinos', text: 'En T podés consultar logros y tu misión diaria. Seguí la campaña para descubrir nuevas regiones, equipo y servicios de la fragua. Los avisos del mundo anuncian invasiones y eventos; revisá su destino y requisitos antes de viajar. El Custodio del Caos explica cómo participar en el Castillo.' },
  { id: 'death', title: 'Volvé a intentarlo', control: 'Esperá la reaparición', text: 'Al morir volvés al pueblo. Revisá tu equipo y tus provisiones antes de regresar con M. Tu misión sigue registrada: el panel de aventura te indica cómo continuar. Contra un jefe, buscá sus avisos rojos y dejá espacio para esquivar.' },
];
const byId = new Map(LESSONS.map(lesson => [lesson.id, lesson]));

/** Derives guidance from server progress, never advances quests or invents completion. */
export function beginnerLesson(state: BeginnerState, seen: ReadonlySet<string> = new Set()): Lesson | undefined {
  if ((state.level ?? 1) > 10 || (state.questId && !QUEST_ORDER.includes(state.questId))) return;
  const candidates: string[] = [];
  if (state.dead) candidates.push('death');
  if (!state.dead && state.hp !== undefined && state.maxHp && state.hp < state.maxHp * .5) candidates.push('recovery');
  if ((state.statPoints ?? 0) > 0) candidates.push('stats');
  const quest = state.questId ? getQuest(state.questId) : undefined;
  if (quest && state.questProgress >= quest.amount) candidates.push('rewards');
  else if (!quest) candidates.push('npc');
  else if (state.questId === 'q1') candidates.push(state.mapId === 'pueblo' ? 'travel' : 'combat');
  else {
    const lessons: Record<string, string[]> = {
      q_supplies: ['equipment', 'objects'], q_shrine: ['shrine'], q2: ['skills', 'recovery'],
      q_alpha: ['boss'], q_ruins: ['stats', 'services'], q3: ['services', 'social'],
      q4: ['boss', 'social'], q_crypt: ['dungeon'], q5: ['progress'], q_ash_shrine: ['progress'], q6: ['boss', 'progress'],
    };
    candidates.push(...(lessons[state.questId] ?? []));
  }
  const id = candidates.find(candidate => !seen.has(candidate));
  return id ? byId.get(id) : undefined;
}

/** Preferences are local to this browser and character; campaign progress stays on the server. */
export class BeginnerGuide {
  private readonly root = document.createElement('section');
  private readonly tip: HTMLElement;
  private readonly manual: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly heading: HTMLElement;
  private readonly text: HTMLElement;
  private readonly control: HTMLElement;
  private seen = new Set<string>();
  private hidden = false;
  private key = '';
  private current?: Lesson;
  private state?: BeginnerState;

  constructor(parent: HTMLElement) {
    this.root.className = 'beginner-guide';
    this.root.hidden = true;
    this.root.innerHTML = `
      <button type="button" class="beginner-guide-toggle" aria-expanded="false">Guía de juego <kbd>H</kbd></button>
      <div data-guide-tip hidden>
        <div class="beginner-guide-copy" aria-live="polite"><h3></h3><p></p><strong></strong></div>
        <div class="beginner-guide-actions"><button type="button" data-guide-ack>Entendido</button><button type="button" data-guide-hide>Ocultar consejos</button></div>
      </div>
      <div data-guide-manual hidden><p class="beginner-guide-intro">Aprendé a tu ritmo. Tu objetivo actual sigue arriba.</p><div class="beginner-guide-lessons"></div>
        <button type="button" data-guide-resume>Reactivar consejos desde mi progreso</button>
      </div>`;
    this.tip = this.root.querySelector('[data-guide-tip]')!;
    this.manual = this.root.querySelector('[data-guide-manual]')!;
    this.toggle = this.root.querySelector('.beginner-guide-toggle')!;
    this.heading = this.tip.querySelector('h3')!;
    this.text = this.tip.querySelector('p')!;
    this.control = this.tip.querySelector('strong')!;
    for (const lesson of LESSONS) {
      const details = document.createElement('details');
      const title = document.createElement('summary'); title.textContent = lesson.title;
      const text = document.createElement('p'); text.textContent = lesson.text;
      const control = document.createElement('strong'); control.textContent = lesson.control;
      details.append(title, text, control);
      this.root.querySelector('.beginner-guide-lessons')!.append(details);
    }
    this.toggle.addEventListener('click', () => this.toggleManual());
    this.root.querySelector('[data-guide-ack]')!.addEventListener('click', () => {
      if (this.current) this.seen.add(this.current.id);
      this.save(); this.refresh();
    });
    this.root.querySelector('[data-guide-hide]')!.addEventListener('click', () => {
      this.hidden = true; this.save(); this.refresh(); this.toggle.focus();
    });
    this.root.querySelector('[data-guide-resume]')!.addEventListener('click', () => {
      this.seen.clear(); this.hidden = false; this.manual.hidden = true;
      this.toggle.setAttribute('aria-expanded', 'false');
      this.save(); this.refresh(); this.toggle.focus();
    });
    parent.append(this.root);
  }

  setCharacter(name: string, isNew = false) {
    this.key = `aden.guide.v1:${encodeURIComponent(name.trim())}`;
    this.seen = new Set(); this.hidden = false; this.state = undefined; this.current = undefined;
    this.manual.hidden = true; this.toggle.setAttribute('aria-expanded', 'false');
    try {
      const saved = isNew ? null : JSON.parse(localStorage.getItem(this.key) ?? 'null');
      if (saved && Array.isArray(saved.seen)) this.seen = new Set(saved.seen.filter((id: unknown) => typeof id === 'string' && byId.has(id)));
      this.hidden = saved?.hidden === true;
    } catch { /* Storage can be unavailable or hold an older/corrupt value. */ }
    if (isNew) this.save();
    this.root.hidden = false; this.refresh();
  }

  update(state: BeginnerState) { this.state = state; this.refresh(); }

  toggleManual() {
    this.manual.hidden = !this.manual.hidden;
    this.toggle.setAttribute('aria-expanded', String(!this.manual.hidden));
    this.refresh();
  }

  private refresh() {
    const lesson = this.state ? beginnerLesson(this.state, this.seen) : undefined;
    this.tip.hidden = this.hidden || !this.manual.hidden || !lesson;
    if (lesson?.id !== this.current?.id) {
      this.current = lesson;
      this.heading.textContent = lesson?.title ?? '';
      this.text.textContent = lesson?.text ?? '';
      this.control.textContent = lesson?.control ?? '';
    }
  }

  private save() {
    try { localStorage.setItem(this.key, JSON.stringify({ seen: [...this.seen], hidden: this.hidden })); }
    catch { /* The guide still works for this session when storage is blocked. */ }
  }
}
