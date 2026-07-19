import React from 'react';
import { motion } from 'motion/react';
import { BlockType, BLOCK_DEFINITIONS, InventoryItem, GameMode, PlayerStats, GameSettings, WeatherType } from '../types';
import { Heart, Shield, Compass, RotateCcw, Volume2, VolumeX, Eye, BookOpen, Layers, Menu, Moon, Sun, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Smartphone, EyeOff } from 'lucide-react';

interface HUDProps {
  gameMode: GameMode;
  stats: PlayerStats;
  hotbar: (BlockType | null)[];
  activeHotbarIndex: number;
  inventory: InventoryItem[];
  coords: { x: number; y: number; z: number };
  seed: number;
  totalBlocksInWorld: number;
  onSelectHotbarIndex: (index: number) => void;
  onOpenInventory: () => void;
  onToggleGameMode: () => void;
  onResetWorld: () => void;
  settings: GameSettings;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  // Trigger virtual controls
  virtualKeys: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
  };
  setVirtualKeys: React.Dispatch<React.SetStateAction<{
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
  }>>;
  onVirtualMine: () => void;
  onVirtualPlace: () => void;
  timeOfDay: number; // 0 to 24000
  weather: WeatherType;
  onToggleWeather: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  gameMode,
  stats,
  hotbar,
  activeHotbarIndex,
  inventory,
  coords,
  seed,
  totalBlocksInWorld,
  onSelectHotbarIndex,
  onOpenInventory,
  onToggleGameMode,
  onResetWorld,
  settings,
  onUpdateSettings,
  virtualKeys,
  setVirtualKeys,
  onVirtualMine,
  onVirtualPlace,
  timeOfDay,
  weather,
  onToggleWeather,
}) => {
  const [showControlsGuide, setShowControlsGuide] = React.useState(true);

  // Function to render hearts based on health (0 to 20)
  const renderHearts = () => {
    const hearts = [];
    const maxHearts = stats.maxHealth / 2; // 10 hearts
    for (let i = 0; i < maxHearts; i++) {
      const heartVal = stats.health - i * 2;
      if (heartVal >= 2) {
        // Full heart
        hearts.push(
          <span key={i} className="text-red-500 font-bold text-lg leading-none drop-shadow-md">
            ❤️
          </span>
        );
      } else if (heartVal === 1) {
        // Half heart (using heart emoji with a yellow accent or half emoji style, let's use a smaller/faded style or split style)
        hearts.push(
          <span key={i} className="text-red-400 font-bold text-lg leading-none opacity-80 drop-shadow-md relative">
            ❤️<span className="absolute left-1/2 right-0 top-0 bottom-0 bg-neutral-900/60 overflow-hidden rounded-r-xs pointer-events-none" />
          </span>
        );
      } else {
        // Empty heart
        hearts.push(
          <span key={i} className="text-neutral-600 font-bold text-lg leading-none opacity-40 drop-shadow-md">
            🖤
          </span>
        );
      }
    }
    return hearts;
  };

  // Function to render hunger shanks (0 to 20)
  const renderHunger = () => {
    const shanks = [];
    const maxShanks = stats.maxHunger / 2; // 10 shanks
    for (let i = 0; i < maxShanks; i++) {
      const hungerVal = stats.hunger - i * 2;
      if (hungerVal >= 2) {
        shanks.push(<span key={i} className="text-orange-600 text-md leading-none">🍖</span>);
      } else if (hungerVal === 1) {
        shanks.push(
          <span key={i} className="text-orange-500 text-md leading-none relative">
            🍖<span className="absolute left-1/2 right-0 top-0 bottom-0 bg-neutral-900/60 overflow-hidden rounded-r-xs pointer-events-none" />
          </span>
        );
      } else {
        shanks.push(<span key={i} className="text-neutral-700 text-md leading-none opacity-35">🍗</span>);
      }
    }
    return shanks;
  };

  const formattedTime = () => {
    const hours = Math.floor((timeOfDay / 1000) + 6) % 24;
    const minutes = Math.floor((timeOfDay % 1000) / 16.6);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4">
      {/* 1. TOP HEADER STATUS */}
      <div className="flex w-full items-start justify-between">
        {/* Left Stats Side */}
        <div className="flex flex-col gap-1 rounded-md bg-black/40 p-3 text-white backdrop-blur-xs pointer-events-auto border border-white/5">
          <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-yellow-400">
            <Compass className="h-4 w-4 animate-spin-slow" />
            <span>MINECRAFT VIRTUAL CLONE</span>
          </div>

          <div className="mt-1 space-y-0.5 font-mono text-xs text-neutral-200">
            <p>
              <span className="text-neutral-400">Position:</span> X: {coords.x.toFixed(1)}, Y: {coords.y.toFixed(1)}, Z: {coords.z.toFixed(1)}
            </p>
            <p>
              <span className="text-neutral-400">Seed:</span> {seed}
            </p>
            <p>
              <span className="text-neutral-400">Voxel Count:</span> {totalBlocksInWorld}
            </p>
            <p className="flex items-center gap-1">
              <span className="text-neutral-400">Time:</span> {formattedTime()}
              {timeOfDay > 4000 && timeOfDay < 18000 ? (
                <Sun className="h-3 w-3 text-amber-400 inline" />
              ) : (
                <Moon className="h-3 w-3 text-sky-400 inline" />
              )}
            </p>
            <p className="flex items-center gap-1">
              <span className="text-neutral-400">Weather:</span>{' '}
              <span className={`font-bold ${
                weather === 'CLEAR' ? 'text-sky-400' : weather === 'RAINY' ? 'text-indigo-400 animate-pulse' : 'text-neutral-300'
              }`}>
                {weather === 'CLEAR' ? '☀️ Clear' : weather === 'RAINY' ? '🌧️ Rainy' : '🌫️ Foggy'}
              </span>
            </p>
            <p>
              <span className="text-neutral-400">Mode:</span>{' '}
              <span className={gameMode === 'CREATIVE' ? 'text-green-400 font-bold' : 'text-rose-400 font-bold'}>
                {gameMode}
              </span>
            </p>
          </div>

          {/* Quick World actions */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              onClick={onToggleGameMode}
              className="rounded bg-neutral-700/80 px-2 py-1 font-mono text-[10px] font-bold text-white transition-colors hover:bg-neutral-600 active:translate-y-px cursor-pointer"
            >
              Toggle Mode
            </button>
            <button
              onClick={onToggleWeather}
              className="rounded bg-neutral-700/80 px-2 py-1 font-mono text-[10px] font-bold text-white transition-colors hover:bg-indigo-600 hover:text-white active:translate-y-px cursor-pointer"
              title="Change weather conditions"
            >
              ⛅ Toggle Weather
            </button>
            <button
              onClick={onResetWorld}
              className="flex items-center gap-1 rounded bg-neutral-750 px-2 py-1 font-mono text-[10px] font-bold text-white transition-colors hover:bg-red-600 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>New World</span>
            </button>
          </div>
        </div>

        {/* Center Controls Toggle & Guides */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setShowControlsGuide(!showControlsGuide)}
            className="rounded-full bg-black/40 p-2 text-white hover:bg-neutral-800 backdrop-blur-xs pointer-events-auto transition-colors border border-white/5"
            title="Toggle Controls Guide"
          >
            {showControlsGuide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          {showControlsGuide && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 rounded-lg bg-black/65 border border-white/10 p-3 font-mono text-[11px] text-white space-y-1 backdrop-blur-sm max-w-xs"
            >
              <p className="text-yellow-400 font-bold uppercase tracking-wide border-b border-white/10 pb-1 mb-1 text-center">
                Keyboard Controls
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <p>• <span className="text-yellow-300 font-semibold">WASD</span>: Walk</p>
                <p>• <span className="text-yellow-300 font-semibold">Space</span>: Jump</p>
                <p>• <span className="text-yellow-300 font-semibold">L-Click</span>: Mine</p>
                <p>• <span className="text-yellow-300 font-semibold">R-Click</span>: Place</p>
                <p>• <span className="text-yellow-300 font-semibold">1-9 Keys</span>: Hotbar</p>
                <p>• <span className="text-yellow-300 font-semibold">E Key</span>: Inventory</p>
                <p>• <span className="text-yellow-300 font-semibold">M-Click</span>: Pick Block</p>
                <p>• <span className="text-yellow-300 font-semibold">Esc</span>: Lock Mouse</p>
              </div>
              <p className="text-[10px] text-emerald-400/90 italic pt-1 text-center">
                ✨ Click screen to lock cursor and look around!
              </p>
            </motion.div>
          )}
        </div>

        {/* Right Options Panels */}
        <div className="flex flex-col gap-1.5 rounded-md bg-black/40 p-3 text-white backdrop-blur-xs pointer-events-auto border border-white/5">
          <div className="font-mono text-xs font-bold text-neutral-300 uppercase tracking-wide border-b border-white/5 pb-1 mb-1.5">
            Settings
          </div>

          {/* Sound settings */}
          <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
            <span>Sound Effects</span>
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className="rounded bg-neutral-700/80 p-1 hover:bg-neutral-600 transition-colors"
            >
              {settings.soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-green-400" /> : <VolumeX className="h-3.5 w-3.5 text-neutral-400" />}
            </button>
          </div>

          {/* Touch settings */}
          <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
            <span>Touch/Iframe Controls</span>
            <button
              onClick={() => onUpdateSettings({ useTouchControls: !settings.useTouchControls })}
              className="rounded bg-neutral-700/80 p-1 hover:bg-neutral-600 transition-colors"
            >
              <Smartphone className={`h-3.5 w-3.5 ${settings.useTouchControls ? 'text-green-400 animate-pulse' : 'text-neutral-400'}`} />
            </button>
          </div>

          {/* Render Distance */}
          <div className="mt-1 font-mono text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Chunks</span>
              <span className="text-yellow-400 font-bold">{settings.renderDistance}</span>
            </div>
            <input
              type="range"
              min="2"
              max="5"
              step="1"
              value={settings.renderDistance}
              onChange={(e) => onUpdateSettings({ renderDistance: parseInt(e.target.value) })}
              className="w-24 accent-yellow-400 cursor-pointer h-1 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* 2. CENTER CROSSHAIR */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Crosshair lines */}
        <div className="relative flex items-center justify-center h-4 w-4">
          <div className="absolute h-0.5 w-3.5 bg-white mix-blend-difference" />
          <div className="absolute h-3.5 w-0.5 bg-white mix-blend-difference" />
          {/* subtle dot */}
          <div className="h-1 w-1 rounded-full bg-white mix-blend-difference" />
        </div>
      </div>

      {/* 3. VIRTUAL CONTROLS FOR IFRAMES (Bottom corners) */}
      {settings.useTouchControls && (
        <div className="absolute inset-x-0 bottom-36 px-4 flex justify-between pointer-events-none">
          {/* Movement Joystick/D-pad */}
          <div className="flex flex-col items-center gap-1.5 bg-black/40 p-2.5 rounded-xl backdrop-blur-xs pointer-events-auto border border-white/5">
            <button
              onMouseDown={() => setVirtualKeys((prev) => ({ ...prev, forward: true }))}
              onMouseUp={() => setVirtualKeys((prev) => ({ ...prev, forward: false }))}
              onTouchStart={() => setVirtualKeys((prev) => ({ ...prev, forward: true }))}
              onTouchEnd={() => setVirtualKeys((prev) => ({ ...prev, forward: false }))}
              className={`h-11 w-11 flex items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700 font-bold font-mono transition-all hover:bg-neutral-700 active:scale-95
                ${virtualKeys.forward ? 'bg-yellow-500 text-neutral-900 border-yellow-400' : ''}
              `}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <div className="flex gap-1.5">
              <button
                onMouseDown={() => setVirtualKeys((prev) => ({ ...prev, left: true }))}
                onMouseUp={() => setVirtualKeys((prev) => ({ ...prev, left: false }))}
                onTouchStart={() => setVirtualKeys((prev) => ({ ...prev, left: true }))}
                onTouchEnd={() => setVirtualKeys((prev) => ({ ...prev, left: false }))}
                className={`h-11 w-11 flex items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700 font-bold font-mono transition-all hover:bg-neutral-700 active:scale-95
                  ${virtualKeys.left ? 'bg-yellow-500 text-neutral-900 border-yellow-400' : ''}
                `}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onMouseDown={() => setVirtualKeys((prev) => ({ ...prev, backward: true }))}
                onMouseUp={() => setVirtualKeys((prev) => ({ ...prev, backward: false }))}
                onTouchStart={() => setVirtualKeys((prev) => ({ ...prev, backward: true }))}
                onTouchEnd={() => setVirtualKeys((prev) => ({ ...prev, backward: false }))}
                className={`h-11 w-11 flex items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700 font-bold font-mono transition-all hover:bg-neutral-700 active:scale-95
                  ${virtualKeys.backward ? 'bg-yellow-500 text-neutral-900 border-yellow-400' : ''}
                `}
              >
                <ArrowDown className="h-5 w-5" />
              </button>
              <button
                onMouseDown={() => setVirtualKeys((prev) => ({ ...prev, right: true }))}
                onMouseUp={() => setVirtualKeys((prev) => ({ ...prev, right: false }))}
                onTouchStart={() => setVirtualKeys((prev) => ({ ...prev, right: true }))}
                onTouchEnd={() => setVirtualKeys((prev) => ({ ...prev, right: false }))}
                className={`h-11 w-11 flex items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700 font-bold font-mono transition-all hover:bg-neutral-700 active:scale-95
                  ${virtualKeys.right ? 'bg-yellow-500 text-neutral-900 border-yellow-400' : ''}
                `}
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Action Buttons: Mine, Place, Jump */}
          <div className="flex gap-2 items-end bg-black/40 p-2.5 rounded-xl backdrop-blur-xs pointer-events-auto border border-white/5">
            <button
              onClick={onVirtualMine}
              className="h-14 w-14 flex flex-col items-center justify-center rounded-full bg-red-600 border-2 border-red-400 font-bold font-mono text-[10px] text-white uppercase shadow-lg hover:bg-red-500 active:scale-90 transition-transform"
            >
              <span>⛏️</span>
              <span className="text-[9px]">Mine</span>
            </button>
            <button
              onClick={onVirtualPlace}
              className="h-14 w-14 flex flex-col items-center justify-center rounded-full bg-green-600 border-2 border-green-400 font-bold font-mono text-[10px] text-white uppercase shadow-lg hover:bg-green-500 active:scale-90 transition-transform"
            >
              <span>🪵</span>
              <span className="text-[9px]">Place</span>
            </button>
            <button
              onMouseDown={() => setVirtualKeys((prev) => ({ ...prev, jump: true }))}
              onMouseUp={() => setVirtualKeys((prev) => ({ ...prev, jump: false }))}
              onTouchStart={() => setVirtualKeys((prev) => ({ ...prev, jump: true }))}
              onTouchEnd={() => setVirtualKeys((prev) => ({ ...prev, jump: false }))}
              className={`h-14 w-14 flex flex-col items-center justify-center rounded-lg bg-yellow-600 border-2 border-yellow-400 font-bold font-mono text-[10px] text-white uppercase shadow-lg hover:bg-yellow-500 active:scale-90 transition-transform
                ${virtualKeys.jump ? 'bg-yellow-400 border-white text-neutral-950' : ''}
              `}
            >
              <span>🦘</span>
              <span className="text-[9px]">Jump</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. BOTTOM BAR: HEALTH, HUNGER & HOTBAR */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {/* Survival Indicators (only visible in SURVIVAL mode) */}
        {gameMode === 'SURVIVAL' && (
          <div className="flex w-full max-w-md items-center justify-between px-3 pb-1">
            {/* Hearts (Health) */}
            <div className="flex items-center gap-0.5 select-none pointer-events-auto bg-black/35 px-2 py-0.5 rounded-md">
              {renderHearts()}
            </div>

            {/* Food Shanks (Hunger) */}
            <div className="flex items-center gap-0.5 select-none pointer-events-auto bg-black/35 px-2 py-0.5 rounded-md">
              {renderHunger()}
            </div>
          </div>
        )}

        {/* Hotbar Container */}
        <div className="flex items-center gap-2 max-w-xl w-full pointer-events-auto">
          {/* Inventory Button */}
          <button
            onClick={onOpenInventory}
            className="flex h-12 w-12 flex-col items-center justify-center rounded-md border-2 border-neutral-600 bg-neutral-800 text-white shadow-md hover:bg-neutral-700 hover:border-neutral-500 cursor-pointer active:scale-95 transition-transform"
            title="Open Inventory (E)"
          >
            <BookOpen className="h-5 w-5 text-yellow-400" />
            <span className="font-mono text-[8px] font-bold text-neutral-400">BAG [E]</span>
          </button>

          {/* Slot Grid */}
          <div className="grid grid-cols-9 gap-1 bg-black/55 p-1.5 rounded-lg border border-neutral-700/80 shadow-2xl flex-1">
            {hotbar.map((bType, idx) => {
              const isActive = idx === activeHotbarIndex;
              const def = bType !== null ? BLOCK_DEFINITIONS[bType] : null;

              // Check inventory count if Survival
              const invItem = bType !== null ? inventory.find((item) => item.type === bType) : null;
              const count = bType === null ? 0 : gameMode === 'CREATIVE' ? '∞' : invItem?.count || 0;

              return (
                <button
                  key={idx}
                  onClick={() => onSelectHotbarIndex(idx)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-md border-2 p-1 transition-all
                    ${isActive ? 'border-yellow-400 bg-neutral-600 shadow-md scale-105 ring-2 ring-yellow-400/20' : 'border-neutral-800 bg-neutral-800/85 hover:border-neutral-600'}
                  `}
                >
                  {def ? (
                    <div
                      className="h-8 w-8 rounded-sm shadow-md"
                      style={{
                        backgroundColor: def.textureColorMap.base,
                        backgroundImage: `linear-gradient(135deg, ${def.textureColorMap.highlight} 0%, ${def.textureColorMap.base} 50%, ${def.textureColorMap.shadow} 100%)`,
                      }}
                    />
                  ) : null}

                  {/* Slot Stock Number */}
                  {def && (
                    <span className="absolute bottom-0.5 right-1 font-mono text-[9px] font-black text-white bg-black/60 px-1 rounded-sm leading-tight select-none">
                      {count}
                    </span>
                  )}

                  {/* Slot Number Label */}
                  <span className="absolute top-0.5 left-1 font-mono text-[8px] font-semibold text-neutral-500 select-none">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
