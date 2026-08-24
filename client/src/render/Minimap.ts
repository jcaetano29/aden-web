import { MAP_BOUNDS, TOWN, ZONES } from "@aden/shared";

export type MinimapEntity = { x: number; z: number; kind: "self" | "player" | "mob" | "boss" };
export type MinimapMarker = { x: number; z: number; label: string; color: string };

/** "0xRRGGBB" → "#rrggbb" para dibujar en canvas 2D con los colores de bioma. */
function hexColor(n: number, alpha = 1): string {
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

const SIZE = 168; // px del canvas
const PAD = 6; // margen interno para que los puntos del borde no se corten

/**
 * Minimapa fijo (esquina superior derecha). Dibuja una vista cenital abstracta
 * del mundo (MAP_BOUNDS, ±50) con el pueblo, marcadores fijos (NPCs / arena del
 * jefe) y las entidades vivas (self/otros jugadores/mobs/jefe) leídas cada frame
 * del estado sincronizado. Norte = -Z arriba. Sólo UI; no muta nada.
 */
export class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private markers: MinimapMarker[] = [];
  private objective: MinimapMarker | null = null;
  private pulse = 0;

  constructor(parent: HTMLElement = document.body) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.canvas.style.cssText =
      "position:fixed;top:12px;right:12px;z-index:1000;pointer-events:none;" +
      "border:2px solid #555;border-radius:6px;background:rgba(10,14,10,0.72);" +
      "box-shadow:0 2px 8px rgba(0,0,0,0.5);";
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
  }

  /** Marcadores fijos del mundo (NPCs, arena del jefe): se setean una vez. */
  setMarkers(markers: MinimapMarker[]): void {
    this.markers = markers;
    this.update([]); // frame inicial: muestra pueblo + marcadores aunque no haya entidades aún
  }

  /**
   * Marcador dinámico del objetivo de la misión activa (zona del enemigo a
   * cazar). Se actualiza cada frame desde main; `null` lo oculta.
   */
  setObjective(objective: MinimapMarker | null): void {
    this.objective = objective;
  }

  /**
   * Convierte coords de mundo (x,z) a píxeles del canvas, preservando el aspecto
   * del mundo (ahora rectangular, más alto que ancho): se usa una escala única
   * (la del eje mayor) y se centra el eje menor. Norte (-z) arriba.
   */
  private toPx(x: number, z: number): [number, number] {
    const { minX, maxX, minZ, maxZ } = MAP_BOUNDS;
    const usable = SIZE - PAD * 2;
    const worldW = maxX - minX;
    const worldD = maxZ - minZ;
    const scale = usable / Math.max(worldW, worldD);
    const offX = (usable - worldW * scale) / 2;
    const offZ = (usable - worldD * scale) / 2;
    const px = PAD + offX + (x - minX) * scale;
    const py = PAD + offZ + (z - minZ) * scale;
    return [px, py];
  }

  /** Radio en píxeles de una distancia en unidades de mundo (para dibujar zonas). */
  private toPxRadius(worldR: number): number {
    const { minX, maxX, minZ, maxZ } = MAP_BOUNDS;
    const usable = SIZE - PAD * 2;
    const scale = usable / Math.max(maxX - minX, maxZ - minZ);
    return worldR * scale;
  }

  private dot(x: number, z: number, r: number, color: string): void {
    const [px, py] = this.toPx(x, z);
    this.ctx.beginPath();
    this.ctx.arc(px, py, r, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  /** Redibuja el minimapa con las entidades actuales. Llamar cada frame. */
  update(entities: MinimapEntity[]): void {
    const ctx = this.ctx;
    this.pulse += 0.06;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Zonas del mundo: disco tenue con el color del bioma → el jugador ve de un
    // vistazo el mapa de zonas (pueblo verde al sur, ruinas violeta, yermo rojo,
    // trono oscuro al norte) y hacia dónde avanzar.
    for (const z of ZONES) {
      const [zx, zy] = this.toPx(z.center.x, z.center.z);
      ctx.beginPath();
      ctx.arc(zx, zy, this.toPxRadius(z.radius), 0, Math.PI * 2);
      ctx.fillStyle = hexColor(z.biome.ground, z.safe ? 0.35 : 0.5);
      ctx.fill();
    }

    // Pueblo: anillo destacado alrededor de TOWN (punto de partida/refugio).
    const [tx, ty] = this.toPx(TOWN.x, TOWN.z);
    ctx.beginPath();
    ctx.arc(tx, ty, this.toPxRadius(6), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,213,79,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Objetivo de la misión activa: anillo pulsante + etiqueta, para saber a
    // dónde ir a cazar. Se dibuja bajo las entidades vivas.
    if (this.objective) {
      const [ox, oy] = this.toPx(this.objective.x, this.objective.z);
      const r = 7 + Math.sin(this.pulse) * 2.5;
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.strokeStyle = this.objective.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = this.objective.color;
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.objective.label, ox, oy);
    }

    // Marcadores fijos (NPCs / arena del jefe).
    for (const m of this.markers) {
      const [mx, my] = this.toPx(m.x, m.z);
      ctx.fillStyle = m.color;
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(m.label, mx, my);
    }

    // Entidades vivas.
    for (const e of entities) {
      if (e.kind === "self") continue; // el self se dibuja al final, arriba de todo
      if (e.kind === "boss") this.dot(e.x, e.z, 4, "#ff3b3b");
      else if (e.kind === "player") this.dot(e.x, e.z, 3, "#4da6ff");
      else this.dot(e.x, e.z, 2.4, "#c0c0c0");
    }

    // El jugador local: flecha/punto blanco resaltado.
    const self = entities.find((e) => e.kind === "self");
    if (self) {
      const [sx, sy] = this.toPx(self.x, self.z);
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#1a1a1a";
      ctx.stroke();
    }

    // Indicador de Norte.
    ctx.fillStyle = "#ddd";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("N", SIZE / 2, 3);
  }
}
