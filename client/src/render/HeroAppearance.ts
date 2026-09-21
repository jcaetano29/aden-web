import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CharacterGender } from '@aden/shared';
import { addRangerEquipment } from './HeroDetails.js';
import { surfaceMaps, type SurfaceKind } from './materialAtlas.js';

const PALETTES: Record<string, { armor: number; cloth: number; trim: number; hair: number; skin: number }> = {
  Knight: { armor: 0x60798f, cloth: 0x722e3d, trim: 0xc5a367, hair: 0x39251d, skin: 0xc99573 },
  Mage: { armor: 0x334477, cloth: 0x242a51, trim: 0xb7cddd, hair: 0xc4c8d2, skin: 0xd1a188 },
  Barbarian: { armor: 0x614431, cloth: 0x713628, trim: 0xb79b68, hair: 0x753925, skin: 0xb97c55 },
  Rogue: { armor: 0x303c4c, cloth: 0x3c294f, trim: 0x929daa, hair: 0x191c29, skin: 0xbe9781 },
  Ranger: { armor: 0x465b3c, cloth: 0x293b2e, trim: 0xb69256, hair: 0x754125, skin: 0xc79972 },
};

/** Sculpted modular meshes use the original animated rig and equipment anchors.
 * Fitting is done once in the sampled idle pose in world units, before cloning.
 */
export function buildHeroAppearance(root: THREE.Object3D, model: string, gender: CharacterGender): void {
  const palette = PALETTES[model]; if (!palette) return;
  const female = gender === 'female', h = Number(root.userData.visualHeight) || 2.5;
  root.userData.gender = gender; root.userData.heroClass = model;
  root.updateMatrixWorld(true);
  // Keep the author's weapons and rig. Replace the old body, head and clothing.
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    let weapon = false;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.name === 'WeaponR' || p.name === 'Weapon.R') weapon = true;
    o.visible = weapon && model !== 'Ranger';
  });
  const bone = (name: string): THREE.Object3D => {
    const found = root.getObjectByName(name) ?? root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
    if (!found) throw new Error(`Missing hero anchor ${model}/${name}`);
    return found;
  };
  const point = (name: string) => bone(name).getWorldPosition(new THREE.Vector3());
  const mat = (color: number, metalness = 0, roughness = .78) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const armor = mat(palette.armor, model === 'Knight' ? .72 : .15, model === 'Knight' ? .34 : .7);
  const cloth = mat(palette.cloth), trim = mat(palette.trim, .7, .32), leather = mat(0x302720);
  const skin = mat(palette.skin, 0, .88), hair = mat(palette.hair), dark = mat(0x17171c), white = mat(0xe5dcc8);
  const iris = mat(model === 'Mage' ? 0x638da5 : model === 'Ranger' ? 0x677d43 : 0x685341);
  const lip = mat(0x925e51), fur = mat(model === 'Barbarian' ? 0x9d8a6c : 0x343942);
  for (const [material, kind] of [[armor, model === 'Knight' ? 'metal' : 'leather'], [cloth, 'cloth'], [leather, 'leather'], [trim, 'metal']] as [THREE.MeshStandardMaterial, SurfaceKind][]) {
    const maps = surfaceMaps(kind);
    if (maps) { material.bumpMap = maps.bump; material.bumpScale = kind === 'metal' ? .009 : .018; material.roughnessMap = maps.roughness; }
  }
  const orb = new THREE.SphereGeometry(1, 16, 12);
  const part = (name: string, anchor: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: THREE.Vector3, scale?: THREE.Vector3) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.position.copy(position);
    if (scale) mesh.scale.copy(scale);
    root.add(mesh); root.updateMatrixWorld(true); bone(anchor).attach(mesh); mesh.castShadow = true;
    return mesh;
  };
  const ellipsoid = (name: string, anchor: string, pos: THREE.Vector3, x: number, y: number, z: number, material: THREE.Material) =>
    part(name, anchor, orb, material, pos, new THREE.Vector3(x * h, y * h, z * h));
  const offset = (p: THREE.Vector3, x: number, y: number, z: number) => p.clone().add(new THREE.Vector3(x, y, z).multiplyScalar(h));
  const tube = (name: string, anchor: string, from: THREE.Vector3, to: THREE.Vector3, r1: number, r2: number, material: THREE.Material) => {
    const length = from.distanceTo(to);
    const profile = [[r1, -.5], [r1 * 1.04, -.3], [(r1 + r2) * .51, .1], [r2, .4], [r2 * .96, .5]];
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * h, y * length)), 12), material);
    mesh.name = name; mesh.position.copy(from).lerp(to, .5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    root.add(mesh); root.updateMatrixWorld(true); bone(anchor).attach(mesh); mesh.castShadow = true;
    return mesh;
  };
  const lathe = (name: string, anchor: string, pos: THREE.Vector3, profile: number[][], depth: number, material: THREE.Material) => {
    const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * h, y * h)), 16);
    return part(name, anchor, geometry, material, pos, new THREE.Vector3(1, 1, depth));
  };
  const hips = point('Hips'), neck = point('Neck'), head = point('Head');
  const waist = offset(hips, 0, .06, 0);
  const torsoHeight = (neck.y - waist.y) / h;
  const chest = female ? .127 : .151, waistR = female ? .084 : .108;
  lathe('hero_cuirass', 'Torso', waist, [[waistR, 0], [waistR, .045], [chest, torsoHeight * .65], [chest * .88, torsoHeight * .86], [.062, torsoHeight]], .65, armor);
  lathe('hero_undercoat', 'Hips', offset(hips, 0, -.10, 0), [[female ? .139 : .143, 0], [.123, .085], [waistR, .16]], .68, cloth);
  lathe('hero_belt', 'Abdomen', waist, [[waistR + .007, 0], [waistR + .007, .027]], .72, leather);
  const clasp = part('hero_buckle', 'Abdomen', new THREE.BoxGeometry(.033 * h, .026 * h, .012 * h), trim, offset(waist, 0, .015, waistR * .73));
  clasp.userData.heroDetail = true;
  tube('hero_neck', 'Neck', offset(neck, 0, -.018, 0), offset(head, 0, -.005, 0), .039, .035, skin);
  // Gorget and a raised class emblem catch light at the game's camera distance.
  lathe('hero_collar', 'Torso', offset(neck, 0, -.033, 0), [[.064, 0], [.058, .037]], .8, trim);
  const emblem = part('hero_emblem', 'Torso', new THREE.OctahedronGeometry(h * .032), trim, offset(neck, 0, -.105, chest * .65));
  emblem.scale.z *= .35;
  for (const sign of [-1, 1]) {
    tube(`hero_chest_inlay_${sign}`, 'Torso', offset(neck, sign * chest * .75, -.06, chest * .51), offset(neck, 0, -.12, chest * .67), .003, .003, trim);
    for (let i = 0; i < 3; i++) {
      ellipsoid(`hero_cuirass_rivet_${sign}_${i}`, 'Torso', offset(waist, sign * waistR * .76, .065 + i * .028, waistR * .54), .004, .004, .004, trim);
    }
  }
  if (model === 'Ranger' || model === 'Rogue' || model === 'Barbarian') {
    const start = offset(neck, -.078, -.045, chest * .59), end = offset(waist, .065, .025, waistR * .72);
    tube('hero_crossbelt', 'Torso', start, end, .012, .012, leather);
    part('hero_crossbelt_clasp', 'Torso', new THREE.BoxGeometry(h * .027, h * .03, h * .012), trim, start.clone().lerp(end, .48));
  }
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? 1 : -1;
    const upper = point(`UpperArm.${side}`), elbow = point(`LowerArm.${side}`), hand = point(`Fist.${side}`);
    tube(`hero_sleeve_${side}`, `UpperArm.${side}`, upper, elbow, female ? .043 : .052, .037, model === 'Barbarian' ? skin : cloth);
    tube(`hero_bracer_${side}`, `LowerArm.${side}`, elbow, hand, .038, .029, armor);
    tube(`hero_cuff_${side}`, `LowerArm.${side}`, elbow.clone().lerp(hand, .78), elbow.clone().lerp(hand, .86), .035, .033, trim);
    ellipsoid(`hero_glove_${side}`, `Fist.${side}`, hand, .034, .05, .035, leather);
    ellipsoid(`hero_pauldron_${side}`, `UpperArm.${side}`, offset(upper, sign * .008, 0, 0), female ? .059 : .074, .045, .068, model === 'Barbarian' ? fur : armor);
    tube(`hero_shoulder_trim_${side}`, `UpperArm.${side}`, upper.clone().lerp(elbow, .15), upper.clone().lerp(elbow, .20), female ? .049 : .06, female ? .047 : .058, trim);
    ellipsoid(`hero_thumb_${side}`, `Fist.${side}`, offset(hand, -sign * .023, -.016, .023), .013, .026, .017, leather);
    const hip = point(`UpperLeg.${side}`), knee = point(`LowerLeg.${side}`), foot = point(`Foot.${side}`);
    tube(`hero_trouser_${side}`, `UpperLeg.${side}`, hip, knee, female ? .059 : .064, .039, cloth);
    tube(`hero_greave_${side}`, `LowerLeg.${side}`, knee, offset(foot, 0, .035, 0), .043, .034, model === 'Knight' ? armor : leather);
    ellipsoid(`hero_knee_${side}`, `LowerLeg.${side}`, offset(knee, 0, .006, .022), .046, .048, .027, armor);
    ellipsoid(`hero_boot_${side}`, `Foot.${side}`, new THREE.Vector3(foot.x, h * .037, foot.z + h * .023), .044, .037, .076, leather);
    part(`hero_sole_${side}`, `Foot.${side}`, new THREE.BoxGeometry(h * .087, h * .016, h * .144), dark, new THREE.Vector3(foot.x, h * .009, foot.z + h * .024));
  }
  // A tailored tabard / split robe instead of a rigid full-length cone.
  if (model === 'Mage' || model === 'Knight') {
    for (const sign of [-1, 1]) {
      const panel = part(`hero_tabard_${sign}`, 'Hips', new THREE.BoxGeometry(h * .085, h * (model === 'Mage' ? .25 : .13), h * .015), cloth, offset(hips, sign * .046, model === 'Mage' ? -.10 : -.047, .097));
      panel.rotation.z += sign * .08;
      part(`hero_tabard_trim_${sign}`, 'Hips', new THREE.BoxGeometry(h * .012, h * (model === 'Mage' ? .245 : .125), h * .018), trim, offset(hips, sign * .083, model === 'Mage' ? -.10 : -.047, .099));
    }
  }
  if (model === 'Barbarian') {
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI * 2 / 10;
      ellipsoid(`hero_fur_${i}`, 'Torso', offset(neck, Math.cos(angle) * .105, -.03, Math.sin(angle) * .068), .038, .028, .029, fur);
    }
  }
  if (model === 'Ranger' || model === 'Rogue' || model === 'Mage') {
    // Shoulder mantle stays above the thighs to avoid clipping walk and attacks.
    const geo = new THREE.CylinderGeometry(h * .075, h * .145, h * .25, 12, 1, true, Math.PI / 2, Math.PI);
    const mantleMat = cloth.clone(); mantleMat.side = THREE.DoubleSide;
    part('hero_mantle', 'Torso', geo, mantleMat, offset(neck, 0, -.14, -.035), new THREE.Vector3(1, 1, .6));
  }
  const center = offset(head, 0, .039, .003);
  const faceGeometry = new THREE.SphereGeometry(1, 20, 16);
  const positions = faceGeometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (y < 0) positions.setX(i, positions.getX(i) * (1 + y * (female ? .27 : .12)));
  }
  faceGeometry.computeVertexNormals();
  part('hero_head', 'Head', faceGeometry, skin, center, new THREE.Vector3(h * (female ? .068 : .074), h * .086, h * .064));
  ellipsoid('hero_nose', 'Head', offset(center, 0, -.004, .061), female ? .008 : .011, .019, .01, skin);
  ellipsoid('hero_mouth', 'Head', offset(center, 0, -.034, .058), female ? .019 : .022, .0025, .002, lip);
  for (const sign of [-1, 1]) {
    ellipsoid(`hero_ear_${sign}`, 'Head', offset(center, sign * .064, -.007, 0), .013, .021, .011, skin);
    ellipsoid(`hero_eye_${sign}`, 'Head', offset(center, sign * .027, .007, .059), .013, .005, .003, white);
    ellipsoid(`hero_iris_${sign}`, 'Head', offset(center, sign * .027, .007, .061), .0045, .0045, .002, iris);
    ellipsoid(`hero_pupil_${sign}`, 'Head', offset(center, sign * .027, .007, .063), .002, .0035, .0015, dark);
    ellipsoid(`hero_eye_glint_${sign}`, 'Head', offset(center, sign * .027 - .002, .009, .064), .0012, .0012, .001, white);
    const brow = ellipsoid(`hero_brow_${sign}`, 'Head', offset(center, sign * .026, .023, .057), .018, female ? .0028 : .004, .003, hair);
    brow.rotation.z += sign * .07;
  }
  // Sculpted hair crown, swept locks and class-specific tied hair.
  part('hero_hair_crown', 'Head', new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * .54), hair, offset(center, 0, .01, -.006), new THREE.Vector3(h * .076, h * .081, h * .069));
  for (let i = 0; i < 5; i++) {
    const lock = ellipsoid(`hero_fringe_${i}`, 'Head', offset(center, (i - 2) * .022, .059 - i * .003, .039), .022, .03, .023, hair);
    lock.rotation.z += -.3;
  }
  if (female) {
    const long = model === 'Mage' || model === 'Barbarian';
    for (const sign of [-1, 1]) {
      ellipsoid(`hero_hair_side_${sign}`, 'Head', offset(center, sign * .062, -.024, -.012), .021, long ? .097 : .062, .045, hair);
    }
    ellipsoid('hero_hair_back', 'Head', offset(center, 0, -.018, -.04), .063, long ? .108 : .065, .034, hair);
    if (model === 'Knight' || model === 'Ranger' || model === 'Barbarian') {
      for (let i = 0; i < 7; i++) {
        ellipsoid(`hero_braid_${i}`, 'Head', offset(center, .065 + Math.sin(i * 2.5) * .004, -.068 - i * .019, -.035), .018 - i * .0012, .014, .018 - i * .0012, i === 5 ? trim : hair);
      }
    }
  } else {
    for (const sign of [-1, 1]) ellipsoid(`hero_sideburn_${sign}`, 'Head', offset(center, sign * .061, -.018, -.004), .013, .035, .03, hair);
    if (model === 'Mage' || model === 'Barbarian') ellipsoid('hero_beard', 'Head', offset(center, 0, -.061, .032), .047, .04, .037, hair);
  }
  if (model === 'Mage') {
    const band = new THREE.TorusGeometry(h * .067, h * .0045, 6, 32);
    const circlet = part('hero_circlet', 'Head', band, trim, offset(center, 0, .033, 0));
    // Fitted in world orientation before attaching (the head is tilted at idle).
    circlet.rotation.x += Math.PI / 2;
    const gem = mat(0x6caed9, .3, .18);
    part('hero_circlet_gem', 'Head', new THREE.OctahedronGeometry(h * .013), gem, offset(center, 0, .031, .066));
  }
  if (model === 'Ranger') addRangerEquipment(root);
  root.updateMatrixWorld(true);
  mergeRigidDetails(root);
}

/** Details on the same animated anchor share draw calls, without merging joints. */
function mergeRigidDetails(root: THREE.Object3D): void {
  const anchors: THREE.Object3D[] = [];
  root.traverse(object => { if (object.children.some(child => child.name.startsWith('hero_'))) anchors.push(object); });
  for (const anchor of anchors) {
    const groups = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of anchor.children) {
      if (!(child instanceof THREE.Mesh) || !child.name.startsWith('hero_') || Array.isArray(child.material)) continue;
      const parts = groups.get(child.material) ?? []; parts.push(child); groups.set(child.material, parts);
    }
    for (const [material, parts] of groups) {
      if (parts.length < 2) continue;
      const geometries = parts.map(mesh => {
        mesh.updateMatrix();
        return (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix);
      });
      const geometry = mergeGeometries(geometries);
      geometries.forEach(g => g.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, material);
      merged.name = `hero_details_${anchor.name}_${groups.size}_${material.id}`;
      merged.userData.parts = parts.map(p => p.name); merged.castShadow = true;
      parts.forEach(mesh => anchor.remove(mesh)); anchor.add(merged);
    }
  }
}
