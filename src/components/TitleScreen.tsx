import React, { useEffect, useState } from 'react';
import { SaveData } from '../types/game';
import { PixelSpritePreview } from './PixelSpritePreview';

interface TitleScreenProps {
  saveData: SaveData;
  onStart: () => void;
  onResetSave: () => void;
}

const BACKDROP_URL = '/src/assets/images/wasteland_title_backdrop_1794836380589.jpg';

export const TitleScreen: React.FC<TitleScreenProps> = ({
  saveData,
  onStart,
  onResetSave,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const hasProgress = saveData.highestClearedLevel > 0 || saveData.totalKills > 0;

  useEffect(() => {
    const canonicalUrl = window.location.origin + window.location.pathname;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;
  }, []);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="relative w-full h-full bg-[#070709] overflow-hidden flex flex-col justify-between">
      {/* Pixel Wasteland Key Art Backdrop */}
      {!imgFailed ? (
        <img
          src={BACKDROP_URL}
          alt="Ruined dark wasteland skyline with a glowing neon-purple dimensional rift"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover pixelated"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 75% 45%, rgba(168,85,247,0.28), transparent 45%), linear-gradient(180deg, #070709 0%, #14141d 100%)',
          }}
        />
      )}

      {/* Measured Contrast Scrim keeping right-side rift visible and left negative space legible */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#070709]/95 via-[#070709]/65 to-[#070709]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-transparent to-[#070709]/60" />

      {/* Top quiet unboxed line */}
      <div className="relative z-10 px-6 sm:px-12 pt-6 flex items-center justify-between gap-4 text-xs text-[#a1a1b5] font-mono-num">
        <span>Free-to-Play Browser RPG · Local Save Enabled</span>
        <button
          type="button"
          onClick={handleCopyShareLink}
          className="text-[#d8b4fe] hover:text-[#f3e8ff] underline underline-offset-4 cursor-pointer whitespace-nowrap"
        >
          {copiedLink ? 'Link Copied!' : 'Copy Share Link'}
        </button>
      </div>

      {/* Left Focal Anchor: Bespoke SVG Lockup + Single Primary CTA */}
      <div className="relative z-10 px-6 sm:px-12 max-w-2xl my-auto">
        {/* Bespoke Pixel-Cut SVG Title Lockup */}
        <svg
          viewBox="0 0 540 104"
          className="w-full max-w-[460px] h-auto mb-5"
          role="img"
          aria-label="NULLBOUND"
        >
          <defs>
            <linearGradient id="nullboundGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f4f4f6" />
              <stop offset="65%" stopColor="#e9d5ff" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          {/* Hard pixel offset shadow */}
          <text
            x="4"
            y="72"
            fill="#4c1d95"
            fontFamily="Silkscreen, monospace"
            fontWeight="700"
            fontSize="60"
            letterSpacing="4"
          >
            NULLBOUND
          </text>
          <text
            x="0"
            y="68"
            fill="url(#nullboundGrad)"
            fontFamily="Silkscreen, monospace"
            fontWeight="700"
            fontSize="60"
            letterSpacing="4"
          >
            NULLBOUND
          </text>
          {/* Crisp stepped pixel underline */}
          <rect x="0" y="84" width="220" height="4" fill="#c084fc" />
          <rect x="228" y="84" width="48" height="4" fill="#525263" />
          <rect x="284" y="84" width="16" height="4" fill="#e9d5ff" />
        </svg>

        <p className="text-base sm:text-lg text-[#d4d4e0] leading-relaxed max-w-lg mb-7">
          Master nine wasteland warriors across Magician, Swordsman, and Fighter classes. Battle 3D glitch monoliths, loot vaults, and forge mythic gear.
        </p>

        {/* Active Hero Preview + Start CTA */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            className="min-h-[48px] px-7 py-3 bg-[#c084fc] hover:bg-[#d8b4fe] text-[#070709] font-pixel text-sm tracking-wide border-2 border-[#f3e8ff] transition-transform active:translate-y-0.5 cursor-pointer"
          >
            {hasProgress ? 'Continue Wasteland' : 'Enter Wasteland'}
          </button>

          {hasProgress && (
            <div className="flex items-center gap-3 bg-[#111117]/90 border border-[#2e2e3d] px-3.5 py-2">
              <PixelSpritePreview kind="hero" heroId={saveData.selectedCharacterId} size={36} />
              <div className="text-xs font-mono-num">
                <div className="text-[#f2f2f7]">
                  Sector {Math.min(30, saveData.highestClearedLevel + 1)}/30
                </div>
                <div className="text-[#a1a1b5]">{saveData.ashShards} Shards</div>
              </div>
            </div>
          )}
        </div>

        {hasProgress && (
          <div className="mt-4">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="text-xs text-[#8e8ea3] hover:text-[#e9d5ff] underline underline-offset-4 cursor-pointer"
              >
                Reset Local Save Data
              </button>
            ) : (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[#fb7185]">Erase all local progress?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetSave();
                    setConfirmReset(false);
                  }}
                  className="px-2.5 py-1 bg-[#fb7185] text-[#070709] font-semibold cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 bg-[#1d1d26] text-[#d4d4e0] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Single flat control-hint line */}
      <div className="relative z-10 px-6 sm:px-12 pb-5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono-num text-[#9e9eb3]">
        <span>WASD Move · Space / Click Attack · E Special · Shift Dash · Touch Controls Included</span>
        <span>Press Enter or Space to Start</span>
      </div>
    </div>
  );
};
