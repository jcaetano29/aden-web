import { describe, it, expect } from "vitest";
import { groundPointToMove } from "./mapping.js";

describe("groundPointToMove", () => {
  it("convierte un punto 3D del suelo en un mensaje moveTo (descarta Y)", () => {
    expect(groundPointToMove({ x: 3.2, y: 12.5, z: -7.8 })).toEqual({ x: 3.2, z: -7.8 });
  });
});
