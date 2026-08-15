import type { Renderer } from "../render/Renderer.js";
import { groundPointToMove } from "./mapping.js";
import type { MoveToMessage } from "@aden/shared";

export class InputController {
  constructor(
    private readonly renderer: Renderer,
    private readonly onMove: (msg: MoveToMessage) => void,
  ) {}

  attach(dom: HTMLElement) {
    dom.addEventListener("click", (e) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      const point = this.renderer.pickGround(ndcX, ndcY);
      if (point) this.onMove(groundPointToMove(point));
    });
  }
}
