import * as THREE from "three";
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
    private readonly onInteractNpc?: () => void,
    private readonly npcObject?: THREE.Object3D,
  ) {}

  attach(dom: HTMLElement) {
    dom.addEventListener("click", (e) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

      // Raycast al NPC primero (antes que mobs/suelo)
      if (this.npcObject && this.onInteractNpc) {
        this.renderer.raycaster.setFromCamera(
          new THREE.Vector2(ndcX, ndcY),
          this.renderer.camera,
        );
        const hits = this.renderer.raycaster.intersectObject(this.npcObject, true);
        if (hits.length > 0) {
          this.onInteractNpc();
          return;
        }
      }

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
