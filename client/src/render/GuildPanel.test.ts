// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { GuildPanel } from "./GuildPanel.js";

describe("GuildPanel", () => {
  it("sin guild muestra el formulario de crear y dispara onCreate", () => {
    const onCreate = vi.fn();
    const panel = new GuildPanel({ onCreate, onJoin: vi.fn(), onLeave: vi.fn() });
    panel.update({ myGuildId: "", guilds: [], roster: [] });
    const name = panel.el.querySelector<HTMLInputElement>("[data-guild-name]")!;
    const tag = panel.el.querySelector<HTMLInputElement>("[data-guild-tag]")!;
    name.value = "Los Lobos"; tag.value = "WOLF";
    panel.el.querySelector<HTMLButtonElement>("[data-guild-create]")!.click();
    expect(onCreate).toHaveBeenCalledWith("Los Lobos", "WOLF");
  });

  it("con guild muestra el roster y el botón de salir", () => {
    const onLeave = vi.fn();
    const panel = new GuildPanel({ onCreate: vi.fn(), onJoin: vi.fn(), onLeave });
    panel.update({ myGuildId: "wolf-1", guilds: [{ id: "wolf-1", name: "Los Lobos", tag: "WOLF", leaderName: "A", bossKills: 0 }], roster: ["A", "B"] });
    expect(panel.el.textContent).toContain("Los Lobos");
    expect(panel.el.textContent).toContain("B");
    panel.el.querySelector<HTMLButtonElement>("[data-guild-leave]")!.click();
    expect(onLeave).toHaveBeenCalled();
  });
});
