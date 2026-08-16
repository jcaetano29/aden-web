import type { Renderer } from "../render/Renderer.js";
import type { EntityViews } from "../render/EntityViews.js";
import { groundPointToMove } from "./mapping.js";
import type { MoveToMessage } from "@aden/shared";

export class InputController {
  constructor(
    private readonly renderer: Renderer,
    private readonly views: EntityViews,
    private readonly onMove: (msg: MoveToMessage) => void,
    private readonly onPickMob: (mobId: string) => void,
  ) {}

  attach(dom: HTMLElement) {
    dom.addEventListener("click", (e) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

      const mobId = this.renderer.pickMobs(ndcX, ndcY, this.views.raycastTargets());
      if (mobId) {
        this.onPickMob(mobId);
        return;
      }

      const point = this.renderer.pickGround(ndcX, ndcY);
      if (point) this.onMove(groundPointToMove(point));
    });
  }
}
