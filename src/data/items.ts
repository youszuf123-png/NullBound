import { ChestType, ItemRarity, ItemTemplate } from '../types/game';

export const ITEM_TEMPLATES: ItemTemplate[] = [
  // === WEAPONS ===
  {
    id: 'w_scrap_edge',
    name: 'Scrap Edge',
    slot: 'weapon',
    rarity: 'Common',
    bonuses: { str: 2, hp: 0, spd: 1 },
    desc: 'Sharpened wasteland rebar wrapped in insulated wire.',
    shopCost: 60,
  },
  {
    id: 'w_volt_conductor',
    name: 'Volt Conductor',
    slot: 'weapon',
    rarity: 'Uncommon',
    bonuses: { str: 4, hp: 1, spd: 1 },
    critBonus: 4,
    desc: 'Hums with residual purple grid charge on every strike.',
    shopCost: 140,
  },
  {
    id: 'w_rift_focus',
    name: 'Rift Edge Focus',
    slot: 'weapon',
    rarity: 'Rare',
    bonuses: { str: 7, hp: 1, spd: 3 },
    critBonus: 8,
    desc: 'Calibrated crystal core that amplifies blade, fist, and spell output.',
    shopCost: 290,
  },
  {
    id: 'w_glitch_fang',
    name: 'Null-Vertex Fang',
    slot: 'weapon',
    rarity: 'Mythic',
    bonuses: { str: 12, hp: 3, spd: 4 },
    critBonus: 14,
    lifesteal: 4,
    desc: 'Forged from a severed boss wireframe. Cuts across space itself.',
    shopCost: 0,
    craftCores: 2,
    craftScrap: 25,
  },

  // === ARMOR ===
  {
    id: 'a_ash_coat',
    name: 'Ash Duster',
    slot: 'armor',
    rarity: 'Common',
    bonuses: { str: 0, hp: 3, spd: 1 },
    desc: 'Layered grey canvas treated against cinder fallout.',
    shopCost: 55,
  },
  {
    id: 'a_quarry_plate',
    name: 'Quarry Plating',
    slot: 'armor',
    rarity: 'Uncommon',
    bonuses: { str: 1, hp: 6, spd: 0 },
    desc: 'Riveted steel shoulder plates salvaged from dead haulers.',
    shopCost: 135,
  },
  {
    id: 'a_neon_carapace',
    name: 'Neon Carapace',
    slot: 'armor',
    rarity: 'Rare',
    bonuses: { str: 2, hp: 9, spd: 2 },
    desc: 'Lightweight carbon-weave reinforced with light-purple energy seams.',
    shopCost: 280,
  },
  {
    id: 'a_monolith_shell',
    name: 'Architect Shell',
    slot: 'armor',
    rarity: 'Mythic',
    bonuses: { str: 4, hp: 15, spd: 3 },
    lifesteal: 3,
    desc: 'Phase-locked plating harvested from a 3D Monolith guardian.',
    shopCost: 0,
    craftCores: 2,
    craftScrap: 25,
  },

  // === RELICS ===
  {
    id: 'r_rust_coil',
    name: 'Rust Coil',
    slot: 'relic',
    rarity: 'Common',
    bonuses: { str: 1, hp: 1, spd: 2 },
    desc: 'Worn copper spring that quickens reflexes in battle.',
    shopCost: 50,
  },
  {
    id: 'r_violet_prism',
    name: 'Violet Shard',
    slot: 'relic',
    rarity: 'Uncommon',
    bonuses: { str: 3, hp: 2, spd: 2 },
    critBonus: 5,
    desc: 'Faintly glowing prism pulsing with Rift harmonics.',
    shopCost: 150,
  },
  {
    id: 'r_leech_diode',
    name: 'Siphon Diode',
    slot: 'relic',
    rarity: 'Rare',
    bonuses: { str: 4, hp: 4, spd: 3 },
    lifesteal: 6,
    desc: 'Converts shattered enemy energy directly back into vitality.',
    shopCost: 310,
  },
  {
    id: 'r_tesseract_heart',
    name: 'Tesseract Heart',
    slot: 'relic',
    rarity: 'Mythic',
    bonuses: { str: 8, hp: 8, spd: 6 },
    critBonus: 10,
    lifesteal: 6,
    desc: 'A stabilized 4D glitch core humming inside a containment ring.',
    shopCost: 0,
    craftCores: 3,
    craftScrap: 35,
  },
];

export const ITEM_TEMPLATE_MAP: Record<string, ItemTemplate> = ITEM_TEMPLATES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, ItemTemplate>
);

export const RARITY_COLORS: Record<ItemRarity, { border: string; text: string; bg: string }> = {
  Common: { border: '#52525b', text: '#d4d4d8', bg: '#18181f' },
  Uncommon: { border: '#94a3b8', text: '#f1f5f9', bg: '#1d1f29' },
  Rare: { border: '#a855f7', text: '#e9d5ff', bg: '#21182e' },
  Mythic: { border: '#d8b4fe', text: '#f5f3ff', bg: '#2c1842' },
};

export function rollChestLoot(chestType: ChestType): {
  shards: number;
  scrap: number;
  healthVials: number;
  overclockCells: number;
  itemTemplateId: string;
} {
  const pickFrom = (rarities: ItemRarity[]) => {
    const pool = ITEM_TEMPLATES.filter((t) => rarities.includes(t.rarity));
    return pool[Math.floor(Math.random() * pool.length)].id;
  };

  if (chestType === 'Scrap Cache') {
    const roll = Math.random();
    return {
      shards: 35 + Math.floor(Math.random() * 30),
      scrap: 4 + Math.floor(Math.random() * 5),
      healthVials: Math.random() < 0.65 ? 1 : 0,
      overclockCells: Math.random() < 0.35 ? 1 : 0,
      itemTemplateId: roll < 0.65 ? pickFrom(['Common']) : pickFrom(['Uncommon']),
    };
  }

  if (chestType === 'Neon Vault') {
    const roll = Math.random();
    return {
      shards: 85 + Math.floor(Math.random() * 55),
      scrap: 9 + Math.floor(Math.random() * 8),
      healthVials: 1 + (Math.random() < 0.5 ? 1 : 0),
      overclockCells: 1,
      itemTemplateId:
        roll < 0.35 ? pickFrom(['Uncommon']) : roll < 0.9 ? pickFrom(['Rare']) : pickFrom(['Mythic']),
    };
  }

  // Glitch Core Chest
  const roll = Math.random();
  return {
    shards: 160 + Math.floor(Math.random() * 90),
    scrap: 16 + Math.floor(Math.random() * 12),
    healthVials: 2,
    overclockCells: 1 + (Math.random() < 0.5 ? 1 : 0),
    itemTemplateId: roll < 0.45 ? pickFrom(['Rare']) : pickFrom(['Mythic']),
  };
}
