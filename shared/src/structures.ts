import { TOWN } from "./combat.js";
import { ZONES, type Zone } from "./world.js";
import { WORLD_OBJECTS } from "./worldobjects.js";
export interface Point2 {
    readonly x: number;
    readonly z: number;
}
/** Local X/Z rectangle rotated like THREE.Object3D.rotation.y. */
export interface StructureObstacle extends Point2 {
    readonly id: string;
    readonly mapId: string;
    readonly width: number;
    readonly depth: number;
    readonly rotation: number;
}
export const STRUCTURE_SIZE = Object.freeze({ houseWidth: 5, houseDepth: 4.5, fountainRadius: 3.6, wellRadius: 1.1, towerRadius: 2.4, stallWidth: 3.2, stallDepth: 1.4, archPierWidth: 1, archPierOffset: 3, gateTowerWidth: 4, fenceDepth: 0.2, columnRadius: 0.9, obeliskRadius: 1.6, dressingColumnRadius: 0.72 });
export interface AuthoredStructure extends StructureObstacle {
    readonly kind: string;
    readonly height: number;
    readonly color: number;
    readonly roof: number;
    readonly scale: number;
    readonly thatched: boolean;
    readonly broken: boolean;
}
const authored: AuthoredStructure[] = [];
function add(kind: string, mapId: string, x: number, z: number, width: number, depth: number, rotation = 0, height = 1, color = 0x8a8497, scale = 1, roof = 0x7a3b2b, thatched = false, broken = false) {
    authored.push({ id: `${mapId}-${kind}-${authored.length}`, kind, mapId, x, z, width, depth, rotation, height, color, scale, roof, thatched, broken });
}
const S = STRUCTURE_SIZE;
const cx = TOWN.x, cz = TOWN.z;
const houseColors = [0xc9b48c, 0xbfa77e, 0xd0be95, 0xb89f76, 0xcab488], roofColors = [0x7a3b2b, 0x8a4a2b, 0x6a4a3b, 0x7a4a2b];
let hi = 0;
for (const side of [-1, 1])
    for (let row = 0; row < 3; row++, hi++)
        add('house', 'pueblo', cx + side * (16 + (row % 2) * 3), cz - 26 + row * 16, S.houseWidth, S.houseDepth, side < 0 ? 1.5 + (hi % 2) * .1 : -1.5 - (hi % 2) * .1, 3, houseColors[hi % 5], 1, roofColors[hi % 4], hi % 3 === 0);
add('house', 'pueblo', cx, cz - 34, S.houseWidth * 1.5, S.houseDepth * 1.5, 0, 4.5, 0xcab488, 1.5, 0x6a4a3b);
for (const side of [-1, 1])
    add('house', 'pueblo', cx + side * 23, cz + 24, S.houseWidth, S.houseDepth, side * Math.PI / 2, 3, 0xc9b991, 1, 0x566274);
add('fountain', 'pueblo', cx, cz, S.fountainRadius * 2, S.fountainRadius * 2);
add('well', 'pueblo', 14, -4, S.wellRadius * 2, S.wellRadius * 2);
const stallColors = [0xb23b3b, 0x2f7d4f, 0x3060a8, 0xb8902b, 0x8a4fa8];
for (let i = 0; i < 5; i++)
    add('stall', 'pueblo', cx + 20 + (i % 2) * 2, cz + 2 + (i - 2) * 6, S.stallWidth, S.stallDepth, -Math.PI / 2, 1, stallColors[i]);
for (let i = 0; i < 3; i++)
    add('stall', 'pueblo', cx - 22, cz - 6 + i * 7, S.stallWidth, S.stallDepth, Math.PI / 2, 1, stallColors[(i + 2) % 5]);
for (let i = 0; i < 24; i++) {
    const a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2, a = (a0 + a1) / 2, r = 42, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (z > cz + r - 8 && Math.abs(x - cx) < 8)
        continue;
    add('wall', 'pueblo', x, z, Math.hypot(Math.cos(a1) * r - Math.cos(a0) * r, Math.sin(a1) * r - Math.sin(a0) * r) + .6, 1.6, -a - Math.PI / 2, 5);
}
for (const side of [-1, 1])
    add('gateTower', 'pueblo', cx + side * 7, cz + 42, S.gateTowerWidth, S.gateTowerWidth, 0, 9);
export const TOWN_FENCES = Object.freeze([[-30, 8, -30, -6], [-30, -6, -18, -6], [-15, 30, -27, 30], [15, 30, 27, 30]].map(p => Object.freeze(p)));
for (const [x0, z0, x1, z1] of TOWN_FENCES)
    add('fence', 'pueblo', cx + (x0 + x1) / 2, cz + (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0) + S.fenceDepth, S.fenceDepth, -Math.atan2(z1 - z0, x1 - x0), 1.2);
for (const [map, x, z, h, color, broken] of [
    ['bosque', 340, -30, 9, 0x8a8497, false], ['bosque', 262, 30, 6, 0x7a7d80, false], ['ruinas', -40, 268, 7, 0x6a5f80, true], ['yermo', 340, 320, 8, 0x3b322c, true], ['yermo', 262, 276, 6, 0x2e2622, true], ['trono', 574, 190, 10, 0x201c28, true], ['trono', 626, 190, 10, 0x201c28, true],
] as const)
    add('tower', map, x, z, S.towerRadius * 2, S.towerRadius * 2, 0, h, color, 1, 0, false, broken);
for (const [map, x, z, rot, color, scale] of [['bosque', 300, 55, 0, 0x6b6577, 1.2], ['bosque', 300, -58, 0, 0x5f5a52, 1], ['ruinas', 0, 355, 0, 0x9b7fd4, 1.6], ['ruinas', 40, 300, Math.PI / 2, 0x7a6f90, 1.1], ['yermo', 300, 356, 0, 0x2a231f, 1.2], ['trono', 600, 200, 0, 0x1e1b26, 2]] as const)
    add('arch', map, x, z, S.archPierWidth * scale, S.archPierWidth * scale, rot, 7 * scale, color, scale);
for (let i = 0; i < 6; i++)
    for (const x of [-12, 12])
        add('templeColumn', 'ruinas', x, 300 - 8 + i * 3.2, S.columnRadius * 2, S.columnRadius * 2, 0, 6);
for (let i = 0; i < 5; i++)
    for (const x of [-7, 7])
        add('boneColumn', 'trono', 600 + x, 162 - i * 6, S.columnRadius * 2, S.columnRadius * 2, 0, 6);
export const OBELISKS = Object.freeze([[-30, 20, 10], [28, -18, 12], [-10, -30, 8], [18, 26, 9], [-26, -8, 11], [8, 8, 7]].map(p => Object.freeze(p)));
for (const [x, z, h] of OBELISKS)
    add('obelisk', 'yermo', 300 + x, 300 + z, S.obeliskRadius * 2, S.obeliskRadius * 2, 0, h);
add('tent', 'bosque', 280, -5, 4, 4, Math.PI / 4, 2.2);
// Raised throne base is solid; stairs and flush temple platforms remain walkable.
add('throne', 'trono', 600, 140, 10, 10);
export interface StructureBox extends StructureObstacle {
    readonly y: number;
    readonly height: number;
    readonly material: 'stone' | 'timber' | 'cloth' | 'iron' | 'gold' | 'blue';
    readonly solid: boolean;
}
const boxes: StructureBox[] = [];
function box(mapId: string, id: string, x: number, y: number, z: number, width: number, height: number, depth: number, material: StructureBox['material'] = 'stone', solid = true) { boxes.push({ mapId, id, x, y, z, width, height, depth, rotation: 0, material, solid }); }
for (const [index, z] of [28, -1, -34].entries())
    for (const x of [879, 921]) {
        box('cripta', `crypt-wall-${index}-${x}`, x, .35, z, .8, .7, 24);
        for (const dz of [-10, 10]) {
            const id = `crypt-pillar-${index}-${x}-${dz}`;
            box('cripta', id, x, 2.1, z + dz, 1.3, 4.2, 1.3);
            box('cripta', `${id}-capital`, x, 4.3, z + dz, 1.9, .3, 1.9, 'stone', false);
            box('cripta', `${id}-light`, x, 4.65, z + dz, .6, .45, .6, index === 2 ? 'gold' : 'blue', false);
        }
    }
for (const z of [14, -18])
    for (const x of [895, 905]) {
        box('cripta', `crypt-passage-${x}-${z}`, x, 1.4, z, .65, 2.8, .65);
        box('cripta', `crypt-passage-capital-${x}-${z}`, x, 2.9, z, .8, .35, .8, 'gold', false);
    }
for (const zone of ZONES.filter(z => !z.safe && z.id !== 'cripta'))
    for (const side of [-1, 1])
        for (const row of [-1, 1]) {
            const x = zone.center.x + side * 25, z = zone.center.z + row * 26;
            if (WORLD_OBJECTS.some(o => o.mapId === zone.id && Math.hypot(o.x - x, o.z - z) < 12))
                continue;
            let n = 0;
            const b = (dx: number, y: number, dz: number, w: number, h: number, d: number, m: StructureBox['material'] = 'stone', solid = true) => box(zone.id, `${zone.id}-landmark-${side}-${row}-${n++}`, x + dx, y, z + dz, w, h, d, m, solid);
            if (zone.id === 'bosque') {
                for (const dx of [-3, 3])
                    for (const dz of [-2, 2])
                        b(dx, 1.8, dz, .22, 3.6, .22, 'timber');
                b(0, 3.5, 0, 7, .15, 5, 'cloth', false);
                for (let i = 0; i < 3; i++)
                    b(-2 + i * 1.1, .55, -1, .9, 1.1, .8, 'timber');
                b(0, .45, 2.5, 4.4, .18, .7, 'timber');
            }
            else {
                b(0, .8, -4, 12, 1.6, .9);
                b(side * 5, 1.1, 0, .9, 2.2, 8);
                for (const dx of [-4, 4]) {
                    b(dx, 2.2, -3, 1.1, 4.4, 1.1);
                    b(dx, 4.5, -3, 1.8, .4, 1.8, 'stone', false);
                    b(dx, .6, 1, 1.8, 1.2, 3);
                }
                b(0, 2.6, -3, .12, 5.2, .12, 'iron');
                b(.75, 3.7, -3, 1.4, 2, .08, 'cloth', false);
            }
        }
// Isolated deterministic stream for scattered ruin columns; central routes stay clear.
let columnSeed = 4913;
const columnRandom = () => { columnSeed = (Math.imul(columnSeed, 1664525) + 1013904223) >>> 0; return columnSeed / 4294967296; };
for (let i = 0; i < 26;) {
    const x = -59 + columnRandom() * 118, z = 241 + columnRandom() * 118;
    if (Math.abs(x) < 7 || Math.abs(z - 300) < 5 || Math.hypot(x, z - 300) < 18 || Math.hypot(x, z - 355) < 9 || WORLD_OBJECTS.some(o => o.mapId === 'ruinas' && Math.hypot(o.x - x, o.z - z) < 6))
        continue;
    add('ruinColumn', 'ruinas', x, z, 1.2, 1.2, 0, 1.5 + columnRandom() * 4);
    i++;
}
export const AUTHORED_STRUCTURES: readonly AuthoredStructure[] = Object.freeze(authored.map(p => Object.freeze(p)));
export const STRUCTURE_BOXES: readonly StructureBox[] = Object.freeze(boxes.map(p => Object.freeze(p)));
export interface Placement {
    x: number;
    z: number;
    scale: number;
    yaw: number;
    kind: "tree" | "rock" | "shrub";
}
function random(seed: number): () => number {
    return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}
/** Clustered, reproducible decoration. The main route, central arena, spawn and
 * interactables reserve space before any props are emitted. No gameplay state. */
export function dressingLayout(zone: Zone): Placement[] {
    if (zone.id === "cripta")
        return []; // The dungeon uses authored chambers, not scattered scenery.
    const rng = random(Array.from(zone.id).reduce((n, c) => n * 31 + c.charCodeAt(0), 8421));
    const objects = WORLD_OBJECTS.filter(o => o.mapId === zone.id);
    const out: Placement[] = [];
    const count = zone.safe ? 260 : zone.id === "bosque" ? 880 : 520;
    for (let attempt = 0; attempt < count * 12 && out.length < count; attempt++) {
        // Alternating groves and scattered low detail avoids a uniform carpet.
        const cluster = attempt % 8;
        const angle = cluster * Math.PI / 4 + 0.24;
        const radius = zone.safe ? 52 : 34 + (cluster % 2) * 12;
        const dx = Math.cos(angle) * radius + (rng() - 0.5) * 27;
        const dz = Math.sin(angle) * radius + (rng() - 0.5) * 27;
        const x = zone.center.x + dx, z = zone.center.z + dz;
        if (Math.abs(dx) > 60 || Math.abs(dz) > 60 || Math.abs(dx) < 7 || Math.abs(dz) < 5)
            continue;
        if (Math.hypot(dx, dz) < (zone.safe ? 46 : 19))
            continue;
        if (!zone.safe && [-1, 1].some(side => [-1, 1].some(row => Math.hypot(dx - side * 25, dz - row * 26) < 10)))
            continue;
        if (Math.hypot(x - zone.spawn.x, z - zone.spawn.z) < 10)
            continue;
        if (objects.some(o => Math.hypot(x - o.x, z - o.z) < 7))
            continue;
        const roll = rng();
        const kind = roll < (zone.id === "bosque" ? 0.3 : zone.safe ? 0.25 : 0.12) ? "tree" : roll < 0.52 ? "rock" : "shrub";
        // Keep large trees/columns from overlapping one another inside a grove.
        if (kind === "tree" && out.some(p => p.kind === "tree" && Math.hypot(p.x - x, p.z - z) < 3.5))
            continue;
        out.push({ x, z, scale: 0.65 + rng() * 0.8, yaw: rng() * Math.PI * 2, kind });
    }
    return out;
}
const obstacles: StructureObstacle[] = authored.flatMap(p => p.kind === 'arch' ? [-1, 1].map(side => ({ ...p, id: `${p.id}-pier-${side}`, x: p.x + Math.cos(p.rotation) * side * S.archPierOffset * p.scale, z: p.z - Math.sin(p.rotation) * side * S.archPierOffset * p.scale })) : [p]);
obstacles.push(...boxes.filter(p => p.solid));
for (const zone of ZONES.filter(z => z.id === 'ruinas' || z.id === 'trono'))
    dressingLayout(zone).filter(p => p.kind === 'tree').forEach((p, i) => obstacles.push({ id: zone.id + '-grove-column-' + i, mapId: zone.id, x: p.x, z: p.z, width: S.dressingColumnRadius * 2 * p.scale, depth: S.dressingColumnRadius * 2 * p.scale, rotation: p.yaw }));
export const STRUCTURE_OBSTACLES: readonly StructureObstacle[] = Object.freeze(obstacles.map(p => Object.freeze({ id: p.id, mapId: p.mapId, x: p.x, z: p.z, width: p.width, depth: p.depth, rotation: p.rotation })));
const obstaclesByMap = new Map(ZONES.map(zone => [zone.id, Object.freeze(STRUCTURE_OBSTACLES.filter(p => p.mapId === zone.id))]));
const noObstacles: readonly StructureObstacle[] = Object.freeze([]);
export function obstaclesForMap(mapId: string): readonly StructureObstacle[] { return obstaclesByMap.get(mapId) ?? noObstacles; }
