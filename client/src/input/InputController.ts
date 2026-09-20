import * as THREE from "three";
import type { Renderer } from "../render/Renderer.js";
import type { EntityViews } from "../render/EntityViews.js";
import { groundPointToMove } from "./mapping.js";
import type { MoveToMessage } from "@aden/shared";

/** Un NPC clickeable: su mesh raíz + qué hacer al hacerle clic. */
export interface NpcInteractable {
  object: THREE.Object3D;
  onInteract: () => void;
}

export class InputController {
  constructor(
    private readonly renderer: Renderer,
    private readonly views: EntityViews,
    private readonly onMove: (msg: MoveToMessage) => void,
    private readonly onPickMob: (mobId: string) => void,
    private readonly onPickPlayer: (playerId: string) => void,
    private readonly onPickObject?: (objectId: string) => void,
    private readonly objectTargets?: () => { objects: THREE.Object3D[]; idOf: (o: THREE.Object3D) => string | null },
    /** NPCs clickeables (Anciano, Mercader, Sanadora, Herrero, Capitán). Se chequean primero. */
    private readonly npcTargets?: () => NpcInteractable[],
  ) {}

  attach(dom: HTMLElement) {
    dom.addEventListener("click", (e) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

      // Raycast a los NPCs primero (antes que mobs/objetos/suelo).
      if (this.npcTargets) {
        this.renderer.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.renderer.camera);
        for (const npc of this.npcTargets()) {
          const hits = this.renderer.raycaster.intersectObject(npc.object, true);
          if (hits.length > 0) {
            npc.onInteract();
            return;
          }
        }
      }

      const mobId = this.renderer.pickMobs(ndcX, ndcY, this.views.raycastTargets());
      if (mobId) {
        this.onPickMob(mobId);
        return;
      }

      // Raycast a otros jugadores (targeting PvP) — mismo mecanismo que mobs.
      const playerId = this.renderer.pickMobs(ndcX, ndcY, this.views.raycastPlayerTargets());
      if (playerId) {
        this.onPickPlayer(playerId);
        return;
      }

      // Raycast a objetos de mundo (cofres/barriles/santuarios) — antes que el suelo.
      if (this.onPickObject && this.objectTargets) {
        const objId = this.renderer.pickMobs(ndcX, ndcY, this.objectTargets());
        if (objId) {
          this.onPickObject(objId);
          return;
        }
      }

      const point = this.renderer.pickGround(ndcX, ndcY);
      if (point) this.onMove(groundPointToMove(point));
    });
  }
}
