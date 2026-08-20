// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { LeaderboardPanel } from "./LeaderboardPanel.js";

describe("LeaderboardPanel", () => {
  it("dibuja filas de jugadores y de guilds", () => {
    const panel = new LeaderboardPanel();
    panel.update({
      players: [{ name: "Aragorn", level: 9, pvpKills: 4, className: "knight" }],
      guilds: [{ name: "Los Lobos", tag: "WOLF", bossKills: 3 }],
    });
    expect(panel.el.textContent).toContain("Aragorn");
    expect(panel.el.textContent).toContain("9");
    expect(panel.el.textContent).toContain("WOLF");
    expect(panel.el.textContent).toContain("Los Lobos");
  });

  it("con listas vacías muestra un placeholder y no crashea", () => {
    const panel = new LeaderboardPanel();
    panel.update({ players: [], guilds: [] });
    expect(panel.el).toBeTruthy();
  });
});
