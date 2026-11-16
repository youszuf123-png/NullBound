import React, { useEffect, useRef } from 'react';
import { BossShape, CharacterId, ChestType } from '../types/game';
import { draw3DGlitchBoss, drawChestPixelSprite, drawHeroPixelSprite } from '../utils/pixelSprites';

interface Props {
  kind: 'hero' | 'boss' | 'chest';
  heroId?: CharacterId;
  bossShape?: BossShape;
  chestType?: ChestType;
  size?: number;
  animate?: boolean;
  opened?: boolean;
  className?: string;
}

export const PixelSpritePreview: React.FC<Props> = ({
  kind,
  heroId = 'sable',
  bossShape = 'tesseract',
  chestType = 'Scrap Cache',
  size = 64,
  animate = true,
  opened = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const render = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;

      if (kind === 'hero') {
        drawHeroPixelSprite(ctx, heroId, size / 2, size / 2 + 2, size / 20, 1, animate ? t : 0, 0, false);
      } else if (kind === 'boss') {
        draw3DGlitchBoss(ctx, bossShape, size / 2, size / 2, size * 0.34, animate ? t : 0.7, false, false);
      } else {
        drawChestPixelSprite(ctx, chestType, size / 2, size / 2 + 2, size / 20, opened);
      }

      if (animate) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [kind, heroId, bossShape, chestType, size, animate, opened]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pixelated block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
