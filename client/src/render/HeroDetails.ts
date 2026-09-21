import * as THREE from "three";

/** Model-space additions fitted once, then attached to the animated skeleton. */
export function addHeroDetails(root: THREE.Object3D, model: string): void {
  if (!["Knight", "Mage", "Rogue", "Ranger", "Barbarian"].includes(model)) return;
  const rigModel = model === "Ranger" ? "Rogue" : model;
  root.updateMatrixWorld(true);
  const head = root.getObjectByName("Head");
  const face = root.getObjectByName("Face") ?? root.getObjectByName("Monk001");
  if (!head || !face) throw new Error(`Missing hero face rig: ${model}`);
  const h = root.userData.visualHeight as number;
  const origin = head.getWorldPosition(new THREE.Vector3());
  const ray = new THREE.Raycaster();
  // Some rigs keep forehead/eyelids in the skinned body and only the beard in
  // their rigid face mesh. Sample both, excluding the accessories added below.
  const surfaces: THREE.Object3D[] = [];
  root.traverse(object => { if ((object as THREE.Mesh).isMesh) surfaces.push(object); });
  const dark = new THREE.MeshStandardMaterial({ color: 0x261b18, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xc7c4af, roughness: 0.7 });
  const iris = new THREE.MeshStandardMaterial({ color: rigModel === "Mage" ? 0x527eaa : 0x535c3b, roughness: 0.6 });
  const lip = new THREE.MeshStandardMaterial({ color: 0x70423a, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98b68, roughness: 0.9 });
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const feature = (name: string, x: number, y: number, width: number, height: number, depth: number, material: THREE.Material, offset = 0) => {
    ray.set(new THREE.Vector3(origin.x + x * h, origin.y + y * h, origin.z + h), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObjects(surfaces, false)[0];
    if (!hit) throw new Error(`Cannot fit ${name} on ${model}`);
    const mesh = new THREE.Mesh(sphere, material);
    mesh.name = name;
    mesh.scale.set(width * h, height * h, depth * h);
    mesh.position.copy(hit.point); mesh.position.z += offset * h;
    root.add(mesh); root.updateMatrixWorld(true); head.attach(mesh);
    return mesh;
  };
  for (const side of [-1, 1]) {
    const x = side * 0.027;
    const eyeY = rigModel === "Rogue" ? 0.058 : 0.102;
    if (rigModel === "Rogue") feature(`hero_eyelid_${side}`, x, eyeY, 0.026, 0.014, 0.004, skin, 0.001);
    feature(`hero_eye_${side}`, x, eyeY, 0.015, 0.005, 0.006, white, 0.005);
    feature(`hero_iris_${side}`, x, eyeY, 0.005, 0.005, 0.003, iris, 0.011);
    feature(`hero_pupil_${side}`, x, eyeY, 0.0025, 0.004, 0.002, dark, 0.014);
    const brow = feature(`hero_brow_${side}`, x, eyeY + 0.014, 0.018, 0.0035, 0.004, dark, 0.004);
    // Rotate in head-local coordinates; all source heads face +Z.
    brow.rotation.z += side * 0.13;
  }
  if (rigModel !== "Rogue") feature("hero_mouth", 0, 0.05, 0.019, 0.003, 0.003, lip, 0.004);

  const leather = new THREE.MeshStandardMaterial({ color: model === "Barbarian" ? 0x473426 : 0x24252b, roughness: 0.82 });
  const sole = new THREE.MeshStandardMaterial({ color: 0x10141b, roughness: 0.95 });
  const metal = new THREE.MeshStandardMaterial({ color: model === "Mage" ? 0x9d8350 : 0x737f8e, metalness: 0.65, roughness: 0.4 });
  for (const side of ["L", "R"]) {
    const bone = root.getObjectByName(`Foot${side}`);
    if (!bone) throw new Error(`Missing foot rig: ${model}/${side}`);
    const foot = bone.getWorldPosition(new THREE.Vector3());
    const boot = new THREE.Group(); boot.name = `hero_boot_${side}`;
    boot.position.set(foot.x, 0.03, foot.z);
    const toe = new THREE.Mesh(sphere, leather);
    toe.scale.set(h * 0.046, h * 0.032, h * 0.085); toe.position.set(0, h * 0.043, h * 0.045); boot.add(toe);
    const outsole = new THREE.Mesh(new THREE.BoxGeometry(h * 0.1, h * 0.024, h * 0.17), sole);
    outsole.position.set(0, h * 0.012, h * 0.038); boot.add(outsole);
    const ankle = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.044, h * 0.042, h * 0.105, 8), leather);
    ankle.position.set(0, h * 0.098, 0); boot.add(ankle);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(h * 0.064, h * 0.018, h * 0.012), metal);
    buckle.position.set(0, h * 0.11, h * 0.043); boot.add(buckle);
    root.add(boot); root.updateMatrixWorld(true); bone.attach(boot);
  }
  if (model === "Ranger") addRangerEquipment(root);
}

/** Adds a bow and a filled quiver without requiring another downloadable model. */
export function addRangerEquipment(root: THREE.Object3D): void {
  const h = Number(root.userData.visualHeight) || 2.4;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6f431f, roughness: 0.82 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x302015, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x87917d, metalness: 0.45, roughness: 0.48 });

  const bow = new THREE.Group();
  bow.name = "ranger_bow";
  const limb = new THREE.Mesh(new THREE.TorusGeometry(h * 0.18, h * 0.012, 6, 28, Math.PI * 1.55), wood);
  limb.rotation.z = Math.PI * 0.72;
  bow.add(limb);
  const stringGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-h * 0.14, h * 0.11, 0),
    new THREE.Vector3(0, 0, -h * 0.025),
    new THREE.Vector3(h * 0.14, -h * 0.11, 0),
  ]);
  bow.add(new THREE.Line(stringGeometry, new THREE.LineBasicMaterial({ color: 0xd8cfaa })));
  bow.rotation.set(0.15, 0.2, -0.45);
  const hand = root.getObjectByName('FistL') ?? root.getObjectByName('Fist.L') ?? root.getObjectByName('HandL') ?? root.getObjectByName('HandR') ?? root;
  root.updateMatrixWorld(true);
  bow.position.copy(hand.getWorldPosition(new THREE.Vector3()));
  bow.position.y += h * .035;
  root.add(bow); root.updateMatrixWorld(true); hand.attach(bow);

  const quiver = new THREE.Group();
  quiver.name = "ranger_quiver";
  const caseMesh = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.045, h * 0.06, h * 0.38, 10, 1, true), leather);
  caseMesh.rotation.z = 0.12;
  quiver.add(caseMesh);
  for (let i = 0; i < 5; i++) {
    const arrow = new THREE.Group();
    arrow.name = `ranger_arrow_${i}`;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.006, h * 0.006, h * 0.45, 6), wood);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(h * 0.018, h * 0.045, 5), metal);
    tip.position.y = h * 0.245;
    arrow.add(shaft, tip);
    arrow.position.set((i - 2) * h * 0.018, h * 0.08 + Math.abs(i - 2) * h * 0.012, 0);
    quiver.add(arrow);
  }
  const torso = root.getObjectByName('Torso') ?? root.getObjectByName('Spine2') ?? root.getObjectByName('Spine') ?? root;
  quiver.position.copy(torso.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(-h * .11, h * .02, -h * .13));
  quiver.rotation.set(0.2, 0, 0.28);
  root.add(quiver); root.updateMatrixWorld(true); torso.attach(quiver);
}
