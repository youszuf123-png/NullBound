import { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HubOverlay } from './components/HubOverlay';
import { PixelSpritePreview } from './components/PixelSpritePreview';
import { TitleScreen } from './components/TitleScreen';
import { CHARACTER_MAP } from './data/characters';
import { LEVELS } from './data/levels';
import {
  CharacterId,
  CombatResult,
  GameScreen,
  HubTab,
  SaveData,
  StatBlock,
} from './types/game';
import { soundFX } from './utils/audio';
import {
  getAvailableStatPoints,
  getComputedHeroStats,
  loadSaveData,
  persistSaveData,
  resetSaveData,
} from './utils/storage';

export default function App() {
  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [hubTab, setHubTab] = useState<HubTab>('campaign');
  const [activeLevelNum, setActiveLevelNum] = useState<number>(1);
  const [runKey, setRunKey] = useState<number>(0);
  const [lastResult, setLastResult] = useState<CombatResult | null>(null);

  useEffect(() => {
    soundFX.setMuted(saveData.soundMuted);
    persistSaveData(saveData);
  }, [saveData]);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSaveData((prev) => updater(prev));
  }, []);

  const handleMuteToggle = useCallback(() => {
    updateSave((prev) => ({ ...prev, soundMuted: !prev.soundMuted }));
  }, [updateSave]);

  const handleTouchModeCycle = useCallback(() => {
    updateSave((prev) => {
      const next =
        prev.touchControlsMode === 'auto'
          ? 'always'
          : prev.touchControlsMode === 'always'
          ? 'off'
          : 'auto';
      return { ...prev, touchControlsMode: next };
    });
  }, [updateSave]);

  const handleSelectCharacter = useCallback(
    (id: CharacterId) => {
      updateSave((prev) => ({ ...prev, selectedCharacterId: id }));
    },
    [updateSave]
  );

  const handleAllocateStat = useCallback(
    (charId: CharacterId, stat: keyof StatBlock) => {
      updateSave((prev) => {
        const available = getAvailableStatPoints(prev, charId);
        if (available <= 0) return prev;
        const current = prev.allocatedStats[charId] || { str: 0, hp: 0, spd: 0 };
        return {
          ...prev,
          allocatedStats: {
            ...prev.allocatedStats,
            [charId]: {
              ...current,
              [stat]: current[stat] + 1,
            },
          },
        };
      });
    },
    [updateSave]
  );

  const handleResetCharacterStats = useCallback(
    (charId: CharacterId) => {
      updateSave((prev) => ({
        ...prev,
        allocatedStats: {
          ...prev.allocatedStats,
          [charId]: { str: 0, hp: 0, spd: 0 },
        },
      }));
    },
    [updateSave]
  );

  const handleDeployLevel = useCallback((levelNum: number) => {
    setActiveLevelNum(levelNum);
    setLastResult(null);
    setRunKey((k) => k + 1);
    setScreen('PLAYING');
  }, []);

  const handleConsumeItem = useCallback(
    (kind: 'healthVial' | 'overclockCell') => {
      updateSave((prev) => ({
        ...prev,
        consumables: {
          ...prev.consumables,
          [kind]: Math.max(0, prev.consumables[kind] - 1),
        },
      }));
    },
    [updateSave]
  );

  const handleCombatEnd = useCallback(
    (result: CombatResult) => {
      setLastResult(result);
      if (result.victory) {
        updateSave((prev) => {
          const clearedSet = new Set(prev.clearedLevels);
          clearedSet.add(result.level);
          const storySet = new Set(prev.unlockedStoryLevels);
          storySet.add(result.level);
          if (result.level < 30) storySet.add(result.level + 1);

          const chests = { ...prev.chests };
          if (result.chestGained) {
            chests[result.chestGained] = (chests[result.chestGained] || 0) + 1;
          }

          return {
            ...prev,
            totalStatPointsEarned: prev.totalStatPointsEarned + result.statPointsGained,
            highestClearedLevel: Math.max(prev.highestClearedLevel, result.level),
            clearedLevels: Array.from(clearedSet).sort((a, b) => a - b),
            unlockedStoryLevels: Array.from(storySet).sort((a, b) => a - b),
            ashShards: prev.ashShards + result.shardsGained,
            scrapMetal: prev.scrapMetal + result.scrapGained,
            glitchCores: prev.glitchCores + result.coresGained,
            chests,
            totalKills: prev.totalKills + result.enemiesDefeated,
            totalWins: prev.totalWins + 1,
          };
        });
        setScreen('VICTORY');
      } else {
        updateSave((prev) => ({
          ...prev,
          ashShards: prev.ashShards + Math.floor(result.shardsGained * 0.5),
          totalKills: prev.totalKills + result.enemiesDefeated,
        }));
        setScreen('DEFEAT');
      }
    },
    [updateSave]
  );

  const activeLevel = LEVELS[activeLevelNum - 1] || LEVELS[0];
  const activeChar = CHARACTER_MAP[saveData.selectedCharacterId];
  const unspentPoints = getAvailableStatPoints(saveData, activeChar.id);
  const heroComputed = getComputedHeroStats(saveData, activeChar.id);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#070709] text-[#f2f2f7]">
      {screen === 'TITLE' && (
        <TitleScreen
          saveData={saveData}
          onStart={() => {
            soundFX.playClick();
            setScreen('HUB');
          }}
          onResetSave={() => {
            soundFX.playClick();
            const fresh = resetSaveData();
            setSaveData(fresh);
          }}
        />
      )}

      {screen === 'HUB' && (
        <HubOverlay
          saveData={saveData}
          activeTab={hubTab}
          onTabChange={setHubTab}
          onBackToTitle={() => setScreen('TITLE')}
          onMuteToggle={handleMuteToggle}
          onSelectCharacter={handleSelectCharacter}
          onAllocateStat={handleAllocateStat}
          onResetCharacterStats={handleResetCharacterStats}
          onDeployLevel={handleDeployLevel}
          onUpdateSave={updateSave}
        />
      )}

      {(screen === 'PLAYING' || screen === 'PAUSED' || screen === 'VICTORY' || screen === 'DEFEAT') && (
        <div className="relative w-full h-full">
          <GameCanvas
            key={runKey}
            levelDef={activeLevel}
            saveData={saveData}
            paused={screen !== 'PLAYING'}
            onPauseToggle={() =>
              setScreen((s) => (s === 'PLAYING' ? 'PAUSED' : s === 'PAUSED' ? 'PLAYING' : s))
            }
            onMuteToggle={handleMuteToggle}
            onTouchModeCycle={handleTouchModeCycle}
            onConsumeItem={handleConsumeItem}
            onCombatEnd={handleCombatEnd}
          />

          {/* PAUSE MODAL */}
          {screen === 'PAUSED' && (
            <div className="absolute inset-0 z-30 bg-[#070709]/85 flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#111118] border-2 border-[#c084fc] p-6 space-y-4">
                <div>
                  <div className="font-mono-num text-xs text-[#c084fc]">
                    Sector {String(activeLevel.level).padStart(2, '0')} · {activeLevel.zone}
                  </div>
                  <h2 className="font-pixel text-lg text-[#f4f4f6] mt-1">Mission Paused</h2>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setScreen('PLAYING');
                    }}
                    className="w-full min-h-[44px] bg-[#c084fc] hover:bg-[#d8b4fe] text-[#070709] font-pixel text-xs cursor-pointer"
                  >
                    Resume Combat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      handleDeployLevel(activeLevel.level);
                    }}
                    className="w-full min-h-[44px] bg-[#181822] hover:border-[#c084fc] border-2 border-[#343448] text-[#f2f2f7] font-pixel text-xs cursor-pointer"
                  >
                    Restart Sector
                  </button>
                  <button
                    type="button"
                    onClick={handleTouchModeCycle}
                    className="w-full min-h-[44px] bg-[#181822] hover:border-[#c084fc] border-2 border-[#343448] text-[#d4d4e0] font-mono-num text-xs cursor-pointer"
                  >
                    Touch Controls: {saveData.touchControlsMode.toUpperCase()}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setScreen('HUB');
                    }}
                    className="w-full min-h-[44px] bg-[#111118] hover:border-[#fb7185] border-2 border-[#2a2a38] text-[#b4b4c6] font-pixel text-xs cursor-pointer"
                  >
                    Retreat to Camp
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VICTORY MODAL WITH +4 STAT POINTS ALLOCATION */}
          {screen === 'VICTORY' && lastResult && (
            <div className="absolute inset-0 z-30 bg-[#070709]/88 flex items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-lg bg-[#111118] border-2 border-[#c084fc] p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-mono-num text-xs text-[#c084fc]">
                      Sector {String(lastResult.level).padStart(2, '0')} Cleared · {lastResult.timeSeconds}s
                    </div>
                    <h2 className="font-pixel text-xl text-[#f3e8ff] mt-1">
                      {lastResult.level === 30 ? 'Wasteland Liberated' : 'Sector Victory'}
                    </h2>
                  </div>
                  {lastResult.chestGained && (
                    <PixelSpritePreview kind="chest" chestType={lastResult.chestGained} opened size={56} />
                  )}
                </div>

                {/* Loot Breakdown */}
                <div className="bg-[#0b0b10] border border-[#2c2c3d] p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono-num text-xs">
                  <div>
                    <div className="text-[#8e8ea3]">Stat Pts</div>
                    <div className="text-[#e9d5ff] font-bold text-sm mt-0.5">
                      +{lastResult.statPointsGained}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#8e8ea3]">Shards</div>
                    <div className="text-[#c084fc] font-bold text-sm mt-0.5">
                      +{lastResult.shardsGained}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#8e8ea3]">Scrap</div>
                    <div className="text-[#f2f2f7] font-bold text-sm mt-0.5">
                      +{lastResult.scrapGained}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#8e8ea3]">Loot</div>
                    <div className="text-[#d8b4fe] font-bold text-xs mt-1">
                      {lastResult.chestGained || 'Cache'}
                      {lastResult.coresGained > 0 ? ' + Core' : ''}
                    </div>
                  </div>
                </div>

                {/* Immediate +4 Stat Point Allocator */}
                <div className="bg-[#151220] border border-[#581c87] p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    <span className="font-pixel text-[#e9d5ff]">
                      Upgrade {activeChar.name}
                    </span>
                    <span className="text-[#c084fc]">
                      Unspent Points: {unspentPoints}
                    </span>
                  </div>

                  {(
                    [
                      { key: 'str', label: 'Strength', val: heroComputed.str },
                      { key: 'hp', label: 'Health', val: heroComputed.hp },
                      { key: 'spd', label: 'Speed', val: heroComputed.spd },
                    ] as const
                  ).map((st) => (
                    <div key={st.key} className="flex items-center justify-between text-xs font-mono-num">
                      <span className="text-[#d4d4e0]">{st.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#f2f2f7]">{st.val}</span>
                        <button
                          type="button"
                          disabled={unspentPoints <= 0}
                          onClick={() => {
                            soundFX.playClick();
                            handleAllocateStat(activeChar.id, st.key);
                          }}
                          className="min-w-[44px] min-h-[34px] bg-[#2a1c40] hover:bg-[#c084fc] hover:text-[#070709] disabled:opacity-30 border border-[#c084fc] text-[#f3e8ff] font-pixel text-xs cursor-pointer disabled:cursor-not-allowed"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Victory Actions */}
                <div className="flex flex-wrap gap-3">
                  {lastResult.level < 30 && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playClick();
                        handleDeployLevel(lastResult.level + 1);
                      }}
                      className="flex-1 min-h-[46px] px-4 bg-[#c084fc] hover:bg-[#d8b4fe] text-[#070709] font-pixel text-xs cursor-pointer"
                    >
                      Next Sector ({String(lastResult.level + 1).padStart(2, '0')})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setHubTab(lastResult.chestGained ? 'inventory' : 'campaign');
                      setScreen('HUB');
                    }}
                    className="flex-1 min-h-[46px] px-4 bg-[#191924] hover:border-[#c084fc] border-2 border-[#38384c] text-[#f2f2f7] font-pixel text-xs cursor-pointer"
                  >
                    Open Chests & Camp
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DEFEAT MODAL */}
          {screen === 'DEFEAT' && lastResult && (
            <div className="absolute inset-0 z-30 bg-[#070709]/88 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#111118] border-2 border-[#fb7185] p-6 space-y-4">
                <div>
                  <div className="font-mono-num text-xs text-[#fb7185]">
                    Sector {String(lastResult.level).padStart(2, '0')} · Signal Lost
                  </div>
                  <h2 className="font-pixel text-lg text-[#f4f4f6] mt-1">Fallen in the Ash</h2>
                  <p className="text-xs text-[#b4b4c6] mt-2">
                    Salvaged {Math.floor(lastResult.shardsGained * 0.5)} Ash Shards before extraction. Visit the Craftsman or upgrade your stats and try again.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      handleDeployLevel(lastResult.level);
                    }}
                    className="flex-1 min-h-[44px] bg-[#c084fc] hover:bg-[#d8b4fe] text-[#070709] font-pixel text-xs cursor-pointer"
                  >
                    Retry Sector
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setScreen('HUB');
                    }}
                    className="flex-1 min-h-[44px] bg-[#191924] hover:border-[#c084fc] border-2 border-[#38384c] text-[#f2f2f7] font-pixel text-xs cursor-pointer"
                  >
                    Return to Camp
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
