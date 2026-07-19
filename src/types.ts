export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  SAND = 6,
  COBBLESTONE = 7,
  PLANKS = 8,
  BRICK = 9,
  GLASS = 10,
  COAL_ORE = 11,
  IRON_ORE = 12,
  GOLD_ORE = 13,
  DIAMOND_ORE = 14,
  WATER = 15,
  SNOW = 16,
  ICE = 17,
  BAMBOO_STEM = 18,
  CACTUS = 19,
  REDWOOD_LOG = 20,
  REDWOOD_LEAVES = 21,
}

export interface BlockConfig {
  type: BlockType;
  name: string;
  color: string; // fallback color
  textureColorMap: {
    base: string;
    shadow: string;
    highlight: string;
    accent?: string;
  };
  isTransparent?: boolean;
  isSolid?: boolean;
}

export const BLOCK_DEFINITIONS: Record<BlockType, BlockConfig> = {
  [BlockType.AIR]: {
    type: BlockType.AIR,
    name: 'Air',
    color: 'transparent',
    textureColorMap: { base: '#000000', shadow: '#000000', highlight: '#000000' },
    isTransparent: true,
    isSolid: false,
  },
  [BlockType.GRASS]: {
    type: BlockType.GRASS,
    name: 'Grass Block',
    color: '#557a46',
    textureColorMap: { base: '#557a46', shadow: '#3f5e33', highlight: '#739e60', accent: '#8b5a2b' }, // accent is the dirt side
    isSolid: true,
  },
  [BlockType.DIRT]: {
    type: BlockType.DIRT,
    name: 'Dirt',
    color: '#8b5a2b',
    textureColorMap: { base: '#8b5a2b', shadow: '#6a421d', highlight: '#a46f3d' },
    isSolid: true,
  },
  [BlockType.STONE]: {
    type: BlockType.STONE,
    name: 'Stone',
    color: '#7f8c8d',
    textureColorMap: { base: '#7f8c8d', shadow: '#616a6b', highlight: '#95a5a6' },
    isSolid: true,
  },
  [BlockType.WOOD]: {
    type: BlockType.WOOD,
    name: 'Oak Log',
    color: '#6e473b',
    textureColorMap: { base: '#6e473b', shadow: '#4d3026', highlight: '#8f5e4f', accent: '#d7b174' }, // accent is the ring top
    isSolid: true,
  },
  [BlockType.LEAVES]: {
    type: BlockType.LEAVES,
    name: 'Oak Leaves',
    color: '#2e7d32',
    textureColorMap: { base: '#2e7d32', shadow: '#1b5e20', highlight: '#4caf50' },
    isTransparent: true, // leaves let some light/renders through in fancy
    isSolid: true,
  },
  [BlockType.SAND]: {
    type: BlockType.SAND,
    name: 'Sand',
    color: '#f1c40f',
    textureColorMap: { base: '#f1c40f', shadow: '#d4ac0d', highlight: '#f4d03f' },
    isSolid: true,
  },
  [BlockType.COBBLESTONE]: {
    type: BlockType.COBBLESTONE,
    name: 'Cobblestone',
    color: '#95a5a6',
    textureColorMap: { base: '#95a5a6', shadow: '#7f8c8d', highlight: '#bdc3c7' },
    isSolid: true,
  },
  [BlockType.PLANKS]: {
    type: BlockType.PLANKS,
    name: 'Oak Planks',
    color: '#d7b174',
    textureColorMap: { base: '#d7b174', shadow: '#b8945a', highlight: '#ebd49d' },
    isSolid: true,
  },
  [BlockType.BRICK]: {
    type: BlockType.BRICK,
    name: 'Bricks',
    color: '#b03a2e',
    textureColorMap: { base: '#b03a2e', shadow: '#78281f', highlight: '#ec7063' },
    isSolid: true,
  },
  [BlockType.GLASS]: {
    type: BlockType.GLASS,
    name: 'Glass',
    color: '#eaf2f8',
    textureColorMap: { base: '#eaf2f8', shadow: '#a9cce3', highlight: '#ffffff' },
    isTransparent: true,
    isSolid: true,
  },
  [BlockType.COAL_ORE]: {
    type: BlockType.COAL_ORE,
    name: 'Coal Ore',
    color: '#424949',
    textureColorMap: { base: '#7f8c8d', shadow: '#616a6b', highlight: '#95a5a6', accent: '#2c3e50' },
    isSolid: true,
  },
  [BlockType.IRON_ORE]: {
    type: BlockType.IRON_ORE,
    name: 'Iron Ore',
    color: '#b97a57',
    textureColorMap: { base: '#7f8c8d', shadow: '#616a6b', highlight: '#95a5a6', accent: '#d35400' },
    isSolid: true,
  },
  [BlockType.GOLD_ORE]: {
    type: BlockType.GOLD_ORE,
    name: 'Gold Ore',
    color: '#f39c12',
    textureColorMap: { base: '#7f8c8d', shadow: '#616a6b', highlight: '#95a5a6', accent: '#f1c40f' },
    isSolid: true,
  },
  [BlockType.DIAMOND_ORE]: {
    type: BlockType.DIAMOND_ORE,
    name: 'Diamond Ore',
    color: '#1abc9c',
    textureColorMap: { base: '#7f8c8d', shadow: '#616a6b', highlight: '#95a5a6', accent: '#3498db' },
    isSolid: true,
  },
  [BlockType.WATER]: {
    type: BlockType.WATER,
    name: 'Water',
    color: '#2980b9',
    textureColorMap: { base: '#2980b9', shadow: '#1f618d', highlight: '#5dade2' },
    isTransparent: true,
    isSolid: false, // walk through water
  },
  [BlockType.SNOW]: {
    type: BlockType.SNOW,
    name: 'Snow Block',
    color: '#ffffff',
    textureColorMap: { base: '#ffffff', shadow: '#e2e8f0', highlight: '#ffffff' },
    isSolid: true,
  },
  [BlockType.ICE]: {
    type: BlockType.ICE,
    name: 'Ice',
    color: '#a5f3fc',
    textureColorMap: { base: '#a5f3fc', shadow: '#7dd3fc', highlight: '#e0f2fe' },
    isTransparent: true,
    isSolid: true,
  },
  [BlockType.BAMBOO_STEM]: {
    type: BlockType.BAMBOO_STEM,
    name: 'Bamboo Stem',
    color: '#4ade80',
    textureColorMap: { base: '#4ade80', shadow: '#22c55e', highlight: '#86efac' },
    isSolid: true,
  },
  [BlockType.CACTUS]: {
    type: BlockType.CACTUS,
    name: 'Cactus',
    color: '#15803d',
    textureColorMap: { base: '#15803d', shadow: '#166534', highlight: '#22c55e', accent: '#ffffff' },
    isSolid: true,
  },
  [BlockType.REDWOOD_LOG]: {
    type: BlockType.REDWOOD_LOG,
    name: 'Pine Log',
    color: '#451a03',
    textureColorMap: { base: '#451a03', shadow: '#2d0e00', highlight: '#78350f', accent: '#f59e0b' },
    isSolid: true,
  },
  [BlockType.REDWOOD_LEAVES]: {
    type: BlockType.REDWOOD_LEAVES,
    name: 'Pine Needles',
    color: '#064e3b',
    textureColorMap: { base: '#064e3b', shadow: '#022c22', highlight: '#059669' },
    isTransparent: true,
    isSolid: true,
  },
};

export interface InventoryItem {
  type: BlockType;
  count: number;
}

export type GameMode = 'SURVIVAL' | 'CREATIVE';

export interface PlayerStats {
  health: number; // 0 to 20 (10 hearts)
  maxHealth: number;
  hunger: number; // 0 to 20 (10 hunger drumsticks)
  maxHunger: number;
  score: number;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface GameSettings {
  renderDistance: number; // standard chunk radius
  soundEnabled: boolean;
  fov: number;
  mouseSensitivity: number;
  useTouchControls: boolean;
}

export type WeatherType = 'CLEAR' | 'RAINY' | 'FOGGY';
