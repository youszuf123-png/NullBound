import React, { useState } from 'react';
import {
  ChevronLeft,
  Hammer,
  Package,
  Play,
  RotateCcw,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CHARACTERS, CHARACTER_MAP } from '../data/characters';
import { ITEM_TEMPLATE_MAP, ITEM_TEMPLATES, RARITY_COLORS, rollChestLoot } from '../data/items';
import { LEVELS } from '../data/levels';
import {
  CharacterClass,
  CharacterId,
  ChestType,
  HubTab,
  InventoryItem,
  SaveData,
  StatBlock,
} from '../types/game';
import { soundFX } from '../utils/audio';
import {
  getAvailableStatPoints,
  getComputedHeroStats,
  getItemEffectiveBonuses,
} from '../utils/storage';
import { PixelSpritePreview } from './PixelSpritePreview';

interface HubOverlayProps {
  saveData: SaveData;
  activeTab: HubTab;
  onTabChange: (tab: HubTab) => void;
  onBackToTitle: () => void;
  onMuteToggle: () => void;
  onSelectCharacter: (id: CharacterId) => void;
  onAllocateStat: (charId: CharacterId, stat: keyof StatBlock) => void;
  onResetCharacterStats: (charId: CharacterId) => void;
  onDeployLevel: (levelNum: number) => void;
  onUpdateSave: (updater: (prev: SaveData) => SaveData) => void;
}

interface ChestReveal {
  chestType: ChestType;
  shards: number;
  scrap: number;
  healthVials: number;
  overclockCells: number;
  itemName: string;
  itemRarity: string;
}

export const HubOverlay: React.FC<HubOverlayProps> = ({
  saveData,
  activeTab,
  onTabChange,
  onBackToTitle,
  onMuteToggle,
  onSelectCharacter,
  onAllocateStat,
  onResetCharacterStats,
  onDeployLevel,
  onUpdateSave,
}) => {
  const [selectedLevelNum, setSelectedLevelNum] = useState<number>(
    Math.min(30, saveData.highestClearedLevel + 1)
  );
  const [classFilter, setClassFilter] = useState<'All' | CharacterClass>('All');
  const [chestReveal, setChestReveal] = useState<ChestReveal | null>(null);
  const [craftMessage, setCraftMessage] = useState<string>('');

  const activeChar = CHARACTER_MAP[saveData.selectedCharacterId];
  const heroComputed = getComputedHeroStats(saveData, activeChar.id);
  const unspentPoints = getAvailableStatPoints(saveData, activeChar.id);
  const selectedLevel = LEVELS[selectedLevelNum - 1] || LEVELS[0];

  const handleOpenChest = (chestType: ChestType) => {
    if ((saveData.chests[chestType] || 0) <= 0) return;
    soundFX.playChestOpen();
    const loot = rollChestLoot(chestType);
    const tpl = ITEM_TEMPLATE_MAP[loot.itemTemplateId];
    const newItem: InventoryItem = {
      instanceId: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      templateId: loot.itemTemplateId,
      upgradeLevel: 0,
    };

    onUpdateSave((prev) => ({
      ...prev,
      chests: {
        ...prev.chests,
        [chestType]: Math.max(0, (prev.chests[chestType] || 0) - 1),
      },
      ashShards: prev.ashShards + loot.shards,
      scrapMetal: prev.scrapMetal + loot.scrap,
      consumables: {
        healthVial: prev.consumables.healthVial + loot.healthVials,
        overclockCell: prev.consumables.overclockCell + loot.overclockCells,
      },
      inventory: [newItem, ...prev.inventory],
    }));

    setChestReveal({
      chestType,
      shards: loot.shards,
      scrap: loot.scrap,
      healthVials: loot.healthVials,
      overclockCells: loot.overclockCells,
      itemName: tpl.name,
      itemRarity: tpl.rarity,
    });
  };

  const handleEquipItem = (item: InventoryItem) => {
    const tpl = ITEM_TEMPLATE_MAP[item.templateId];
    if (!tpl) return;
    soundFX.playClick();
    onUpdateSave((prev) => ({
      ...prev,
      equipped: {
        ...prev.equipped,
        [tpl.slot]: item.instanceId,
      },
    }));
  };

  const handleSalvageItem = (item: InventoryItem) => {
    const tpl = ITEM_TEMPLATE_MAP[item.templateId];
    if (!tpl) return;
    // Prevent salvaging if equipped
    if (
      saveData.equipped.weapon === item.instanceId ||
      saveData.equipped.armor === item.instanceId ||
      saveData.equipped.relic === item.instanceId
    ) {
      return;
    }
    soundFX.playClick();
    const shardGain = 20 + item.upgradeLevel * 18 + (tpl.rarity === 'Rare' ? 35 : tpl.rarity === 'Mythic' ? 80 : 10);
    const scrapGain = 3 + item.upgradeLevel * 2;
    onUpdateSave((prev) => ({
      ...prev,
      ashShards: prev.ashShards + shardGain,
      scrapMetal: prev.scrapMetal + scrapGain,
      inventory: prev.inventory.filter((i) => i.instanceId !== item.instanceId),
    }));
  };

  const handleBuyConsumable = (kind: 'healthVial' | 'overclockCell', cost: number) => {
    if (saveData.ashShards < cost) {
      setCraftMessage('Not enough Ash Shards.');
      return;
    }
    soundFX.playClick();
    onUpdateSave((prev) => ({
      ...prev,
      ashShards: prev.ashShards - cost,
      consumables: {
        ...prev.consumables,
        [kind]: prev.consumables[kind] + 1,
      },
    }));
    setCraftMessage(kind === 'healthVial' ? 'Purchased Health Vial.' : 'Purchased Overclock Cell.');
  };

  const handleBuyShopItem = (templateId: string) => {
    const tpl = ITEM_TEMPLATE_MAP[templateId];
    if (!tpl || tpl.shopCost <= 0) return;
    if (saveData.ashShards < tpl.shopCost) {
      setCraftMessage(`Need ${tpl.shopCost} Ash Shards for ${tpl.name}.`);
      return;
    }
    soundFX.playChestOpen();
    const newItem: InventoryItem = {
      instanceId: `shop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      templateId: tpl.id,
      upgradeLevel: 0,
    };
    onUpdateSave((prev) => ({
      ...prev,
      ashShards: prev.ashShards - tpl.shopCost,
      inventory: [newItem, ...prev.inventory],
    }));
    setCraftMessage(`Acquired ${tpl.name}! Check Inventory to equip.`);
  };

  const handleCraftMythic = (templateId: string) => {
    const tpl = ITEM_TEMPLATE_MAP[templateId];
    if (!tpl || !tpl.craftCores) return;
    const scrapNeed = tpl.craftScrap || 20;
    if (saveData.glitchCores < tpl.craftCores || saveData.scrapMetal < scrapNeed) {
      setCraftMessage(`Requires ${tpl.craftCores} Glitch Cores and ${scrapNeed} Scrap Metal.`);
      return;
    }
    soundFX.playSpecial();
    const newItem: InventoryItem = {
      instanceId: `mythic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      templateId: tpl.id,
      upgradeLevel: 0,
    };
    onUpdateSave((prev) => ({
      ...prev,
      glitchCores: prev.glitchCores - (tpl.craftCores || 0),
      scrapMetal: prev.scrapMetal - scrapNeed,
      inventory: [newItem, ...prev.inventory],
    }));
    setCraftMessage(`Forged Mythic Gear: ${tpl.name}!`);
  };

  const handleUpgradeItem = (item: InventoryItem) => {
    if (item.upgradeLevel >= 5) return;
    const shardCost = 45 + item.upgradeLevel * 45;
    const scrapCost = 4 + item.upgradeLevel * 4;
    if (saveData.ashShards < shardCost || saveData.scrapMetal < scrapCost) {
      setCraftMessage(`Need ${shardCost} Shards and ${scrapCost} Scrap to forge +${item.upgradeLevel + 1}.`);
      return;
    }
    soundFX.playSpecial();
    onUpdateSave((prev) => ({
      ...prev,
      ashShards: prev.ashShards - shardCost,
      scrapMetal: prev.scrapMetal - scrapCost,
      inventory: prev.inventory.map((i) =>
        i.instanceId === item.instanceId ? { ...i, upgradeLevel: i.upgradeLevel + 1 } : i
      ),
    }));
    const tpl = ITEM_TEMPLATE_MAP[item.templateId];
    setCraftMessage(`Forged ${tpl?.name} to +${item.upgradeLevel + 1}!`);
  };

  const tabs: { id: HubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'campaign', label: 'Campaign (30)', icon: <Swords className="w-4 h-4" /> },
    { id: 'roster', label: 'Heroes (9)', icon: <Shield className="w-4 h-4" /> },
    { id: 'inventory', label: 'Chests & Gear', icon: <Package className="w-4 h-4" /> },
    { id: 'craftsman', label: 'Craftsman', icon: <Hammer className="w-4 h-4" /> },
    { id: 'story', label: 'Story', icon: <ScrollText className="w-4 h-4" /> },
  ];

  const totalChests =
    (saveData.chests['Scrap Cache'] || 0) +
    (saveData.chests['Neon Vault'] || 0) +
    (saveData.chests['Glitch Core'] || 0);

  return (
    <div className="w-full h-full bg-[#08080c] text-[#f2f2f7] flex flex-col overflow-hidden">
      {/* Compact Game Camp Header */}
      <header className="shrink-0 bg-[#0e0e15] border-b-2 border-[#272736] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onBackToTitle();
            }}
            className="min-h-[38px] px-2.5 bg-[#15151f] border border-[#2f2f40] hover:border-[#c084fc] flex items-center gap-1 text-xs text-[#c7c7d9] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Title</span>
          </button>
          <div className="flex items-center gap-2.5">
            <PixelSpritePreview kind="hero" heroId={activeChar.id} size={34} />
            <div>
              <div className="font-pixel text-xs sm:text-sm text-[#f2f2f7] leading-tight">
                {activeChar.name}
              </div>
              <div className="font-mono-num text-[11px] text-[#a8a8bd]">
                {activeChar.charClass} · STR {heroComputed.str} · HP {heroComputed.hp} · SPD {heroComputed.spd}
              </div>
            </div>
          </div>
        </div>

        {/* Economy / Unspent Stat Points Summary */}
        <div className="flex items-center gap-4 font-mono-num text-xs">
          <div className="text-[#e9d5ff]">
            <span className="text-[#8d8da3]">Shards </span>
            {saveData.ashShards}
          </div>
          <div className="text-[#d4d4e0]">
            <span className="text-[#8d8da3]">Scrap </span>
            {saveData.scrapMetal}
          </div>
          <div className="text-[#c084fc]">
            <span className="text-[#8d8da3]">Cores </span>
            {saveData.glitchCores}
          </div>
          {unspentPoints > 0 && (
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onTabChange('roster');
              }}
              className="px-2.5 py-1 bg-[#2b1b42] border border-[#c084fc] text-[#f3e8ff] cursor-pointer whitespace-nowrap"
            >
              +{unspentPoints} Stat Pts
            </button>
          )}
          <button
            type="button"
            onClick={onMuteToggle}
            aria-label={saveData.soundMuted ? 'Unmute audio' : 'Mute audio'}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center bg-[#15151f] border border-[#2f2f40] hover:border-[#c084fc] cursor-pointer"
          >
            {saveData.soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Segmented Navigation Strip */}
      <nav className="shrink-0 bg-[#0b0b10] border-b border-[#222230] px-4 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          const badgeCount =
            t.id === 'inventory' && totalChests > 0
              ? ` (${totalChests})`
              : t.id === 'roster' && unspentPoints > 0
              ? ` (+${unspentPoints})`
              : '';
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                soundFX.playClick();
                onTabChange(t.id);
              }}
              className={`min-h-[40px] px-3.5 py-1.5 flex items-center gap-2 text-xs font-pixel whitespace-nowrap shrink-0 border-2 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#221733] border-[#c084fc] text-[#f3e8ff]'
                  : 'bg-[#12121a] border-[#252534] text-[#9b9bb0] hover:text-[#f2f2f7] hover:border-[#424259]'
              }`}
            >
              {t.icon}
              <span>
                {t.label}
                {badgeCount}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Main Content Workspace */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* === TAB 1: CAMPAIGN (30 LEVELS) === */}
        {activeTab === 'campaign' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: 6 Chapters x 5 Levels */}
            <div className="lg:col-span-7 space-y-5">
              {[1, 2, 3, 4, 5, 6].map((chap) => {
                const chapLevels = LEVELS.filter((l) => l.chapter === chap);
                return (
                  <section key={chap} className="bg-[#111118] border-2 border-[#252534] p-4">
                    <div className="flex items-baseline justify-between mb-3">
                      <h2 className="font-pixel text-xs sm:text-sm text-[#e9d5ff]">
                        {chapLevels[0].chapterTitle}
                      </h2>
                      <span className="font-mono-num text-xs text-[#8d8da3]">
                        {chapLevels[0].zone}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {chapLevels.map((lvl) => {
                        const unlocked = lvl.level <= saveData.highestClearedLevel + 1;
                        const cleared = saveData.clearedLevels.includes(lvl.level);
                        const selected = selectedLevelNum === lvl.level;
                        return (
                          <button
                            key={lvl.level}
                            type="button"
                            disabled={!unlocked}
                            onClick={() => {
                              soundFX.playClick();
                              setSelectedLevelNum(lvl.level);
                            }}
                            className={`min-h-[64px] p-2 flex flex-col items-center justify-center border-2 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                              selected
                                ? 'bg-[#281b3d] border-[#c084fc] text-[#f3e8ff]'
                                : cleared
                                ? 'bg-[#171722] border-[#4e396e] text-[#d4d4e0] hover:border-[#c084fc]'
                                : unlocked
                                ? 'bg-[#161620] border-[#38384c] text-[#f2f2f7] hover:border-[#c084fc]'
                                : 'bg-[#0d0d12] border-[#1f1f2b] text-[#6d6d80]'
                            }`}
                          >
                            <span className="font-pixel text-xs">
                              {String(lvl.level).padStart(2, '0')}
                            </span>
                            <span className="font-mono-num text-[10px] mt-1 text-[#c084fc]">
                              {lvl.isBoss ? '3D BOSS' : cleared ? 'Cleared' : unlocked ? 'Open' : 'Locked'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Right: Selected Level Briefing & Deploy */}
            <aside className="lg:col-span-5 lg:sticky lg:top-0 bg-[#12121a] border-2 border-[#343448] p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono-num text-xs text-[#c084fc]">
                    Sector {String(selectedLevel.level).padStart(2, '0')} · {selectedLevel.zone}
                  </div>
                  <h3 className="font-pixel text-base sm:text-lg text-[#f4f4f6] mt-1">
                    {selectedLevel.name}
                  </h3>
                </div>
                {selectedLevel.isBoss && selectedLevel.bossShape && (
                  <div className="bg-[#0a0a0f] border border-[#c084fc] p-1">
                    <PixelSpritePreview kind="boss" bossShape={selectedLevel.bossShape} size={64} />
                  </div>
                )}
              </div>

              <p className="text-sm text-[#c7c7d9] leading-relaxed">
                {selectedLevel.storyText}
              </p>

              {selectedLevel.isBoss && (
                <div className="bg-[#1b1229] border border-[#7e22ce] p-3">
                  <div className="font-pixel text-xs text-[#e9d5ff]">
                    Boss Threat: {selectedLevel.bossName}
                  </div>
                  <div className="font-mono-num text-xs text-[#c4b5fd] mt-1">
                    {selectedLevel.bossTitle} · {selectedLevel.bossHp} HP
                  </div>
                </div>
              )}

              <div className="border-t border-[#262636] pt-3 space-y-2 text-xs font-mono-num">
                <div className="flex justify-between">
                  <span className="text-[#8e8ea3]">Win Stat Reward</span>
                  <span className="text-[#e9d5ff]">+4 Stat Points</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e8ea3]">Loot Rewards</span>
                  <span className="text-[#d4d4e0]">
                    {selectedLevel.rewardShards} Shards · {selectedLevel.rewardScrap} Scrap
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e8ea3]">Chest Drop</span>
                  <span className="text-[#c084fc]">
                    {selectedLevel.rewardChest}
                    {selectedLevel.isBoss ? ' + 1 Glitch Core' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e8ea3]">Combat Waves</span>
                  <span className="text-[#d4d4e0]">{selectedLevel.waves} Waves</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onDeployLevel(selectedLevel.level);
                }}
                className="w-full min-h-[48px] bg-[#c084fc] hover:bg-[#d8b4fe] text-[#070709] font-pixel text-sm flex items-center justify-center gap-2 border-2 border-[#f3e8ff] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Deploy to Sector {String(selectedLevel.level).padStart(2, '0')}</span>
              </button>
            </aside>
          </div>
        )}

        {/* === TAB 2: HEROES (ALL 9 CHARACTERS & +4 STAT ALLOCATION) === */}
        {activeTab === 'roster' && (
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111118] border-2 border-[#262636] p-4">
              <div>
                <h2 className="font-pixel text-sm sm:text-base text-[#f2f2f7]">
                  Wasteland Roster (All 9 Warriors)
                </h2>
                <p className="text-xs text-[#a1a1b5] mt-1">
                  Every level victory grants +4 Stat Points usable on every hero. Switch classes anytime.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {(['All', 'Magician', 'Swordsman', 'Fighter'] as const).map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setClassFilter(cls);
                    }}
                    className={`min-h-[38px] px-3 py-1 text-xs font-pixel border cursor-pointer ${
                      classFilter === cls
                        ? 'bg-[#261a3a] border-[#c084fc] text-[#f3e8ff]'
                        : 'bg-[#161620] border-[#2e2e3d] text-[#a1a1b5] hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {CHARACTERS.filter((c) => classFilter === 'All' || c.charClass === classFilter).map(
                (char) => {
                  const isSelected = saveData.selectedCharacterId === char.id;
                  const alloc = saveData.allocatedStats[char.id] || { str: 0, hp: 0, spd: 0 };
                  const ptsLeft = getAvailableStatPoints(saveData, char.id);
                  const totalSpent = alloc.str + alloc.hp + alloc.spd;
                  const computed = getComputedHeroStats(saveData, char.id);

                  return (
                    <div
                      key={char.id}
                      className={`p-4 flex flex-col justify-between gap-3 border-2 ${
                        isSelected
                          ? 'bg-[#171322] border-[#c084fc]'
                          : 'bg-[#111118] border-[#282838]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#09090d] border border-[#2f2f40] p-1">
                              <PixelSpritePreview kind="hero" heroId={char.id} size={56} />
                            </div>
                            <div>
                              <h3 className="font-pixel text-sm text-[#f4f4f6]">{char.name}</h3>
                              <div className="font-mono-num text-xs text-[#c084fc]">
                                {char.charClass} · {char.epithet}
                              </div>
                              <div className="font-mono-num text-[11px] text-[#9b9bb0] mt-0.5">
                                {char.weaponName}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playClick();
                              onSelectCharacter(char.id);
                            }}
                            className={`min-h-[36px] px-3 text-xs font-pixel border cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-[#c084fc] border-[#f3e8ff] text-[#070709]'
                                : 'bg-[#191924] border-[#3a3a4f] text-[#e4e4ee] hover:border-[#c084fc]'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Select'}
                          </button>
                        </div>

                        <p className="text-xs text-[#b4b4c6] mt-3 leading-relaxed">
                          <strong className="text-[#e9d5ff]">{char.specialName}:</strong>{' '}
                          {char.specialDesc}
                        </p>
                      </div>

                      {/* Strength / Health / Speed Stat Allocator */}
                      <div className="border-t border-[#242433] pt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono-num">
                          <span className="text-[#c084fc]">
                            Available Points: {ptsLeft}
                          </span>
                          {totalSpent > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                soundFX.playClick();
                                onResetCharacterStats(char.id);
                              }}
                              className="flex items-center gap-1 text-[#9e9eb3] hover:text-[#e9d5ff] cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>

                        {(
                          [
                            { key: 'str', label: 'Strength', base: char.baseStats.str, total: computed.str },
                            { key: 'hp', label: 'Health', base: char.baseStats.hp, total: computed.hp },
                            { key: 'spd', label: 'Speed', base: char.baseStats.spd, total: computed.spd },
                          ] as const
                        ).map((row) => (
                          <div key={row.key} className="flex items-center justify-between gap-2 text-xs font-mono-num">
                            <span className="w-20 text-[#c7c7d9]">{row.label}</span>
                            <div className="flex-1 h-2.5 bg-[#0b0b10] border border-[#282838]">
                              <div
                                className="h-full bg-[#c084fc]"
                                style={{ width: `${Math.min(100, (row.total / 35) * 100)}%` }}
                              />
                            </div>
                            <span className="w-14 text-right text-[#f2f2f7]">
                              {row.total}
                              {alloc[row.key] > 0 ? ` (+${alloc[row.key]})` : ''}
                            </span>
                            <button
                              type="button"
                              disabled={ptsLeft <= 0}
                              onClick={() => {
                                soundFX.playClick();
                                onAllocateStat(char.id, row.key);
                              }}
                              className="min-w-[34px] min-h-[30px] bg-[#221733] hover:bg-[#c084fc] hover:text-[#070709] disabled:opacity-30 border border-[#581c87] text-[#e9d5ff] font-pixel text-xs cursor-pointer disabled:cursor-not-allowed"
                            >
                              +1
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* === TAB 3: CHESTS & INVENTORY === */}
        {activeTab === 'inventory' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Chests Shelf */}
            <section className="bg-[#111118] border-2 border-[#282838] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="font-pixel text-sm sm:text-base text-[#f2f2f7]">
                  Wasteland Chests
                </h2>
                <span className="font-mono-num text-xs text-[#a1a1b5]">
                  Earned by clearing sectors & 3D Bosses
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['Scrap Cache', 'Neon Vault', 'Glitch Core'] as ChestType[]).map((ct) => {
                  const count = saveData.chests[ct] || 0;
                  return (
                    <div
                      key={ct}
                      className="bg-[#0c0c12] border-2 border-[#2a2a3a] p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <PixelSpritePreview kind="chest" chestType={ct} size={52} />
                        <div>
                          <div className="font-pixel text-xs text-[#f2f2f7]">{ct}</div>
                          <div className="font-mono-num text-xs text-[#c084fc] mt-1">
                            Owned: {count}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={count <= 0}
                        onClick={() => handleOpenChest(ct)}
                        className="min-h-[40px] px-3.5 bg-[#c084fc] hover:bg-[#d8b4fe] disabled:bg-[#1a1a24] disabled:text-[#666678] text-[#070709] font-pixel text-xs cursor-pointer disabled:cursor-not-allowed"
                      >
                        Open
                      </button>
                    </div>
                  );
                })}
              </div>

              {chestReveal && (
                <div className="mt-4 bg-[#1c132b] border-2 border-[#c084fc] p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <PixelSpritePreview kind="chest" chestType={chestReveal.chestType} opened size={48} />
                    <div>
                      <div className="font-pixel text-xs text-[#e9d5ff]">
                        Opened {chestReveal.chestType}: Found {chestReveal.itemName} ({chestReveal.itemRarity})
                      </div>
                      <div className="font-mono-num text-xs text-[#d4d4e0] mt-1">
                        +{chestReveal.shards} Shards · +{chestReveal.scrap} Scrap
                        {chestReveal.healthVials > 0 ? ` · +${chestReveal.healthVials} Health Vial` : ''}
                        {chestReveal.overclockCells > 0 ? ` · +${chestReveal.overclockCells} Overclock Cell` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChestReveal(null)}
                    className="px-3 py-1.5 bg-[#0d0d13] border border-[#c084fc] text-xs font-pixel text-[#e9d5ff] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </section>

            {/* Equipped Loadout + Consumables */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-[#111118] border-2 border-[#282838] p-4">
                <h3 className="font-pixel text-sm text-[#f2f2f7] mb-3">Active Equipment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['weapon', 'armor', 'relic'] as const).map((slot) => {
                    const instId = saveData.equipped[slot];
                    const item = saveData.inventory.find((i) => i.instanceId === instId);
                    const tpl = item ? ITEM_TEMPLATE_MAP[item.templateId] : null;
                    const bonuses = item ? getItemEffectiveBonuses(item) : null;
                    return (
                      <div key={slot} className="bg-[#0c0c12] border border-[#303042] p-3">
                        <div className="font-mono-num text-[11px] text-[#8e8ea3] uppercase">
                          {slot}
                        </div>
                        {tpl && item && bonuses ? (
                          <>
                            <div className="font-pixel text-xs text-[#e9d5ff] mt-1">
                              {tpl.name} {item.upgradeLevel > 0 ? `+${item.upgradeLevel}` : ''}
                            </div>
                            <div className="font-mono-num text-[11px] text-[#c7c7d9] mt-1.5">
                              +{bonuses.str} STR · +{bonuses.hp} HP · +{bonuses.spd} SPD
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-[#6e6e82] mt-2">Empty Slot</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#111118] border-2 border-[#282838] p-4">
                <h3 className="font-pixel text-sm text-[#f2f2f7] mb-3">Battle Supplies</h3>
                <div className="space-y-2.5 font-mono-num text-xs">
                  <div className="flex items-center justify-between bg-[#0c0c12] border border-[#2a2a3a] px-3 py-2">
                    <span>Health Vial (Q / Touch)</span>
                    <span className="text-[#c084fc]">x{saveData.consumables.healthVial}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0c0c12] border border-[#2a2a3a] px-3 py-2">
                    <span>Overclock Cell (R)</span>
                    <span className="text-[#c084fc]">x{saveData.consumables.overclockCell}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Full Bag Inventory */}
            <section className="bg-[#111118] border-2 border-[#282838] p-4">
              <h3 className="font-pixel text-sm text-[#f2f2f7] mb-3">
                Gear Inventory ({saveData.inventory.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {saveData.inventory.map((item) => {
                  const tpl = ITEM_TEMPLATE_MAP[item.templateId];
                  if (!tpl) return null;
                  const rarityStyle = RARITY_COLORS[tpl.rarity];
                  const bonuses = getItemEffectiveBonuses(item);
                  const isEquipped =
                    saveData.equipped.weapon === item.instanceId ||
                    saveData.equipped.armor === item.instanceId ||
                    saveData.equipped.relic === item.instanceId;

                  return (
                    <div
                      key={item.instanceId}
                      style={{
                        borderColor: isEquipped ? '#c084fc' : rarityStyle.border,
                        backgroundColor: rarityStyle.bg,
                      }}
                      className="border-2 p-3 flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-pixel text-xs" style={{ color: rarityStyle.text }}>
                            {tpl.name}
                            {item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : ''}
                          </span>
                          <span className="font-mono-num text-[11px] text-[#9b9bb0]">
                            {tpl.rarity} · {tpl.slot}
                          </span>
                        </div>
                        <div className="font-mono-num text-xs text-[#e4e4ee] mt-1">
                          +{bonuses.str} STR · +{bonuses.hp} HP · +{bonuses.spd} SPD
                          {bonuses.crit > 0 ? ` · +${bonuses.crit}% Crit` : ''}
                          {bonuses.lifesteal > 0 ? ` · ${bonuses.lifesteal}% Leech` : ''}
                        </div>
                        <p className="text-xs text-[#a1a1b5] mt-1">{tpl.desc}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isEquipped}
                          onClick={() => handleEquipItem(item)}
                          className="flex-1 min-h-[34px] bg-[#221733] hover:bg-[#c084fc] hover:text-[#070709] disabled:opacity-50 border border-[#7e22ce] text-xs font-pixel text-[#f3e8ff] cursor-pointer disabled:cursor-default"
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                        {!isEquipped && (
                          <button
                            type="button"
                            onClick={() => handleSalvageItem(item)}
                            className="min-h-[34px] px-3 bg-[#15151f] hover:border-[#fb7185] border border-[#323244] text-xs font-mono-num text-[#c7c7d9] cursor-pointer"
                          >
                            Salvage
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* === TAB 4: CRAFTSMAN SHOP & FORGE === */}
        {activeTab === 'craftsman' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-[#13111c] border-2 border-[#581c87] p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-pixel text-sm sm:text-base text-[#e9d5ff]">
                  Vorn the Craftsman — Wasteland Anvil
                </h2>
                <p className="text-xs text-[#c7c7d9] mt-1">
                  "Bring me Ash Shards, Scrap Metal, and Boss Glitch Cores. I'll temper your steel to survive the Rift."
                </p>
              </div>
              {craftMessage && (
                <div className="font-mono-num text-xs text-[#f3e8ff] bg-[#241638] border border-[#c084fc] px-3 py-1.5">
                  {craftMessage}
                </div>
              )}
            </div>

            {/* Upgrade Owned Gear */}
            <section className="bg-[#111118] border-2 border-[#282838] p-4">
              <h3 className="font-pixel text-sm text-[#f2f2f7] mb-3">
                Forge Upgrades (Max +5)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {saveData.inventory.map((item) => {
                  const tpl = ITEM_TEMPLATE_MAP[item.templateId];
                  if (!tpl) return null;
                  const shardCost = 45 + item.upgradeLevel * 45;
                  const scrapCost = 4 + item.upgradeLevel * 4;
                  const maxed = item.upgradeLevel >= 5;
                  return (
                    <div
                      key={item.instanceId}
                      className="bg-[#0c0c12] border border-[#303042] p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-pixel text-xs text-[#f2f2f7]">
                          {tpl.name} {item.upgradeLevel > 0 ? `+${item.upgradeLevel}` : ''}
                        </div>
                        <div className="font-mono-num text-[11px] text-[#9b9bb0] mt-1">
                          {maxed ? 'Max Temper Reached' : `Cost: ${shardCost} Shards · ${scrapCost} Scrap`}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={maxed}
                        onClick={() => handleUpgradeItem(item)}
                        className="min-h-[36px] px-3 bg-[#221733] hover:bg-[#c084fc] hover:text-[#070709] disabled:opacity-35 border border-[#c084fc] font-pixel text-xs text-[#f3e8ff] cursor-pointer disabled:cursor-not-allowed shrink-0"
                      >
                        {maxed ? 'MAX' : `Forge +${item.upgradeLevel + 1}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Supplies & Shop Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-[#111118] border-2 border-[#282838] p-4 space-y-3">
                <h3 className="font-pixel text-sm text-[#f2f2f7]">Supplies & Market Gear</h3>
                <div className="flex items-center justify-between bg-[#0c0c12] border border-[#2f2f42] p-3">
                  <div>
                    <div className="font-pixel text-xs text-[#e9d5ff]">Health Vial</div>
                    <div className="text-xs text-[#a1a1b5]">Restores 45% HP in battle</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuyConsumable('healthVial', 35)}
                    className="min-h-[36px] px-3 bg-[#1e1e2b] hover:border-[#c084fc] border border-[#3e3e54] font-mono-num text-xs text-[#f2f2f7] cursor-pointer"
                  >
                    Buy 35 Shards
                  </button>
                </div>
                <div className="flex items-center justify-between bg-[#0c0c12] border border-[#2f2f42] p-3">
                  <div>
                    <div className="font-pixel text-xs text-[#e9d5ff]">Overclock Cell</div>
                    <div className="text-xs text-[#a1a1b5]">+35% Damage & Speed for 7s</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuyConsumable('overclockCell', 55)}
                    className="min-h-[36px] px-3 bg-[#1e1e2b] hover:border-[#c084fc] border border-[#3e3e54] font-mono-num text-xs text-[#f2f2f7] cursor-pointer"
                  >
                    Buy 55 Shards
                  </button>
                </div>

                {ITEM_TEMPLATES.filter((t) => t.shopCost > 0).map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between gap-3 bg-[#0c0c12] border border-[#2a2a3a] p-3"
                  >
                    <div>
                      <div className="font-pixel text-xs text-[#f2f2f7]">
                        {tpl.name} · <span className="text-[#c084fc]">{tpl.rarity}</span>
                      </div>
                      <div className="font-mono-num text-[11px] text-[#a1a1b5]">
                        +{tpl.bonuses.str} STR · +{tpl.bonuses.hp} HP · +{tpl.bonuses.spd} SPD
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBuyShopItem(tpl.id)}
                      className="min-h-[36px] px-3 bg-[#1e1e2b] hover:border-[#c084fc] border border-[#3e3e54] font-mono-num text-xs text-[#e9d5ff] cursor-pointer shrink-0"
                    >
                      {tpl.shopCost} Shards
                    </button>
                  </div>
                ))}
              </section>

              {/* Boss Glitch Core Mythic Forge */}
              <section className="bg-[#111118] border-2 border-[#7e22ce] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#c084fc]" />
                  <h3 className="font-pixel text-sm text-[#e9d5ff]">
                    Mythic Glitch Forge
                  </h3>
                </div>
                <p className="text-xs text-[#b4b4c6]">
                  Defeat 3D Glitch Bosses every 5 sectors to harvest Glitch Cores for Mythic armaments.
                </p>

                {ITEM_TEMPLATES.filter((t) => t.craftCores).map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-[#191224] border border-[#6b21a8] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-pixel text-xs text-[#f3e8ff]">{tpl.name}</div>
                      <div className="font-mono-num text-[11px] text-[#d8b4fe] mt-1">
                        +{tpl.bonuses.str} STR · +{tpl.bonuses.hp} HP · +{tpl.bonuses.spd} SPD · {tpl.critBonus || 0}% Crit · {tpl.lifesteal || 0}% Leech
                      </div>
                      <div className="text-xs text-[#a1a1b5] mt-1">{tpl.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCraftMythic(tpl.id)}
                      className="min-h-[40px] px-3.5 bg-[#c084fc] hover:bg-[#d8b4fe] text-[#070709] font-pixel text-xs cursor-pointer shrink-0"
                    >
                      Craft ({tpl.craftCores} Cores · {tpl.craftScrap} Scrap)
                    </button>
                  </div>
                ))}
              </section>
            </div>
          </div>
        )}

        {/* === TAB 5: WASTELAND STORY & 3D BOSS DOSSIERS === */}
        {activeTab === 'story' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <section className="bg-[#111118] border-2 border-[#2a2a3a] p-5">
              <h2 className="font-pixel text-base text-[#e9d5ff] mb-2">
                Chronicle of the Collapse
              </h2>
              <p className="text-sm text-[#c7c7d9] leading-relaxed">
                When the Core Reactor fractured above Sector 30, reality tore into grey ash and violet static. Nine survivors adapted—weavers of the void, blades of the obsidian gate, and iron-fisted brawlers—pushing inward sector by sector to dismantle the six 3D Glitch Architects sustaining the wasteland.
              </p>
            </section>

            {/* Boss Dossiers */}
            <section className="space-y-3">
              <h3 className="font-pixel text-sm text-[#f2f2f7]">
                3D Glitch Boss Dossiers (Every 5 Sectors)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LEVELS.filter((l) => l.isBoss).map((bossLvl) => {
                  const encountered = saveData.highestClearedLevel + 1 >= bossLvl.level;
                  const defeated = saveData.clearedLevels.includes(bossLvl.level);
                  return (
                    <div
                      key={bossLvl.level}
                      className="bg-[#111118] border-2 border-[#34264a] p-4 flex items-center gap-4"
                    >
                      <div className="bg-[#08080c] border border-[#581c87] p-1 shrink-0">
                        {bossLvl.bossShape && (
                          <PixelSpritePreview
                            kind="boss"
                            bossShape={bossLvl.bossShape}
                            size={72}
                            animate={encountered}
                          />
                        )}
                      </div>
                      <div>
                        <div className="font-mono-num text-[11px] text-[#c084fc]">
                          Sector {bossLvl.level} · {defeated ? 'Purged' : encountered ? 'Active Threat' : 'Unreached'}
                        </div>
                        <div className="font-pixel text-sm text-[#f4f4f6] mt-0.5">
                          {bossLvl.bossName}
                        </div>
                        <div className="text-xs text-[#a1a1b5] mt-1">{bossLvl.bossTitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Unlocked Field Logs */}
            <section className="space-y-2.5">
              <h3 className="font-pixel text-sm text-[#f2f2f7]">
                Unlocked Field Dispatches ({Math.min(30, saveData.highestClearedLevel + 1)}/30)
              </h3>
              {LEVELS.filter((l) => l.level <= saveData.highestClearedLevel + 1).map((lvl) => (
                <div key={lvl.level} className="bg-[#0e0e14] border border-[#242433] p-3.5">
                  <div className="font-mono-num text-xs text-[#c084fc]">
                    Sector {String(lvl.level).padStart(2, '0')} · {lvl.name} ({lvl.zone})
                  </div>
                  <p className="text-xs sm:text-sm text-[#d4d4e0] mt-1 leading-relaxed">
                    {lvl.storyText}
                  </p>
                </div>
              ))}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
