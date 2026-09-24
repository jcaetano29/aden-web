import * as THREE from "three";
import type { NpcRole } from "@aden/shared";
import type { Character, CharacterFactory } from "./CharacterFactory.js";

const MODELS: Record<NpcRole, string> = { elder: "Mage", merchant: "Rogue", healer: "Mage", smith: "Barbarian", captain: "Knight" };
const FINISHES: Record<NpcRole, number> = { elder: 0xc0a887, merchant: 0xa5c1b2, healer: 0xe4eee0, smith: 0xc7aa91, captain: 0xb6bdcb };

/** Local, articulated service characters; accessories are fitted in normalized
 * world space before attaching to bones, so exporter bone scale is irrelevant. */
export class NpcAppearance {
  readonly root: THREE.Object3D;
  readonly height: number;
  private readonly character: Character;
  private elapsed = 0;
  private gesturing = false;

  constructor(factory: Pick<CharacterFactory, "create">, readonly role: NpcRole, model = MODELS[role]) {
    this.character = factory.create(model);
    this.root = this.character.root;
    this.root.name = `npc_${role}`;
    this.height = Number(this.root.userData.visualHeight) || 2.5;
    const materials = new Map<THREE.Material, THREE.Material>();
    this.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const isolate = (source: THREE.Material) => {
        let material = materials.get(source);
        if (!material) {
          material = source.clone();
          if (material instanceof THREE.MeshStandardMaterial) material.color.multiply(new THREE.Color(FINISHES[role]));
          materials.set(source, material);
        }
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(isolate) : isolate(object.material);
      object.castShadow = true;
    });
    // Civilian silhouettes should not inherit the hero's drawn combat weapon.
    for (const name of ["Wizard_Staff", "Rogue_Dagger", "Warrior_Sword"]) {
      const weapon = this.root.getObjectByName(name); if (weapon) weapon.visible = false;
    }
    this.character.play("Idle", true);
    this.root.updateMatrixWorld(true);
    this.equip();
  }

  private equip(): void {
    const h = this.height;
    const cloth = new THREE.MeshStandardMaterial({ color: this.role === "captain" ? 0x762e34 : this.role === "healer" ? 0xd6ddd0 : 0x57402c, roughness: .95, side: THREE.DoubleSide });
    const leather = new THREE.MeshStandardMaterial({ color: 0x65452b, roughness: .88 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xa6a79c, metalness: .7, roughness: .42 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc5a767, metalness: .55, roughness: .5 });
    const add = (name: string, boneName: string, geometry: THREE.BufferGeometry, material: THREE.Material, offset: number[], rotation = 0) => {
      const bone = this.root.getObjectByName(boneName);
      if (!bone) throw new Error(`NPC ${this.role}: missing ${boneName} attachment`);
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `npc_${name}`; mesh.castShadow = true;
      mesh.position.copy(bone.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(...offset).multiplyScalar(h));
      mesh.rotation.z = rotation;
      this.root.add(mesh); this.root.updateMatrixWorld(true); bone.attach(mesh);
      return mesh;
    };
    const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x*h, y*h, z*h);
    if (this.role === "elder") {
      add("beard", "Head", new THREE.ConeGeometry(.055*h, .22*h, 7), new THREE.MeshStandardMaterial({color: 0xd4d0bd, roughness: 1}), [0, -.035, .105], Math.PI);
      add("walking_staff", "FistR", new THREE.CylinderGeometry(.013*h, .018*h, .8*h, 8), leather, [0, -.08, .03], -.08);
      add("staff_finial", "FistR", new THREE.SphereGeometry(.033*h, 10, 8), gold, [.031, .32, .03]);
    } else if (this.role === "merchant") {
      add("satchel", "Abdomen", box(.18, .2, .12), leather, [.2, -.1, .03], -.12);
      add("satchel_flap", "Abdomen", box(.19, .06, .025), gold, [.2, -.045, .097], -.12);
      add("travel_pack", "Torso", box(.3, .34, .17), leather, [0, -.035, -.2]);
      add("bedroll", "Torso", new THREE.CylinderGeometry(.068*h, .068*h, .4*h, 10), cloth, [0, .17, -.21], Math.PI/2);
      add("shoulder_strap", "Torso", box(.035, .35, .035), leather, [.08, -.01, .16], -.5);
    } else if (this.role === "healer") {
      for (const side of [-1, 1]) add(side === -1 ? "stole" : "stole_right", "Torso", box(.085, .5, .035), cloth, [side*.085, -.13, .17]);
      add("medallion", "Torso", new THREE.TorusGeometry(.035*h,.009*h,6,16), gold, [0, .07, .18]);
      add("medicine_case", "Abdomen", box(.15, .16, .12), new THREE.MeshStandardMaterial({color:0x2e7668,roughness:.85}), [-.18,-.1,0]);
      add("ceremonial_circlet", "Head", new THREE.TorusGeometry(.092*h,.009*h,6,20), gold, [0,.1,.025]).rotateX(Math.PI/2);
    } else if (this.role === "smith") {
      const apron = new THREE.Shape();
      apron.moveTo(-.085*h,.23*h); apron.lineTo(.085*h,.23*h);
      apron.lineTo(.1*h,.08*h); apron.lineTo(.16*h,-.22*h);
      apron.quadraticCurveTo(0,-.27*h,-.16*h,-.22*h);
      apron.lineTo(-.1*h,.08*h); apron.closePath();
      const apronMaterial = leather.clone(); apronMaterial.side = THREE.DoubleSide;
      add("apron", "Torso", new THREE.ExtrudeGeometry(apron,{depth:.012*h,bevelEnabled:false,curveSegments:6}), apronMaterial, [0,-.14,.17]);
      add("apron_pocket", "Torso", box(.12,.08,.018), cloth, [.02,-.2,.19]);
      add("apron_belt", "Abdomen", box(.35,.035,.055), cloth, [0,0,.17]);
      add("hammer", "FistR", new THREE.CylinderGeometry(.016*h,.016*h,.3*h,8), leather, [0,.07,.025]);
      add("hammer_head", "FistR", box(.16,.085,.085), metal, [0,.22,.025]);
    } else {
      add("cape", "Torso", new THREE.CylinderGeometry(.16*h,.24*h,.65*h,12,1,true,Math.PI*.5,Math.PI), cloth, [0,-.18,-.08]);
      add("rank_badge", "Torso", box(.07,.065,.025), gold, [-.12,.08,.17]);
      add("helmet_crest", "Head", box(.035,.15,.19), cloth, [0,.21,.01]);
      add("command_baton", "FistR", new THREE.CylinderGeometry(.017*h,.017*h,.38*h,8), metal, [0,.06,.03]);
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.character.mixer.update(dt);
    // Brief role gestures return to idle; they never translate the interaction root.
    const gesture = this.role === "healer" ? "Spell1" : this.role === "merchant" || this.role === "smith" ? "PickUp" : undefined;
    if (!this.gesturing && gesture && this.elapsed > 9 && this.character.clipNames.includes(gesture)) {
      this.elapsed = 0; this.gesturing = true;
      this.character.playOnce(gesture, () => { this.gesturing = false; this.character.play("Idle"); });
    }
  }
}
