import { BossShape, CharacterId, ChestType, EnemyKind } from '../types/game';

/** Helper to draw crisp pixel blocks on an integer grid */
function px(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  s: number,
  gx: number,
  gy: number,
  gw: number,
  gh: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(ox + gx * s), Math.round(oy + gy * s), Math.ceil(gw * s), Math.ceil(gh * s));
}

export function drawHeroPixelSprite(
  ctx: CanvasRenderingContext2D,
  charId: CharacterId,
  centerX: number,
  centerY: number,
  scale: number,
  facing: number, // 1 right, -1 left
  animTime: number,
  attackProgress: number, // 0..1
  flashWhite = false
) {
  ctx.save();
  ctx.translate(Math.round(centerX), Math.round(centerY));
  if (facing < 0) {
    ctx.scale(-1, 1);
  }

  const s = scale;
  const bob = Math.sin(animTime * 8) > 0 ? 0 : -0.5;
  const ox = -8 * s;
  const oy = (-8 + bob) * s;

  const cDark = flashWhite ? '#ffffff' : '#121218';
  const cGrey1 = flashWhite ? '#ffffff' : '#2c2c38';
  const cGrey2 = flashWhite ? '#ffffff' : '#525263';
  const cGrey3 = flashWhite ? '#ffffff' : '#8e8ea3';
  const cSkin = flashWhite ? '#ffffff' : '#c4c4d4';
  const cNeon = flashWhite ? '#ffffff' : '#c084fc';
  const cBright = flashWhite ? '#ffffff' : '#f3e8ff';
  const cDeepPurple = flashWhite ? '#ffffff' : '#7e22ce';

  // Shadow underneath
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(Math.round(-6 * s), Math.round(7 * s), Math.round(12 * s), Math.round(2 * s));

  const swing = attackProgress > 0 ? Math.sin(attackProgress * Math.PI) * 3 : 0;

  if (charId === 'vespera' || charId === 'kaelen' || charId === 'orin') {
    // === MAGICIANS ===
    // Cloak body
    px(ctx, ox, oy, s, 4, 6, 8, 8, cGrey1);
    px(ctx, ox, oy, s, 5, 7, 6, 7, cDark);
    px(ctx, ox, oy, s, 6, 8, 4, 6, charId === 'vespera' ? cDeepPurple : cGrey2);
    // Cloak trim
    px(ctx, ox, oy, s, 4, 13, 8, 1, cNeon);
    // Boots
    px(ctx, ox, oy, s, 5, 14, 2, 2, cGrey2);
    px(ctx, ox, oy, s, 9, 14, 2, 2, cGrey2);

    // Head / Hood
    if (charId === 'vespera') {
      // Pointed Void Hood
      px(ctx, ox, oy, s, 5, 1, 6, 2, cGrey1);
      px(ctx, ox, oy, s, 4, 2, 8, 4, cGrey1);
      px(ctx, ox, oy, s, 5, 3, 6, 3, cDark);
      px(ctx, ox, oy, s, 7, 4, 1, 1, cBright);
      px(ctx, ox, oy, s, 9, 4, 1, 1, cNeon);
    } else if (charId === 'kaelen') {
      // Spiky ash hair + glowing collar
      px(ctx, ox, oy, s, 5, 1, 5, 2, cGrey3);
      px(ctx, ox, oy, s, 4, 2, 7, 1, cGrey2);
      px(ctx, ox, oy, s, 5, 3, 6, 3, cSkin);
      px(ctx, ox, oy, s, 7, 4, 1, 1, cNeon);
      px(ctx, ox, oy, s, 9, 4, 1, 1, cNeon);
      px(ctx, ox, oy, s, 4, 6, 8, 1, cNeon);
    } else {
      // Orin: Chrono visor + metallic circlet
      px(ctx, ox, oy, s, 5, 2, 6, 4, cGrey2);
      px(ctx, ox, oy, s, 4, 2, 8, 1, cNeon);
      px(ctx, ox, oy, s, 6, 4, 5, 1, cBright);
    }

    // Staff / Tome
    const wx = 12 + swing;
    px(ctx, ox, oy, s, wx, 4, 1, 11, cGrey3);
    px(ctx, ox, oy, s, wx - 1, 2, 3, 3, cDeepPurple);
    px(ctx, ox, oy, s, wx, 3, 1, 1, cBright);
  } else if (charId === 'sable' || charId === 'darius' || charId === 'lyra') {
    // === SWORDSMEN ===
    // Torso armor
    px(ctx, ox, oy, s, 4, 6, 8, 6, charId === 'darius' ? cGrey2 : cGrey1);
    px(ctx, ox, oy, s, 5, 7, 6, 4, cDark);
    px(ctx, ox, oy, s, 6, 7, 4, 1, cNeon);
    // Legs
    px(ctx, ox, oy, s, 5, 12, 2, 4, cGrey1);
    px(ctx, ox, oy, s, 9, 12, 2, 4, cGrey1);
    px(ctx, ox, oy, s, 5, 15, 2, 1, cGrey3);
    px(ctx, ox, oy, s, 9, 15, 2, 1, cGrey3);

    if (charId === 'sable') {
      // Scarf + sleek ninja-blade mask
      px(ctx, ox, oy, s, 5, 2, 6, 4, cGrey1);
      px(ctx, ox, oy, s, 3, 6, 3, 3, cDeepPurple);
      px(ctx, ox, oy, s, 6, 4, 4, 1, cBright);
      // Katana
      const kx = 11 + swing;
      px(ctx, ox, oy, s, kx, 7, 2, 1, cGrey3);
      px(ctx, ox, oy, s, kx + 1, 1, 1, 7, cBright);
      px(ctx, ox, oy, s, kx + 1, 2, 1, 5, cNeon);
    } else if (charId === 'darius') {
      // Heavy full helm + shoulder pauldrons
      px(ctx, ox, oy, s, 3, 6, 2, 3, cGrey3);
      px(ctx, ox, oy, s, 11, 6, 2, 3, cGrey3);
      px(ctx, ox, oy, s, 5, 1, 6, 5, cGrey3);
      px(ctx, ox, oy, s, 6, 3, 4, 1, cNeon);
      // Greatsword
      const gx = 12 + swing;
      px(ctx, ox, oy, s, gx, 0, 2, 10, cGrey3);
      px(ctx, ox, oy, s, gx + 1, 1, 1, 8, cNeon);
      px(ctx, ox, oy, s, gx - 1, 9, 4, 1, cGrey2);
    } else {
      // Lyra: Twin-fang ponytail + dual blades
      px(ctx, ox, oy, s, 3, 3, 2, 3, cDeepPurple);
      px(ctx, ox, oy, s, 5, 2, 6, 4, cSkin);
      px(ctx, ox, oy, s, 5, 1, 6, 2, cGrey2);
      px(ctx, ox, oy, s, 7, 4, 1, 1, cNeon);
      px(ctx, ox, oy, s, 9, 4, 1, 1, cNeon);
      // Twin blades
      px(ctx, ox, oy, s, 12 + swing, 5, 1, 6, cBright);
      px(ctx, ox, oy, s, 2 - swing * 0.5, 6, 1, 5, cNeon);
    }
  } else {
    // === FIGHTERS ===
    // Broad brawler torso
    px(ctx, ox, oy, s, 3, 6, 10, 6, cGrey2);
    px(ctx, ox, oy, s, 5, 7, 6, 4, cDark);
    if (charId === 'tarek') {
      // Glowing reactor core chest
      px(ctx, ox, oy, s, 7, 8, 2, 2, cBright);
      px(ctx, ox, oy, s, 6, 8, 1, 2, cNeon);
    } else {
      px(ctx, ox, oy, s, 6, 9, 4, 1, cNeon);
    }
    // Heavy legs
    px(ctx, ox, oy, s, 4, 12, 3, 4, cGrey1);
    px(ctx, ox, oy, s, 9, 12, 3, 4, cGrey1);

    // Head
    if (charId === 'bram') {
      px(ctx, ox, oy, s, 5, 2, 6, 4, cSkin);
      px(ctx, ox, oy, s, 5, 1, 6, 2, cGrey1);
      px(ctx, ox, oy, s, 7, 4, 1, 1, cDark);
      px(ctx, ox, oy, s, 9, 4, 1, 1, cNeon);
    } else if (charId === 'nyx') {
      // Neon headband
      px(ctx, ox, oy, s, 5, 2, 6, 4, cSkin);
      px(ctx, ox, oy, s, 4, 2, 8, 1, cNeon);
      px(ctx, ox, oy, s, 7, 4, 3, 1, cBright);
    } else {
      // Tarek: Scrap helmet
      px(ctx, ox, oy, s, 4, 1, 8, 5, cGrey3);
      px(ctx, ox, oy, s, 6, 3, 5, 1, cNeon);
    }

    // Massive gauntlets
    const fx = 12 + swing * 1.4;
    px(ctx, ox, oy, s, fx, 7, 3, 4, cGrey3);
    px(ctx, ox, oy, s, fx + 1, 8, 2, 2, cNeon);
    px(ctx, ox, oy, s, 1, 8, 3, 3, cGrey2);
    px(ctx, ox, oy, s, 1, 9, 1, 1, cNeon);
  }

  ctx.restore();
}

export function drawEnemyPixelSprite(
  ctx: CanvasRenderingContext2D,
  kind: EnemyKind,
  centerX: number,
  centerY: number,
  scale: number,
  animTime: number,
  flashWhite = false,
  telegraphRatio = 0 // 0..1 when winding up an attack
) {
  ctx.save();
  ctx.translate(Math.round(centerX), Math.round(centerY));
  const s = scale;
  const bob = Math.sin(animTime * 9) * 0.6;
  const ox = -8 * s;
  const oy = (-8 + bob) * s;

  const dark = flashWhite ? '#ffffff' : '#111116';
  const grey1 = flashWhite ? '#ffffff' : '#2b2b36';
  const grey2 = flashWhite ? '#ffffff' : '#555568';
  const grey3 = flashWhite ? '#ffffff' : '#8b8ba0';
  const eye = flashWhite ? '#ffffff' : telegraphRatio > 0 ? '#f43f5e' : '#c084fc';
  const accent = flashWhite ? '#ffffff' : telegraphRatio > 0 ? '#fb7185' : '#a855f7';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(Math.round(-6 * s), Math.round(7 * s), Math.round(12 * s), Math.round(2 * s));

  if (kind === 'stalker') {
    px(ctx, ox, oy, s, 5, 3, 6, 5, grey2);
    px(ctx, ox, oy, s, 4, 8, 8, 5, grey1);
    px(ctx, ox, oy, s, 6, 5, 1, 1, eye);
    px(ctx, ox, oy, s, 9, 5, 1, 1, eye);
    px(ctx, ox, oy, s, 5, 13, 2, 3, dark);
    px(ctx, ox, oy, s, 9, 13, 2, 3, dark);
    px(ctx, ox, oy, s, 2, 8, 2, 4, accent);
    px(ctx, ox, oy, s, 12, 8, 2, 4, accent);
  } else if (kind === 'sniper') {
    px(ctx, ox, oy, s, 5, 2, 6, 4, grey1);
    px(ctx, ox, oy, s, 6, 4, 4, 1, eye);
    px(ctx, ox, oy, s, 4, 6, 8, 7, dark);
    px(ctx, ox, oy, s, 7, 7, 2, 4, accent);
    px(ctx, ox, oy, s, 11, 7, 5, 2, grey3);
    px(ctx, ox, oy, s, 5, 13, 2, 3, grey2);
    px(ctx, ox, oy, s, 9, 13, 2, 3, grey2);
  } else if (kind === 'hulk') {
    px(ctx, ox, oy, s, 2, 3, 12, 10, grey2);
    px(ctx, ox, oy, s, 4, 4, 8, 6, grey1);
    px(ctx, ox, oy, s, 5, 2, 6, 3, grey3);
    px(ctx, ox, oy, s, 6, 3, 4, 1, eye);
    px(ctx, ox, oy, s, 6, 7, 4, 2, accent);
    px(ctx, ox, oy, s, 3, 13, 4, 3, dark);
    px(ctx, ox, oy, s, 9, 13, 4, 3, dark);
  } else if (kind === 'drone') {
    const hover = Math.sin(animTime * 14) * 1.2;
    const dy = oy + hover * s;
    px(ctx, ox, dy, s, 4, 4, 8, 6, grey3);
    px(ctx, ox, dy, s, 5, 5, 6, 4, dark);
    px(ctx, ox, dy, s, 7, 6, 2, 2, eye);
    px(ctx, ox, dy, s, 2, 5, 2, 3, accent);
    px(ctx, ox, dy, s, 12, 5, 2, 3, accent);
  } else {
    // wraith
    px(ctx, ox, oy, s, 5, 2, 6, 10, dark);
    px(ctx, ox, oy, s, 4, 4, 8, 6, grey1);
    px(ctx, ox, oy, s, 6, 5, 1, 2, eye);
    px(ctx, ox, oy, s, 9, 5, 1, 2, eye);
    px(ctx, ox, oy, s, 4, 12, 2, 3, accent);
    px(ctx, ox, oy, s, 7, 13, 2, 3, accent);
    px(ctx, ox, oy, s, 10, 12, 2, 3, accent);
  }

  ctx.restore();
}

export function drawChestPixelSprite(
  ctx: CanvasRenderingContext2D,
  chestType: ChestType,
  centerX: number,
  centerY: number,
  scale: number,
  opened = false
) {
  ctx.save();
  ctx.translate(Math.round(centerX), Math.round(centerY));
  const s = scale;
  const ox = -8 * s;
  const oy = -8 * s;

  const base =
    chestType === 'Scrap Cache' ? '#3f3f46' : chestType === 'Neon Vault' ? '#2e1f3d' : '#1f1230';
  const trim =
    chestType === 'Scrap Cache' ? '#a1a1aa' : chestType === 'Neon Vault' ? '#c084fc' : '#e9d5ff';
  const lock =
    chestType === 'Scrap Cache' ? '#d4d4d8' : chestType === 'Neon Vault' ? '#f3e8ff' : '#a855f7';

  // Chest base
  px(ctx, ox, oy, s, 2, 7, 12, 7, base);
  px(ctx, ox, oy, s, 2, 7, 12, 1, trim);
  px(ctx, ox, oy, s, 2, 13, 12, 1, trim);
  px(ctx, ox, oy, s, 2, 7, 1, 7, trim);
  px(ctx, ox, oy, s, 13, 7, 1, 7, trim);

  if (opened) {
    // Open lid tilted up + glow inside
    px(ctx, ox, oy, s, 2, 2, 12, 3, base);
    px(ctx, ox, oy, s, 2, 2, 12, 1, trim);
    px(ctx, ox, oy, s, 3, 5, 10, 2, lock);
  } else {
    // Closed lid
    px(ctx, ox, oy, s, 2, 4, 12, 3, base);
    px(ctx, ox, oy, s, 2, 4, 12, 1, trim);
    px(ctx, ox, oy, s, 7, 6, 2, 3, lock);
  }

  ctx.restore();
}

// === 3D GLITCHY BOSS RASTERIZER ===
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Mesh3D {
  vertices: Vec3[];
  edges: [number, number][];
  faces: number[][];
}

function rotateVec(v: Vec3, ax: number, ay: number, az: number): Vec3 {
  // X axis
  const y1 = v.y * Math.cos(ax) - v.z * Math.sin(ax);
  const z1 = v.y * Math.sin(ax) + v.z * Math.cos(ax);
  // Y axis
  const x2 = v.x * Math.cos(ay) + z1 * Math.sin(ay);
  const z2 = -v.x * Math.sin(ay) + z1 * Math.cos(ay);
  // Z axis
  const x3 = x2 * Math.cos(az) - y1 * Math.sin(az);
  const y3 = x2 * Math.sin(az) + y1 * Math.cos(az);
  return { x: x3, y: y3, z: z2 };
}

function getCubeMesh(scale: number): Mesh3D {
  const s = scale;
  const vertices: Vec3[] = [
    { x: -s, y: -s, z: -s },
    { x: s, y: -s, z: -s },
    { x: s, y: s, z: -s },
    { x: -s, y: s, z: -s },
    { x: -s, y: -s, z: s },
    { x: s, y: -s, z: s },
    { x: s, y: s, z: s },
    { x: -s, y: s, z: s },
  ];
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const faces = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [0, 3, 7, 4],
    [1, 2, 6, 5],
  ];
  return { vertices, edges, faces };
}

function getOctahedronMesh(scale: number): Mesh3D {
  const s = scale;
  const vertices: Vec3[] = [
    { x: 0, y: -s, z: 0 },
    { x: s, y: 0, z: 0 },
    { x: 0, y: 0, z: s },
    { x: -s, y: 0, z: 0 },
    { x: 0, y: 0, z: -s },
    { x: 0, y: s, z: 0 },
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [5, 1], [5, 2], [5, 3], [5, 4],
    [1, 2], [2, 3], [3, 4], [4, 1],
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],
    [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4],
  ];
  return { vertices, edges, faces };
}

function getPyramidMesh(scale: number): Mesh3D {
  const s = scale;
  const vertices: Vec3[] = [
    { x: 0, y: -s * 1.25, z: 0 },
    { x: -s, y: s * 0.8, z: -s },
    { x: s, y: s * 0.8, z: -s },
    { x: s, y: s * 0.8, z: s },
    { x: -s, y: s * 0.8, z: s },
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 2], [2, 3], [3, 4], [4, 1],
  ];
  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 4],
    [0, 4, 1],
    [1, 2, 3, 4],
  ];
  return { vertices, edges, faces };
}

export function draw3DGlitchBoss(
  ctx: CanvasRenderingContext2D,
  shape: BossShape,
  centerX: number,
  centerY: number,
  radius: number,
  time: number,
  flashWhite = false,
  ragePhase = false
) {
  ctx.save();

  // Glitch jitter & scanline artifact offsets
  const glitchPulse = Math.sin(time * 17) > 0.82 || ragePhase;
  const jitterX = glitchPulse ? (Math.sin(time * 93) * 3.5) : 0;
  const jitterY = glitchPulse ? (Math.cos(time * 71) * 1.5) : 0;

  const projectAndDraw = (
    mesh: Mesh3D,
    ax: number,
    ay: number,
    az: number,
    offsetX: number,
    offsetY: number,
    wireColor: string,
    fillBaseAlpha: number,
    pixelSnap = 2
  ) => {
    const transformed = mesh.vertices.map((v) => rotateVec(v, ax, ay, az));
    const fov = 320;
    const projected = transformed.map((v) => {
      const z = v.z + 240;
      const scale = fov / Math.max(40, z);
      const sx = centerX + offsetX + Math.round((v.x * scale) / pixelSnap) * pixelSnap;
      const sy = centerY + offsetY + Math.round((v.y * scale) / pixelSnap) * pixelSnap;
      return { x: sx, y: sy, z: v.z };
    });

    // Sort faces back-to-front
    const sortedFaces = mesh.faces
      .map((face) => {
        const avgZ = face.reduce((sum, idx) => sum + transformed[idx].z, 0) / face.length;
        return { face, avgZ };
      })
      .sort((a, b) => a.avgZ - b.avgZ);

    for (const { face, avgZ } of sortedFaces) {
      ctx.beginPath();
      face.forEach((idx, i) => {
        const p = projected[idx];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();

      if (flashWhite) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
      } else {
        const shade = Math.max(0.15, Math.min(0.85, 0.45 + avgZ / (radius * 2.2)));
        const r = Math.round(22 + shade * 38);
        const g = Math.round(18 + shade * 24);
        const b = Math.round(34 + shade * 68);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillBaseAlpha})`;
      }
      ctx.fill();
    }

    // Wireframe edges
    ctx.strokeStyle = flashWhite ? '#ffffff' : wireColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [a, b] of mesh.edges) {
      const pa = projected[a];
      const pb = projected[b];
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
    }
    ctx.stroke();

    // Glowing pixel vertices
    ctx.fillStyle = flashWhite ? '#ffffff' : '#f3e8ff';
    for (const p of projected) {
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
  };

  // Ground shadow
  ctx.fillStyle = 'rgba(168, 85, 247, 0.16)';
  ctx.fillRect(Math.round(centerX - radius * 0.7), Math.round(centerY + radius * 0.85), Math.round(radius * 1.4), 6);

  // Chromatic glitch ghost layer
  if (glitchPulse && !flashWhite) {
    const ghostMesh = shape === 'prism' ? getPyramidMesh(radius * 0.72) : getCubeMesh(radius * 0.62);
    projectAndDraw(
      ghostMesh,
      time * 1.3,
      time * 1.7,
      time * 0.6,
      jitterX + 6,
      jitterY - 2,
      'rgba(192, 132, 252, 0.35)',
      0.18
    );
  }

  if (shape === 'tesseract') {
    const outer = getCubeMesh(radius * 0.72);
    const inner = getCubeMesh(radius * 0.38);
    projectAndDraw(outer, time * 0.9, time * 1.2, time * 0.5, jitterX, jitterY, '#c084fc', 0.65);
    projectAndDraw(inner, -time * 1.5, time * 1.8, -time * 0.9, jitterX, jitterY, '#f3e8ff', 0.85);
  } else if (shape === 'wyrm') {
    for (let seg = 4; seg >= 0; seg--) {
      const segSize = radius * (0.58 - seg * 0.06);
      const sx = Math.sin(time * 3.2 - seg * 0.75) * radius * 0.45;
      const sy = Math.cos(time * 2.4 - seg * 0.6) * radius * 0.2;
      const oct = getOctahedronMesh(segSize);
      projectAndDraw(
        oct,
        time * 1.4 + seg,
        time * 1.9,
        seg * 0.5,
        jitterX + sx,
        jitterY + sy,
        seg === 0 ? '#f3e8ff' : '#a855f7',
        0.78
      );
    }
  } else if (shape === 'prism') {
    const pyr = getPyramidMesh(radius * 0.78);
    projectAndDraw(pyr, 0.35, time * 1.5, Math.sin(time) * 0.2, jitterX, jitterY, '#d8b4fe', 0.82);
    // 2 orbiting mini cubes
    for (let i = 0; i < 2; i++) {
      const ang = time * 2.8 + i * Math.PI;
      const ox = Math.cos(ang) * radius * 0.95;
      const oy = Math.sin(ang) * radius * 0.32;
      projectAndDraw(
        getCubeMesh(radius * 0.22),
        time * 2.2,
        time * 2.6,
        0,
        jitterX + ox,
        jitterY + oy,
        '#c084fc',
        0.8
      );
    }
  } else if (shape === 'seraph') {
    const core = getOctahedronMesh(radius * 0.55);
    projectAndDraw(core, time * 1.1, time * 1.6, 0.4, jitterX, jitterY, '#f3e8ff', 0.85);
    // Wing prisms
    const wing = getPyramidMesh(radius * 0.45);
    const flap = Math.sin(time * 5) * 0.35;
    projectAndDraw(wing, flap, time * 0.5, -1.2, jitterX - radius * 0.68, jitterY - 6, '#c084fc', 0.55);
    projectAndDraw(wing, flap, -time * 0.5, 1.2, jitterX + radius * 0.68, jitterY - 6, '#c084fc', 0.55);
  } else if (shape === 'torus') {
    // Interlocking orthogonal wireframe rings (approximated via rotated octagons/cubes)
    const ring1 = getCubeMesh(radius * 0.68);
    const ring2 = getOctahedronMesh(radius * 0.72);
    projectAndDraw(ring1, time * 2.1, time * 0.8, 0.6, jitterX, jitterY, '#a855f7', 0.45);
    projectAndDraw(ring2, -time * 0.9, time * 2.3, 1.1, jitterX, jitterY, '#e9d5ff', 0.7);
  } else {
    // Final Boss: ARCHITECT OF ASH (Monolith + rotating outer rings)
    const mono = getPyramidMesh(radius * 0.82);
    const crown = getOctahedronMesh(radius * 0.42);
    const cage = getCubeMesh(radius * 0.85);
    projectAndDraw(cage, time * 0.7, -time * 0.9, time * 0.4, jitterX, jitterY, '#7e22ce', 0.3);
    projectAndDraw(mono, 0.2, time * 1.2, Math.sin(time * 2) * 0.15, jitterX, jitterY, '#c084fc', 0.85);
    projectAndDraw(crown, time * 2.4, time * 2.4, 0, jitterX, jitterY - radius * 0.55, '#f5f3ff', 0.9);
  }

  // Horizontal pixel glitch slice overlay
  if (glitchPulse && !flashWhite) {
    ctx.fillStyle = 'rgba(216, 180, 254, 0.35)';
    const sliceY = centerY + Math.sin(time * 41) * radius * 0.6;
    ctx.fillRect(Math.round(centerX - radius), Math.round(sliceY), Math.round(radius * 2), 2);
  }

  ctx.restore();
}
