import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BlockType, BLOCK_DEFINITIONS, InventoryItem } from '../types';
import { Briefcase, X, HelpCircle, Archive, Hammer, Sparkles, ChevronRight, Check } from 'lucide-react';

interface InventoryProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  hotbar: (BlockType | null)[];
  activeHotbarIndex: number;
  onSetHotbarSlot: (index: number, blockType: BlockType | null) => void;
  onUpdateInventoryCount: (blockType: BlockType, amount: number) => void;
  gameMode: 'SURVIVAL' | 'CREATIVE';
}

interface RecipeIngredient {
  type: BlockType;
  count: number;
}

interface CraftingRecipe {
  id: string;
  name: string;
  outputType: BlockType;
  outputCount: number;
  ingredients: RecipeIngredient[];
  description: string;
}

const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'planks',
    name: 'Oak Planks',
    outputType: BlockType.PLANKS,
    outputCount: 4,
    ingredients: [{ type: BlockType.WOOD, count: 1 }],
    description: 'Refine a raw Oak Log into solid wooden building planks.'
  },
  {
    id: 'glass',
    name: 'Glass Block',
    outputType: BlockType.GLASS,
    outputCount: 1,
    ingredients: [{ type: BlockType.SAND, count: 3 }],
    description: 'Smelt raw sand grains into clean, transparent window glass.'
  },
  {
    id: 'bricks',
    name: 'Clay Bricks',
    outputType: BlockType.BRICK,
    outputCount: 4,
    ingredients: [
      { type: BlockType.DIRT, count: 2 },
      { type: BlockType.STONE, count: 2 }
    ],
    description: 'Bake standard dirt clay and stones together into durable red brick blocks.'
  },
  {
    id: 'cobblestone',
    name: 'Cobblestone',
    outputType: BlockType.COBBLESTONE,
    outputCount: 4,
    ingredients: [{ type: BlockType.STONE, count: 2 }],
    description: 'Chisel natural stones into textured, load-bearing cobblestone blocks.'
  },
  {
    id: 'grass_block',
    name: 'Grass Block',
    outputType: BlockType.GRASS,
    outputCount: 1,
    ingredients: [
      { type: BlockType.DIRT, count: 1 },
      { type: BlockType.LEAVES, count: 2 }
    ],
    description: 'Combine standard dirt soil with fresh leaves to grow organic grass turf.'
  },
  {
    id: 'coal_block',
    name: 'Purified Coal',
    outputType: BlockType.COAL_ORE,
    outputCount: 1,
    ingredients: [{ type: BlockType.WOOD, count: 2 }],
    description: 'Char raw wood logs to create carbon-rich coal chunks.'
  },
  {
    id: 'diamond_gem',
    name: 'Crystalline Diamond',
    outputType: BlockType.DIAMOND_ORE,
    outputCount: 1,
    ingredients: [
      { type: BlockType.COAL_ORE, count: 8 },
      { type: BlockType.STONE, count: 4 }
    ],
    description: 'Supercompress carbon coal under high stone pressure to synthesize diamond ore!'
  },
  {
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    outputType: BlockType.WOODEN_PICKAXE,
    outputCount: 1,
    ingredients: [
      { type: BlockType.WOOD, count: 2 },
      { type: BlockType.PLANKS, count: 3 }
    ],
    description: 'An entry-level wood tool. Allows gathering resources with a small bonus chance.'
  },
  {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    outputType: BlockType.STONE_PICKAXE,
    outputCount: 1,
    ingredients: [
      { type: BlockType.WOOD, count: 2 },
      { type: BlockType.COBBLESTONE, count: 3 }
    ],
    description: 'A sturdy cobblestone tool. Provides a 50% chance to yield double resources when mining.'
  },
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    outputType: BlockType.IRON_PICKAXE,
    outputCount: 1,
    ingredients: [
      { type: BlockType.WOOD, count: 2 },
      { type: BlockType.IRON_ORE, count: 3 }
    ],
    description: 'A heavy-duty iron tool. Guaranteed to mine double resources (+1 bonus block)!'
  },
  {
    id: 'diamond_pickaxe',
    name: 'Diamond Pickaxe',
    outputType: BlockType.DIAMOND_PICKAXE,
    outputCount: 1,
    ingredients: [
      { type: BlockType.WOOD, count: 2 },
      { type: BlockType.DIAMOND_ORE, count: 3 }
    ],
    description: 'The ultimate harvesting tool. Mines triple resources (+2 bonus blocks)!'
  },
  {
    id: 'golden_sword',
    name: 'Golden Sword',
    outputType: BlockType.GOLDEN_SWORD,
    outputCount: 1,
    ingredients: [
      { type: BlockType.WOOD, count: 1 },
      { type: BlockType.GOLD_ORE, count: 2 }
    ],
    description: 'A luxurious sword with legendary power. Smites mobs for massive 10 HP damage!'
  },
  {
    id: 'glowing_lantern',
    name: 'Glowing Lantern',
    outputType: BlockType.GLOWING_LANTERN,
    outputCount: 1,
    ingredients: [
      { type: BlockType.GLASS, count: 1 },
      { type: BlockType.COAL_ORE, count: 2 }
    ],
    description: 'A luminous amber glass lantern that glows with eternal heat.'
  },
  {
    id: 'reinforced_stone',
    name: 'Reinforced Stone',
    outputType: BlockType.REINFORCED_STONE,
    outputCount: 4,
    ingredients: [
      { type: BlockType.STONE, count: 4 },
      { type: BlockType.IRON_ORE, count: 1 }
    ],
    description: 'Steel-clad, high-density stone masonry perfect for fortresses.'
  },
  {
    id: 'iron_block',
    name: 'Iron Block',
    outputType: BlockType.IRON_BLOCK,
    outputCount: 1,
    ingredients: [{ type: BlockType.IRON_ORE, count: 4 }],
    description: 'A heavy block made of compressed iron ore veins.'
  },
  {
    id: 'gold_block',
    name: 'Gold Block',
    outputType: BlockType.GOLD_BLOCK,
    outputCount: 1,
    ingredients: [{ type: BlockType.GOLD_ORE, count: 4 }],
    description: 'A shimmering block of pure gold ore value.'
  },
  {
    id: 'diamond_block',
    name: 'Diamond Block',
    outputType: BlockType.DIAMOND_BLOCK,
    outputCount: 1,
    ingredients: [{ type: BlockType.DIAMOND_ORE, count: 4 }],
    description: 'A highly brilliant cubic block of solid gemstone material.'
  }
];

export const Inventory: React.FC<InventoryProps> = ({
  isOpen,
  onClose,
  inventory,
  hotbar,
  activeHotbarIndex,
  onSetHotbarSlot,
  onUpdateInventoryCount,
  gameMode,
}) => {
  const [activeTab, setActiveTab] = React.useState<'INVENTORY' | 'CRAFTING'>('INVENTORY');
  const [selectedBlock, setSelectedBlock] = React.useState<BlockType | null>(null);
  const [selectedRecipe, setSelectedRecipe] = React.useState<CraftingRecipe | null>(CRAFTING_RECIPES[0]);

  // Filter out AIR, we don't put Air in inventory
  const allBlocks = Object.values(BlockType).filter(
    (val) => typeof val === 'number' && val !== BlockType.AIR
  ) as BlockType[];

  const handleBlockSelect = (type: BlockType) => {
    setSelectedBlock(type);
  };

  const handleAssignToHotbar = (hotbarIndex: number) => {
    if (activeTab === 'INVENTORY' && selectedBlock !== null) {
      onSetHotbarSlot(hotbarIndex, selectedBlock);
      setSelectedBlock(null);
    } else if (activeTab === 'CRAFTING' && selectedRecipe !== null) {
      // Allow mapping the crafted recipe output directly to hotbar!
      onSetHotbarSlot(hotbarIndex, selectedRecipe.outputType);
    }
  };

  const handleClearHotbarSlot = (hotbarIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onSetHotbarSlot(hotbarIndex, null);
  };

  // Helper stock counts
  const getStock = (blockType: BlockType): number => {
    if (gameMode === 'CREATIVE') return 999;
    const item = inventory.find((i) => i.type === blockType);
    return item ? item.count : 0;
  };

  const canCraft = (recipe: CraftingRecipe): boolean => {
    return recipe.ingredients.every((ing) => getStock(ing.type) >= ing.count);
  };

  const playCraftSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Tone 1: Hammer slam (low square wave)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(380, audioCtx.currentTime + 0.1);
      gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.12);

      // Tone 2: Crystal Shimmer Chime
      setTimeout(() => {
        try {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc2.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.22); // A5
          gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.22);
        } catch (e) {}
      }, 80);
    } catch (e) {
      // AudioContext is blocked or unsupported
    }
  };

  const handleCraft = () => {
    if (!selectedRecipe) return;
    if (!canCraft(selectedRecipe)) return;

    // Deduct ingredients in survival mode
    if (gameMode === 'SURVIVAL') {
      selectedRecipe.ingredients.forEach((ing) => {
        onUpdateInventoryCount(ing.type, -ing.count);
      });
    }

    // Add crafted item to player inventory
    onUpdateInventoryCount(selectedRecipe.outputType, selectedRecipe.outputCount);

    // Play retro synth assembly tone
    playCraftSound();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="inventory-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-lg border-4 border-neutral-700 bg-neutral-800 p-6 text-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-neutral-700 pb-3">
            <div className="flex items-center gap-2">
              <Archive className="h-6 w-6 text-yellow-500" />
              <h2 className="font-mono text-xl font-bold uppercase tracking-wider text-neutral-100">
                {gameMode === 'CREATIVE' ? 'Creative Workshop' : 'Survival Workshop'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md bg-neutral-700 p-1.5 text-neutral-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-3 flex gap-2 border-b border-neutral-700 pb-2">
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`flex items-center gap-1.5 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer
                ${activeTab === 'INVENTORY' 
                  ? 'bg-yellow-500 text-neutral-950 font-bold shadow' 
                  : 'text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200'}
              `}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>📦 Storage & Mapping</span>
            </button>
            <button
              onClick={() => setActiveTab('CRAFTING')}
              className={`flex items-center gap-1.5 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer
                ${activeTab === 'CRAFTING' 
                  ? 'bg-yellow-500 text-neutral-950 font-bold shadow' 
                  : 'text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200'}
              `}
            >
              <Hammer className="h-3.5 w-3.5" />
              <span>🛠️ Crafting Chamber</span>
            </button>
          </div>

          {/* TAB CONTENT GRID */}
          {activeTab === 'INVENTORY' ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left side: Available blocks grid */}
              <div className="md:col-span-2">
                <h3 className="mb-2 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Select a block to map in your hotbar:
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {allBlocks.map((bType) => {
                    const def = BLOCK_DEFINITIONS[bType];
                    const count = gameMode === 'CREATIVE' ? '∞' : getStock(bType);
                    const isAvailable = gameMode === 'CREATIVE' || getStock(bType) > 0;
                    const isSelected = selectedBlock === bType;

                    return (
                      <button
                        key={bType}
                        onClick={() => isAvailable && handleBlockSelect(bType)}
                        disabled={!isAvailable}
                        className={`relative aspect-square flex flex-col items-center justify-center rounded-md border-2 p-1.5 transition-all cursor-pointer
                          ${!isAvailable ? 'opacity-30 cursor-not-allowed border-neutral-700 bg-neutral-900/50' : ''}
                          ${isAvailable && isSelected ? 'border-yellow-400 bg-neutral-600 shadow-md ring-2 ring-yellow-400/30' : 'border-neutral-600 bg-neutral-700 hover:border-neutral-500 hover:bg-neutral-650'}
                        `}
                      >
                        {/* Voxel color block visualization */}
                        <div
                          className="h-8 w-8 rounded-sm shadow-inner"
                          style={{
                            backgroundColor: def.textureColorMap.base,
                            backgroundImage: `linear-gradient(135deg, ${def.textureColorMap.highlight} 0%, ${def.textureColorMap.base} 50%, ${def.textureColorMap.shadow} 100%)`,
                          }}
                        />
                        <span className="mt-1 font-mono text-[10px] text-neutral-300 truncate w-full text-center">
                          {def.name}
                        </span>
                        {/* Count badge */}
                        <span className="absolute top-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white leading-none">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right side: Selected Block Details & Guide */}
              <div className="rounded-md bg-neutral-900/90 p-4 border border-neutral-750 flex flex-col justify-between">
                <div>
                  <h3 className="mb-2 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Block Inspector
                  </h3>
                  {selectedBlock !== null ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 rounded-md shadow-md border border-neutral-600"
                          style={{
                            backgroundColor: BLOCK_DEFINITIONS[selectedBlock].textureColorMap.base,
                            backgroundImage: `linear-gradient(135deg, ${BLOCK_DEFINITIONS[selectedBlock].textureColorMap.highlight} 0%, ${BLOCK_DEFINITIONS[selectedBlock].textureColorMap.base} 50%, ${BLOCK_DEFINITIONS[selectedBlock].textureColorMap.shadow} 100%)`,
                          }}
                        />
                        <div>
                          <h4 className="font-mono text-md font-bold text-yellow-400 leading-tight">
                            {BLOCK_DEFINITIONS[selectedBlock].name}
                          </h4>
                          <p className="font-mono text-[10px] text-neutral-400">
                            ID: {selectedBlock}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs font-mono text-neutral-300">
                        <p>
                          <span className="text-neutral-500">Solid:</span>{' '}
                          {BLOCK_DEFINITIONS[selectedBlock].isSolid !== false ? 'Yes' : 'No'}
                        </p>
                        <p>
                          <span className="text-neutral-500">Transparent:</span>{' '}
                          {BLOCK_DEFINITIONS[selectedBlock].isTransparent ? 'Yes' : 'No'}
                        </p>
                      </div>

                      <p className="font-mono text-xs text-yellow-300/80 italic mt-3 leading-relaxed">
                        💡 Click on any Hotbar Slot below to map this block to it!
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-neutral-500 text-center">
                      <HelpCircle className="h-10 w-10 mb-2 text-neutral-600" />
                      <p className="font-mono text-xs">No block selected</p>
                      <p className="font-mono text-[10px] mt-1 text-neutral-500">
                        Click any available block on the left to inspect or assign it to your hotbar.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div className="mt-4 pt-4 border-t border-neutral-800 text-[10px] font-mono text-neutral-400 space-y-1.5">
                  <p className="font-semibold text-neutral-300">Quick Commands:</p>
                  <p>• [1-9] Keys: Swap hotbar active slot</p>
                  <p>• [E]: Open / Close Inventory</p>
                  <p>• [Left Click]: Mine / Block actions</p>
                  <p>• [Right Click]: Place selected block</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left side: Crafting recipes catalog */}
              <div className="md:col-span-2">
                <h3 className="mb-2 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Available Recipes:
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {CRAFTING_RECIPES.map((recipe) => {
                    const isSelected = selectedRecipe?.id === recipe.id;
                    const isCraftable = canCraft(recipe);
                    const outputDef = BLOCK_DEFINITIONS[recipe.outputType];

                    return (
                      <button
                        key={recipe.id}
                        onClick={() => setSelectedRecipe(recipe)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border-2 text-left transition-all cursor-pointer
                          ${isSelected 
                            ? 'border-yellow-400 bg-neutral-700 shadow-md ring-2 ring-yellow-400/20' 
                            : 'border-neutral-700 bg-neutral-900/50 hover:border-neutral-600 hover:bg-neutral-700/30'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {/* Output block visual */}
                          <div
                            className="h-10 w-10 rounded-md border border-neutral-600 flex-shrink-0"
                            style={{
                              backgroundColor: outputDef.textureColorMap.base,
                              backgroundImage: `linear-gradient(135deg, ${outputDef.textureColorMap.highlight} 0%, ${outputDef.textureColorMap.base} 50%, ${outputDef.textureColorMap.shadow} 100%)`,
                            }}
                          />
                          <div>
                            <h4 className="font-mono text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                              {recipe.name} 
                              <span className="text-yellow-400 font-bold bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">
                                x{recipe.outputCount}
                              </span>
                            </h4>
                            <p className="font-mono text-[9px] text-neutral-400 truncate max-w-[180px] mt-0.5">
                              {recipe.description}
                            </p>
                          </div>
                        </div>

                        {/* Status label badge */}
                        <div className="flex items-center gap-2">
                          {isCraftable ? (
                            <span className="rounded bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400 uppercase tracking-wide">
                              Craftable
                            </span>
                          ) : (
                            <span className="rounded bg-neutral-800 border border-neutral-700 px-2 py-0.5 font-mono text-[9px] font-semibold text-neutral-500 uppercase tracking-wide">
                              No Materials
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-neutral-500" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right side: Selected Blueprint Workspace Core */}
              <div className="rounded-md bg-neutral-900/90 p-4 border border-neutral-750 flex flex-col justify-between">
                <div>
                  <h3 className="mb-2 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Blueprint Details
                  </h3>
                  {selectedRecipe ? (
                    <div className="space-y-4">
                      {/* Big Visual Card header */}
                      <div className="flex items-center gap-3">
                        <div
                          className="h-14 w-14 rounded-md shadow-md border-2 border-neutral-600 flex-shrink-0"
                          style={{
                            backgroundColor: BLOCK_DEFINITIONS[selectedRecipe.outputType].textureColorMap.base,
                            backgroundImage: `linear-gradient(135deg, ${BLOCK_DEFINITIONS[selectedRecipe.outputType].textureColorMap.highlight} 0%, ${BLOCK_DEFINITIONS[selectedRecipe.outputType].textureColorMap.base} 50%, ${BLOCK_DEFINITIONS[selectedRecipe.outputType].textureColorMap.shadow} 100%)`,
                          }}
                        />
                        <div>
                          <h4 className="font-mono text-sm font-bold text-yellow-400 leading-tight">
                            {selectedRecipe.name}
                          </h4>
                          <p className="font-mono text-[10px] text-emerald-400 font-semibold mt-0.5">
                            Yield: +{selectedRecipe.outputCount} Blocks
                          </p>
                        </div>
                      </div>

                      {/* Description statement */}
                      <p className="font-mono text-[10px] text-neutral-300 leading-relaxed bg-neutral-950 p-2 rounded border border-neutral-800">
                        {selectedRecipe.description}
                      </p>

                      {/* Ingredients checklist */}
                      <div className="space-y-1.5">
                        <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          Ingredients Required:
                        </span>
                        <div className="space-y-1.5">
                          {selectedRecipe.ingredients.map((ing) => {
                            const def = BLOCK_DEFINITIONS[ing.type];
                            const stock = getStock(ing.type);
                            const hasEnough = stock >= ing.count;

                            return (
                              <div 
                                key={ing.type} 
                                className="flex items-center justify-between text-xs font-mono bg-neutral-850 p-1.5 rounded border border-neutral-800"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-5 w-5 rounded-sm border border-neutral-750"
                                    style={{
                                      backgroundColor: def.textureColorMap.base,
                                      backgroundImage: `linear-gradient(135deg, ${def.textureColorMap.highlight} 0%, ${def.textureColorMap.base} 50%, ${def.textureColorMap.shadow} 100%)`,
                                    }}
                                  />
                                  <span className="text-neutral-300 text-[10px] truncate max-w-[100px]">{def.name}</span>
                                </div>
                                <div className={`text-[10px] font-bold ${hasEnough ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {stock} / {ing.count}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-neutral-500 text-center">
                      <Hammer className="h-10 w-10 mb-2 animate-pulse text-neutral-600" />
                      <p className="font-mono text-xs">No blueprint selected</p>
                      <p className="font-mono text-[10px] mt-1 text-neutral-500">
                        Select a recipe blueprint from the catalog on the left to start.
                      </p>
                    </div>
                  )}
                </div>

                {/* Craft Action Button */}
                {selectedRecipe && (
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <button
                      disabled={!canCraft(selectedRecipe)}
                      onClick={handleCraft}
                      className={`w-full py-2.5 rounded font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md
                        ${canCraft(selectedRecipe)
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-neutral-950 border border-yellow-400 active:translate-y-px'
                          : 'bg-neutral-800 border border-neutral-750 text-neutral-500 cursor-not-allowed'}
                      `}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Assemble Blueprint</span>
                    </button>
                    {canCraft(selectedRecipe) && (
                      <p className="text-center font-mono text-[8px] text-neutral-400 mt-1.5">
                        💡 Click on any Hotbar Slot below to map the output immediately!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hotbar mapper mapping section (Always visible in both tabs!) */}
          <div className="mt-6 border-t-2 border-neutral-700 pt-3">
            <h3 className="mb-2 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {activeTab === 'INVENTORY' 
                ? 'Hotbar Layout (Select Slot to Assign Inspected Block)' 
                : 'Hotbar Quick-Bind (Select Slot to Bind Crafted Block)'
              }
            </h3>
            <div className="grid grid-cols-9 gap-1.5 bg-neutral-900 p-2.5 rounded-lg border border-neutral-700">
              {hotbar.map((bType, idx) => {
                const isActive = idx === activeHotbarIndex;
                const def = bType !== null ? BLOCK_DEFINITIONS[bType] : null;

                return (
                  <div
                    key={idx}
                    onClick={() => handleAssignToHotbar(idx)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-md border-2 p-1 transition-all cursor-pointer
                      ${isActive ? 'border-yellow-400 bg-neutral-700 ring-2 ring-yellow-400/20' : 'border-neutral-700 bg-neutral-800/80 hover:border-neutral-600'}
                    `}
                  >
                    {def ? (
                      <>
                        <div
                          className="h-8 w-8 rounded-sm shadow-md animate-fade-in"
                          style={{
                            backgroundColor: def.textureColorMap.base,
                            backgroundImage: `linear-gradient(135deg, ${def.textureColorMap.highlight} 0%, ${def.textureColorMap.base} 50%, ${def.textureColorMap.shadow} 100%)`,
                          }}
                        />
                        <button
                          onClick={(e) => handleClearHotbarSlot(idx, e)}
                          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700 text-[8px] font-bold hover:bg-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className="font-mono text-[10px] text-neutral-600 font-bold">Empty</span>
                    )}

                    <span className="absolute bottom-0.5 left-1 font-mono text-[9px] font-semibold text-neutral-500">
                      {idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
