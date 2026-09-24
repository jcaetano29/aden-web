import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CharacterGender } from '@aden/shared';
import { addRangerEquipment } from './HeroDetails.js';
import { heroMaterial } from './HeroMaterials.js';
import { addHeroBody } from './HeroBody.js';
import { heroFaceMaterial } from './HeroFaces.js';
import { createHeroHair } from './HeroHair.js';
import { heroEquipmentSlot } from './HeroEquipment.js';

const PALETTES: Record<string, { armor: number; cloth: number; trim: number; hair: number; skin: number }> = {
  Knight: { armor: 0x9da6b3, cloth: 0x642c39, trim: 0xbfa36e, hair: 0x392b24, skin: 0xc99573 },
  Mage: { armor: 0x535079, cloth: 0x302b49, trim: 0xb7cddd, hair: 0xa5a6b0, skin: 0xd1a188 },
  Barbarian: { armor: 0x79604b, cloth: 0x563c33, trim: 0xb79b68, hair: 0x593528, skin: 0xb97c55 },
  Rogue: { armor: 0x515363, cloth: 0x43364d, trim: 0x929daa, hair: 0x25232a, skin: 0xbe9781 },
  Ranger: { armor: 0x667451, cloth: 0x3d4936, trim: 0xb69256, hair: 0x533b29, skin: 0xc79972 },
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
  const armor = heroMaterial(model === 'Knight' ? 'metal' : model === 'Mage' ? 'cloth' : 'leather', palette.armor);
  const cloth = heroMaterial('cloth', palette.cloth), trim = heroMaterial('metal', palette.trim), leather = heroMaterial('leather', 0x514436);
  const skin = mat(palette.skin, 0, .92), hair = heroMaterial('hair', palette.hair), dark = mat(0x17171c), white = mat(0xb3aaa0);
  const iris = mat(model === 'Mage' ? 0x638da5 : model === 'Ranger' ? 0x677d43 : 0x685341);
  const lip = mat(0x925e51), fur = heroMaterial('hair', model === 'Barbarian' ? 0x91816a : 0x343942);
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
  const tube = (name: string, anchor: string, from: THREE.Vector3, to: THREE.Vector3, r1: number, r2: number, material: THREE.Material, roundedRoot = false) => {
    const length = from.distanceTo(to);
    const profile = roundedRoot
      ? [[0, -.56], [r1 * .38, -.49], [r1 * .82, -.38], [r1 * 1.03, -.17], [(r1 + r2) * .49, .17], [r2, .45], [0, .56]]
      : [[0, -.56], [r1 * .87, -.51], [r1, -.4], [r1 * 1.035, -.24], [(r1 + r2) * .51, .07], [r2, .4], [r2 * .87, .51], [0, .56]];
    const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r * h, y * length)));
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(curve.getPoints(12), 16), material);
    mesh.name = name; mesh.position.copy(from).lerp(to, .5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    root.add(mesh); root.updateMatrixWorld(true); bone(anchor).attach(mesh); mesh.castShadow = true;
    return mesh;
  };
  const lathe = (name: string, anchor: string, pos: THREE.Vector3, profile: number[][], depth: number, material: THREE.Material) => {
    const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r * h, y * h)));
    const geometry = new THREE.LatheGeometry(curve.getPoints(12), 24);
    return part(name, anchor, geometry, material, pos, new THREE.Vector3(1, 1, depth));
  };
  const hips = point('Hips'), neck = point('Neck'), head = point('Head');
  const waist = new THREE.Vector3(hips.x, THREE.MathUtils.lerp(hips.y - h * .07, neck.y, .38), hips.z);
  const chest = female ? .124 : .151, waistR = female ? .080 : .098;
  addHeroBody(root, female, armor);
  const body = root.getObjectByName('hero_cuirass') as THREE.SkinnedMesh;
  body.skeleton.update();
  const ray = new THREE.Raycaster();
  const fitFront = (position: THREE.Vector3) => {
    ray.set(new THREE.Vector3(position.x, position.y, h * 2), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(body, false)[0];
    return hit ? hit.point.add(new THREE.Vector3(0, 0, h * .003)) : position;
  };
  lathe('hero_belt', 'Abdomen', offset(waist, 0, -.006, 0), [[waistR + .006, 0], [waistR + .005, .018]], .72, leather);
  const clasp = part('hero_buckle', 'Abdomen', new THREE.BoxGeometry(.033 * h, .026 * h, .012 * h), trim, offset(waist, 0, .015, waistR * .73));
  clasp.userData.heroDetail = true;
  tube('hero_neck', 'Neck', offset(neck, 0, -.018, 0), offset(head, 0, -.005, 0), .039, .035, skin);
  // Gorget and a raised class emblem catch light at the game's camera distance.
  lathe('hero_collar', 'Torso', offset(neck, 0, -.010, 0), [[female ? .041 : .046, 0], [female ? .039 : .044, .012]], .85, trim);
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
    const path = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => fitFront(start.clone().lerp(end, i / 12))));
    const geometry = new THREE.TubeGeometry(path, 24, h * .009, 6, false);
    const strap = part('hero_crossbelt', 'Torso', geometry, leather, new THREE.Vector3());
    strap.castShadow = true;
    part('hero_crossbelt_clasp', 'Torso', new THREE.BoxGeometry(h * .023, h * .026, h * .009), trim, fitFront(start.clone().lerp(end, .48)));
  }
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? 1 : -1;
    const upper = point(`UpperArm.${side}`), elbow = point(`LowerArm.${side}`), hand = point(`Fist.${side}`);
    tube(`hero_sleeve_${side}`, `UpperArm.${side}`, upper, elbow, female ? .040 : .052, female ? .029 : .037, model === 'Barbarian' ? skin : cloth);
    ellipsoid(`hero_elbow_${side}`, `LowerArm.${side}`, elbow, female ? .030 : .036, .036, .032, model === 'Barbarian' ? skin : cloth);
    tube(`hero_bracer_${side}`, `LowerArm.${side}`, elbow, hand, female ? .033 : .039, female ? .023 : .028, armor);
    tube(`hero_cuff_${side}`, `LowerArm.${side}`, elbow.clone().lerp(hand, .78), elbow.clone().lerp(hand, .86), .035, .033, trim);
    ellipsoid(`hero_glove_${side}`, `Fist.${side}`, hand, female ? .026 : .031, .045, .025, leather);
    const pauldron = ellipsoid(`hero_pauldron_${side}`, `UpperArm.${side}`, offset(upper, sign * .007, .006, 0), female ? .054 : .066, .029, .058, model === 'Barbarian' ? fur : armor);
    pauldron.rotation.z += sign * -.18;
    if (model === 'Knight') {
      const plate = ellipsoid(`hero_pauldron_lame_${side}`, `UpperArm.${side}`, offset(upper, sign * .013, -.014, 0), female ? .058 : .070, .015, .061, trim);
      plate.rotation.z += sign * -.22;
    }
    tube(`hero_shoulder_trim_${side}`, `UpperArm.${side}`, upper.clone().lerp(elbow, .15), upper.clone().lerp(elbow, .20), female ? .049 : .06, female ? .047 : .058, trim);
    ellipsoid(`hero_thumb_${side}`, `Fist.${side}`, offset(hand, -sign * .023, -.016, .023), .013, .026, .017, leather);
    const hip = point(`UpperLeg.${side}`), knee = point(`LowerLeg.${side}`), foot = point(`Foot.${side}`);
    tube(`hero_trouser_${side}`, `UpperLeg.${side}`, offset(hip, -sign * .012, .025, 0), knee, female ? .065 : .064, female ? .033 : .039, model === 'Knight' ? armor : cloth, true);
    tube(`hero_greave_${side}`, `LowerLeg.${side}`, knee, offset(foot, 0, .025, 0), female ? .036 : .043, female ? .025 : .030, model === 'Knight' ? armor : leather);
    ellipsoid(`hero_knee_${side}`, `LowerLeg.${side}`, offset(knee, 0, .004, .015), female ? .033 : .040, .041, .022, armor);
    ellipsoid(`hero_boot_${side}`, `Foot.${side}`, new THREE.Vector3(foot.x, h * .037, foot.z + h * .023), .044, .037, .076, leather);
    ellipsoid(`hero_sole_${side}`, `Foot.${side}`, new THREE.Vector3(foot.x, h * .012, foot.z + h * .024), .044, .012, .074, dark);
  }
  // Curved, draped panels with folds and pointed hems, rather than box slabs.
  if (model === 'Mage' || model === 'Knight') {
    const fabric = cloth.clone(); fabric.side = THREE.DoubleSide;
    for (const sign of [-1, 1]) {
      const length = model === 'Mage' ? .30 : .15;
      const geometry = new THREE.PlaneGeometry(h * .081, h * length, 8, 16);
      const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
      for (let i = 0; i < position.count; i++) {
        const u = uv.getX(i), v = uv.getY(i), drop = 1 - v;
        position.setXYZ(i, position.getX(i) * (.72 + drop * .4), position.getY(i) - Math.sin(u * Math.PI) * drop ** 4 * h * .028,
          h * (.008 * Math.cos(u * Math.PI * 4) + .028 * drop * drop));
      }
      geometry.computeVertexNormals();
      part(`hero_tabard_${sign}`, 'Hips', geometry, fabric, offset(hips, sign * .047, .025 - length / 2, .087));
    }
  }
  if (model === 'Barbarian') {
    lathe('hero_fur_mantle', 'Torso', offset(neck, 0, -.048, 0), [[.123, 0], [.137, .015], [.123, .033], [.067, .040]], .66, fur);
  }
  if (model === 'Ranger' || model === 'Rogue' || model === 'Mage') {
    // Shoulder mantle stays above the thighs to avoid clipping walk and attacks.
    const geo = new THREE.CylinderGeometry(h * .075, h * .145, h * .25, 12, 1, true, Math.PI / 2, Math.PI);
    const mantleMat = cloth.clone(); mantleMat.side = THREE.DoubleSide;
    part('hero_mantle', 'Torso', geo, mantleMat, offset(neck, 0, -.14, -.035), new THREE.Vector3(1, 1, .6));
  }
  const center = offset(head, 0, .025, .003);
  const faceGeometry = new THREE.SphereGeometry(1, 32, 24);
  const positions = faceGeometry.getAttribute('position');
  const faceUv = faceGeometry.getAttribute('uv');
  const texturedFace = heroFaceMaterial(female, palette.skin);
  const colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    if (y < 0) positions.setX(i, x * (1 + y * (female ? .28 : .17)));
    // A restrained jaw, brow plane and cheeks; vertex tint avoids painted-on
    // facial details swimming as the head moves.
    if (z > 0) {
      let depth = z * (1 - .10 * Math.exp(-((y - .12) ** 2) / .025));
      if (texturedFace) {
        depth += .12 * Math.exp(-((x / .12) ** 2) - (((y + .12) / .28) ** 2));
        depth += .13 * Math.exp(-((x / .15) ** 2) - (((y + .33) / .12) ** 2));
        depth += .06 * Math.exp(-(((Math.abs(x) - .48) / .2) ** 2) - (((y + .2) / .17) ** 2));
        depth += .035 * Math.exp(-((x / .3) ** 2) - (((y + .60) / .09) ** 2));
      }
      positions.setZ(i, depth);
    }
    if (texturedFace) faceUv.setXY(i, .5 + x * .42, .56 + y * .35);
    const cheek = Math.exp(-((Math.abs(x) - .55) ** 2 + (y + .17) ** 2) / .10) * Math.max(z, 0);
    const shade = .91 + Math.max(y, 0) * .09;
    colors.push(shade, shade - cheek * .10, shade - cheek * .12);
  }
  faceGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  faceGeometry.computeVertexNormals();
  const faceMaterial = texturedFace ?? skin.clone(); faceMaterial.vertexColors = true;
  part('hero_head', 'Head', faceGeometry, faceMaterial, center, new THREE.Vector3(h * (female ? .062 : .067), h * .083, h * .061));
  if (!texturedFace) {
    ellipsoid('hero_nose', 'Head', offset(center, 0, -.004, .057), female ? .0065 : .008, .017, .010, skin);
    ellipsoid('hero_mouth', 'Head', offset(center, 0, -.030, .056), female ? .014 : .016, .002, .0018, lip);
  }
  for (const sign of [-1, 1]) {
    if (!female) ellipsoid(`hero_ear_${sign}`, 'Head', offset(center, sign * .060, -.007, 0), .008, .018, .009, skin);
    if (texturedFace) continue;
    ellipsoid(`hero_eye_${sign}`, 'Head', offset(center, sign * .024, .006, .053), .010, .0032, .002, white);
    ellipsoid(`hero_iris_${sign}`, 'Head', offset(center, sign * .024, .006, .0545), .0030, .0031, .0013, iris);
    ellipsoid(`hero_pupil_${sign}`, 'Head', offset(center, sign * .024, .006, .0555), .0015, .0025, .001, dark);
    const brow = ellipsoid(`hero_brow_${sign}`, 'Head', offset(center, sign * .024, .018, .052), .013, female ? .002 : .0028, .002, hair);
    brow.rotation.z += sign * .07;
  }
  const hairMaterial = hair.clone(); hairMaterial.side = THREE.DoubleSide;
  part('hero_hair', 'Head', createHeroHair(female, model === 'Mage' || model === 'Barbarian'),
    hairMaterial, center, new THREE.Vector3(h, h, h));
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
    const groups = new Map<string, { material: THREE.Material; parts: THREE.Mesh[] }>();
    for (const child of anchor.children) {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.SkinnedMesh || !child.name.startsWith('hero_') || Array.isArray(child.material)) continue;
      const key = `${child.material.uuid}:${heroEquipmentSlot(child.name) ?? 'detail'}`;
      const group = groups.get(key) ?? { material: child.material, parts: [] as THREE.Mesh[] };
      group.parts.push(child); groups.set(key, group);
    }
    for (const [key, { material, parts }] of groups) {
      if (parts.length < 2) continue;
      const geometries = parts.map(mesh => {
        mesh.updateMatrix();
        return (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix);
      });
      const geometry = mergeGeometries(geometries);
      geometries.forEach(g => g.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, material);
      merged.name = `hero_details_${anchor.name}_${key}`;
      merged.userData.parts = parts.map(p => p.name); merged.castShadow = true;
      parts.forEach(mesh => anchor.remove(mesh)); anchor.add(merged);
    }
  }
}
