/**
 * Input de habilidades: tecla "1" (y, opcionalmente, barra espaciadora) dispara
 * la skill característica de la clase. Sólo envía la intención (`onUseSkill`) —
 * el server resuelve target/rango/MP/cooldown de forma autoritativa
 * (cliente no-autoritativo).
 */
export class SkillInput {
  constructor(
    private readonly skillId: string,
    private readonly onUseSkill: (skillId: string) => void,
  ) {}

  attach(dom: HTMLElement | Document) {
    dom.addEventListener("keydown", (e) => {
      const ev = e as KeyboardEvent;
      if (ev.key === "1" || ev.code === "Digit1" || ev.code === "Numpad1") {
        this.onUseSkill(this.skillId);
        return;
      }
      if (ev.code === "Space" || ev.key === " ") {
        this.onUseSkill(this.skillId);
      }
    });
  }
}
