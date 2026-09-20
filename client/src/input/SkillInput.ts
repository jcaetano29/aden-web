/**
 * Input de habilidades: teclas 1..6 (y Space = slot 0) disparan las skills
 * APRENDIDAS de la clase. Sólo envía la intención (`onUseSkill`); el server
 * resuelve target/rango/MP/cooldown/aprendizaje de forma autoritativa.
 */
export class SkillInput {
  private skillIds: string[] = [];

  constructor(
    private readonly onUseSkill: (skillId: string) => void,
  ) {}

  /** Vincula las skills aprendidas a los slots 0..5 (teclas 1..6; Space = slot 0). */
  setSkills(ids: string[]) {
    this.skillIds = ids;
  }

  attach(dom: HTMLElement | Document) {
    dom.addEventListener("keydown", (e) => {
      // No disparar skills mientras se tipea en un input (login/guild/etc.).
      const ae = document.activeElement;
      if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement) return;

      const ev = e as KeyboardEvent;
      let slot: number | null = null;

      if (ev.code === "Space" || ev.key === " ") {
        slot = 0;
        e.preventDefault(); // evitar scroll de la página
      } else {
        // Teclas 1..6 → slots 0..5.
        const n = parseInt(ev.key, 10);
        if (n >= 1 && n <= 6) slot = n - 1;
      }

      if (slot !== null && this.skillIds[slot]) {
        this.onUseSkill(this.skillIds[slot]);
      }
    });
  }
}
