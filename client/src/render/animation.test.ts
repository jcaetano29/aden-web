import { describe, it, expect } from "vitest";
import { selectClip } from "./animation.js";

const CLIPS = ["Idle", "Walking_A", "Running_A", "Attack_Melee"];

describe("selectClip", () => {
  it("elige el clip de caminar por 'walk'", () => {
    expect(selectClip(CLIPS, "walk")).toBe("Walking_A");
  });

  it("elige el clip idle por 'idle'", () => {
    expect(selectClip(CLIPS, "idle")).toBe("Idle");
  });

  it("cae a 'run' si no hay 'walk'", () => {
    expect(selectClip(["Idle", "Running_A"], "walk")).toBe("Running_A");
  });

  it("es case-insensitive", () => {
    expect(selectClip(["idle_loop", "walk_loop"], "walk")).toBe("walk_loop");
  });

  it("devuelve null si no hay clips", () => {
    expect(selectClip([], "idle")).toBeNull();
  });

  it("cae al primer clip si no matchea nada", () => {
    expect(selectClip(["Foo", "Bar"], "walk")).toBe("Foo");
  });

  it("prefiere el idle neutro sobre variantes con arma (nombre más corto)", () => {
    expect(selectClip(["2H_Melee_Idle", "Idle", "Unarmed_Idle"], "idle")).toBe("Idle");
  });

  it("prefiere la caminata base sobre variantes", () => {
    expect(selectClip(["Walking_Backwards", "Walking_A"], "walk")).toBe("Walking_A");
  });
});
