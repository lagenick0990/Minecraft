/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BlockType, BLOCK_DEFINITIONS, InventoryItem, GameMode, PlayerStats, GameSettings, WeatherType } from './types';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Inventory } from './components/Inventory';
import { Compass, Hammer, Volume2, Sparkles, AlertTriangle, Play, Settings, RefreshCw, Layers } from 'lucide-react';

interface NotificationMessage {
  id: string;
  text: string;
  color?: string;
}

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [seed, setSeed] = useState<number>(101);
  const [seedInput, setSeedInput] = useState('101');

  // Core Game State
  const [gameMode, setGameMode] = useState<GameMode>('SURVIVAL');
  const [stats, setStats] = useState<PlayerStats>({
    health: 20,
    maxHealth: 20,
    hunger: 20,
    maxHunger: 20,
    score: 0,
  });

  const [activeHotbarIndex, setActiveHotbarIndex] = useState(0);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const [totalBlocksInWorld, setTotalBlocksInWorld] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState(6000); // 0 to 24000
  const [weather, setWeather] = useState<WeatherType>('CLEAR');

  // Automatic weather cycle every 90 seconds
  useEffect(() => {
    if (!gameStarted) return;
    const interval = setInterval(() => {
      const rand = Math.random();
      let nextWeather: WeatherType = 'CLEAR';
      if (rand < 0.5) {
        nextWeather = 'CLEAR';
      } else if (rand < 0.75) {
        nextWeather = 'RAINY';
      } else {
        nextWeather = 'FOGGY';
      }

      setWeather((current) => {
        if (current !== nextWeather) {
          addNotification(`The sky shifts... Weather is now ${nextWeather}!`, 
            nextWeather === 'CLEAR' ? 'text-sky-300' : nextWeather === 'RAINY' ? 'text-slate-400' : 'text-neutral-300'
          );
          return nextWeather;
        }
        return current;
      });
    }, 90000);
    return () => clearInterval(interval);
  }, [gameStarted]);

  const handleToggleWeather = () => {
    const list: WeatherType[] = ['CLEAR', 'RAINY', 'FOGGY'];
    const currentIndex = list.indexOf(weather);
    const nextWeather = list[(currentIndex + 1) % list.length];
    setWeather(nextWeather);
    addNotification(`Manual Weather Toggle: ${nextWeather}!`, 
      nextWeather === 'CLEAR' ? 'text-sky-300' : nextWeather === 'RAINY' ? 'text-indigo-400' : 'text-neutral-300'
    );
  };

  // Standard pre-populated starting items for a fun sandbox
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { type: BlockType.GRASS, count: 64 },
    { type: BlockType.DIRT, count: 64 },
    { type: BlockType.STONE, count: 64 },
    { type: BlockType.WOOD, count: 16 },
    { type: BlockType.LEAVES, count: 32 },
    { type: BlockType.SAND, count: 16 },
    { type: BlockType.COBBLESTONE, count: 32 },
    { type: BlockType.PLANKS, count: 64 },
    { type: BlockType.BRICK, count: 32 },
    { type: BlockType.GLASS, count: 16 },
    { type: BlockType.COAL_ORE, count: 8 },
    { type: BlockType.IRON_ORE, count: 4 },
    { type: BlockType.GOLD_ORE, count: 2 },
    { type: BlockType.DIAMOND_ORE, count: 1 },
    { type: BlockType.APPLE, count: 10 },
    { type: BlockType.COOKED_PORKCHOP, count: 5 },
  ]);

  // Initial Hotbar slots configuration
  const [hotbar, setHotbar] = useState<(BlockType | null)[]>([
    BlockType.GRASS,
    BlockType.DIRT,
    BlockType.STONE,
    BlockType.WOOD,
    BlockType.LEAVES,
    BlockType.PLANKS,
    BlockType.APPLE,
    BlockType.COOKED_PORKCHOP,
    BlockType.COBBLESTONE,
  ]);

  // Game Settings
  const [settings, setSettings] = useState<GameSettings>({
    renderDistance: 3, // radius in chunks
    soundEnabled: true,
    fov: 75,
    mouseSensitivity: 1.5,
    useTouchControls: false,
  });

  // Notifications Log
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  // Virtual controllers for action button triggers
  const [virtualKeys, setVirtualKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });

  const triggerVirtualMineRef = useRef<(() => void) | null>(null);
  const triggerVirtualPlaceRef = useRef<(() => void) | null>(null);

  // Helper to add popups/logs
  const addNotification = (text: string, color?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev.slice(-3), { id, text, color }]); // keep last 4 items
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 2800);
  };

  // Listen to keyboard event E to toggle inventory overlay
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (!gameStarted) return;
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsInventoryOpen((prev) => {
          if (!prev) {
            // Releasing mouse lock on opening inventory
            document.exitPointerLock?.();
          }
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [gameStarted]);

  // Handle mined block collection
  const handleBlockMined = (blockType: BlockType) => {
    const blockDef = BLOCK_DEFINITIONS[blockType];
    addNotification(`Mined ${blockDef?.name || 'Block'}!`, 'text-yellow-400');

    // Add block score points
    setStats((prev) => ({ ...prev, score: prev.score + 10 }));

    if (gameMode === 'SURVIVAL') {
      setInventory((prevInv) => {
        let updatedInv = prevInv.map((i) => (i.type === blockType ? { ...i, count: i.count + 1 } : i));
        if (!prevInv.some((i) => i.type === blockType)) {
          updatedInv = [...prevInv, { type: blockType, count: 1 }];
        }

        // 20% chance to drop an Apple when leaves are broken
        if (blockType === BlockType.LEAVES || blockType === BlockType.REDWOOD_LEAVES) {
          if (Math.random() < 0.20) {
            setTimeout(() => {
              addNotification('✨ An Apple fell from the leaves! 🍎', 'text-green-300 font-semibold');
            }, 300);
            const appleItem = updatedInv.find((i) => i.type === BlockType.APPLE);
            if (appleItem) {
              updatedInv = updatedInv.map((i) => (i.type === BlockType.APPLE ? { ...i, count: i.count + 1 } : i));
            } else {
              updatedInv = [...updatedInv, { type: BlockType.APPLE, count: 1 }];
            }
          }
        }

        return updatedInv;
      });
    }
  };

  // Handle block placement stock usage
  const handleBlockPlaced = (blockType: BlockType) => {
    if (gameMode === 'SURVIVAL') {
      setInventory((prevInv) => {
        return prevInv.map((i) => {
          if (i.type === blockType) {
            return { ...i, count: Math.max(0, i.count - 1) };
          }
          return i;
        });
      });
    }
  };

  // Helper count getter
  const getInventoryCount = (blockType: BlockType): number => {
    const item = inventory.find((i) => i.type === blockType);
    return item ? item.count : 0;
  };

  // Launch world trigger
  const handleStartGame = () => {
    const parsedSeed = parseInt(seedInput) || Math.floor(Math.random() * 9999) + 1;
    setSeed(parsedSeed);
    setGameStarted(true);
    addNotification('Entering procedural world...', 'text-green-400');
  };

  const handleRandomizeSeed = () => {
    const r = Math.floor(Math.random() * 999) + 1;
    setSeedInput(r.toString());
  };

  const handleResetWorld = () => {
    const confirmReset = window.confirm('Generate a brand new procedural world? Current edits will be reset!');
    if (confirmReset) {
      const r = Math.floor(Math.random() * 999) + 1;
      setSeed(r);
      setSeedInput(r.toString());
      setStats({
        health: 20,
        maxHealth: 20,
        hunger: 20,
        maxHunger: 20,
        score: 0,
      });
      addNotification('World regenerated!', 'text-sky-400');
    }
  };

  // Check if player died
  const isDead = stats.health <= 0;

  const handleRespawn = () => {
    setStats({
      health: 20,
      maxHealth: 20,
      hunger: 20,
      maxHunger: 20,
      score: Math.max(0, stats.score - 100), // penalty
    });
    addNotification('Respawned back at spawn coordinate Y surface!', 'text-emerald-400');
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-neutral-900 text-white select-none">
      
      {/* 1. ONBOARDING / START SCREEN */}
      {!gameStarted && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-radial from-neutral-800 to-neutral-950 p-4">
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg rounded-xl border-4 border-neutral-700 bg-neutral-800/90 p-8 shadow-2xl backdrop-blur-sm text-center"
          >
            {/* Minecraft Style Logo */}
            <div className="mb-6 flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-2">
                <Hammer className="h-9 w-9 text-yellow-500 animate-bounce" />
                <h1 className="font-mono text-4xl font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                  MINECRAFT
                </h1>
              </div>
              <span className="rounded bg-emerald-600 px-3 py-1 font-mono text-xs font-bold text-white tracking-widest uppercase">
                3D VOXEL CLONE
              </span>
              <div className="font-mono text-xs text-amber-400 font-semibold mt-2">
                Developed by <span className="text-yellow-300 font-extrabold underline decoration-amber-500 underline-offset-4">Mr.prime</span>
              </div>
            </div>

            <p className="mb-6 font-mono text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
              Welcome! Experience a procedurally generated infinite-like voxel environment featuring hills, water shores, foliage, and ore veins. Mine materials, construct buildings, and customize your hotbar inventory.
            </p>

            {/* Inputs & Parameters */}
            <div className="mb-6 space-y-4 rounded-lg bg-black/45 p-5 border border-neutral-700 text-left">
              <h3 className="font-mono text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2">
                Configure World Settings:
              </h3>

              {/* Seed input */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] text-neutral-400 uppercase font-semibold">
                  Terrain Generator Seed
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 rounded border-2 border-neutral-650 bg-neutral-800 px-3 py-1.5 font-mono text-sm text-white focus:border-yellow-500 focus:outline-hidden"
                    placeholder="Enter numbers..."
                  />
                  <button
                    onClick={handleRandomizeSeed}
                    className="flex items-center gap-1.5 rounded bg-neutral-700 px-3 py-1.5 font-mono text-xs hover:bg-neutral-650 active:translate-y-px transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-neutral-300" />
                    <span>Random</span>
                  </button>
                </div>
              </div>

              {/* Game Mode */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] text-neutral-400 uppercase font-semibold">
                  Game Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGameMode('SURVIVAL')}
                    className={`rounded border-2 p-2 text-center font-mono text-xs font-bold transition-all
                      ${gameMode === 'SURVIVAL' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400 shadow-md' : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'}
                    `}
                  >
                    ❤️ SURVIVAL
                  </button>
                  <button
                    onClick={() => setGameMode('CREATIVE')}
                    className={`rounded border-2 p-2 text-center font-mono text-xs font-bold transition-all
                      ${gameMode === 'CREATIVE' ? 'border-green-500 bg-green-500/10 text-green-400 shadow-md' : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'}
                    `}
                  >
                    💡 CREATIVE
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action */}
            <button
              onClick={handleStartGame}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-3 font-mono text-sm font-black uppercase text-neutral-900 shadow-lg hover:from-yellow-400 hover:to-amber-500 active:translate-y-px cursor-pointer"
            >
              <Play className="h-4.5 w-4.5 fill-current" />
              <span>Generate & Launch World</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* 2. CORE GAMEPLAY INTERACTIVE WINDOW */}
      {gameStarted && (
        <div className="relative h-full w-full">
          {/* Three.js Engine Canvas Container */}
          <GameCanvas
            gameMode={gameMode}
            onUpdateStats={(newStats) => setStats((prev) => ({ ...prev, ...newStats }))}
            onUpdateCoords={(c) => setCoords(c)}
            hotbar={hotbar}
            activeHotbarIndex={activeHotbarIndex}
            onBlockMined={handleBlockMined}
            onBlockPlaced={handleBlockPlaced}
            inventoryCount={getInventoryCount}
            seed={seed}
            settings={settings}
            stats={stats}
            onSelectHotbarIndex={(idx) => setActiveHotbarIndex(idx)}
            virtualKeys={virtualKeys}
            triggerVirtualMineRef={triggerVirtualMineRef}
            triggerVirtualPlaceRef={triggerVirtualPlaceRef}
            setTotalBlocks={setTotalBlocksInWorld}
            setTimeOfDay={setTimeOfDay}
            weather={weather}
            addNotification={addNotification}
          />

          {/* Heads Up Display Overlay (HUD) */}
          <HUD
            gameMode={gameMode}
            stats={stats}
            hotbar={hotbar}
            activeHotbarIndex={activeHotbarIndex}
            inventory={inventory}
            coords={coords}
            seed={seed}
            totalBlocksInWorld={totalBlocksInWorld}
            onSelectHotbarIndex={(idx) => setActiveHotbarIndex(idx)}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onToggleGameMode={() => {
              const next = gameMode === 'SURVIVAL' ? 'CREATIVE' : 'SURVIVAL';
              setGameMode(next);
              addNotification(`Switched to ${next} Mode!`, 'text-yellow-400');
            }}
            onResetWorld={handleResetWorld}
            settings={settings}
            onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
            virtualKeys={virtualKeys}
            setVirtualKeys={setVirtualKeys}
            onVirtualMine={() => triggerVirtualMineRef.current?.()}
            onVirtualPlace={() => triggerVirtualPlaceRef.current?.()}
            timeOfDay={timeOfDay}
            weather={weather}
            onToggleWeather={handleToggleWeather}
          />

          {/* Side Notifications Popup Layer */}
          <div className="absolute top-24 left-4 z-30 flex flex-col gap-1.5 pointer-events-none select-none">
            <AnimatePresence>
              {notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -30, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  className="rounded bg-black/65 px-3 py-1.5 font-mono text-[10px] text-white border border-white/5 backdrop-blur-xs flex items-center gap-1.5"
                >
                  <Sparkles className="h-3 w-3 text-yellow-400" />
                  <span className={n.color || 'text-white'}>{n.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Inventory Manager Panel */}
          <Inventory
            isOpen={isInventoryOpen}
            onClose={() => setIsInventoryOpen(false)}
            inventory={inventory}
            hotbar={hotbar}
            activeHotbarIndex={activeHotbarIndex}
            onSetHotbarSlot={(idx, blockType) => {
              setHotbar((prev) => {
                const updated = [...prev];
                updated[idx] = blockType;
                return updated;
              });
              const blockName = blockType !== null ? BLOCK_DEFINITIONS[blockType].name : 'Empty';
              addNotification(`Mapped Hotbar Slot ${idx + 1} to: ${blockName}`, 'text-amber-300');
            }}
            onUpdateInventoryCount={(bType, amount) => {
              setInventory((prev) => {
                const existing = prev.find((i) => i.type === bType);
                if (existing) {
                  return prev.map((i) => (i.type === bType ? { ...i, count: Math.max(0, i.count + amount) } : i));
                } else if (amount > 0) {
                  return [...prev, { type: bType, count: amount }];
                }
                return prev;
              });
            }}
            gameMode={gameMode}
          />
        </div>
      )}

      {/* 3. DEATH OVERLAY MODAL */}
      <AnimatePresence>
        {gameStarted && isDead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/85 backdrop-blur-xs text-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full space-y-6"
            >
              <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto animate-pulse" />
              <div className="space-y-2">
                <h2 className="font-mono text-4xl font-extrabold tracking-widest text-red-500 uppercase drop-shadow-md">
                  You Died!
                </h2>
                <p className="font-mono text-xs text-red-300 leading-relaxed">
                  You fell from too high, touched bedrock spikes, or fell into the endless void. Survival can be unforgiving. Let's get you back!
                </p>
              </div>

              <div className="bg-black/45 p-4 rounded-lg border border-red-500/20 max-w-xs mx-auto font-mono text-xs">
                <p className="text-neutral-400">Survival stats reset.</p>
                <p className="text-yellow-400 font-bold mt-1">Score Penalty: -100</p>
              </div>

              <button
                onClick={handleRespawn}
                className="w-full max-w-xs mx-auto rounded-lg bg-red-600 px-6 py-3 font-mono text-sm font-bold uppercase hover:bg-red-500 transition-colors cursor-pointer border border-red-400/45 shadow-xl active:translate-y-px"
              >
                Respawn
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
