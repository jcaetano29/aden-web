import { type Zone, getZone } from "@aden/shared";

export type MinimapEntity = { x: number; z: number; kind: "self" | "player" | "mob" | "boss" };

const SIZE = 168; // px del canvas
const PAD = 8;

/** "0xRRGGBB" → "rgba(...)" para pintar el fondo del bioma. */
function hexColor(n: number, alpha = 1): string {
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Minimapa (esquina sup. der.): radar del MAPA ACTUAL (Etapa 15, estilo Mu). Se
 * escala a los bounds del mapa donde está el jugador (setMap) y dibuja las entidades
 * de ese mapa (self/otros/mobs/jefe). Norte = -Z arriba. Sólo UI.
 */
export class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly nameEl: HTMLDivElement;
  private zone: Zone = getZone("pueblo");

  constructor(parent: HTMLElement = document.body) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;top:12px;right:12px;z-index:1000;pointer-events:none;text-align:center;";

    this.nameEl = document.createElement("div");
    this.nameEl.style.cssText =
      "font:bold 11px sans-serif;color:#fff;text-shadow:0 0 3px #000;margin-bottom:3px;";
    wrap.appendChild(this.nameEl);

    this.canvas = document.createElement("canvas");
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.canvas.style.cssText =
      "border:2px solid #555;border-radius:6px;background:rgba(10,14,10,0.72);box-shadow:0 2px 8px rgba(0,0,0,0.5);";
    wrap.appendChild(this.canvas);
    parent.appendChild(wrap);
    this.ctx = this.canvas.getContext("2d")!;
    this.setMap(this.zone);
  }

  /** Fija el mapa que muestra el minimapa (al warpear). */
  setMap(zone: Zone): void {
    this.zone = zone;
    this.nameEl.textContent = zone.name;
    this.update([]);
  }

  /** Coords del mapa actual → píxeles del canvas (aspecto preservado). Norte (-z) arriba. */
  private toPx(x: number, z: number): [number, number] {
    const b = this.zone.bounds;
    const usable = SIZE - PAD * 2;
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
    const scale = usable / Math.max(w, d);
    const offX = (usable - w * scale) / 2;
    const offZ = (usable - d * scale) / 2;
    return [PAD + offX + (x - b.minX) * scale, PAD + offZ + (z - b.minZ) * scale];
  }

  private dot(x: number, z: number, r: number, color: string): void {
    const [px, py] = this.toPx(x, z);
    this.ctx.beginPath();
    this.ctx.arc(px, py, r, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  update(entities: MinimapEntity[]): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Fondo con el color del bioma del mapa actual.
    const [x0, y0] = this.toPx(this.zone.bounds.minX, this.zone.bounds.minZ);
    const [x1, y1] = this.toPx(this.zone.bounds.maxX, this.zone.bounds.maxZ);
    ctx.fillStyle = hexColor(this.zone.biome.ground, 0.55);
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));

    for (const e of entities) {
      if (e.kind === "self") continue;
      if (e.kind === "boss") this.dot(e.x, e.z, 4, "#ff3b3b");
      else if (e.kind === "player") this.dot(e.x, e.z, 3, "#4da6ff");
      else this.dot(e.x, e.z, 2.4, "#c0c0c0");
    }

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

    ctx.fillStyle = "#ddd";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("N", SIZE / 2, 3);
  }
}
