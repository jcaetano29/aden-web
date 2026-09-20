import * as THREE from "three";

/** Model-space additions fitted once, then attached to the animated skeleton. */
export function addHeroDetails(root: THREE.Object3D, model: string): void {
  if (!["Knight", "Mage", "Rogue", "Barbarian"].includes(model)) return;
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
  const iris = new THREE.MeshStandardMaterial({ color: model === "Mage" ? 0x527eaa : 0x535c3b, roughness: 0.6 });
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
    const eyeY = model === "Rogue" ? 0.058 : 0.102;
    if (model === "Rogue") feature(`hero_eyelid_${side}`, x, eyeY, 0.026, 0.014, 0.004, skin, 0.001);
    feature(`hero_eye_${side}`, x, eyeY, 0.015, 0.005, 0.006, white, 0.005);
    feature(`hero_iris_${side}`, x, eyeY, 0.005, 0.005, 0.003, iris, 0.011);
    feature(`hero_pupil_${side}`, x, eyeY, 0.0025, 0.004, 0.002, dark, 0.014);
    const brow = feature(`hero_brow_${side}`, x, eyeY + 0.014, 0.018, 0.0035, 0.004, dark, 0.004);
    // Rotate in head-local coordinates; all source heads face +Z.
    brow.rotation.z += side * 0.13;
  }
  if (model !== "Rogue") feature("hero_mouth", 0, 0.05, 0.019, 0.003, 0.003, lip, 0.004);

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
}
