import { CHARACTERS, CHARACTER_MAP } from '../data/characters';
import { ITEM_TEMPLATE_MAP } from '../data/items';
import { CharacterId, InventoryItem, SaveData, StatBlock } from '../types/game';

const STORAGE_KEY = 'nullbound_wasteland_save_v1';

function createInitialAllocated(): Record<CharacterId, StatBlock> {
  const map = {} as Record<CharacterId, StatBlock>;
  for (const c of CHARACTERS) {
    map[c.id] = { str: 0, hp: 0, spd: 0 };
  }
  return map;
}

export function createDefaultSaveData(): SaveData {
  const starterWeapon: InventoryItem = {
    instanceId: 'starter_w_1',
    templateId: 'w_scrap_edge',
    upgradeLevel: 0,
  };
  const starterArmor: InventoryItem = {
    instanceId: 'starter_a_1',
    templateId: 'a_ash_coat',
    upgradeLevel: 0,
  };

  return {
    version: 1,
    selectedCharacterId: 'sable',
    totalStatPointsEarned: 0,
    allocatedStats: createInitialAllocated(),
    highestClearedLevel: 0,
    clearedLevels: [],
    ashShards: 120,
    scrapMetal: 8,
    glitchCores: 0,
    chests: {
      'Scrap Cache': 1,
      'Neon Vault': 0,
      'Glitch Core': 0,
    },
    inventory: [starterWeapon, starterArmor],
    equipped: {
      weapon: starterWeapon.instanceId,
      armor: starterArmor.instanceId,
      relic: null,
    },
    consumables: {
      healthVial: 3,
      overclockCell: 1,
    },
    unlockedStoryLevels: [1],
    soundMuted: false,
    touchControlsMode: 'auto',
    totalKills: 0,
    totalWins: 0,
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = createDefaultSaveData();

    const allocated = createInitialAllocated();
    if (parsed.allocatedStats) {
      for (const c of CHARACTERS) {
        const entry = parsed.allocatedStats[c.id];
        if (entry) {
          allocated[c.id] = {
            str: Math.max(0, Number(entry.str) || 0),
            hp: Math.max(0, Number(entry.hp) || 0),
            spd: Math.max(0, Number(entry.spd) || 0),
          };
        }
      }
    }

    return {
      ...defaults,
      ...parsed,
      selectedCharacterId:
        parsed.selectedCharacterId && CHARACTER_MAP[parsed.selectedCharacterId]
          ? parsed.selectedCharacterId
          : defaults.selectedCharacterId,
      allocatedStats: allocated,
      chests: {
        ...defaults.chests,
        ...(parsed.chests || {}),
      },
      equipped: {
        ...defaults.equipped,
        ...(parsed.equipped || {}),
      },
      consumables: {
        ...defaults.consumables,
        ...(parsed.consumables || {}),
      },
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : defaults.inventory,
      clearedLevels: Array.isArray(parsed.clearedLevels) ? parsed.clearedLevels : [],
      unlockedStoryLevels: Array.isArray(parsed.unlockedStoryLevels)
        ? parsed.unlockedStoryLevels
        : [1],
    };
  } catch {
    return createDefaultSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors cleanly
  }
}

export function resetSaveData(): SaveData {
  const fresh = createDefaultSaveData();
  persistSaveData(fresh);
  return fresh;
}

export function getAvailableStatPoints(save: SaveData, charId: CharacterId): number {
  const spent = save.allocatedStats[charId] || { str: 0, hp: 0, spd: 0 };
  const totalSpent = spent.str + spent.hp + spent.spd;
  return Math.max(0, save.totalStatPointsEarned - totalSpent);
}

export function getItemEffectiveBonuses(item: InventoryItem): {
  str: number;
  hp: number;
  spd: number;
  crit: number;
  lifesteal: number;
} {
  const tpl = ITEM_TEMPLATE_MAP[item.templateId];
  if (!tpl) return { str: 0, hp: 0, spd: 0, crit: 0, lifesteal: 0 };
  const lvl = item.upgradeLevel || 0;
  return {
    str: tpl.bonuses.str + (tpl.bonuses.str > 0 ? lvl * 2 : lvl),
    hp: tpl.bonuses.hp + (tpl.bonuses.hp > 0 ? lvl * 2 : 0),
    spd: tpl.bonuses.spd + (tpl.bonuses.spd > 0 ? Math.floor((lvl + 1) / 2) : 0),
    crit: tpl.critBonus || 0,
    lifesteal: tpl.lifesteal || 0,
  };
}

export function getComputedHeroStats(save: SaveData, charId: CharacterId): {
  str: number;
  hp: number;
  spd: number;
  maxHealth: number;
  moveSpeed: number;
  attackDamage: number;
  critChance: number;
  lifesteal: number;
} {
  const char = CHARACTER_MAP[charId];
  const alloc = save.allocatedStats[charId] || { str: 0, hp: 0, spd: 0 };

  let gearStr = 0;
  let gearHp = 0;
  let gearSpd = 0;
  let critChance = char.charClass === 'Swordsman' ? 12 : char.charClass === 'Magician' ? 8 : 6;
  let lifesteal = char.id === 'tarek' ? 3 : 0;

  const equippedIds = [save.equipped.weapon, save.equipped.armor, save.equipped.relic];
  for (const instId of equippedIds) {
    if (!instId) continue;
    const item = save.inventory.find((i) => i.instanceId === instId);
    if (!item) continue;
    const b = getItemEffectiveBonuses(item);
    gearStr += b.str;
    gearHp += b.hp;
    gearSpd += b.spd;
    critChance += b.crit;
    lifesteal += b.lifesteal;
  }

  const str = char.baseStats.str + alloc.str + gearStr;
  const hp = char.baseStats.hp + alloc.hp + gearHp;
  const spd = char.baseStats.spd + alloc.spd + gearSpd;

  return {
    str,
    hp,
    spd,
    maxHealth: 85 + hp * 18,
    moveSpeed: 135 + Math.min(spd, 45) * 4.5,
    attackDamage: 12 + str * 3.4,
    critChance: Math.min(60, critChance),
    lifesteal: Math.min(25, lifesteal),
  };
}
