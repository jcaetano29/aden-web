import * as THREE from 'three';

/** A fitted scalp and continuous side/back fall. Fine strands come from the
 * material; the silhouette never depends on disconnected tubes or spheres. */
export function createHeroHair(female: boolean, long: boolean): THREE.BufferGeometry {
  const columns = 64, capRows = 20, fallRows = female ? 12 : 0;
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let row = 0; row <= capRows + fallRows; row++) {
    for (let column = 0; column <= columns; column++) {
      const angle = column / columns * Math.PI * 2;
      const front = Math.cos(angle), side = Math.sin(angle);
      // Side part, temples and nape are all boundaries of the same surface.
      const hairline = female
        ? 1.16 + .35 * (1 - Math.max(front, 0)) + .08 * side * Math.max(front, 0)
        : 1.18 + .36 * (1 - front) + .14 * side * side + .11 * side * Math.max(front, 0);
      const polar = Math.min(row / capRows, 1) * hairline;
      const grain = .00065 * Math.sin(angle * 19 + polar * 2) * Math.sin(polar);
      let x = side * Math.sin(polar) * ((female ? .067 : .072) + grain);
      let y = Math.cos(polar) * .086 + .002;
      let z = front * Math.sin(polar) * (.066 + grain) - .004;
      if (row > capRows) {
        const t = (row - capRows) / fallRows;
        const coverage = 1 - THREE.MathUtils.smoothstep(front, .25, .78);
        const drop = t * coverage;
        const width = .072 + Math.sin(t * Math.PI) * .005;
        x = THREE.MathUtils.lerp(x, side * width, drop);
        y = THREE.MathUtils.lerp(y, long ? -.148 : -.108, drop);
        z = THREE.MathUtils.lerp(z, front * .064 - .014, drop);
      }
      positions.push(x, y, z);
      uv.push(column / columns * 2, 1 - row / (capRows + fallRows));
      if (row < capRows + fallRows && column < columns) {
        const a = row * (columns + 1) + column, b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
