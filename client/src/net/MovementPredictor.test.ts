import { describe, it, expect } from "vitest";
import { advanceMovable, clampToBounds, getZone, MOVE_SPEED, type Movable } from "@aden/shared";
import { MovementPredictor, predictorStateFromSnapshot, type PredictorServerState } from "./MovementPredictor.js";

// Tramo recto y libre del pueblo (verificado con clipMovement): spawn (0,14) → (8,14).
const START = { x: 0, z: 14 };
const GOAL = { x: 8, z: 14 };

function server(over: Partial<PredictorServerState> = {}): PredictorServerState {
  return {
    x: START.x, z: START.z, targetX: START.x, targetZ: START.z, moving: false,
    mapId: "pueblo", dead: false, stunMs: 0, rootMs: 0, moveSpeed: MOVE_SPEED, ...over,
  };
}

function readyPredictor(over: Partial<PredictorServerState> = {}): MovementPredictor {
  const p = new MovementPredictor();
  p.reconcile(server(over));
  return p;
}

describe("MovementPredictor", () => {
  it("arranca a caminar en el mismo frame del click, sin esperar al server", () => {
    const p = readyPredictor();
    const sent = p.request(GOAL.x, GOAL.z);
    expect(sent).toEqual(GOAL);
    p.update(0.1);
    expect(p.state.moving).toBe(true);
    expect(p.state.x).toBeCloseTo(START.x + MOVE_SPEED * 0.1);
    expect(p.state.z).toBeCloseTo(START.z);
  });

  it("no se mueve antes de conocer el estado del server", () => {
    const p = new MovementPredictor();
    expect(p.request(GOAL.x, GOAL.z)).toBeNull();
  });

  it("llega exactamente al mismo punto que el server, que corre el mismo código con latencia", () => {
    const p = readyPredictor();
    const srv: Movable = { x: START.x, z: START.z, targetX: START.x, targetZ: START.z, moving: false, mapId: "pueblo" };
    p.request(GOAL.x, GOAL.z);
    const dt = 1 / 15;
    for (let tick = 0; tick < 60; tick++) {
      if (tick === 3) { srv.targetX = GOAL.x; srv.targetZ = GOAL.z; srv.moving = true; } // el MoveTo llega ~200 ms tarde
      advanceMovable(srv, dt, MOVE_SPEED);
      p.update(dt);
      p.reconcile(server({ x: srv.x, z: srv.z, targetX: srv.targetX, targetZ: srv.targetZ, moving: srv.moving }));
    }
    expect(srv.moving).toBe(false);
    expect(p.state.moving).toBe(false);
    expect(p.state.x).toBeCloseTo(GOAL.x);
    expect(p.state.z).toBeCloseTo(GOAL.z);
  });

  it("no tironea hacia atrás con latencia de ida y vuelta (200 ms de subida, 133 ms de bajada)", () => {
    const p = readyPredictor();
    const srv: Movable = { x: START.x, z: START.z, targetX: START.x, targetZ: START.z, moving: false, mapId: "pueblo" };
    const inFlight: PredictorServerState[] = [];
    const DOWNLINK_TICKS = 2;
    p.request(GOAL.x, GOAL.z);
    const dt = 1 / 15;
    let previousX = p.state.x;
    for (let tick = 0; tick < 60; tick++) {
      if (tick === 3) { srv.targetX = GOAL.x; srv.targetZ = GOAL.z; srv.moving = true; }
      advanceMovable(srv, dt, MOVE_SPEED);
      inFlight.push(server({ x: srv.x, z: srv.z, targetX: srv.targetX, targetZ: srv.targetZ, moving: srv.moving }));
      p.update(dt);
      if (inFlight.length > DOWNLINK_TICKS) p.reconcile(inFlight.shift()!);
      expect(p.state.x).toBeGreaterThanOrEqual(previousX - 1e-9);
      previousX = p.state.x;
    }
    expect(p.state.x).toBeCloseTo(GOAL.x);
    expect(p.state.moving).toBe(false);
  });

  it("sigue prediciendo mientras el server todavía no recibió el click", () => {
    const p = readyPredictor();
    p.request(GOAL.x, GOAL.z);
    p.update(0.2);
    const ahead = p.state.x;
    p.reconcile(server()); // el server sigue quieto en el inicio con el target viejo
    expect(p.state.moving).toBe(true);
    expect(p.state.x).toBeCloseTo(ahead);
    expect(p.state.targetX).toBe(GOAL.x);
  });

  it("adopta la posición del server cuando éste lo teletransporta (warp, respawn, pergamino)", () => {
    const p = readyPredictor();
    p.request(GOAL.x, GOAL.z);
    p.update(0.2);
    p.reconcile(server({ x: -20, z: -20, targetX: -20, targetZ: -20, moving: false }));
    expect(p.state).toEqual({ x: -20, z: -20, targetX: -20, targetZ: -20, moving: false });
  });

  it("adopta el estado del server al cambiar de mapa", () => {
    const p = readyPredictor();
    p.reconcile(server({ mapId: "bosque", x: 3, z: 4, targetX: 3, targetZ: 4 }));
    expect(p.state).toEqual({ x: 3, z: 4, targetX: 3, targetZ: 4, moving: false });
  });

  it.each([
    ["aturdido", { stunMs: 1500 }],
    ["enraizado", { rootMs: 1500 }],
    ["muerto", { dead: true }],
  ])("no arranca a caminar si está %s", (_label, over) => {
    const p = readyPredictor(over);
    expect(p.request(GOAL.x, GOAL.z)).toBeNull();
    p.update(0.2);
    expect(p.state.moving).toBe(false);
    expect(p.state.x).toBe(START.x);
  });

  it("frena al llegar un stun a mitad de camino y vuelve a la posición del server", () => {
    const p = readyPredictor();
    p.request(GOAL.x, GOAL.z);
    p.update(0.3);
    p.reconcile(server({ x: 1, z: 14, targetX: GOAL.x, targetZ: GOAL.z, moving: false, stunMs: 1500 }));
    p.update(0.1);
    expect(p.state.moving).toBe(false);
    expect(p.state.x).toBeCloseTo(1);
    expect(p.state.z).toBeCloseTo(14);
  });

  it("no sigue caminando aturdido aunque el server todavía no haya recibido el click", () => {
    const p = readyPredictor();
    p.request(GOAL.x, GOAL.z);
    p.update(0.1);
    p.reconcile(server({ stunMs: 1500 })); // stun con el destino viejo: el MoveTo sigue en vuelo
    p.update(0.5);
    expect(p.state.moving).toBe(false);
    expect(p.state.x).toBeCloseTo(MOVE_SPEED * 0.1);
  });

  it("corrige a la posición del server si la divergencia supera la tolerancia", () => {
    const p = readyPredictor();
    p.request(GOAL.x, GOAL.z);
    p.update(0.1);
    p.reconcile(server({ x: 0, z: 22, targetX: GOAL.x, targetZ: GOAL.z, moving: true }));
    expect(p.state.x).toBeCloseTo(0);
    expect(p.state.z).toBeCloseTo(22);
    expect(p.state.targetX).toBe(GOAL.x);
  });

  it("clampea el destino a los límites del mapa igual que el server", () => {
    const p = readyPredictor();
    const sent = p.request(500, -500)!;
    expect(sent).toEqual(clampToBounds(500, -500, getZone("pueblo").bounds));
    expect(p.state.targetX).toBe(sent.x);
    expect(p.state.targetZ).toBe(sent.z);
  });

  it("traduce el snapshot de red con valores por defecto para campos que el server todavía no mandó", () => {
    const snap = { name: "Aela", x: 1, z: 2, targetX: 3, targetZ: 4, moving: true, dead: false };
    expect(predictorStateFromSnapshot(snap)).toEqual({
      x: 1, z: 2, targetX: 3, targetZ: 4, moving: true, dead: false,
      mapId: "pueblo", stunMs: 0, rootMs: 0, moveSpeed: MOVE_SPEED,
    });
    expect(predictorStateFromSnapshot({ ...snap, mapId: "cripta", stunMs: 900, rootMs: 400, moveSpeed: 6 })).toMatchObject({
      mapId: "cripta", stunMs: 900, rootMs: 400, moveSpeed: 6,
    });
  });

  it("usa la velocidad replicada por el server (montura +20%)", () => {
    const p = readyPredictor({ moveSpeed: MOVE_SPEED * 1.2 });
    p.request(GOAL.x, GOAL.z);
    p.update(0.5);
    expect(p.state.x).toBeCloseTo(MOVE_SPEED * 1.2 * 0.5);
  });
});
