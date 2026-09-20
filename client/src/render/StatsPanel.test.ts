// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expToNextLevel } from '@aden/shared';
import { StatsPanel, type StatsView } from './StatsPanel.js';

const view = (over: Partial<StatsView> = {}): StatsView => ({
  statPoints: 3, str: 10, agi: 8, vit: 6, ene: 4,
  pAtk: 120, pDef: 80, maxHp: 320, maxMp: 140,
  level: 12, exp: 750, hp: 210, mp: 90, ...over,
});
afterEach(() => document.body.replaceChildren());

describe('StatsPanel', () => {
  it('muestra progreso y estadísticas debajo del atributo correspondiente', () => {
    const panel = new StatsPanel(vi.fn());
    panel.update(view()); panel.open();
    expect(document.body.textContent).toContain('Nivel: 12');
    expect(document.body.textContent).toContain(`Experiencia: 750 / ${expToNextLevel(12)}`);
    expect(document.querySelector('[data-attribute="str"]')?.textContent).toContain('Ataque: 120');
    expect(document.querySelector('[data-attribute="agi"]')?.textContent).toContain('Defensa: 80');
    expect(document.querySelector('[data-attribute="vit"]')?.textContent).toContain('Vida: 210 / 320');
    expect(document.querySelector('[data-attribute="ene"]')?.textContent).toContain('Maná: 90 / 140');
  });

  it('solicita un punto del atributo elegido sin cambiar el estado antes de sincronizar', () => {
    const allocate = vi.fn(); const panel = new StatsPanel(allocate);
    panel.update(view()); panel.open();
    const button = document.querySelector<HTMLButtonElement>('[aria-label="Aumentar Fuerza"]')!;
    expect(button).not.toBeNull(); button.click();
    expect(allocate).toHaveBeenCalledTimes(1);
    expect(allocate).toHaveBeenCalledWith('str');
    expect(document.querySelector('[data-pts]')?.textContent).toBe('3');
    panel.update(view({ str: 11, statPoints: 2 }));
    expect(document.querySelector('[data-attribute="str"] [data-val]')?.textContent).toBe('11');
    expect(document.querySelector('[data-pts]')?.textContent).toBe('2');
  });

  it('deshabilita los botones sin puntos y actualiza vida y experiencia sin reemplazar el foco', () => {
    const allocate = vi.fn(); const panel = new StatsPanel(allocate);
    panel.update(view()); panel.open();
    const button = document.querySelector<HTMLButtonElement>('[aria-label="Aumentar Energía"]')!;
    expect(button).not.toBeNull(); button.focus();
    panel.update(view({ hp: 200, exp: 800 }));
    expect(document.activeElement).toBe(button);
    expect(document.body.textContent).toContain('Vida: 200 / 320');
    expect(document.body.textContent).toContain('Experiencia: 800');
    panel.update(view({ statPoints: 0 })); button.click();
    expect(allocate).not.toHaveBeenCalled();
    expect([...document.querySelectorAll<HTMLButtonElement>('.stats-add')].every(b => b.disabled)).toBe(true);
  });

  it('permite cerrar y volver a abrir el panel', () => {
    const panel = new StatsPanel(vi.fn()); panel.open();
    const close = document.querySelector<HTMLButtonElement>('[aria-label="Cerrar atributos"]');
    expect(close).not.toBeNull(); close!.click();
    expect(panel.isOpen()).toBe(false); panel.toggle(); expect(panel.isOpen()).toBe(true);
  });
});
