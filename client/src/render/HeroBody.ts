import * as THREE from 'three';

/** One continuous fitted surface, weighted onto the existing animated spine.
 * Width, front depth and back depth are independent so the female silhouette
 * has a pelvis, a waist and a shaped bust in profile as well as from the front. */
export function addHeroBody(root: THREE.Object3D, female: boolean, material: THREE.Material): void {
  const h = Number(root.userData.visualHeight) || 2.5;
  const bones = ['Hips', 'Abdomen', 'Torso'].map(name => root.getObjectByName(name) as THREE.Bone);
  const joints = bones.map(bone => bone.getWorldPosition(new THREE.Vector3()));
  const neck = root.getObjectByName('Neck')!.getWorldPosition(new THREE.Vector3());
  const bottom = joints[0].y - h * .07, height = neck.y - bottom;
  // [vertical position, half width, front depth, back depth] in height units.
  const profile = female ? [
    [0, .117, .060, .068], [.13, .147, .075, .091], [.26, .117, .066, .080],
    [.38, .080, .052, .057], [.51, .092, .063, .061], [.68, .117, .080, .068],
    [.78, .124, .078, .066], [.88, .115, .057, .055], [1, .037, .033, .034],
  ] : [
    [0, .115, .065, .066], [.14, .134, .075, .078], [.28, .112, .069, .074],
    [.38, .098, .061, .065], [.52, .120, .075, .078], [.70, .151, .094, .083],
    [.80, .151, .086, .075], [.89, .127, .061, .062], [1, .042, .035, .037],
  ];
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const skinIndices: number[] = [], weights: number[] = [];
  const rows = 40, columns = 40;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const next = Math.max(1, profile.findIndex(point => point[0] >= t));
    const a = profile[next - 1], b = profile[next];
    const blend = THREE.MathUtils.smoothstep(t, a[0], b[0]);
    const width = THREE.MathUtils.lerp(a[1], b[1], blend);
    const front = THREE.MathUtils.lerp(a[2], b[2], blend), back = THREE.MathUtils.lerp(a[3], b[3], blend);
    const y = bottom + t * height;
    // Distribute bending across the waist, keeping the pelvis on Hips.
    const upperBlend = THREE.MathUtils.smoothstep(y, joints[1].y, joints[2].y);
    const lowerBlend = THREE.MathUtils.smoothstep(y, joints[0].y, joints[1].y);
    for (let column = 0; column <= columns; column++) {
      const angle = column / columns * Math.PI * 2 + Math.PI;
      const x = Math.sin(angle) * width, facing = Math.cos(angle);
      const bust = female && facing > 0
        ? .030 * Math.exp(-(((t - .70) / .105) ** 2)) * Math.exp(-(((Math.abs(x) - .053) / .048) ** 2)) * facing
        : 0;
      const centerZ = THREE.MathUtils.lerp(joints[0].z, neck.z, t);
      positions.push(joints[0].x + x * h, y, centerZ + (facing * (facing > 0 ? front : back) + bust) * h);
      uvs.push(column / columns * 2, t);
      skinIndices.push(0, 1, 2, 0);
      weights.push(1 - lowerBlend, lowerBlend * (1 - upperBlend), lowerBlend * upperBlend, 0);
      if (row < rows && column < columns) {
        const current = row * (columns + 1) + column, upper = current + columns + 1;
        indices.push(current, current + 1, upper, upper, current + 1, upper + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  // Average the duplicated UV seam normals, leaving no hard line down the back.
  const normals = geometry.getAttribute('normal');
  for (let row = 0; row <= rows; row++) {
    const first = row * (columns + 1), last = first + columns;
    const normal = new THREE.Vector3().fromBufferAttribute(normals, first)
      .add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z); normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = 'hero_cuirass'; mesh.castShadow = true;
  // Runtime poses can leave the idle bounds; avoid stale skinned-mesh culling.
  mesh.frustumCulled = false;
  root.add(mesh); root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
}
