import { CASTLE_BRACKETS, castleBracket, type CastleBracket, type CastleView } from "@aden/shared";

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const argentinaTime = (ms: number) =>
  new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(ms));

/** Diálogo del Custodio del Caos según la inscripción abierta, el nivel y si tenés un Sello. */
export function castleDialog(
  view: CastleView | null, next: { startsAt: number; bracket: CastleBracket }, level: number, hasSeal: boolean, now: number,
): { text: string; actionLabel: string; send: boolean } {
  const info = (text: string) => ({ text, actionLabel: "Entendido", send: false });
  if (castleBracket(level) === null) return info("El Castillo del Caos es para nivel 10 o más. Volvé cuando estés listo para pelear contra todos.");
  if (view?.phase === "registration") {
    const b = CASTLE_BRACKETS[view.bracket];
    if (castleBracket(level) !== view.bracket) return info(`La inscripción abierta es para el ${b.name} (nivel ${b.minLevel}–${b.maxLevel}). Esperá el castillo de tu tramo.`);
    if (!hasSeal) return info(`La inscripción al ${b.name} está abierta y empieza en ${clock(view.startsAt - now)}. Necesitás un Sello del Caos: cae de enemigos, cofres y jefes, y se puede intercambiar.`);
    return {
      text: `El ${b.name} empieza en ${clock(view.startsAt - now)}. Entregame un Sello del Caos y te llevo a la arena cuando empiece. Es todos contra todos: el piso se derrumba y sólo puede quedar uno.`,
      actionLabel: "Inscribirme (entregar Sello del Caos)", send: true,
    };
  }
  if (view?.phase === "active") return info(`El ${CASTLE_BRACKETS[view.bracket].name} está en curso: quedan ${view.alive}. Esperá al próximo.`);
  const b = CASTLE_BRACKETS[next.bracket];
  return info(`El próximo es el ${b.name} (nivel ${b.minLevel}–${b.maxLevel}) a las ${argentinaTime(next.startsAt)} (hora de Argentina). La inscripción abre 5 minutos antes y necesitás un Sello del Caos.`);
}
