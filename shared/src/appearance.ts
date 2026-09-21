/** Appearance is cosmetic: class stats and skills are independent of gender. */
export type CharacterGender = 'male' | 'female';

export function isCharacterGender(value: unknown): value is CharacterGender {
  return value === 'male' || value === 'female';
}

/** Saves written before appearance selection retain their original male model. */
export function characterGender(value: unknown): CharacterGender {
  return value === 'female' ? 'female' : 'male';
}

const FEMALE_NAMES: Record<string, string> = {
  knight: 'Caballera', mage: 'Maga', barbarian: 'Bárbara', rogue: 'Pícara', ranger: 'Exploradora',
};

export function feminineClassName(classId: string, fallback: string): string {
  return FEMALE_NAMES[classId] ?? fallback;
}
