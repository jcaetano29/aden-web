import type { SpawnZone } from "@aden/shared";

export interface SpawnedMob {
  id: string;
  templateId: string;
  mapId: string;
  x: number;
  z: number;
}

export function createSpawns(zones: SpawnZone[], rng: () => number): SpawnedMob[] {
  const mobs: SpawnedMob[] = [];
  for (const zone of zones) {
    for (let i = 0; i < zone.count; i++) {
      // punto aleatorio uniforme dentro del disco de la zona
      const angle = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * zone.radius;
      mobs.push({
        id: `${zone.id}_${i}`,
        templateId: zone.templateId,
        mapId: zone.mapId,
        x: zone.centerX + Math.cos(angle) * dist,
        z: zone.centerZ + Math.sin(angle) * dist,
      });
    }
  }
  return mobs;
}
