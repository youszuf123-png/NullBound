export type CharacterClass = 'Magician' | 'Swordsman' | 'Fighter';

export type StatBlock = {
  str: number;
  hp: number;
  spd: number;
};

export type CharacterId =
  | 'vespera'
  | 'kaelen'
  | 'orin'
  | 'sable'
  | 'darius'
  | 'lyra'
  | 'bram'
  | 'nyx'
  | 'tarek';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  epithet: string;
  charClass: CharacterClass;
  baseStats: StatBlock;
  weaponName: string;
  attackDesc: string;
  specialName: string;
  specialDesc: string;
  specialCooldown: number; // seconds
  lore: string;
  accentColor: string;
  secondaryColor: string;
}

export type ItemSlot = 'weapon' | 'armor' | 'relic';
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Mythic';

export interface ItemTemplate {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  bonuses: StatBlock;
  critBonus?: number; // percentage e.g. 8
  lifesteal?: number; // percentage e.g. 5
  desc: string;
  shopCost: number; // Ash Shards, 0 if drop/craft only
  craftCores?: number; // Glitch Cores needed if craftable
  craftScrap?: number;
}

export interface InventoryItem {
  instanceId: string;
  templateId: string;
  upgradeLevel: number; // 0 to 5
}

export type ChestType = 'Scrap Cache' | 'Neon Vault' | 'Glitch Core';

export type BossShape =
  | 'tesseract'
  | 'wyrm'
  | 'prism'
  | 'seraph'
  | 'torus'
  | 'monolith';

export type EnemyKind =
  | 'stalker'
  | 'sniper'
  | 'hulk'
  | 'drone'
  | 'wraith';

export interface LevelDef {
  level: number;
  chapter: number;
  chapterTitle: string;
  name: string;
  zone: string;
  storyText: string;
  waves: number;
  enemyCountBase: number;
  enemyTypes: EnemyKind[];
  isBoss: boolean;
  bossName?: string;
  bossTitle?: string;
  bossShape?: BossShape;
  bossHp?: number;
  rewardShards: number;
  rewardScrap: number;
  rewardChest?: ChestType;
}

export interface SaveData {
  version: number;
  selectedCharacterId: CharacterId;
  /** Total stat points earned (+4 per level victory) */
  totalStatPointsEarned: number;
  /** Allocated stat points per character */
  allocatedStats: Record<CharacterId, StatBlock>;
  highestClearedLevel: number;
  clearedLevels: number[];
  ashShards: number;
  scrapMetal: number;
  glitchCores: number;
  chests: Record<ChestType, number>;
  inventory: InventoryItem[];
  equipped: {
    weapon: string | null;
    armor: string | null;
    relic: string | null;
  };
  consumables: {
    healthVial: number;
    overclockCell: number;
  };
  unlockedStoryLevels: number[];
  soundMuted: boolean;
  touchControlsMode: 'auto' | 'always' | 'off';
  totalKills: number;
  totalWins: number;
}

export type GameScreen = 'TITLE' | 'HUB' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT';

export type HubTab = 'campaign' | 'roster' | 'inventory' | 'craftsman' | 'story';

export interface CombatResult {
  level: number;
  victory: boolean;
  firstTimeClear: boolean;
  statPointsGained: number;
  shardsGained: number;
  scrapGained: number;
  coresGained: number;
  chestGained?: ChestType;
  enemiesDefeated: number;
  timeSeconds: number;
}
