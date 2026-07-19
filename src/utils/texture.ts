import * as THREE from 'three';
import { BlockType, BLOCK_DEFINITIONS } from '../types';

export function createPixelTexture(
  type: BlockType,
  face: 'top' | 'bottom' | 'side' = 'side'
): THREE.Texture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const def = BLOCK_DEFINITIONS[type];
  const { base, shadow, highlight, accent } = def.textureColorMap;

  // Let's seed random colors for pixel-art texture
  const pseudoRand = (x: number, y: number) => {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };

  // Render texture pixel by pixel
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = base;
      const noise = pseudoRand(x + (type * 7), y + (type * 13));

      switch (type) {
        case BlockType.GRASS:
          if (face === 'top') {
            // Green grass with variations
            color = noise > 0.6 ? highlight : noise > 0.3 ? base : shadow;
          } else if (face === 'bottom') {
            // Dirt only
            color = noise > 0.6 ? highlight : noise > 0.2 ? base : shadow;
          } else {
            // Side: top 4-5 pixels are grass, rest is dirt
            const grassEdge = 4 + Math.floor(pseudoRand(x, type) * 3); // wavy edge
            if (y < grassEdge) {
              color = noise > 0.5 ? highlight : noise > 0.25 ? base : shadow;
            } else {
              // Dirt side colors
              const dirtNoise = pseudoRand(x, y);
              color = dirtNoise > 0.7 ? '#a46f3d' : dirtNoise > 0.3 ? '#8b5a2b' : '#6a421d';
            }
          }
          break;

        case BlockType.DIRT:
          color = noise > 0.7 ? highlight : noise > 0.3 ? base : shadow;
          break;

        case BlockType.STONE:
          // Stone noise and cracks
          if (noise > 0.85) {
            color = highlight;
          } else if (noise < 0.15) {
            color = shadow;
          } else if (noise > 0.45 && noise < 0.52) {
            color = '#515a5a'; // darker crack
          } else {
            color = base;
          }
          break;

        case BlockType.WOOD:
          if (face === 'top' || face === 'bottom') {
            // Wood rings
            const centerX = size / 2;
            const centerY = size / 2;
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            if (dist < 2.5) {
              color = '#4d3026'; // dark core
            } else if (dist < 4.5) {
              color = accent || '#d7b174'; // inner ring
            } else if (dist < 6.5) {
              color = '#8f5e4f'; // outer ring
            } else {
              color = base; // bark border
            }
          } else {
            // Side bark: vertical stripes and ridges
            if (x === 1 || x === 6 || x === 11 || x === 15) {
              color = shadow;
            } else if (x === 3 || x === 8 || x === 13) {
              color = highlight;
            } else {
              color = base;
            }
          }
          break;

        case BlockType.LEAVES:
          // Leaves: green with transparent cutouts
          const isTransparent = noise < 0.18;
          if (isTransparent) {
            ctx.clearRect(x, y, 1, 1);
            continue;
          } else {
            color = noise > 0.65 ? highlight : noise > 0.3 ? base : shadow;
          }
          break;

        case BlockType.SAND:
          color = noise > 0.8 ? highlight : noise > 0.2 ? base : shadow;
          // Add some tiny dot grains
          if (pseudoRand(x * 5, y * 3) > 0.92) {
            color = '#d4ac0d';
          }
          break;

        case BlockType.COBBLESTONE:
          // Bricks / cobblestone pieces with dark boundaries
          const cellX = Math.floor(x / 4);
          const cellY = Math.floor(y / 4);
          const isBorder = (x % 4 === 0) || (y % 4 === 0);
          if (isBorder) {
            color = '#566573'; // darker border
          } else {
            const cellNoise = pseudoRand(cellX, cellY);
            color = cellNoise > 0.6 ? highlight : cellNoise > 0.2 ? base : shadow;
          }
          break;

        case BlockType.PLANKS:
          // Horizontal planks
          const plankRow = Math.floor(y / 4);
          const isPlankBorder = y % 4 === 0;
          const isPlankCrack = (x === 6 && plankRow === 0) || (x === 12 && plankRow === 1) || (x === 3 && plankRow === 2) || (x === 10 && plankRow === 3);
          if (isPlankBorder || isPlankCrack) {
            color = shadow;
          } else {
            const woodNoise = pseudoRand(x, plankRow);
            color = woodNoise > 0.7 ? highlight : base;
          }
          break;

        case BlockType.BRICK:
          // Red bricks with light grey mortar lines
          const brickRow = Math.floor(y / 4);
          const isMortarY = y % 4 === 0;
          const isMortarX = (brickRow % 2 === 0) ? (x % 8 === 0) : ((x + 4) % 8 === 0);
          if (isMortarY || isMortarX) {
            color = '#bdc3c7'; // grey mortar
          } else {
            color = noise > 0.6 ? highlight : noise > 0.25 ? base : shadow;
          }
          break;

        case BlockType.GLASS:
          // Glass: transparent with diagonal highlights
          const isDiagHighlight = Math.abs(x - y) <= 1 || Math.abs((x - 8) - y) <= 1;
          const isEdge = x === 0 || x === size - 1 || y === 0 || y === size - 1;
          if (isEdge) {
            color = '#a9cce3';
          } else if (isDiagHighlight && noise > 0.3) {
            color = '#ffffff';
          } else {
            // fully transparent inside
            ctx.clearRect(x, y, 1, 1);
            continue;
          }
          break;

        case BlockType.COAL_ORE:
        case BlockType.IRON_ORE:
        case BlockType.GOLD_ORE:
        case BlockType.DIAMOND_ORE:
          // Ore blocks are stone with colored flakes
          const isFlake = pseudoRand(x * 2.5, y * 3.5) > 0.78;
          if (isFlake) {
            color = accent || '#ffffff';
          } else {
            color = noise > 0.8 ? highlight : noise > 0.2 ? base : shadow;
          }
          break;

        case BlockType.WATER:
          // Animated / wavy water look
          color = noise > 0.7 ? highlight : noise > 0.3 ? base : shadow;
          break;

        case BlockType.SNOW:
          if (face === 'top') {
            color = noise > 0.8 ? '#f1f5f9' : '#ffffff';
          } else if (face === 'bottom') {
            color = '#8b5a2b'; // dirt
          } else {
            // side
            const grassEdge = 4 + Math.floor(pseudoRand(x, type) * 3);
            if (y < grassEdge) {
              color = noise > 0.8 ? '#f1f5f9' : '#ffffff'; // snow cap on side
            } else {
              color = pseudoRand(x, y) > 0.6 ? '#a46f3d' : '#8b5a2b';
            }
          }
          break;

        case BlockType.ICE:
          // Translucent ice block with lines
          const isIceHighlight = Math.abs((x + 2) - y) <= 1 || Math.abs((x - 10) - y) <= 1;
          color = isIceHighlight ? '#e0f2fe' : '#7dd3fc';
          break;

        case BlockType.BAMBOO_STEM:
          // Green with vertical streaks and horizontal node lines
          const isNode = y === 4 || y === 12;
          if (isNode) {
            color = '#15803d'; // dark green node line
          } else {
            color = x === 2 || x === 8 || x === 14 ? '#86efac' : '#22c55e';
          }
          break;

        case BlockType.CACTUS:
          // Green body with little white dots for spines
          const isSpine = pseudoRand(x, y) > 0.9;
          if (isSpine) {
            color = '#ffffff';
          } else {
            const stripe = x % 4 === 0;
            color = stripe ? '#166534' : '#15803d';
          }
          break;

        case BlockType.REDWOOD_LOG:
          if (face === 'top' || face === 'bottom') {
            // Dark ring
            const dist = Math.hypot(x - 8, y - 8);
            color = dist < 3 ? '#2d0e00' : dist < 6 ? '#f59e0b' : '#451a03';
          } else {
            // redwood bark pattern
            color = x % 3 === 0 ? '#2d0e00' : '#451a03';
          }
          break;

        case BlockType.REDWOOD_LEAVES:
          const leafTrans = noise < 0.25;
          if (leafTrans) {
            ctx.clearRect(x, y, 1, 1);
            continue;
          } else {
            color = noise > 0.7 ? '#059669' : noise > 0.35 ? '#064e3b' : '#022c22';
          }
          break;

        case BlockType.APPLE:
          // Translucent apple cutout texture!
          const ax = x - 8;
          const ay = y - 9;
          const distToAppleCenter = Math.sqrt(ax * ax + ay * ay);
          if (distToAppleCenter <= 4.5) {
            const isAppleHighlight = ax < -1 && ay < -1;
            const isAppleShadow = ax > 1 || ay > 1;
            color = isAppleHighlight ? highlight : isAppleShadow ? shadow : base;
          } else if (x === 8 && y >= 3 && y <= 5) {
            color = '#5c4033'; // Stem (brown)
          } else if (x === 9 && y === 3) {
            color = '#2e7d32'; // Green leaf
          } else {
            ctx.clearRect(x, y, 1, 1);
            continue;
          }
          break;

        case BlockType.COOKED_PORKCHOP:
          // Porkchop meat cutout texture!
          const px = x - 8;
          const py = y - 8;
          const isInsidePorkchop = (px >= -5 && px <= 4 && py >= -4 && py <= 5) && 
                                   !(px === -5 && py === -4) && !(px === 4 && py === 5) &&
                                   !(px === -5 && py === 5) && !(px === 4 && py === -4);
          if (isInsidePorkchop) {
            const isBoneZone = (px === -3 && py === -3) || (px === -4 && py === -3) || (px === -3 && py === -4);
            if (isBoneZone) {
              color = '#fdfefe'; // Bone (white)
            } else {
              const isPorkchopHighlight = px < -1 && py < -1;
              const isPorkchopShadow = px > 2 || py > 2;
              color = isPorkchopHighlight ? highlight : isPorkchopShadow ? shadow : base;
            }
          } else {
            ctx.clearRect(x, y, 1, 1);
            continue;
          }
          break;

        default:
          color = base;
          break;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Create THREE.js Texture
  const texture = new THREE.CanvasTexture(canvas);
  // Pixelated retro scaling
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Generate materials mapping for each block
const materialCache: Record<string, THREE.Material[]> = {};

export function getBlockMaterials(type: BlockType): THREE.Material[] {
  const cacheKey = `${type}`;
  if (materialCache[cacheKey]) {
    return materialCache[cacheKey];
  }

  const def = BLOCK_DEFINITIONS[type];
  if (!def || type === BlockType.AIR) {
    return [];
  }

  const materials: THREE.Material[] = [];

  const createMaterial = (t: THREE.Texture) => {
    let roughness = 0.85;
    let metalness = 0.0;
    
    if (type === BlockType.DIAMOND_ORE || type === BlockType.GOLD_ORE) {
      roughness = 0.22;
      metalness = 0.85;
    } else if (type === BlockType.IRON_ORE || type === BlockType.COAL_ORE) {
      roughness = 0.45;
      metalness = 0.55;
    } else if (type === BlockType.ICE || type === BlockType.GLASS) {
      roughness = 0.1;
      metalness = 0.9;
    } else if (type === BlockType.WATER) {
      roughness = 0.05;
      metalness = 0.3;
    } else if (type === BlockType.APPLE || type === BlockType.COOKED_PORKCHOP) {
      roughness = 0.35;
      metalness = 0.1;
    }

    return new THREE.MeshStandardMaterial({
      map: t,
      roughness,
      metalness,
      transparent: def.isTransparent || type === BlockType.GLASS || type === BlockType.ICE || type === BlockType.REDWOOD_LEAVES || type === BlockType.WATER || type === BlockType.APPLE || type === BlockType.COOKED_PORKCHOP,
      alphaTest: type === BlockType.LEAVES || type === BlockType.REDWOOD_LEAVES || type === BlockType.APPLE || type === BlockType.COOKED_PORKCHOP ? 0.05 : 0.0,
      side: THREE.DoubleSide,
    });
  };

  if (type === BlockType.GRASS || type === BlockType.SNOW) {
    // Order of materials in Three.js BoxGeometry:
    // px (Right), nx (Left), py (Top), ny (Bottom), pz (Front), nz (Back)
    const topTexture = createPixelTexture(type, 'top');
    const bottomTexture = createPixelTexture(type, 'bottom');
    const sideTexture = createPixelTexture(type, 'side');

    const topMat = createMaterial(topTexture);
    const bottomMat = createMaterial(bottomTexture);
    const sideMat = createMaterial(sideTexture);

    materials.push(sideMat);   // Right
    materials.push(sideMat);   // Left
    materials.push(topMat);    // Top
    materials.push(bottomMat); // Bottom
    materials.push(sideMat);   // Front
    materials.push(sideMat);   // Back
  } else if (type === BlockType.WOOD || type === BlockType.REDWOOD_LOG) {
    const topTexture = createPixelTexture(type, 'top');
    const sideTexture = createPixelTexture(type, 'side');

    const topMat = createMaterial(topTexture);
    const sideMat = createMaterial(sideTexture);

    materials.push(sideMat); // Right
    materials.push(sideMat); // Left
    materials.push(topMat);  // Top
    materials.push(topMat);  // Bottom
    materials.push(sideMat); // Front
    materials.push(sideMat); // Back
  } else {
    // Same texture on all 6 faces
    const sideTexture = createPixelTexture(type, 'side');
    const mat = createMaterial(sideTexture);
    for (let i = 0; i < 6; i++) {
      materials.push(mat);
    }
  }

  materialCache[cacheKey] = materials;
  return materials;
}
