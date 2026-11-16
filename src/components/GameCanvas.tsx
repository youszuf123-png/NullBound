import React, { useEffect, useRef, useState } from 'react';
import { Pause, Volume2, VolumeX, Gamepad2 } from 'lucide-react';
import { CHARACTER_MAP } from '../data/characters';
import { CombatResult, EnemyKind, LevelDef, SaveData } from '../types/game';
import { soundFX } from '../utils/audio';
import {
  draw3DGlitchBoss,
  drawChestPixelSprite,
  drawEnemyPixelSprite,
  drawHeroPixelSprite,
} from '../utils/pixelSprites';
import { getComputedHeroStats } from '../utils/storage';

interface GameCanvasProps {
  levelDef: LevelDef;
  saveData: SaveData;
  paused: boolean;
  onPauseToggle: () => void;
  onMuteToggle: () => void;
  onTouchModeCycle: () => void;
  onConsumeItem: (kind: 'healthVial' | 'overclockCell') => void;
  onCombatEnd: (result: CombatResult) => void;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  fromPlayer: boolean;
  pierce: number;
  homing: boolean;
  aoeRadius: number;
  life: number;
  color: string;
  hitIds: Set<number>;
}

interface SlashArc {
  x: number;
  y: number;
  angle: number;
  spread: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface GroundTelegraph {
  kind: 'circle' | 'line';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  radius: number;
  timer: number;
  duration: number;
  damage: number;
  ownerId: number;
  triggered: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface EnemyEntity {
  id: number;
  kind: EnemyKind | 'boss';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  windupTimer: number;
  windupMax: number;
  stunTimer: number;
  flashTimer: number;
  bossPhase: number;
  bossAttackIndex: number;
}

interface ArenaPickup {
  x: number;
  y: number;
  kind: 'shard' | 'heal';
  value: number;
  life: number;
}

const ARENA_W = 1120;
const ARENA_H = 700;
const WALL_PAD = 44;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  levelDef,
  saveData,
  paused,
  onPauseToggle,
  onMuteToggle,
  onTouchModeCycle,
  onConsumeItem,
  onCombatEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const saveRef = useRef(saveData);
  saveRef.current = saveData;

  const [hudState, setHudState] = useState({
    hp: 100,
    maxHp: 100,
    wave: 1,
    totalWaves: levelDef.waves,
    kills: 0,
    combo: 0,
    specialCd: 0,
    specialMaxCd: 5,
    dashCd: 0,
    overclockTimer: 0,
    bossHp: 0,
    bossMaxHp: 0,
    bossActive: false,
    bannerText: `${levelDef.zone} — Wave 1`,
  });

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        navigator.maxTouchPoints > 0 || window.innerWidth < 960
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const showTouchControls =
    saveData.touchControlsMode === 'always' ||
    (saveData.touchControlsMode === 'auto' && isTouchDevice);

  // Input refs shared with 60fps loop
  const keysRef = useRef<Set<string>>(new Set());
  const touchStickRef = useRef<{
    active: boolean;
    pointerId: number | null;
    originX: number;
    originY: number;
    dx: number;
    dy: number;
  }>({ active: false, pointerId: null, originX: 0, originY: 0, dx: 0, dy: 0 });

  const [stickVisual, setStickVisual] = useState({ active: false, x: 0, y: 0 });

  const actionHoldRef = useRef({
    attack: false,
    specialQueued: false,
    dashQueued: false,
    healQueued: false,
    overclockQueued: false,
  });

  const mouseRef = useRef({
    active: false,
    down: false,
    screenX: 0,
    screenY: 0,
  });

  // Main 60fps Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const charDef = CHARACTER_MAP[saveRef.current.selectedCharacterId];
    const computed = getComputedHeroStats(saveRef.current, charDef.id);

    // Build symmetrical wasteland pillar obstacles based on level
    const obstacles: Obstacle[] = [
      { x: 250, y: 190, w: 64, h: 64 },
      { x: ARENA_W - 314, y: 190, w: 64, h: 64 },
      { x: 250, y: ARENA_H - 254, w: 64, h: 64 },
      { x: ARENA_W - 314, y: ARENA_H - 254, w: 64, h: 64 },
    ];
    if (levelDef.level % 2 === 0) {
      obstacles.push({ x: ARENA_W / 2 - 42, y: ARENA_H / 2 - 28, w: 84, h: 56 });
    }

    let nextEntityId = 1;
    let gameOverTriggered = false;
    let simTime = 0;
    let hitstopTimer = 0;
    let shakeIntensity = 0;
    let waveBannerTimer = 2.2;
    let currentBanner = `${levelDef.zone} · Wave 1`;

    const player = {
      x: ARENA_W / 2,
      y: ARENA_H - 135,
      vx: 0,
      vy: 0,
      radius: 17,
      facing: 1,
      aimAngle: -Math.PI / 2,
      hp: computed.maxHealth,
      maxHp: computed.maxHealth,
      attackCd: 0,
      attackAnim: 0,
      specialCd: 0,
      dashCd: 0,
      dashTimer: 0,
      dashVx: 0,
      dashVy: 0,
      invulnTimer: 0,
      flashTimer: 0,
      shieldTimer: 0,
      spinTimer: 0,
      spinTick: 0,
      overclockTimer: 0,
      comboStep: 0,
    };

    const stasisZones: { x: number; y: number; radius: number; life: number }[] = [];
    const delayedBombs: { x: number; y: number; timer: number; radius: number; damage: number }[] = [];
    const enemies: EnemyEntity[] = [];
    const projectiles: Projectile[] = [];
    const slashArcs: SlashArc[] = [];
    const telegraphs: GroundTelegraph[] = [];
    const particles: Particle[] = [];
    const floatingTexts: FloatingText[] = [];
    const pickups: ArenaPickup[] = [];

    // Background ambient wasteland embers
    const embers = Array.from({ length: 36 }, () => ({
      x: Math.random() * ARENA_W,
      y: Math.random() * ARENA_H,
      vx: (Math.random() - 0.5) * 18,
      vy: -10 - Math.random() * 20,
      size: Math.random() < 0.7 ? 2 : 3,
      alpha: 0.25 + Math.random() * 0.45,
    }));

    let currentWave = 1;
    let totalKills = 0;
    let shardsInRun = 0;
    let comboCount = 0;
    let comboTimer = 0;
    let chestVisualPos: { x: number; y: number; opened: boolean } | null = null;
    let victoryTimer = -1;

    const spawnParticles = (
      x: number,
      y: number,
      color: string,
      count: number,
      speed = 140,
      size = 4
    ) => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.7) * speed;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: size * (0.7 + Math.random() * 0.6),
          life: 0.25 + Math.random() * 0.35,
          maxLife: 0.55,
          color,
        });
      }
    };

    const addFloatingText = (x: number, y: number, text: string, color: string) => {
      floatingTexts.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - 14,
        vy: -42,
        text,
        color,
        life: 0.75,
        maxLife: 0.75,
      });
    };

    const resolveObstacleCollision = (ent: { x: number; y: number; radius: number }) => {
      ent.x = Math.max(WALL_PAD + ent.radius, Math.min(ARENA_W - WALL_PAD - ent.radius, ent.x));
      ent.y = Math.max(WALL_PAD + ent.radius, Math.min(ARENA_H - WALL_PAD - ent.radius, ent.y));

      for (const ob of obstacles) {
        const cx = Math.max(ob.x, Math.min(ent.x, ob.x + ob.w));
        const cy = Math.max(ob.y, Math.min(ent.y, ob.y + ob.h));
        const dx = ent.x - cx;
        const dy = ent.y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq < ent.radius * ent.radius) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = ent.radius - dist;
          ent.x += (dx / dist) * overlap;
          ent.y += (dy / dist) * overlap;
        }
      }
    };

    const spawnEnemy = (kind: EnemyKind, x: number, y: number) => {
      const lvlScale = 1 + (levelDef.level - 1) * 0.14;
      const statsMap: Record<EnemyKind, { hp: number; spd: number; dmg: number; r: number }> = {
        stalker: { hp: 46, spd: 112, dmg: 12, r: 16 },
        sniper: { hp: 36, spd: 78, dmg: 15, r: 15 },
        hulk: { hp: 105, spd: 64, dmg: 22, r: 23 },
        drone: { hp: 38, spd: 132, dmg: 11, r: 14 },
        wraith: { hp: 62, spd: 118, dmg: 17, r: 16 },
      };
      const base = statsMap[kind];
      enemies.push({
        id: nextEntityId++,
        kind,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: base.r,
        hp: Math.round(base.hp * lvlScale),
        maxHp: Math.round(base.hp * lvlScale),
        speed: base.spd + Math.min(40, levelDef.level * 1.1),
        damage: Math.round(base.dmg * (1 + (levelDef.level - 1) * 0.09)),
        attackCooldown: 0.6 + Math.random() * 0.9,
        windupTimer: 0,
        windupMax: 0.55,
        stunTimer: 0,
        flashTimer: 0,
        bossPhase: 1,
        bossAttackIndex: 0,
      });
    };

    const spawnWave = (waveNum: number) => {
      const isBossWave = levelDef.isBoss && waveNum === levelDef.waves;
      const count = isBossWave
        ? Math.max(2, Math.floor(levelDef.enemyCountBase * 0.5))
        : levelDef.enemyCountBase + (waveNum - 1) * 2;

      for (let i = 0; i < count; i++) {
        const edge = i % 4;
        let sx = ARENA_W / 2;
        let sy = 90;
        if (edge === 0) {
          sx = 100 + Math.random() * (ARENA_W - 200);
          sy = 75;
        } else if (edge === 1) {
          sx = ARENA_W - 85;
          sy = 90 + Math.random() * (ARENA_H - 180);
        } else if (edge === 2) {
          sx = 85;
          sy = 90 + Math.random() * (ARENA_H - 180);
        } else {
          sx = 100 + Math.random() * (ARENA_W - 200);
          sy = ARENA_H - 85;
        }
        // Keep safe distance from player
        if (Math.hypot(sx - player.x, sy - player.y) < 170) {
          sy = player.y > ARENA_H / 2 ? 85 : ARENA_H - 85;
        }
        const kind = levelDef.enemyTypes[Math.floor(Math.random() * levelDef.enemyTypes.length)];
        spawnEnemy(kind, sx, sy);
      }

      if (isBossWave) {
        const bhp = levelDef.bossHp || 650;
        enemies.push({
          id: nextEntityId++,
          kind: 'boss',
          x: ARENA_W / 2,
          y: 165,
          vx: 0,
          vy: 0,
          radius: 42,
          hp: bhp,
          maxHp: bhp,
          speed: 78 + levelDef.level * 1.1,
          damage: 20 + levelDef.level * 1.4,
          attackCooldown: 1.4,
          windupTimer: 0,
          windupMax: 0.75,
          stunTimer: 0,
          flashTimer: 0,
          bossPhase: 1,
          bossAttackIndex: 0,
        });
        soundFX.playBossGlitch();
        currentBanner = `WARNING: ${levelDef.bossName}`;
        waveBannerTimer = 2.8;
        shakeIntensity = 9;
      } else {
        currentBanner = `${levelDef.zone} · Wave ${waveNum}/${levelDef.waves}`;
        waveBannerTimer = 1.9;
      }
    };

    const damageEnemy = (enemy: EnemyEntity, rawDmg: number, knockX: number, knockY: number, isHeavy = false) => {
      if (enemy.hp <= 0) return;
      const isCrit = Math.random() * 100 < computed.critChance;
      const ocMult = player.overclockTimer > 0 ? 1.35 : 1;
      const dmg = Math.round(rawDmg * ocMult * (isCrit ? 1.65 : 1));
      enemy.hp -= dmg;
      enemy.flashTimer = 0.09;

      const knockScale = enemy.kind === 'boss' ? 0.15 : enemy.kind === 'hulk' ? 0.45 : 1;
      enemy.x += knockX * knockScale;
      enemy.y += knockY * knockScale;
      resolveObstacleCollision(enemy);

      if (computed.lifesteal > 0) {
        const healAmt = Math.max(1, Math.round((dmg * computed.lifesteal) / 100));
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
      }

      addFloatingText(
        enemy.x,
        enemy.y - enemy.radius,
        isCrit ? `${dmg}!` : `${dmg}`,
        isCrit ? '#e9d5ff' : '#f4f4f6'
      );
      spawnParticles(enemy.x, enemy.y, isCrit ? '#e9d5ff' : '#c084fc', isHeavy ? 10 : 5, 160, isHeavy ? 5 : 3);
      soundFX.playHit(isHeavy || isCrit);

      if (isHeavy || isCrit) {
        hitstopTimer = 0.032;
        shakeIntensity = Math.max(shakeIntensity, isHeavy ? 6 : 3.5);
      }

      if (enemy.hp <= 0) {
        totalKills++;
        comboCount++;
        comboTimer = 3.2;
        const dropShards = enemy.kind === 'boss' ? 40 : 4 + Math.floor(levelDef.level * 0.4);
        pickups.push({
          x: enemy.x,
          y: enemy.y,
          kind: 'shard',
          value: dropShards,
          life: 16,
        });
        if (Math.random() < 0.16 && enemy.kind !== 'boss') {
          pickups.push({
            x: enemy.x + 12,
            y: enemy.y,
            kind: 'heal',
            value: Math.round(player.maxHp * 0.12),
            life: 14,
          });
        }
        spawnParticles(
          enemy.x,
          enemy.y,
          enemy.kind === 'boss' ? '#e9d5ff' : '#a855f7',
          enemy.kind === 'boss' ? 36 : 14,
          enemy.kind === 'boss' ? 240 : 150,
          enemy.kind === 'boss' ? 6 : 4
        );
        if (enemy.kind === 'boss') {
          shakeIntensity = 14;
          hitstopTimer = 0.07;
          soundFX.playBossGlitch();
        }
      }
    };

    const damagePlayer = (rawDmg: number) => {
      if (player.invulnTimer > 0 || gameOverTriggered || victoryTimer >= 0) return;
      const mitigated = player.shieldTimer > 0 ? Math.max(1, Math.round(rawDmg * 0.2)) : rawDmg;
      player.hp = Math.max(0, player.hp - mitigated);
      player.invulnTimer = 0.42;
      player.flashTimer = 0.16;
      shakeIntensity = Math.max(shakeIntensity, 7);
      soundFX.playHurt();
      addFloatingText(player.x, player.y - 22, `-${mitigated}`, '#fb7185');
      spawnParticles(player.x, player.y, '#fb7185', 8, 130, 4);

      if (player.shieldTimer > 0) {
        // Darius Aegis Counter pulse!
        for (const e of enemies) {
          if (Math.hypot(e.x - player.x, e.y - player.y) < 130) {
            const ang = Math.atan2(e.y - player.y, e.x - player.x);
            damageEnemy(e, computed.attackDamage * 1.3, Math.cos(ang) * 28, Math.sin(ang) * 28, true);
          }
        }
      }

      if (player.hp <= 0) {
        gameOverTriggered = true;
        soundFX.playDefeat();
        onCombatEnd({
          level: levelDef.level,
          victory: false,
          firstTimeClear: false,
          statPointsGained: 0,
          shardsGained: shardsInRun,
          scrapGained: 0,
          coresGained: 0,
          enemiesDefeated: totalKills,
          timeSeconds: Math.round(simTime),
        });
      }
    };

    const findBestAimAngle = (fallbackAngle: number): number => {
      if (mouseRef.current.active) {
        const rect = canvas.getBoundingClientRect();
        const viewW = rect.width || 1;
        const viewH = rect.height || 1;
        const camX = Math.max(0, Math.min(ARENA_W - viewW, player.x - viewW / 2));
        const camY = Math.max(0, Math.min(ARENA_H - viewH, player.y - viewH / 2));
        const wx = (mouseRef.current.screenX - rect.left) + camX;
        const wy = (mouseRef.current.screenY - rect.top) + camY;
        return Math.atan2(wy - player.y, wx - player.x);
      }
      // Smart assist: target nearest enemy within 360px for crisp touch/keyboard play
      let bestDist = 360;
      let bestEnemy: EnemyEntity | null = null;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < bestDist) {
          bestDist = d;
          bestEnemy = e;
        }
      }
      if (bestEnemy) {
        return Math.atan2(bestEnemy.y - player.y, bestEnemy.x - player.x);
      }
      return fallbackAngle;
    };

    const performPrimaryAttack = () => {
      const aim = findBestAimAngle(player.aimAngle);
      player.aimAngle = aim;
      player.facing = Math.cos(aim) >= 0 ? 1 : -1;
      player.attackAnim = 1;
      player.comboStep = (player.comboStep + 1) % 3;

      const stasisBoost = stasisZones.some((z) => Math.hypot(player.x - z.x, player.y - z.y) <= z.radius)
        ? 0.72
        : 1;
      const ocBoost = player.overclockTimer > 0 ? 0.75 : 1;
      const speedFactor = Math.max(0.45, 1 - computed.spd * 0.012) * stasisBoost * ocBoost;

      if (charDef.charClass === 'Magician') {
        soundFX.playMagic();
        player.attackCd = (charDef.id === 'kaelen' ? 0.28 : 0.38) * speedFactor;

        if (charDef.id === 'kaelen') {
          for (const offset of [-0.14, 0.14]) {
            const ang = aim + offset;
            projectiles.push({
              x: player.x + Math.cos(ang) * 16,
              y: player.y + Math.sin(ang) * 16,
              vx: Math.cos(ang) * 430,
              vy: Math.sin(ang) * 430,
              radius: 6,
              damage: computed.attackDamage * 0.65,
              fromPlayer: true,
              pierce: 1,
              homing: true,
              aoeRadius: 0,
              life: 1.3,
              color: '#d8b4fe',
              hitIds: new Set(),
            });
          }
        } else if (charDef.id === 'orin') {
          projectiles.push({
            x: player.x + Math.cos(aim) * 18,
            y: player.y + Math.sin(aim) * 18,
            vx: Math.cos(aim) * 510,
            vy: Math.sin(aim) * 510,
            radius: 8,
            damage: computed.attackDamage * 1.05,
            fromPlayer: true,
            pierce: 4,
            homing: false,
            aoeRadius: 0,
            life: 1.2,
            color: '#c084fc',
            hitIds: new Set(),
          });
        } else {
          // Vespera Void Orb
          projectiles.push({
            x: player.x + Math.cos(aim) * 18,
            y: player.y + Math.sin(aim) * 18,
            vx: Math.cos(aim) * 400,
            vy: Math.sin(aim) * 400,
            radius: 9,
            damage: computed.attackDamage * 1.15,
            fromPlayer: true,
            pierce: 1,
            homing: false,
            aoeRadius: 58,
            life: 1.4,
            color: '#e9d5ff',
            hitIds: new Set(),
          });
        }
      } else if (charDef.charClass === 'Swordsman') {
        soundFX.playSlash();
        player.attackCd = (charDef.id === 'lyra' ? 0.24 : charDef.id === 'darius' ? 0.42 : 0.31) * speedFactor;

        const reach = charDef.id === 'darius' ? 102 : charDef.id === 'sable' ? 86 : 78;
        const spread = charDef.id === 'darius' ? Math.PI * 0.92 : Math.PI * 0.72;
        const dmgMult = charDef.id === 'darius' ? 1.35 : charDef.id === 'lyra' ? 0.88 : 1.12;

        slashArcs.push({
          x: player.x,
          y: player.y,
          angle: aim,
          spread,
          radius: reach,
          life: 0.16,
          maxLife: 0.16,
          color: charDef.accentColor,
        });

        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const dx = e.x - player.x;
          const dy = e.y - player.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= reach + e.radius) {
            const angTo = Math.atan2(dy, dx);
            let diff = angTo - aim;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) <= spread / 2 + 0.25) {
              const kb = charDef.id === 'darius' ? 28 : 16;
              damageEnemy(
                e,
                computed.attackDamage * dmgMult,
                Math.cos(angTo) * kb,
                Math.sin(angTo) * kb,
                charDef.id === 'darius' || player.comboStep === 2
              );
            }
          }
        }
      } else {
        // FIGHTER
        soundFX.playPunch();
        player.attackCd = (charDef.id === 'nyx' ? 0.23 : 0.36) * speedFactor;
        const reach = charDef.id === 'bram' ? 76 : 68;
        const dmgMult = charDef.id === 'bram' ? 1.38 : charDef.id === 'nyx' ? 0.92 : 1.15;

        // Forward step punch
        player.x += Math.cos(aim) * 8;
        player.y += Math.sin(aim) * 8;
        resolveObstacleCollision(player);

        slashArcs.push({
          x: player.x + Math.cos(aim) * 14,
          y: player.y + Math.sin(aim) * 14,
          angle: aim,
          spread: Math.PI * 0.55,
          radius: reach - 6,
          life: 0.13,
          maxLife: 0.13,
          color: '#f3e8ff',
        });

        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const dx = e.x - player.x;
          const dy = e.y - player.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= reach + e.radius) {
            const angTo = Math.atan2(dy, dx);
            let diff = angTo - aim;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) <= Math.PI * 0.52) {
              damageEnemy(
                e,
                computed.attackDamage * dmgMult,
                Math.cos(angTo) * 26,
                Math.sin(angTo) * 26,
                charDef.id === 'bram' || player.comboStep === 2
              );
              if (charDef.id === 'bram' && Math.random() < 0.32 && e.kind !== 'boss') {
                e.stunTimer = Math.max(e.stunTimer, 0.55);
              }
            }
          }
        }
      }
    };

    const performSpecial = () => {
      if (player.specialCd > 0) return;
      player.specialCd = charDef.specialCooldown;
      const aim = findBestAimAngle(player.aimAngle);
      player.aimAngle = aim;
      soundFX.playSpecial();
      shakeIntensity = Math.max(shakeIntensity, 6);

      if (charDef.id === 'vespera') {
        // Rift Nova
        slashArcs.push({ x: player.x, y: player.y, angle: 0, spread: Math.PI * 2, radius: 175, life: 0.28, maxLife: 0.28, color: '#c084fc' });
        spawnParticles(player.x, player.y, '#e9d5ff', 28, 260, 5);
        for (const e of enemies) {
          const dist = Math.hypot(e.x - player.x, e.y - player.y);
          if (dist < 180 + e.radius) {
            const ang = Math.atan2(e.y - player.y, e.x - player.x);
            damageEnemy(e, computed.attackDamage * 2.35, Math.cos(ang) * 44, Math.sin(ang) * 44, true);
          }
        }
      } else if (charDef.id === 'kaelen') {
        // Phase Blink + delayed bomb
        delayedBombs.push({ x: player.x, y: player.y, timer: 0.45, radius: 130, damage: computed.attackDamage * 2.2 });
        spawnParticles(player.x, player.y, '#c084fc', 16, 150, 4);
        player.x += Math.cos(aim) * 145;
        player.y += Math.sin(aim) * 145;
        player.invulnTimer = Math.max(player.invulnTimer, 0.35);
        resolveObstacleCollision(player);
        spawnParticles(player.x, player.y, '#f3e8ff', 14, 150, 4);
      } else if (charDef.id === 'orin') {
        // Stasis Field
        stasisZones.push({ x: player.x, y: player.y, radius: 175, life: 4.2 });
        addFloatingText(player.x, player.y - 24, 'STASIS FIELD', '#d8b4fe');
      } else if (charDef.id === 'sable') {
        // Phantom Dash
        player.invulnTimer = 0.45;
        const startX = player.x;
        const startY = player.y;
        player.x += Math.cos(aim) * 175;
        player.y += Math.sin(aim) * 175;
        resolveObstacleCollision(player);
        for (let t = 0; t <= 1; t += 0.2) {
          const px = startX + (player.x - startX) * t;
          const py = startY + (player.y - startY) * t;
          spawnParticles(px, py, '#e9d5ff', 4, 90, 4);
        }
        for (const e of enemies) {
          // Point to segment distance
          const vx = player.x - startX;
          const vy = player.y - startY;
          const lenSq = vx * vx + vy * vy || 1;
          const proj = Math.max(0, Math.min(1, ((e.x - startX) * vx + (e.y - startY) * vy) / lenSq));
          const cx = startX + proj * vx;
          const cy = startY + proj * vy;
          if (Math.hypot(e.x - cx, e.y - cy) < 54 + e.radius) {
            damageEnemy(e, computed.attackDamage * 2.4, Math.cos(aim) * 20, Math.sin(aim) * 20, true);
          }
        }
      } else if (charDef.id === 'darius') {
        // Aegis Counter
        player.shieldTimer = 2.0;
        slashArcs.push({ x: player.x, y: player.y, angle: 0, spread: Math.PI * 2, radius: 120, life: 0.25, maxLife: 0.25, color: '#c084fc' });
        addFloatingText(player.x, player.y - 26, 'AEGIS GUARD', '#e9d5ff');
      } else if (charDef.id === 'lyra') {
        // Blade Tempest
        player.spinTimer = 1.8;
        player.spinTick = 0;
        addFloatingText(player.x, player.y - 26, 'BLADE TEMPEST', '#d8b4fe');
      } else if (charDef.id === 'bram') {
        // Seismic Slam
        slashArcs.push({ x: player.x, y: player.y, angle: 0, spread: Math.PI * 2, radius: 155, life: 0.26, maxLife: 0.26, color: '#e9d5ff' });
        spawnParticles(player.x, player.y, '#c084fc', 26, 220, 5);
        for (const e of enemies) {
          if (Math.hypot(e.x - player.x, e.y - player.y) < 160 + e.radius) {
            const ang = Math.atan2(e.y - player.y, e.x - player.x);
            damageEnemy(e, computed.attackDamage * 2.5, Math.cos(ang) * 38, Math.sin(ang) * 38, true);
            if (e.kind !== 'boss') e.stunTimer = Math.max(e.stunTimer, 1.6);
          }
        }
      } else if (charDef.id === 'nyx') {
        // Overdrive Flurry (6 shock bolts)
        for (let i = 0; i < 6; i++) {
          const spread = (i - 2.5) * 0.14;
          const ang = aim + spread;
          projectiles.push({
            x: player.x + Math.cos(ang) * 16,
            y: player.y + Math.sin(ang) * 16,
            vx: Math.cos(ang) * 420,
            vy: Math.sin(ang) * 420,
            radius: 7,
            damage: computed.attackDamage * 0.65,
            fromPlayer: true,
            pierce: 1,
            homing: false,
            aoeRadius: 0,
            life: 0.42,
            color: '#f3e8ff',
            hitIds: new Set(),
          });
        }
      } else {
        // Tarek: Scrap Fortress
        const healAmt = Math.round(player.maxHp * 0.18);
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        player.shieldTimer = 1.4;
        addFloatingText(player.x, player.y - 24, `+${healAmt} HP`, '#d8b4fe');
        slashArcs.push({ x: player.x, y: player.y, angle: 0, spread: Math.PI * 2, radius: 130, life: 0.24, maxLife: 0.24, color: '#a855f7' });
        for (const e of enemies) {
          if (Math.hypot(e.x - player.x, e.y - player.y) < 135 + e.radius) {
            const ang = Math.atan2(e.y - player.y, e.x - player.x);
            damageEnemy(e, computed.attackDamage * 1.5, Math.cos(ang) * 34, Math.sin(ang) * 34, true);
          }
        }
      }
    };

    const performDash = (moveX: number, moveY: number) => {
      if (player.dashCd > 0 || player.dashTimer > 0) return;
      const dashDirX = moveX !== 0 || moveY !== 0 ? moveX : player.facing;
      const dashDirY = moveX !== 0 || moveY !== 0 ? moveY : 0;
      const len = Math.hypot(dashDirX, dashDirY) || 1;
      player.dashVx = (dashDirX / len) * 560;
      player.dashVy = (dashDirY / len) * 560;
      player.dashTimer = 0.16;
      player.invulnTimer = Math.max(player.invulnTimer, 0.22);
      player.dashCd = Math.max(0.8, 1.7 - computed.spd * 0.02);
      soundFX.playDash();
      spawnParticles(player.x, player.y, '#c084fc', 10, 110, 4);
    };

    // Keyboard Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        onPauseToggle();
        return;
      }
      const k = e.key.toLowerCase();
      keysRef.current.add(k);
      if (k === 'k' || k === 'e') actionHoldRef.current.specialQueued = true;
      if (k === 'l' || k === 'shift') actionHoldRef.current.dashQueued = true;
      if (k === 'q') actionHoldRef.current.healQueued = true;
      if (k === 'r') actionHoldRef.current.overclockQueued = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    const onBlur = () => {
      keysRef.current.clear();
      actionHoldRef.current.attack = false;
      mouseRef.current.down = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Spawn Wave 1
    spawnWave(1);

    let lastTime = performance.now();
    let hudSyncTimer = 0;
    let rafId = 0;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      resizeCanvas();

      if (!pausedRef.current) {
        if (hitstopTimer > 0) {
          hitstopTimer -= dt;
        } else {
          simTime += dt;
          if (waveBannerTimer > 0) waveBannerTimer -= dt;
          if (shakeIntensity > 0) shakeIntensity = Math.max(0, shakeIntensity - dt * 28);
          if (comboTimer > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) comboCount = 0;
          }

          // Handle consumable queues
          if (actionHoldRef.current.healQueued) {
            actionHoldRef.current.healQueued = false;
            if (saveRef.current.consumables.healthVial > 0 && player.hp < player.maxHp) {
              onConsumeItem('healthVial');
              const healAmt = Math.round(player.maxHp * 0.45);
              player.hp = Math.min(player.maxHp, player.hp + healAmt);
              soundFX.playHeal();
              addFloatingText(player.x, player.y - 24, `+${healAmt} HP`, '#d8b4fe');
              spawnParticles(player.x, player.y, '#e9d5ff', 14, 130, 4);
            }
          }
          if (actionHoldRef.current.overclockQueued) {
            actionHoldRef.current.overclockQueued = false;
            if (saveRef.current.consumables.overclockCell > 0) {
              onConsumeItem('overclockCell');
              player.overclockTimer = 7.0;
              soundFX.playSpecial();
              addFloatingText(player.x, player.y - 28, 'OVERCLOCK +35%', '#c084fc');
            }
          }

          // Compute movement vector from WASD/Arrows + Touch Virtual Stick
          let mx = 0;
          let my = 0;
          const keys = keysRef.current;
          if (keys.has('w') || keys.has('arrowup')) my -= 1;
          if (keys.has('s') || keys.has('arrowdown')) my += 1;
          if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
          if (keys.has('d') || keys.has('arrowright')) mx += 1;

          if (touchStickRef.current.active) {
            mx += touchStickRef.current.dx;
            my += touchStickRef.current.dy;
          }

          const mLen = Math.hypot(mx, my);
          if (mLen > 1) {
            mx /= mLen;
            my /= mLen;
          }
          if (mLen > 0.15) {
            player.aimAngle = Math.atan2(my, mx);
            if (Math.abs(mx) > 0.1) player.facing = mx >= 0 ? 1 : -1;
          }

          // Timers
          if (player.attackCd > 0) player.attackCd -= dt;
          if (player.attackAnim > 0) player.attackAnim = Math.max(0, player.attackAnim - dt * 5);
          if (player.specialCd > 0) player.specialCd = Math.max(0, player.specialCd - dt);
          if (player.dashCd > 0) player.dashCd = Math.max(0, player.dashCd - dt);
          if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
          if (player.flashTimer > 0) player.flashTimer = Math.max(0, player.flashTimer - dt);
          if (player.shieldTimer > 0) player.shieldTimer = Math.max(0, player.shieldTimer - dt);
          if (player.overclockTimer > 0) player.overclockTimer = Math.max(0, player.overclockTimer - dt);

          // Lyra spin special
          if (player.spinTimer > 0) {
            player.spinTimer -= dt;
            player.spinTick -= dt;
            if (player.spinTick <= 0) {
              player.spinTick = 0.2;
              soundFX.playSlash();
              slashArcs.push({
                x: player.x,
                y: player.y,
                angle: simTime * 14,
                spread: Math.PI * 1.9,
                radius: 95,
                life: 0.14,
                maxLife: 0.14,
                color: '#d8b4fe',
              });
              for (const e of enemies) {
                if (Math.hypot(e.x - player.x, e.y - player.y) < 98 + e.radius) {
                  damageEnemy(e, computed.attackDamage * 0.72, 0, 0, false);
                }
              }
            }
          }

          // Dash / Move
          if (actionHoldRef.current.dashQueued) {
            actionHoldRef.current.dashQueued = false;
            performDash(mx, my);
          }
          if (actionHoldRef.current.specialQueued) {
            actionHoldRef.current.specialQueued = false;
            performSpecial();
          }

          if (player.dashTimer > 0) {
            player.dashTimer -= dt;
            player.x += player.dashVx * dt;
            player.y += player.dashVy * dt;
          } else {
            const speedMult = player.overclockTimer > 0 ? 1.2 : 1;
            player.x += mx * computed.moveSpeed * speedMult * dt;
            player.y += my * computed.moveSpeed * speedMult * dt;
          }
          resolveObstacleCollision(player);

          // Attack trigger
          const wantsAttack =
            actionHoldRef.current.attack ||
            mouseRef.current.down ||
            keys.has(' ') ||
            keys.has('j');
          if (wantsAttack && player.attackCd <= 0 && victoryTimer < 0 && !gameOverTriggered) {
            performPrimaryAttack();
          }

          // Update stasis zones & delayed bombs
          for (let i = stasisZones.length - 1; i >= 0; i--) {
            stasisZones[i].life -= dt;
            if (stasisZones[i].life <= 0) stasisZones.splice(i, 1);
          }
          for (let i = delayedBombs.length - 1; i >= 0; i--) {
            const b = delayedBombs[i];
            b.timer -= dt;
            if (b.timer <= 0) {
              soundFX.playHit(true);
              slashArcs.push({ x: b.x, y: b.y, angle: 0, spread: Math.PI * 2, radius: b.radius, life: 0.22, maxLife: 0.22, color: '#d8b4fe' });
              spawnParticles(b.x, b.y, '#e9d5ff', 22, 220, 5);
              for (const e of enemies) {
                if (Math.hypot(e.x - b.x, e.y - b.y) < b.radius + e.radius) {
                  const ang = Math.atan2(e.y - b.y, e.x - b.x);
                  damageEnemy(e, b.damage, Math.cos(ang) * 32, Math.sin(ang) * 32, true);
                }
              }
              delayedBombs.splice(i, 1);
            }
          }

          // Update Enemies
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.hp <= 0) {
              enemies.splice(i, 1);
              continue;
            }
            if (e.flashTimer > 0) e.flashTimer -= dt;
            if (e.stunTimer > 0) {
              e.stunTimer -= dt;
              continue;
            }

            const inStasis = stasisZones.some((z) => Math.hypot(e.x - z.x, e.y - z.y) <= z.radius);
            const slowFactor = inStasis ? 0.45 : 1;
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const dist = Math.hypot(dx, dy) || 1;
            const angToPlayer = Math.atan2(dy, dx);

            if (e.kind === 'boss') {
              // Boss phase shift at 50%
              if (e.bossPhase === 1 && e.hp < e.maxHp * 0.5) {
                e.bossPhase = 2;
                soundFX.playBossGlitch();
                addFloatingText(e.x, e.y - 54, 'GLITCH OVERDRIVE!', '#e9d5ff');
                shakeIntensity = 10;
                // Summon 2 drones
                spawnEnemy('drone', e.x - 90, e.y);
                spawnEnemy('drone', e.x + 90, e.y);
              }

              const pace = e.bossPhase === 2 ? 1.32 : 1;
              e.x += (dx / dist) * e.speed * pace * slowFactor * dt;
              e.y += (dy / dist) * e.speed * pace * slowFactor * dt;
              resolveObstacleCollision(e);

              if (dist < e.radius + player.radius + 4) {
                damagePlayer(Math.round(e.damage * 0.85));
              }

              e.attackCooldown -= dt * pace * slowFactor;
              if (e.attackCooldown <= 0) {
                e.bossAttackIndex = (e.bossAttackIndex + 1) % 3;
                if (e.bossAttackIndex === 0) {
                  // Radial glitch orb burst
                  const orbCount = e.bossPhase === 2 ? 12 : 8;
                  for (let k = 0; k < orbCount; k++) {
                    const a = (Math.PI * 2 * k) / orbCount + simTime;
                    projectiles.push({
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(a) * 210,
                      vy: Math.sin(a) * 210,
                      radius: 7,
                      damage: e.damage * 0.8,
                      fromPlayer: false,
                      pierce: 1,
                      homing: false,
                      aoeRadius: 0,
                      life: 3.2,
                      color: '#c084fc',
                      hitIds: new Set(),
                    });
                  }
                  e.attackCooldown = 2.0;
                } else if (e.bossAttackIndex === 1) {
                  // Telegraphed Shock Slam on player location
                  telegraphs.push({
                    kind: 'circle',
                    x: player.x,
                    y: player.y,
                    radius: 95,
                    timer: 0.85,
                    duration: 0.85,
                    damage: e.damage * 1.15,
                    ownerId: e.id,
                    triggered: false,
                  });
                  e.attackCooldown = 1.9;
                } else {
                  // Aimed 3-round Glitch Volley
                  for (const off of [-0.22, 0, 0.22]) {
                    const a = angToPlayer + off;
                    projectiles.push({
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(a) * 265,
                      vy: Math.sin(a) * 265,
                      radius: 8,
                      damage: e.damage * 0.9,
                      fromPlayer: false,
                      pierce: 1,
                      homing: false,
                      aoeRadius: 0,
                      life: 2.8,
                      color: '#fb7185',
                      hitIds: new Set(),
                    });
                  }
                  e.attackCooldown = 1.7;
                }
              }
            } else if (e.kind === 'sniper') {
              // Keep distance ~240-320px and telegraph shot
              if (dist > 300) {
                e.x += (dx / dist) * e.speed * slowFactor * dt;
                e.y += (dy / dist) * e.speed * slowFactor * dt;
              } else if (dist < 165) {
                e.x -= (dx / dist) * e.speed * 0.8 * slowFactor * dt;
                e.y -= (dy / dist) * e.speed * 0.8 * slowFactor * dt;
              }
              resolveObstacleCollision(e);

              if (e.windupTimer > 0) {
                e.windupTimer -= dt * slowFactor;
                if (e.windupTimer <= 0) {
                  projectiles.push({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(angToPlayer) * 285,
                    vy: Math.sin(angToPlayer) * 285,
                    radius: 6,
                    damage: e.damage,
                    fromPlayer: false,
                    pierce: 1,
                    homing: false,
                    aoeRadius: 0,
                    life: 2.4,
                    color: '#fb7185',
                    hitIds: new Set(),
                  });
                  e.attackCooldown = 1.85;
                }
              } else {
                e.attackCooldown -= dt * slowFactor;
                if (e.attackCooldown <= 0 && dist < 440) {
                  e.windupTimer = 0.55;
                  e.windupMax = 0.55;
                }
              }
            } else {
              // Melee / rusher enemies (stalker, hulk, drone, wraith)
              const targetRange = e.radius + player.radius + 10;
              if (e.windupTimer > 0) {
                e.windupTimer -= dt * slowFactor;
                if (e.windupTimer <= 0) {
                  if (dist <= targetRange + 28) {
                    damagePlayer(e.damage);
                  }
                  // Short lunge
                  e.x += Math.cos(angToPlayer) * 18;
                  e.y += Math.sin(angToPlayer) * 18;
                  e.attackCooldown = e.kind === 'hulk' ? 1.4 : 1.0;
                }
              } else {
                if (dist > targetRange) {
                  const strafe = e.kind === 'wraith' ? Math.sin(simTime * 4 + e.id) * 0.45 : 0;
                  const moveAng = angToPlayer + strafe;
                  e.x += Math.cos(moveAng) * e.speed * slowFactor * dt;
                  e.y += Math.sin(moveAng) * e.speed * slowFactor * dt;
                  resolveObstacleCollision(e);
                } else {
                  e.attackCooldown -= dt * slowFactor;
                  if (e.attackCooldown <= 0) {
                    e.windupTimer = e.kind === 'hulk' ? 0.55 : 0.38;
                    e.windupMax = e.windupTimer;
                  }
                }
              }
            }
          }

          // Update Telegraphs
          for (let i = telegraphs.length - 1; i >= 0; i--) {
            const t = telegraphs[i];
            t.timer -= dt;
            if (t.timer <= 0 && !t.triggered) {
              t.triggered = true;
              spawnParticles(t.x, t.y, '#fb7185', 18, 200, 5);
              shakeIntensity = Math.max(shakeIntensity, 7);
              if (Math.hypot(player.x - t.x, player.y - t.y) <= t.radius + player.radius * 0.5) {
                damagePlayer(Math.round(t.damage));
              }
              telegraphs.splice(i, 1);
            }
          }

          // Update Projectiles
          for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.life -= dt;
            if (p.life <= 0) {
              projectiles.splice(i, 1);
              continue;
            }

            if (p.homing && p.fromPlayer && enemies.length > 0) {
              let nearest: EnemyEntity | null = null;
              let minD = 260;
              for (const e of enemies) {
                const d = Math.hypot(e.x - p.x, e.y - p.y);
                if (d < minD) {
                  minD = d;
                  nearest = e;
                }
              }
              if (nearest) {
                const spd = Math.hypot(p.vx, p.vy);
                const targetAng = Math.atan2(nearest.y - p.y, nearest.x - p.x);
                const curAng = Math.atan2(p.vy, p.vx);
                let diff = targetAng - curAng;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const newAng = curAng + Math.max(-dt * 4.5, Math.min(dt * 4.5, diff));
                p.vx = Math.cos(newAng) * spd;
                p.vy = Math.sin(newAng) * spd;
              }
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Wall or obstacle hit
            let hitWall =
              p.x < WALL_PAD || p.x > ARENA_W - WALL_PAD || p.y < WALL_PAD || p.y > ARENA_H - WALL_PAD;
            if (!hitWall) {
              for (const ob of obstacles) {
                if (p.x > ob.x && p.x < ob.x + ob.w && p.y > ob.y && p.y < ob.y + ob.h) {
                  hitWall = true;
                  break;
                }
              }
            }
            if (hitWall) {
              spawnParticles(p.x, p.y, p.color, 4, 80, 3);
              projectiles.splice(i, 1);
              continue;
            }

            if (p.fromPlayer) {
              let consumed = false;
              for (const e of enemies) {
                if (e.hp <= 0 || p.hitIds.has(e.id)) continue;
                if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + p.radius) {
                  p.hitIds.add(e.id);
                  const ang = Math.atan2(p.vy, p.vx);
                  damageEnemy(e, p.damage, Math.cos(ang) * 14, Math.sin(ang) * 14, p.aoeRadius > 0);
                  if (p.aoeRadius > 0) {
                    slashArcs.push({ x: p.x, y: p.y, angle: 0, spread: Math.PI * 2, radius: p.aoeRadius, life: 0.16, maxLife: 0.16, color: '#c084fc' });
                    for (const splash of enemies) {
                      if (splash.id !== e.id && Math.hypot(splash.x - p.x, splash.y - p.y) <= p.aoeRadius + splash.radius) {
                        damageEnemy(splash, p.damage * 0.55, 0, 0, false);
                      }
                    }
                  }
                  p.pierce--;
                  if (p.pierce <= 0) {
                    consumed = true;
                    break;
                  }
                }
              }
              if (consumed) {
                projectiles.splice(i, 1);
              }
            } else {
              if (Math.hypot(player.x - p.x, player.y - p.y) <= player.radius + p.radius) {
                damagePlayer(Math.round(p.damage));
                projectiles.splice(i, 1);
              }
            }
          }

          // Pickups
          for (let i = pickups.length - 1; i >= 0; i--) {
            const pk = pickups[i];
            pk.life -= dt;
            if (pk.life <= 0) {
              pickups.splice(i, 1);
              continue;
            }
            const d = Math.hypot(player.x - pk.x, player.y - pk.y);
            if (d < 95) {
              pk.x += ((player.x - pk.x) / (d || 1)) * 280 * dt;
              pk.y += ((player.y - pk.y) / (d || 1)) * 280 * dt;
            }
            if (d < player.radius + 14) {
              if (pk.kind === 'shard') {
                shardsInRun += pk.value;
                addFloatingText(player.x, player.y - 20, `+${pk.value} SHARDS`, '#c084fc');
              } else {
                player.hp = Math.min(player.maxHp, player.hp + pk.value);
                addFloatingText(player.x, player.y - 20, `+${pk.value} HP`, '#d8b4fe');
                soundFX.playHeal();
              }
              pickups.splice(i, 1);
            }
          }

          // Particles & Texts & Slash Arcs
          for (let i = slashArcs.length - 1; i >= 0; i--) {
            slashArcs[i].life -= dt;
            if (slashArcs[i].life <= 0) slashArcs.splice(i, 1);
          }
          for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.life -= dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vx *= 0.92;
            pt.vy *= 0.92;
            if (pt.life <= 0) particles.splice(i, 1);
          }
          for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.life -= dt;
            ft.y += ft.vy * dt;
            if (ft.life <= 0) floatingTexts.splice(i, 1);
          }

          // Embers
          for (const em of embers) {
            em.x += em.vx * dt;
            em.y += em.vy * dt;
            if (em.y < 0) em.y = ARENA_H;
            if (em.x < 0) em.x = ARENA_W;
            if (em.x > ARENA_W) em.x = 0;
          }

          // Wave / Victory progression
          if (!gameOverTriggered && enemies.length === 0) {
            if (currentWave < levelDef.waves) {
              currentWave++;
              // Small wave recovery
              player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.08));
              spawnWave(currentWave);
            } else if (victoryTimer < 0) {
              victoryTimer = 1.25;
              chestVisualPos = { x: ARENA_W / 2, y: ARENA_H / 2 - 20, opened: false };
              currentBanner = 'SECTOR CLEARED';
              waveBannerTimer = 2.0;
              soundFX.playChestOpen();
            }
          }

          if (victoryTimer >= 0) {
            victoryTimer -= dt;
            if (victoryTimer < 0.7 && chestVisualPos && !chestVisualPos.opened) {
              chestVisualPos.opened = true;
              spawnParticles(chestVisualPos.x, chestVisualPos.y, '#e9d5ff', 28, 220, 5);
            }
            if (victoryTimer <= 0 && !gameOverTriggered) {
              gameOverTriggered = true;
              const firstClear = !saveRef.current.clearedLevels.includes(levelDef.level);
              soundFX.playVictory();
              onCombatEnd({
                level: levelDef.level,
                victory: true,
                firstTimeClear: firstClear,
                statPointsGained: 4, // +4 stat points per level win!
                shardsGained: levelDef.rewardShards + shardsInRun,
                scrapGained: levelDef.rewardScrap,
                coresGained: levelDef.isBoss ? 1 : 0,
                chestGained: levelDef.rewardChest,
                enemiesDefeated: totalKills,
                timeSeconds: Math.round(simTime),
              });
            }
          }
        }
      }

      // === RENDER ===
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;

      // Clear void black
      ctx.fillStyle = '#070709';
      ctx.fillRect(0, 0, viewW, viewH);

      // Camera centering with shake
      const shakeX = shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity * 2 : 0;
      const shakeY = shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity * 2 : 0;

      const camX =
        viewW >= ARENA_W
          ? -(viewW - ARENA_W) / 2
          : Math.max(0, Math.min(ARENA_W - viewW, player.x - viewW / 2));
      const camY =
        viewH >= ARENA_H
          ? -(viewH - ARENA_H) / 2
          : Math.max(0, Math.min(ARENA_H - viewH, player.y - viewH / 2));

      ctx.translate(Math.round(-camX + shakeX), Math.round(-camY + shakeY));

      // Arena floor tiles (black + dark grey pixel checkerboard)
      ctx.fillStyle = '#0c0c11';
      ctx.fillRect(0, 0, ARENA_W, ARENA_H);

      const tileSize = 40;
      for (let gx = WALL_PAD; gx < ARENA_W - WALL_PAD; gx += tileSize) {
        for (let gy = WALL_PAD; gy < ARENA_H - WALL_PAD; gy += tileSize) {
          const checker = ((gx / tileSize + gy / tileSize) % 2) === 0;
          ctx.fillStyle = checker ? '#111118' : '#14141d';
          ctx.fillRect(gx, gy, tileSize - 1, tileSize - 1);
        }
      }

      // Subtle arena perimeter neon-purple border
      ctx.strokeStyle = '#3b2459';
      ctx.lineWidth = 4;
      ctx.strokeRect(WALL_PAD, WALL_PAD, ARENA_W - WALL_PAD * 2, ARENA_H - WALL_PAD * 2);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1;
      ctx.strokeRect(WALL_PAD - 3, WALL_PAD - 3, ARENA_W - WALL_PAD * 2 + 6, ARENA_H - WALL_PAD * 2 + 6);

      // Stasis zones
      for (const z of stasisZones) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.14)';
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Delayed bombs
      for (const b of delayedBombs) {
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * (1 - b.timer / 0.45), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Telegraphs
      for (const t of telegraphs) {
        const prog = 1 - t.timer / t.duration;
        ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius * prog, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Ruined Grey Concrete Obstacles
      for (const ob of obstacles) {
        ctx.fillStyle = '#070709';
        ctx.fillRect(ob.x + 4, ob.y + 6, ob.w, ob.h);
        ctx.fillStyle = '#252531';
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.fillStyle = '#38384a';
        ctx.fillRect(ob.x, ob.y, ob.w, 8);
        ctx.strokeStyle = '#525268';
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
      }

      // Pickups
      for (const pk of pickups) {
        const bob = Math.sin(simTime * 7 + pk.x) * 3;
        ctx.fillStyle = pk.kind === 'shard' ? '#c084fc' : '#f3e8ff';
        ctx.fillRect(Math.round(pk.x - 4), Math.round(pk.y - 4 + bob), 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(pk.x - 1), Math.round(pk.y - 1 + bob), 2, 2);
      }

      // Victory Chest drop
      if (chestVisualPos) {
        drawChestPixelSprite(
          ctx,
          levelDef.rewardChest || 'Scrap Cache',
          chestVisualPos.x,
          chestVisualPos.y,
          3.2,
          chestVisualPos.opened
        );
      }

      // Enemies & 3D Boss
      for (const e of enemies) {
        if (e.kind === 'boss' && levelDef.bossShape) {
          draw3DGlitchBoss(
            ctx,
            levelDef.bossShape,
            e.x,
            e.y,
            e.radius,
            simTime,
            e.flashTimer > 0,
            e.bossPhase === 2
          );
        } else {
          drawEnemyPixelSprite(
            ctx,
            e.kind as EnemyKind,
            e.x,
            e.y,
            e.kind === 'hulk' ? 2.6 : 2.1,
            simTime + e.id,
            e.flashTimer > 0,
            e.windupTimer > 0 ? 1 - e.windupTimer / e.windupMax : 0
          );
          // Mini HP bar above damaged enemy
          if (e.hp < e.maxHp) {
            const bw = 28;
            ctx.fillStyle = '#14141b';
            ctx.fillRect(Math.round(e.x - bw / 2), Math.round(e.y - e.radius - 12), bw, 4);
            ctx.fillStyle = '#c084fc';
            ctx.fillRect(
              Math.round(e.x - bw / 2),
              Math.round(e.y - e.radius - 12),
              Math.round(bw * (e.hp / e.maxHp)),
              4
            );
          }
        }
      }

      // Player Hero
      if (player.shieldTimer > 0) {
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawHeroPixelSprite(
        ctx,
        charDef.id,
        player.x,
        player.y,
        2.25,
        player.facing,
        simTime,
        player.attackAnim,
        player.flashTimer > 0
      );

      // Slash Arcs
      for (const arc of slashArcs) {
        const alpha = arc.life / arc.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(arc.x, arc.y, arc.radius, arc.angle - arc.spread / 2, arc.angle + arc.spread / 2);
        ctx.stroke();
        ctx.restore();
      }

      // Projectiles
      for (const p of projectiles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - p.radius), Math.round(p.y - p.radius), p.radius * 2, p.radius * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 2), 4, 4);
      }

      // Particles
      for (const pt of particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x - pt.size / 2), Math.round(pt.y - pt.size / 2), Math.ceil(pt.size), Math.ceil(pt.size));
      }
      ctx.globalAlpha = 1;

      // Ambient wasteland embers
      for (const em of embers) {
        ctx.fillStyle = `rgba(192, 132, 252, ${em.alpha})`;
        ctx.fillRect(Math.round(em.x), Math.round(em.y), em.size, em.size);
      }

      // Floating Damage / Loot text
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      for (const ft of floatingTexts) {
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.fillStyle = '#070709';
        ctx.fillText(ft.text, Math.round(ft.x + 1), Math.round(ft.y + 1));
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      // Sync lightweight HUD snapshot ~15Hz so React never stalls 60fps loop
      hudSyncTimer += dt;
      if (hudSyncTimer >= 0.065) {
        hudSyncTimer = 0;
        const boss = enemies.find((e) => e.kind === 'boss');
        setHudState({
          hp: Math.ceil(player.hp),
          maxHp: Math.ceil(player.maxHp),
          wave: currentWave,
          totalWaves: levelDef.waves,
          kills: totalKills,
          combo: comboCount,
          specialCd: Number(player.specialCd.toFixed(1)),
          specialMaxCd: charDef.specialCooldown,
          dashCd: Number(player.dashCd.toFixed(1)),
          overclockTimer: Number(player.overclockTimer.toFixed(1)),
          bossHp: boss ? Math.max(0, Math.ceil(boss.hp)) : 0,
          bossMaxHp: boss ? boss.maxHp : 0,
          bossActive: Boolean(boss),
          bannerText: waveBannerTimer > 0 ? currentBanner : '',
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [levelDef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch Virtual Joystick Handlers
  const handleStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    touchStickRef.current = {
      active: true,
      pointerId: e.pointerId,
      originX: cx,
      originY: cy,
      dx: 0,
      dy: 0,
    };
    updateStickFromPointer(e.clientX, e.clientY, cx, cy);
  };

  const updateStickFromPointer = (px: number, py: number, ox: number, oy: number) => {
    const maxR = 44;
    const rx = px - ox;
    const ry = py - oy;
    const dist = Math.hypot(rx, ry);
    const clamped = Math.min(maxR, dist);
    const ang = Math.atan2(ry, rx);
    const nx = dist > 4 ? (Math.cos(ang) * clamped) / maxR : 0;
    const ny = dist > 4 ? (Math.sin(ang) * clamped) / maxR : 0;
    touchStickRef.current.dx = nx;
    touchStickRef.current.dy = ny;
    setStickVisual({ active: true, x: nx * maxR, y: ny * maxR });
  };

  const handleStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchStickRef.current.active || touchStickRef.current.pointerId !== e.pointerId) return;
    updateStickFromPointer(
      e.clientX,
      e.clientY,
      touchStickRef.current.originX,
      touchStickRef.current.originY
    );
  };

  const handleStickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchStickRef.current.pointerId !== e.pointerId) return;
    touchStickRef.current.active = false;
    touchStickRef.current.pointerId = null;
    touchStickRef.current.dx = 0;
    touchStickRef.current.dy = 0;
    setStickVisual({ active: false, x: 0, y: 0 });
  };

  const charDef = CHARACTER_MAP[saveData.selectedCharacterId];
  const hpPct = Math.max(0, Math.min(100, (hudState.hp / Math.max(1, hudState.maxHp)) * 100));

  return (
    <div
      className="relative w-full h-full bg-[#070709] select-none overflow-hidden touch-none"
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button === 0) {
          mouseRef.current.active = true;
          mouseRef.current.down = true;
          mouseRef.current.screenX = e.clientX;
          mouseRef.current.screenY = e.clientY;
        } else if (e.pointerType === 'mouse' && e.button === 2) {
          actionHoldRef.current.specialQueued = true;
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse') {
          mouseRef.current.active = true;
          mouseRef.current.screenX = e.clientX;
          mouseRef.current.screenY = e.clientY;
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerType === 'mouse') {
          mouseRef.current.down = false;
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="block w-full h-full pixelated" />

      {/* UNOBSTRUCTED CORNER HUD OVERLAY */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
        {/* TOP ROW */}
        <div className="flex items-start justify-between gap-3">
          {/* Top-Left: Hero Status */}
          <div className="bg-[#0d0d13]/90 border-2 border-[#2d2d3d] px-3 py-2 min-w-[200px] sm:min-w-[240px]">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="font-pixel text-xs text-[#f2f2f7] tracking-wide truncate">
                {charDef.name}
              </span>
              <span className="font-mono-num text-[11px] text-[#c084fc]">
                LVL {String(levelDef.level).padStart(2, '0')} · W{hudState.wave}/{hudState.totalWaves}
              </span>
            </div>
            <div className="w-full h-3 bg-[#181822] border border-[#323244] overflow-hidden">
              <div
                className="h-full bg-[#c084fc] transition-[width] duration-75"
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 font-mono-num text-[11px] text-[#b4b4c6]">
              <span>
                HP {hudState.hp}/{hudState.maxHp}
              </span>
              <span>
                {hudState.overclockTimer > 0
                  ? `OC ${hudState.overclockTimer}s`
                  : hudState.combo > 1
                  ? `${hudState.combo}x HIT`
                  : `KO ${hudState.kills}`}
              </span>
            </div>
          </div>

          {/* Top-Center: 3D Boss Health Bar */}
          {hudState.bossActive && (
            <div className="hidden md:flex flex-col items-center bg-[#0d0d13]/90 border-2 border-[#c084fc] px-4 py-2 min-w-[300px]">
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-pixel text-xs text-[#e9d5ff]">{levelDef.bossName}</span>
                <span className="font-mono-num text-[11px] text-[#c084fc]">
                  {hudState.bossHp}/{hudState.bossMaxHp}
                </span>
              </div>
              <div className="w-full h-3 bg-[#171221] border border-[#581c87]">
                <div
                  className="h-full bg-[#d8b4fe]"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (hudState.bossHp / Math.max(1, hudState.bossMaxHp)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Top-Right: Utility Buttons */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onTouchModeCycle}
              title={`Touch Controls: ${saveData.touchControlsMode}`}
              className={`min-h-[40px] min-w-[40px] px-2.5 flex items-center justify-center gap-1.5 border-2 transition-colors cursor-pointer ${
                showTouchControls
                  ? 'bg-[#221733] border-[#c084fc] text-[#e9d5ff]'
                  : 'bg-[#12121a] border-[#2e2e3d] text-[#a1a1b5] hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline font-mono-num text-[11px]">
                {saveData.touchControlsMode.toUpperCase()}
              </span>
            </button>
            <button
              type="button"
              onClick={onMuteToggle}
              aria-label={saveData.soundMuted ? 'Unmute audio' : 'Mute audio'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center bg-[#12121a] border-2 border-[#2e2e3d] text-[#d4d4e0] hover:border-[#c084fc] cursor-pointer"
            >
              {saveData.soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onPauseToggle}
              aria-label="Pause game"
              className="min-h-[40px] px-3 flex items-center justify-center gap-1.5 bg-[#12121a] border-2 border-[#2e2e3d] text-[#f2f2f7] hover:border-[#c084fc] cursor-pointer font-pixel text-[11px]"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          </div>
        </div>

        {/* Mobile Boss Bar */}
        {hudState.bossActive && (
          <div className="md:hidden mx-auto mt-2 bg-[#0d0d13]/90 border-2 border-[#c084fc] px-3 py-1.5 w-[min(92vw,340px)]">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-pixel text-[#e9d5ff]">{levelDef.bossName}</span>
              <span className="font-mono-num text-[#c084fc]">
                {hudState.bossHp}/{hudState.bossMaxHp}
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#171221]">
              <div
                className="h-full bg-[#d8b4fe]"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (hudState.bossHp / Math.max(1, hudState.bossMaxHp)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Wave / Boss Announcement */}
        {hudState.bannerText && (
          <div className="mx-auto my-auto bg-[#0b0b10]/90 border-2 border-[#c084fc] px-5 py-2.5 text-center">
            <p className="font-pixel text-xs sm:text-sm text-[#e9d5ff] tracking-wide">
              {hudState.bannerText}
            </p>
          </div>
        )}

        {/* BOTTOM TOUCH / DESKTOP ACTION BAR */}
        <div className="flex items-end justify-between w-full mt-auto">
          {showTouchControls ? (
            <>
              {/* Left Virtual Joystick */}
              <div
                onPointerDown={handleStickPointerDown}
                onPointerMove={handleStickPointerMove}
                onPointerUp={handleStickPointerUp}
                onPointerCancel={handleStickPointerUp}
                className="pointer-events-auto relative w-[124px] h-[124px] sm:w-[136px] sm:h-[136px] flex items-center justify-center bg-[#101017]/65 border-2 border-[#343447] rounded-full touch-none"
              >
                <div className="w-16 h-16 border border-[#2c2c3c] rounded-full pointer-events-none" />
                <div
                  className="absolute w-12 h-12 bg-[#2a2238] border-2 border-[#c084fc] rounded-full pointer-events-none"
                  style={{
                    transform: `translate(${stickVisual.x}px, ${stickVisual.y}px)`,
                  }}
                />
              </div>

              {/* Right Tactile Combat Cluster */}
              <div className="pointer-events-auto grid grid-cols-2 gap-2.5 items-end">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    actionHoldRef.current.healQueued = true;
                  }}
                  disabled={saveData.consumables.healthVial <= 0}
                  className="min-w-[58px] min-h-[52px] px-2.5 bg-[#14141d]/90 border-2 border-[#363648] active:border-[#c084fc] disabled:opacity-40 flex flex-col items-center justify-center cursor-pointer"
                >
                  <span className="font-pixel text-[10px] text-[#e9d5ff]">Vial</span>
                  <span className="font-mono-num text-[11px] text-[#a1a1b5]">
                    x{saveData.consumables.healthVial}
                  </span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    actionHoldRef.current.dashQueued = true;
                  }}
                  className="min-w-[58px] min-h-[52px] px-2.5 bg-[#14141d]/90 border-2 border-[#47475c] active:border-[#c084fc] flex flex-col items-center justify-center cursor-pointer"
                >
                  <span className="font-pixel text-[10px] text-[#f2f2f7]">Dash</span>
                  <span className="font-mono-num text-[11px] text-[#c084fc]">
                    {hudState.dashCd > 0 ? `${hudState.dashCd}s` : 'Ready'}
                  </span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    actionHoldRef.current.specialQueued = true;
                  }}
                  className={`min-w-[64px] min-h-[60px] px-2.5 border-2 flex flex-col items-center justify-center cursor-pointer ${
                    hudState.specialCd <= 0
                      ? 'bg-[#251738]/95 border-[#c084fc] text-[#f3e8ff]'
                      : 'bg-[#14141d]/90 border-[#323244] text-[#9b9bb0]'
                  }`}
                >
                  <span className="font-pixel text-[10px]">Skill</span>
                  <span className="font-mono-num text-[11px]">
                    {hudState.specialCd > 0 ? `${hudState.specialCd}s` : 'Ready'}
                  </span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    actionHoldRef.current.attack = true;
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    actionHoldRef.current.attack = false;
                  }}
                  onPointerCancel={() => {
                    actionHoldRef.current.attack = false;
                  }}
                  onPointerLeave={() => {
                    actionHoldRef.current.attack = false;
                  }}
                  className="min-w-[72px] min-h-[68px] bg-[#7e22ce]/90 active:bg-[#a855f7] border-2 border-[#e9d5ff] text-white flex flex-col items-center justify-center cursor-pointer"
                >
                  <span className="font-pixel text-xs">Attack</span>
                </button>
              </div>
            </>
          ) : (
            <div className="mx-auto bg-[#0d0d13]/80 border border-[#2a2a38] px-3 py-1.5 font-mono-num text-[11px] text-[#a6a6ba]">
              WASD Move · Click / Space Attack · E Special ({hudState.specialCd > 0 ? `${hudState.specialCd}s` : 'Ready'}) · Shift Dash · Q Vial ({saveData.consumables.healthVial}) · R Overclock ({saveData.consumables.overclockCell})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
