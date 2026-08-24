export const MAX_OFFSET = 0.8;  // unidades de mundo de desplazamiento máximo de cámara
export const DECAY = 1.6;       // cuánto trauma se pierde por segundo

/**
 * Sistema de "trauma" (Squirrel Eiserloh): el trauma ∈ [0,1] decae linealmente y
 * el desplazamiento usa trauma² (curva suave). El offset es aleatorio por frame
 * dentro de ±MAX_OFFSET·trauma², para un shake orgánico.
 */
export class ScreenShake {
  private _trauma = 0;

  addTrauma(amount: number): void {
    this._trauma = Math.min(1, Math.max(0, this._trauma + amount));
  }

  get trauma(): number { return this._trauma; }

  update(dt: number): { x: number; y: number } {
    if (this._trauma <= 0) return { x: 0, y: 0 };
    this._trauma = Math.max(0, this._trauma - DECAY * dt);
    const mag = this._trauma * this._trauma;
    return {
      x: (Math.random() * 2 - 1) * MAX_OFFSET * mag,
      y: (Math.random() * 2 - 1) * MAX_OFFSET * mag,
    };
  }
}
