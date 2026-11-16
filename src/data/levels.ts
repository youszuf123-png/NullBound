import { BossShape, ChestType, EnemyKind, LevelDef } from '../types/game';

interface ChapterConfig {
  chapter: number;
  title: string;
  zone: string;
  bossName: string;
  bossTitle: string;
  bossShape: BossShape;
  levelNames: [string, string, string, string, string];
  stories: [string, string, string, string, string];
  enemyPool: EnemyKind[];
}

const CHAPTERS: ChapterConfig[] = [
  {
    chapter: 1,
    title: 'Chapter I: The Ashen Perimeter',
    zone: 'Ashen Outskirts',
    bossName: 'NULL-CUBE α',
    bossTitle: 'Rotating 3D Glitch Tesseract',
    bossShape: 'tesseract',
    levelNames: [
      'Cinder Gate',
      'Broken Overpass',
      'Scrapyard Trench',
      'Shattered Relay',
      'Sector 05: Null-Cube Vault',
    ],
    stories: [
      'Seven winters after the Rift Collapse, the sky turned pitch black. You step past the Cinder Gate where iron scavengers prowl.',
      'Collapsed highway slabs form jagged chokepoints. Violet static flickers in the dust—something is waking beneath the concrete.',
      'Vorn the Craftsman flagged this trench on your map. Salvage chests lie buried behind patrolling stalkers.',
      'Old broadcast towers hum with purple interference. Enemy snipers lock onto movement from the ruins.',
      'A 3D wireframe distortion tears open the Relay Courtyard. The NULL-CUBE α rotates into reality—shatter its geometry!',
    ],
    enemyPool: ['stalker', 'sniper', 'drone'],
  },
  {
    chapter: 2,
    title: 'Chapter II: Rust Quarry',
    zone: 'Rust Quarry',
    bossName: 'SHARD WYRM',
    bossTitle: 'Segmented 3D Octahedron Serpent',
    bossShape: 'wyrm',
    levelNames: [
      'Red Iron Pit',
      'Conveyor Abyss',
      'Crusher Floor',
      'Furnace Spine',
      'Sector 10: Wyrm Nest',
    ],
    stories: [
      'Deep inside the Rust Quarry, automated excavators have fused with Rift crystals, turning heavy loaders hostile.',
      'Suspended catwalks rattle overhead. Drone swarms guard crates left behind by fleeing miners.',
      'Armored Hulks march through the slag smoke. Heavy strikes and clean dodges are the only way through.',
      'The quarry air tastes of ozone and scorched iron. Only one ridge separates you from the central pit.',
      'The ground splits open as SHARD WYRM uncoils—a multi-segment 3D glitch serpent weaving through dimensional static!',
    ],
    enemyPool: ['stalker', 'hulk', 'sniper', 'drone'],
  },
  {
    chapter: 3,
    title: 'Chapter III: Dead Circuit Marsh',
    zone: 'Dead Circuit Marsh',
    bossName: 'THE IRON PRISM',
    bossTitle: 'Armored 3D Pyramid Sentinel',
    bossShape: 'prism',
    levelNames: [
      'Sunken Server Bed',
      'Silicon Mire',
      'Capacitor Reef',
      'Black Cable Crossing',
      'Sector 15: Prism Citadel',
    ],
    stories: [
      'Flooded server vaults stretch for miles under neon-violet fog. Phase wraiths slip silently across the dark water.',
      'Exposed fiber-optic roots pulse with phantom data. Every skirmish draws faster constructs out of the mire.',
      'Ancient cooling towers lean like tombstones. Salvage vaults hum beneath the grey mud.',
      'The signal grows deafening. Wraiths and drones coordinate in tight pincer formations.',
      'THE IRON PRISM descends above the flooded core—its spinning 3D pyramid shell fires blinding violet beams!',
    ],
    enemyPool: ['wraith', 'drone', 'sniper', 'hulk'],
  },
  {
    chapter: 4,
    title: 'Chapter IV: Glass Crater',
    zone: 'Glass Crater',
    bossName: 'CORRUPT SERAPH',
    bossTitle: '3D Winged Icosahedron',
    bossShape: 'seraph',
    levelNames: [
      'Vitrified Rim',
      'Mirror Basin',
      'Refraction Canyon',
      'Zero-Shadow Plaza',
      'Sector 20: Seraph Spire',
    ],
    stories: [
      'Where the first sky-reactor fell, sand fused into black mirror glass. Enemies strike with razor-sharp precision.',
      'Your reflection fractures in the crater floor. Glitch wraiths phase in and out of sight around every pillar.',
      'High-energy shards hover suspended in midair. Survival demands sharper stats and forged gear from the Craftsman.',
      'No ash blows here—only humming violet static and heavy iron sentinels guarding the inner sanctum.',
      'Six geometric wings unfold in broken 3D wireframe: CORRUPT SERAPH descends to purge the crater floor!',
    ],
    enemyPool: ['wraith', 'sniper', 'hulk', 'drone'],
  },
  {
    chapter: 5,
    title: 'Chapter V: Obsidian Monolith',
    zone: 'Obsidian Monolith',
    bossName: 'ENTROPY ENGINE',
    bossTitle: 'Dual-Ringed 3D Glitch Torus',
    bossShape: 'torus',
    levelNames: [
      'Black Basalt Steps',
      'Threshold of Static',
      'Reactor Catacombs',
      'Gravity Well',
      'Sector 25: Entropy Core',
    ],
    stories: [
      'You reach the base of the Obsidian Monolith. The air crackles as gravity tugs unevenly across the dark stone.',
      'Elite constructs patrol the inner hallways. Every victory sharpens your strength, vitality, and speed.',
      'Ancient warning glyphs flicker on grey steel walls. The Rift horizon burns directly above the roof.',
      'Swarms of drones and hulks throw everything at you to stop your climb to the upper chamber.',
      'The ENTROPY ENGINE spins inside dual interlocking 3D rings, warping bullets and tearing scanlines across space!',
    ],
    enemyPool: ['hulk', 'wraith', 'drone', 'sniper', 'stalker'],
  },
  {
    chapter: 6,
    title: 'Chapter VI: The Core Fracture',
    zone: 'The Core Fracture',
    bossName: 'ARCHITECT OF ASH',
    bossTitle: 'Final 3D Multi-Mesh Monolith',
    bossShape: 'monolith',
    levelNames: [
      'Rift Bridge',
      'Unwritten Sector',
      'Memory Graveyard',
      'Crown of Cinders',
      'Sector 30: The Final Fracture',
    ],
    stories: [
      'Past the Monolith roof lies a suspended bridge of floating grey stone leading straight into the purple tear.',
      'Reality stutters here. Past foes echo forward in relentless waves as the Architect calculates your demise.',
      'Shattered remnants of the old world orbit in silence. One last chance to refine your loadout with Vorn.',
      'The final vanguard blocks the throne platform. Break through the elite guard to face the source of the Wasteland.',
      'The ARCHITECT OF ASH manifests as a towering shifting 3D monolith of pure glitch and neon lightning. End the Collapse!',
    ],
    enemyPool: ['wraith', 'hulk', 'drone', 'sniper', 'stalker'],
  },
];

export const LEVELS: LevelDef[] = CHAPTERS.flatMap((chap) =>
  Array.from({ length: 5 }, (_, idx) => {
    const level = (chap.chapter - 1) * 5 + idx + 1;
    const isBoss = level % 5 === 0;
    let rewardChest: ChestType | undefined;
    if (isBoss) {
      rewardChest = 'Glitch Core';
    } else if (level % 2 === 0) {
      rewardChest = 'Neon Vault';
    } else {
      rewardChest = 'Scrap Cache';
    }

    return {
      level,
      chapter: chap.chapter,
      chapterTitle: chap.title,
      name: chap.levelNames[idx],
      zone: chap.zone,
      storyText: chap.stories[idx],
      waves: isBoss ? 2 : 2 + Math.floor(level / 10),
      enemyCountBase: isBoss ? 4 + Math.floor(level / 6) : 5 + Math.floor(level * 0.45),
      enemyTypes: chap.enemyPool,
      isBoss,
      bossName: isBoss ? chap.bossName : undefined,
      bossTitle: isBoss ? chap.bossTitle : undefined,
      bossShape: isBoss ? chap.bossShape : undefined,
      bossHp: isBoss ? 420 + level * 95 : undefined,
      rewardShards: isBoss ? 140 + level * 12 : 45 + level * 7,
      rewardScrap: isBoss ? 12 + Math.floor(level / 2) : 4 + Math.floor(level / 3),
      rewardChest,
    };
  })
);
