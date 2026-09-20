// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AdventureTracker, adventureGuide } from "./AdventureTracker.js";
import { getQuest } from "@aden/shared";

describe("adventure guidance", () => {
  it("routes unassigned and completed quests to the elder without inventing an objective", () => {
    expect(adventureGuide({ questId: "", questProgress: 0, mapId: "pueblo" }).marker).toMatchObject({ label: "Anciano", x: -5, z: 6 });
    expect(adventureGuide({ questId: "q1", questProgress: getQuest("q1").amount, mapId: "pueblo" }).marker).toMatchObject({ label: "Entregar", x: -5, z: 6 });
    const guide = adventureGuide({ questId: "q1", questProgress: getQuest("q1").amount, mapId: "bosque" });
    expect(guide.title).toBe("Recompensa disponible"); expect(guide.hint).toContain("M"); expect(guide.marker).toBeUndefined();
  });
  it("does not show unknown quest for campaign completion", () => {
    const parent = document.createElement("div"); const tracker = new AdventureTracker(parent);
    tracker.update({ questId: "campaign_complete", questProgress: 0, mapId: "pueblo" });
    expect(parent.textContent).toContain("Campaña completada"); expect(parent.textContent).not.toContain("desconocida");
  });
  it("tracks each seal, warns how to evade and clears the marker on completion", () => {
    const base = { questId: "q_crypt", questProgress: 0, mapId: "cripta", dungeonKills: 0 };
    expect(adventureGuide({ ...base, dungeonStage: 1 }).marker).toMatchObject({ x: 890, z: 15 });
    expect(adventureGuide({ ...base, dungeonStage: 3 }).marker).toMatchObject({ x: 910, z: -12 });
    expect(adventureGuide({ ...base, dungeonStage: 4 }).hint).toContain("círculo rojo");
    expect(adventureGuide({ ...base, dungeonStage: 5 }).marker).toBeUndefined();
    expect(adventureGuide({ ...base, dungeonStage: 5 }).title).toBe("Cripta conquistada");
  });
});
