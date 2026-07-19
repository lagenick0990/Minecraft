import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BlockType, BLOCK_DEFINITIONS, InventoryItem } from '../types';
import { 
  Briefcase, X, HelpCircle, Archive, Hammer, Sparkles, 
  ChevronRight, Check, Search, Filter, Wrench, Box, Layers, 
  Sparkle, Flame, ArrowRight, RefreshCw, AlertCircle
} from 'lucide-react';

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
  category: 'tools' | 'blocks' | 'materials';
}

const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    outputType: BlockType.WOODEN_PICKAXE,
    outputCount: 1,
    ingredients: [
      { type: BlockType.WOOD, count: 2 },
      { type: BlockType.PLANKS, count: 3 }
    ],
    description: 'An entry-level wood tool. Allows gathering resources with a small bonus chance.',
    category: 'tools'
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
    description: 'A sturdy cobblestone tool. Provides a 50% chance to yield double resources when mining.',
    category: 'tools'
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
    description: 'A heavy-duty iron tool. Guaranteed to mine double resources (+1 bonus block)!',
    category: 'tools'
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
    description: 'The ultimate harvesting tool. Mines triple resources (+2 bonus blocks)!',
    category: 'tools'
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
    description: 'A luxurious sword with legendary power. Smites mobs for massive 10 HP damage!',
    category: 'tools'
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
    description: 'A luminous amber glass lantern that glows with eternal heat.',
    category: 'blocks'
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
    description: 'Steel-clad, high-density stone masonry perfect for fortresses.',
    category: 'blocks'
  },
  {
    id: 'iron_block',
    name: 'Iron Block',
    outputType: BlockType.IRON_BLOCK,
    outputCount: 1,
    ingredients: [{ type: BlockType.IRON_ORE, count: 4 }],
    description: 'A heavy block made of compressed iron ore veins.',
    category: 'blocks'
  },
  {
    id: 'gold_block',
    name: 'Gold Block',
    outputType: BlockType.GOLD_BLOCK,
    outputCount: 1,
    ingredients: [{ type: BlockType.GOLD_ORE, count: 4 }],
    description: 'A shimmering block of pure gold ore value.',
    category: 'blocks'
  },
  {
    id: 'diamond_block',
    name: 'Diamond Block',
    outputType: BlockType.DIAMOND_BLOCK,
    outputCount: 1,
    ingredients: [{ type: BlockType.DIAMOND_ORE, count: 4 }],
    description: 'A highly brilliant cubic block of solid gemstone material.',
    category: 'blocks'
  },
  {
    id: 'planks',
    name: 'Oak Planks',
    outputType: BlockType.PLANKS,
    outputCount: 4,
    ingredients: [{ type: BlockType.WOOD, count: 1 }],
    description: 'Refine a raw Oak Log into solid wooden building planks.',
    category: 'materials'
  },
  {
    id: 'glass',
    name: 'Glass Block',
    outputType: BlockType.GLASS,
    outputCount: 1,
    ingredients: [{ type: BlockType.SAND, count: 3 }],
    description: 'Smelt raw sand grains into clean, transparent window glass.',
    category: 'materials'
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
    description: 'Bake standard dirt clay and stones together into durable red brick blocks.',
    category: 'blocks'
  },
  {
    id: 'cobblestone',
    name: 'Cobblestone',
    outputType: BlockType.COBBLESTONE,
    outputCount: 4,
    ingredients: [{ type: BlockType.STONE, count: 2 }],
    description: 'Chisel natural stones into textured, load-bearing cobblestone blocks.',
    category: 'blocks'
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
    description: 'Combine standard dirt soil with fresh leaves to grow organic grass turf.',
    category: 'blocks'
  },
  {
    id: 'coal_block',
    name: 'Purified Coal',
    outputType: BlockType.COAL_ORE,
    outputCount: 1,
    ingredients: [{ type: BlockType.WOOD, count: 2 }],
    description: 'Char raw wood logs to create carbon-rich coal chunks.',
    category: 'materials'
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
    description: 'Supercompress carbon coal under high stone pressure to synthesize diamond ore!',
    category: 'materials'
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
  
  // Crafting specific state variables
  const [selectedRecipe, setSelectedRecipe] = React.useState<CraftingRecipe | null>(CRAFTING_RECIPES[0]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<'ALL' | 'TOOLS' | 'BLOCKS' | 'MATERIALS'>('ALL');
  const [showCraftableOnly, setShowCraftableOnly] = React.useState(false);
  const [craftProgress, setCraftProgress] = React.useState(0);
  const [isCrafting, setIsCrafting] = React.useState(false);
  const [lastCraftedText, setLastCraftedText] = React.useState<string | null>(null);

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

  // Filter and Search logic for Crafting Recipes
  const filteredRecipes = React.useMemo(() => {
    return CRAFTING_RECIPES.filter((recipe) => {
      // 1. Category Filter
      if (selectedCategory !== 'ALL') {
        if (recipe.category !== selectedCategory.toLowerCase()) {
          return false;
        }
      }
      // 2. Search Query Filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = recipe.name.toLowerCase().includes(query);
        const matchesDesc = recipe.description.toLowerCase().includes(query);
        const outputDef = BLOCK_DEFINITIONS[recipe.outputType];
        const matchesOutputName = outputDef?.name.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesDesc && !matchesOutputName) {
          return false;
        }
      }
      // 3. Craftable Only Filter
      if (showCraftableOnly) {
        if (!canCraft(recipe)) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedCategory, showCraftableOnly, inventory, gameMode]);

  // Auto-select the first craftable or available recipe when filters change
  React.useEffect(() => {
    if (filteredRecipes.length > 0) {
      if (!filteredRecipes.some((r) => r.id === selectedRecipe?.id)) {
        setSelectedRecipe(filteredRecipes[0]);
      }
    } else {
      setSelectedRecipe(null);
    }
  }, [searchQuery, selectedCategory, showCraftableOnly]);

  const handleCraft = () => {
    if (!selectedRecipe) return;
    if (!canCraft(selectedRecipe)) return;

    setIsCrafting(true);
    setCraftProgress(0);

    // Assembly bay forging simulation timeline (takes 900ms)
    const totalTime = 900;
    const intervalTime = 30;
    const steps = totalTime / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.min(100, Math.floor((currentStep / steps) * 100));
      setCraftProgress(progress);

      if (currentStep >= steps) {
        clearInterval(timer);
        
        // Execute the transaction
        if (gameMode === 'SURVIVAL') {
          selectedRecipe.ingredients.forEach((ing) => {
            onUpdateInventoryCount(ing.type, -ing.count);
          });
        }

        // Award output block
        onUpdateInventoryCount(selectedRecipe.outputType, selectedRecipe.outputCount);

        // Sound Feedback
        playCraftSound();

        // Complete & confirmation feedback states
        setIsCrafting(false);
        setCraftProgress(0);
        setLastCraftedText(`+${selectedRecipe.outputCount} ${selectedRecipe.name}`);
        
        // Reset confirmation text after some time
        setTimeout(() => {
          setLastCraftedText(null);
        }, 2200);
      }
    }, intervalTime);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="inventory-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-4xl overflow-hidden rounded-xl border-4 border-neutral-700 bg-neutral-850 p-6 text-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-neutral-700 pb-3">
            <div className="flex items-center gap-2.5">
              <Archive className="h-6 w-6 text-yellow-500 animate-pulse" />
              <div>
                <h2 className="font-mono text-xl font-bold uppercase tracking-wider text-neutral-100 flex items-center gap-2">
                  {gameMode === 'CREATIVE' ? 'Creative Workshop' : 'Survival Workshop'}
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-sans tracking-normal capitalize">
                    v2.4 High Definition
                  </span>
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-neutral-800 p-2 text-neutral-400 hover:bg-rose-600 hover:text-white transition-all cursor-pointer hover:rotate-90 duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-3.5 flex gap-2 border-b border-neutral-700 pb-2">
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer
                ${activeTab === 'INVENTORY' 
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-neutral-950 font-bold shadow-lg shadow-yellow-500/10 border border-yellow-400/30' 
                  : 'text-neutral-400 hover:bg-neutral-800/80 hover:text-neutral-200'}
              `}
            >
              <Briefcase className="h-4 w-4" />
              <span>🎒 Storage & Mapping</span>
            </button>
            <button
              onClick={() => setActiveTab('CRAFTING')}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer
                ${activeTab === 'CRAFTING' 
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-neutral-950 font-bold shadow-lg shadow-yellow-500/10 border border-yellow-400/30' 
                  : 'text-neutral-400 hover:bg-neutral-800/80 hover:text-neutral-200'}
              `}
            >
              <Hammer className="h-4 w-4" />
              <span>🛠️ Crafting</span>
            </button>
          </div>

          {/* TAB CONTENT GRID */}
          {activeTab === 'INVENTORY' ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left side: Available blocks grid */}
              <div className="md:col-span-2 flex flex-col">
                <h3 className="mb-2 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Select a block to map in your hotbar:
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
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
                        className={`relative aspect-square flex flex-col items-center justify-center rounded-lg border-2 p-1.5 transition-all cursor-pointer group
                          ${!isAvailable ? 'opacity-30 cursor-not-allowed border-neutral-800 bg-neutral-900/50' : ''}
                          ${isAvailable && isSelected ? 'border-yellow-400 bg-neutral-700 shadow-md ring-2 ring-yellow-400/30 scale-[1.03]' : 'border-neutral-700 bg-neutral-800 hover:border-neutral-500 hover:bg-neutral-750'}
                        `}
                      >
                        {/* Voxel color block visualization */}
                        <div
                          className="h-9 w-9 rounded-md shadow-md transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: def.textureColorMap.base,
                            backgroundImage: `linear-gradient(135deg, ${def.textureColorMap.highlight} 0%, ${def.textureColorMap.base} 50%, ${def.textureColorMap.shadow} 100%)`,
                          }}
                        />
                        <span className="mt-1 font-mono text-[9px] text-neutral-300 truncate w-full text-center">
                          {def.name}
                        </span>
                        {/* Count badge */}
                        <span className="absolute top-1 right-1 rounded-md bg-black/80 border border-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white leading-none">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right side: Selected Block Details & Guide */}
              <div className="rounded-lg bg-neutral-900/90 p-4 border border-neutral-750 flex flex-col justify-between shadow-inner">
                <div>
                  <h3 className="mb-2.5 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
                    <Archive className="h-3.5 w-3.5 text-neutral-500" />
                    Block Inspector
                  </h3>
                  {selectedBlock !== null ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-neutral-800/40 p-2.5 rounded-lg border border-neutral-800">
                        <div
                          className="h-12 w-12 rounded-lg shadow-md border-2 border-neutral-600"
                          style={{
                            backgroundColor: BLOCK_DEFINITIONS[selectedBlock].textureColorMap.base,
                            backgroundImage: `linear-gradient(135deg, ${BLOCK_DEFINITIONS[selectedBlock].textureColorMap.highlight} 0%, ${BLOCK_DEFINITIONS[selectedBlock].textureColorMap.base} 50%, ${BLOCK_DEFINITIONS[selectedBlock].textureColorMap.shadow} 100%)`,
                          }}
                        />
                        <div>
                          <h4 className="font-mono text-sm font-bold text-yellow-400 leading-tight">
                            {BLOCK_DEFINITIONS[selectedBlock].name}
                          </h4>
                          <p className="font-mono text-[9px] text-neutral-500 mt-0.5">
                            Index: #{selectedBlock}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs font-mono text-neutral-300 bg-neutral-800/10 p-2.5 rounded-lg border border-neutral-800/60">
                        <p className="flex justify-between">
                          <span className="text-neutral-500">Solid Physics:</span>{' '}
                          <span className={BLOCK_DEFINITIONS[selectedBlock].isSolid !== false ? 'text-emerald-400' : 'text-neutral-400'}>
                            {BLOCK_DEFINITIONS[selectedBlock].isSolid !== false ? 'True (Solid)' : 'False (Airy)'}
                          </span>
                        </p>
                        <p className="flex justify-between border-t border-neutral-800/50 pt-1.5">
                          <span className="text-neutral-500">Light Emission:</span>{' '}
                          <span>
                            {selectedBlock === BlockType.GLOWING_LANTERN ? '☀️ Luminous' : '✖ None'}
                          </span>
                        </p>
                      </div>

                      <p className="font-mono text-xs text-yellow-300/80 italic mt-3 leading-relaxed flex items-center gap-1">
                        <span>💡 Select a hotbar slot below to quick-bind!</span>
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-500 text-center">
                      <HelpCircle className="h-10 w-10 mb-2 text-neutral-600 animate-bounce" />
                      <p className="font-mono text-xs">No block selected</p>
                      <p className="font-mono text-[10px] mt-1 text-neutral-500 max-w-[180px]">
                        Click any storage item on the left to inspect properties or map it into your hotbar.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div className="mt-4 pt-4 border-t border-neutral-800 text-[10px] font-mono text-neutral-400 space-y-1.5">
                  <p className="font-semibold text-neutral-300 flex items-center gap-1 text-[11px] uppercase">🕹️ Controls Cheat Sheet</p>
                  <p>• [1-9] Keys: Switch Active Hotbar Slot</p>
                  <p>• [E] Key: Open / Exit Workshop Overlay</p>
                  <p>• [Left Click]: Break Blocks / Hit Enemy Mobs</p>
                  <p>• [Right Click]: Build Blocks / Eat Prepared Food</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left side: Advanced Crafting recipes catalog */}
              <div className="md:col-span-2 flex flex-col">
                
                {/* Search & Filter Header Toolbar */}
                <div className="mb-3.5 space-y-2">
                  <div className="flex gap-2">
                    {/* Search Field */}
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search blueprint name or details..."
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-1.5 pl-8 pr-3 font-mono text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-xs text-neutral-500 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Toggle show craftable only */}
                    <button
                      onClick={() => setShowCraftableOnly(!showCraftableOnly)}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer
                        ${showCraftableOnly 
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50' 
                          : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200'}
                      `}
                    >
                      <Filter className="h-3 w-3" />
                      <span>{showCraftableOnly ? 'Showing Craftable' : 'Filter Craftable'}</span>
                    </button>
                  </div>

                  {/* Categories Row */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5">
                    {(['ALL', 'TOOLS', 'BLOCKS', 'MATERIALS'] as const).map((cat) => {
                      const isActive = selectedCategory === cat;
                      const getIcon = () => {
                        switch(cat) {
                          case 'TOOLS': return <Hammer className="h-2.5 w-2.5" />;
                          case 'BLOCKS': return <Box className="h-2.5 w-2.5" />;
                          case 'MATERIALS': return <Layers className="h-2.5 w-2.5" />;
                          default: return <Sparkle className="h-2.5 w-2.5" />;
                        }
                      };

                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap
                            ${isActive 
                              ? 'bg-neutral-700 text-yellow-400 border border-yellow-400/30' 
                              : 'bg-neutral-900/40 border border-neutral-800 text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-300'}
                          `}
                        >
                          {getIcon()}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recipes list */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {filteredRecipes.length > 0 ? (
                    filteredRecipes.map((recipe) => {
                      const isSelected = selectedRecipe?.id === recipe.id;
                      const isCraftable = canCraft(recipe);
                      const outputDef = BLOCK_DEFINITIONS[recipe.outputType];

                      return (
                        <button
                          key={recipe.id}
                          onClick={() => setSelectedRecipe(recipe)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer group
                            ${isSelected 
                              ? 'border-yellow-400 bg-neutral-700/60 shadow-md ring-1 ring-yellow-400/20' 
                              : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-800/40'}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            {/* Output block visual */}
                            <div
                              className="h-10 w-10 rounded-md border border-neutral-600 flex-shrink-0 transition-transform group-hover:scale-[1.05]"
                              style={{
                                backgroundColor: outputDef.textureColorMap.base,
                                backgroundImage: `linear-gradient(135deg, ${outputDef.textureColorMap.highlight} 0%, ${outputDef.textureColorMap.base} 50%, ${outputDef.textureColorMap.shadow} 100%)`,
                              }}
                            />
                            <div>
                              <h4 className="font-mono text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                                {recipe.name} 
                                <span className="text-yellow-400 font-extrabold bg-neutral-900 px-1.5 py-0.5 rounded text-[10px] border border-neutral-800">
                                  x{recipe.outputCount}
                                </span>
                              </h4>
                              <p className="font-mono text-[9px] text-neutral-400 truncate max-w-[210px] mt-0.5">
                                {recipe.description}
                              </p>
                            </div>
                          </div>

                          {/* Status label badge */}
                          <div className="flex items-center gap-2">
                            {isCraftable ? (
                              <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400 uppercase tracking-wide">
                                Ready
                              </span>
                            ) : (
                              <span className="rounded bg-neutral-850 border border-neutral-800 px-2 py-0.5 font-mono text-[9px] font-semibold text-neutral-500 uppercase tracking-wide">
                                Lock
                              </span>
                            )}
                            <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                          </div>
                        </button>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-neutral-500 text-center bg-neutral-900/10 rounded-lg border border-dashed border-neutral-800">
                      <AlertCircle className="h-8 w-8 mb-2 text-neutral-700" />
                      <p className="font-mono text-xs">No blueprints match filters</p>
                      <p className="font-mono text-[10px] mt-1 text-neutral-500">
                        Try clearing search input or toggling 'Filter Craftable' option.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side: Selected Blueprint Assembly Workspace */}
              <div className="rounded-xl bg-neutral-900/90 p-4 border border-neutral-750 flex flex-col justify-between shadow-lg relative overflow-hidden">
                
                {/* Visual decoration: Grid line patterns */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                <div className="relative z-10">
                  <h3 className="mb-2.5 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
                    <Flame className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    Forging Assembly Bay
                  </h3>
                  
                  {selectedRecipe ? (
                    <div className="space-y-4">
                      {/* Big Visual Card header */}
                      <div className="flex items-center gap-3 bg-neutral-800/40 p-2.5 rounded-lg border border-neutral-800">
                        <div
                          className="h-14 w-14 rounded-lg shadow-md border-2 border-neutral-600 flex-shrink-0 animate-pulse bg-neutral-800 relative"
                          style={{
                            backgroundColor: BLOCK_DEFINITIONS[selectedRecipe.outputType].textureColorMap.base,
                            backgroundImage: `linear-gradient(135deg, ${BLOCK_DEFINITIONS[selectedRecipe.outputType].textureColorMap.highlight} 0%, ${BLOCK_DEFINITIONS[selectedRecipe.outputType].textureColorMap.base} 50%, ${BLOCK_DEFINITIONS[selectedRecipe.outputType].textureColorMap.shadow} 100%)`,
                          }}
                        >
                          {/* Shimmer overlay */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 animate-shimmer" />
                        </div>
                        <div>
                          <h4 className="font-mono text-sm font-bold text-yellow-400 leading-tight">
                            {selectedRecipe.name}
                          </h4>
                          <p className="font-mono text-[10px] text-emerald-400 font-bold mt-1 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block">
                            Assembly Output: x{selectedRecipe.outputCount}
                          </p>
                        </div>
                      </div>

                      {/* Description statement */}
                      <p className="font-mono text-[10px] text-neutral-300 leading-relaxed bg-neutral-950 p-2 rounded border border-neutral-800">
                        {selectedRecipe.description}
                      </p>

                      {/* Ingredients checklist */}
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                          Required Materials Checklist:
                        </span>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                          {selectedRecipe.ingredients.map((ing) => {
                            const def = BLOCK_DEFINITIONS[ing.type];
                            const stock = getStock(ing.type);
                            const hasEnough = stock >= ing.count;
                            const percent = Math.min(100, Math.floor((stock / ing.count) * 100));

                            return (
                              <div 
                                key={ing.type} 
                                className="bg-neutral-950/50 p-2 rounded-lg border border-neutral-800 flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-5 w-5 rounded border border-neutral-750"
                                      style={{
                                        backgroundColor: def.textureColorMap.base,
                                        backgroundImage: `linear-gradient(135deg, ${def.textureColorMap.highlight} 0%, ${def.textureColorMap.base} 50%, ${def.textureColorMap.shadow} 100%)`,
                                      }}
                                    />
                                    <span className="text-neutral-200 text-[10px] truncate max-w-[120px]">{def.name}</span>
                                  </div>
                                  <div className={`text-[10px] font-bold ${hasEnough ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {stock} / {ing.count}
                                  </div>
                                </div>
                                {/* Simple material meter bar */}
                                <div className="w-full bg-neutral-900 rounded-full h-1 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${hasEnough ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-neutral-500 text-center">
                      <Hammer className="h-10 w-10 mb-2 animate-pulse text-neutral-600" />
                      <p className="font-mono text-xs">No blueprint selected</p>
                      <p className="font-mono text-[10px] mt-1 text-neutral-500 max-w-[180px]">
                        Select an engineering blueprint from the catalog on the left to start smelting.
                      </p>
                    </div>
                  )}
                </div>

                {/* Forging simulation panel and action trigger */}
                {selectedRecipe && (
                  <div className="mt-4 pt-4 border-t border-neutral-800 relative z-10">
                    
                    {/* Interactive progress assembly bar */}
                    {isCrafting && (
                      <div className="mb-3 space-y-1">
                        <div className="flex justify-between font-mono text-[9px] text-yellow-400">
                          <span className="animate-pulse flex items-center gap-1">🔨 FORGING ITEM...</span>
                          <span>{craftProgress}%</span>
                        </div>
                        <div className="w-full bg-neutral-950 h-2 rounded border border-neutral-800 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 h-full rounded transition-all duration-300"
                            style={{ width: `${craftProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Floating crafting confirmation animation */}
                    <AnimatePresence>
                      {lastCraftedText && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: -10, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute bottom-16 left-0 right-0 text-center pointer-events-none"
                        >
                          <span className="bg-emerald-900 border border-emerald-500/50 text-emerald-300 px-3.5 py-1.5 rounded-full font-mono text-xs font-bold shadow-lg inline-flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-yellow-400 animate-spin" />
                            Crafted: {lastCraftedText}!
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      disabled={!canCraft(selectedRecipe) || isCrafting}
                      onClick={handleCraft}
                      className={`w-full py-2.5 rounded-lg font-mono text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md
                        ${canCraft(selectedRecipe) && !isCrafting
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-neutral-950 border border-yellow-400 active:translate-y-px shadow-yellow-500/10'
                          : 'bg-neutral-800 border border-neutral-750 text-neutral-500 cursor-not-allowed'}
                      `}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isCrafting ? 'TRANSMUTING...' : 'Assemble Blueprint'}</span>
                    </button>

                    {canCraft(selectedRecipe) && !isCrafting && (
                      <p className="text-center font-mono text-[8px] text-neutral-400 mt-2">
                        💡 Tip: Click any Hotbar Slot below to bind output immediately!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hotbar quick binding layout section */}
          <div className="mt-5 border-t-2 border-neutral-700 pt-3">
            <h3 className="mb-2.5 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-neutral-500" />
              {activeTab === 'INVENTORY' 
                ? 'Hotbar Layout (Select Slot to Assign Inspected Item)' 
                : 'Hotbar Quick-Bind (Select Slot to Bind Selected Blueprint Output)'
              }
            </h3>
            <div className="grid grid-cols-9 gap-2 bg-neutral-900/60 p-2 rounded-xl border border-neutral-700">
              {hotbar.map((bType, idx) => {
                const isActive = idx === activeHotbarIndex;
                const def = bType !== null ? BLOCK_DEFINITIONS[bType] : null;

                return (
                  <div
                    key={idx}
                    onClick={() => handleAssignToHotbar(idx)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-lg border-2 p-1 transition-all cursor-pointer group
                      ${isActive ? 'border-yellow-400 bg-neutral-700 ring-2 ring-yellow-400/20 scale-[1.02]' : 'border-neutral-800 bg-neutral-800 hover:border-neutral-600'}
                    `}
                  >
                    {def ? (
                      <>
                        <div
                          className="h-8 w-8 rounded shadow-md group-hover:scale-105 transition-transform"
                          style={{
                            backgroundColor: def.textureColorMap.base,
                            backgroundImage: `linear-gradient(135deg, ${def.textureColorMap.highlight} 0%, ${def.textureColorMap.base} 50%, ${def.textureColorMap.shadow} 100%)`,
                          }}
                        />
                        <button
                          onClick={(e) => handleClearHotbarSlot(idx, e)}
                          className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-neutral-800 text-[8px] font-bold border border-neutral-700 hover:bg-rose-600 hover:text-white transition-all scale-90"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className="font-mono text-[9px] text-neutral-600 font-bold">Empty</span>
                    )}

                    <span className="absolute bottom-0.5 left-1 font-mono text-[9px] font-bold text-neutral-500">
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
