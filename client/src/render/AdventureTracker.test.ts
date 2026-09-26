// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AdventureTracker, adventureGuide } from "./AdventureTracker.js";
import { getQuest } from "@aden/shared";

describe("adventure guidance", () => {
  it('guides the Monastery handoff, regional rewards and final epilogue', () => {
    expect(adventureGuide({questId:'veil_prologue_complete',questProgress:0,mapId:'marismas'}).marker?.label).toBe('Nueva expedición');
    const ready=adventureGuide({questId:'a2_prior',questProgress:1,mapId:'monasterio'});
    expect(ready.hint).toContain('Iria'); expect(ready.marker).toMatchObject({x:1195,z:495});
    const ending=adventureGuide({questId:'memory_campaign_complete',questProgress:0,mapId:'monasterio'});
    expect(ending.title).toContain('completada'); expect(ending.marker).toBeUndefined();
  });
  it('routes the Veil rewards to Maera and recognizes the prologue ending', () => {
    const guide = adventureGuide({ questId: 'a2_caravan', questProgress: 1, mapId: 'marismas' });
    expect(guide.hint).toContain('Maera');
    expect(guide.marker).toMatchObject({ x: 1195, z: 195 });
    expect(adventureGuide({ questId: 'veil_prologue_complete', questProgress: 0, mapId: 'marismas' }).title).toBe('El camino recuperado');
  });
  it("routes unassigned and completed quests to the elder without inventing an objective", () => {
    expect(adventureGuide({ questId: "", questProgress: 0, mapId: "pueblo" }).marker).toMatchObject({ label: "Anciano", x: -5, z: 6 });
    expect(adventureGuide({ questId: "q1", questProgress: getQuest("q1").amount, mapId: "pueblo" }).marker).toMatchObject({ label: "Entregar", x: -5, z: 6 });
    const guide = adventureGuide({ questId: "q1", questProgress: getQuest("q1").amount, mapId: "bosque" });
    expect(guide.title).toBe("Recompensa disponible"); expect(guide.hint).toContain("M"); expect(guide.marker).toBeUndefined();
  });
  it('hands the Memory ending to Dorne and guides the Mines chapter to Brenna', () => {
    const ending = adventureGuide({ questId: 'memory_campaign_complete', questProgress: 0, mapId: 'pueblo' });
    expect(ending.hint).toContain('Herrero Dorne'); expect(ending.marker).toMatchObject({ label: 'Nueva expedición', x: 9, z: -1 });
    const ready = adventureGuide({ questId: 'f_armors', questProgress: 8, mapId: 'minas' });
    expect(ready.hint).toContain('Brenna'); expect(ready.marker).toMatchObject({ x: 1494, z: 194 });
    expect(adventureGuide({ questId: 'f_mark_1', questProgress: 0, mapId: 'minas' }).marker).toMatchObject({ x: 1478, z: 184 });
  });
  it('lists active errands from any announced side chain', () => {
    const parent = document.createElement('div'); const tracker = new AdventureTracker(parent);
    tracker.update({ questId: 'f_diggers', questProgress: 0, mapId: 'minas', sideChains: { tobias: { id: 't_supplies', progress: 1 }, varek: { id: 'b_forest', progress: 2 } } });
    expect(parent.textContent).toContain('Intendente Tobías · Carga perdida en el tajo');
    expect(parent.textContent).toContain('Listo para entregar');
    expect(parent.textContent).not.toContain('Limpieza del Bosque');
  });
  it("does not show unknown quest for campaign completion", () => {
    const parent = document.createElement("div"); const tracker = new AdventureTracker(parent);
    tracker.update({ questId: "campaign_complete", questProgress: 0, mapId: "pueblo" });
    expect(parent.textContent).toContain("Campaña completada"); expect(parent.textContent).not.toContain("desconocida");
  });
  it("tracks each seal, warns how to evade and clears the marker on completion", () => {
    const base = { questId: "q_crypt", questProgress: 0, mapId: "cripta", dungeonKills: 0 };
    expect(adventureGuide({ ...base, dungeonStage: 1 }).marker).toMatchObject({ x: 845, z: 8 });
    expect(adventureGuide({ ...base, dungeonStage: 3 }).marker).toMatchObject({ x: 960, z: -72 });
    expect(adventureGuide({ ...base, dungeonStage: 4 }).hint).toContain("círculo rojo");
    expect(adventureGuide({ ...base, dungeonStage: 5 }).marker).toBeUndefined();
    expect(adventureGuide({ ...base, dungeonStage: 5 }).title).toBe("Cripta conquistada");
    const hint = adventureGuide({ ...base, dungeonStage: 0 }).hint;
    expect(hint).toContain("no reaparecen");
    expect(hint).toContain("cuando no queda nadie");
    expect(hint).toContain("reingresar");
    expect(hint).not.toContain("Salir o morir reinicia");
    expect(adventureGuide({ ...base, dungeonStage: 5 }).hint).toContain("cuando todos salen");
    expect(adventureGuide({ ...base, dungeonStage: 2 }).hint).toContain("círculo rojo");
  });
  it("shows the current crypt discovery during the quest, but not on unrelated expeditions", () => {
    const state = { questId: "q_crypt", questProgress: 0, mapId: "cripta", dungeonStage: 2 };
    const guide = adventureGuide(state);
    expect(guide.story).toBeTruthy();
    expect(adventureGuide({ ...state, dungeonStage: 5 }).story).not.toBe(guide.story);
    expect(adventureGuide({ ...state, questId: "campaign_complete" }).story).toBeUndefined();
    expect(adventureGuide({ ...state, questId: "q3" }).story).toBeUndefined();
    const parent = document.createElement("div");
    const tracker = new AdventureTracker(parent);
    tracker.update(state);
    expect(parent.textContent).toContain(guide.story);
    tracker.update({ ...state, mapId: "pueblo" });
    expect(parent.textContent).not.toContain(guide.story);
  });
});
