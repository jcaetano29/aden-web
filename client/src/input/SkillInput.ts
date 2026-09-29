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
      // Preserve native keyboard actions on forms and the guide's disclosures.
      const ae = document.activeElement;
      const ev = e as KeyboardEvent;
      if (ae instanceof Element && ae.closest('input,textarea,select,[contenteditable]')) return;
      if ((ev.code === 'Space' || ev.key === ' ') && ae instanceof Element && ae.closest('button,a,summary')) return;
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
