/**
 * Input de habilidades: teclas 1/2/3 (y Space = slot 0) disparan
 * las skills del kit de la clase. Sólo envía la intención (`onUseSkill`) —
 * el server resuelve target/rango/MP/cooldown de forma autoritativa
 * (cliente no-autoritativo).
 */
export class SkillInput {
  private skillIds: string[] = [];

  constructor(
    private readonly onUseSkill: (skillId: string) => void,
  ) {}

  /** Vincula las 3 skills de la clase a los slots 0/1/2 (teclas Space/1/2). */
  setSkills(ids: string[]) {
    this.skillIds = ids;
  }

  attach(dom: HTMLElement | Document) {
    dom.addEventListener("keydown", (e) => {
      const ev = e as KeyboardEvent;
      let slot: number | null = null;

      // Space = slot 0
      if (ev.code === "Space" || ev.key === " ") {
        slot = 0;
        e.preventDefault(); // evitar que la página se haga scroll
      }
      // Tecla 1 = slot 0
      else if (ev.key === "1" || ev.code === "Digit1" || ev.code === "Numpad1") {
        slot = 0;
      }
      // Tecla 2 = slot 1
      else if (ev.key === "2" || ev.code === "Digit2" || ev.code === "Numpad2") {
        slot = 1;
      }
      // Tecla 3 = slot 2
      else if (ev.key === "3" || ev.code === "Digit3" || ev.code === "Numpad3") {
        slot = 2;
      }

      if (slot !== null && this.skillIds[slot]) {
        this.onUseSkill(this.skillIds[slot]);
      }
    });
  }
}
