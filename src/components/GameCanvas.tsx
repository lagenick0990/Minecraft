import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BlockType, BLOCK_DEFINITIONS, GameMode, PlayerStats, GameSettings, WeatherType } from '../types';
import { getBlockMaterials } from '../utils/texture';
import { ImprovedNoise2D, SeededRandom } from '../utils/noise';
import { Mob, MobType, spawnMobProcedural, updateMobs, handleAttackMobs, ParticleBurst } from './MobSystem';

interface GameCanvasProps {
  gameMode: GameMode;
  onUpdateStats: (stats: Partial<PlayerStats>) => void;
  onUpdateCoords: (coords: { x: number; y: number; z: number }) => void;
  hotbar: (BlockType | null)[];
  activeHotbarIndex: number;
  onBlockMined: (blockType: BlockType) => void;
  onBlockPlaced: (blockType: BlockType) => void;
  inventoryCount: (blockType: BlockType) => number;
  seed: number;
  settings: GameSettings;
  stats: PlayerStats;
  onSelectHotbarIndex: (idx: number) => void;
  virtualKeys: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
  };
  triggerVirtualMineRef: React.MutableRefObject<(() => void) | null>;
  triggerVirtualPlaceRef: React.MutableRefObject<(() => void) | null>;
  setTotalBlocks: (count: number) => void;
  setTimeOfDay: (time: number) => void;
  weather: WeatherType;
  addNotification: (text: string, color?: string) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameMode,
  onUpdateStats,
  onUpdateCoords,
  hotbar,
  activeHotbarIndex,
  onBlockMined,
  onBlockPlaced,
  inventoryCount,
  seed,
  settings,
  stats,
  onSelectHotbarIndex,
  virtualKeys,
  triggerVirtualMineRef,
  triggerVirtualPlaceRef,
  setTotalBlocks,
  setTimeOfDay,
  weather,
  addNotification,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showHitFlash, setShowHitFlash] = useState(false);

  // Keep latest refs to avoid re-running useEffect on fast updates
  const gameModeRef = useRef(gameMode);
  const activeHotbarIndexRef = useRef(activeHotbarIndex);
  const hotbarRef = useRef(hotbar);
  const settingsRef = useRef(settings);
  const statsRef = useRef(stats);
  const virtualKeysRef = useRef(virtualKeys);
  const weatherRef = useRef(weather);

  useEffect(() => {
    gameModeRef.current = gameMode;
    activeHotbarIndexRef.current = activeHotbarIndex;
    hotbarRef.current = hotbar;
    settingsRef.current = settings;
    statsRef.current = stats;
    virtualKeysRef.current = virtualKeys;
    weatherRef.current = weather;
  }, [gameMode, activeHotbarIndex, hotbar, settings, stats, virtualKeys, weather]);

  useEffect(() => {
    if (!mountRef.current) return;

    let lastCoordUpdate = 0;
    let lastTimeUpdate = 0;
    let lastDamageTime = 0;
    let lastHungerDepletionTime = performance.now();
    let lastRegenTime = performance.now();
    let previousHealth = statsRef.current.health;

    // --- GAME ENGINE CONSTANTS ---
    const CHUNK_SIZE = 16;
    const CHUNK_HEIGHT = 24;
    const WATER_LEVEL = 5;
    const GRAVITY = 22;
    const PLAYER_HEIGHT = 1.75;
    const PLAYER_RADIUS = 0.3;
    const JUMP_FORCE = 7.5;
    const WALK_SPEED = 5.0;

    // Player Mesh references
    let playerMesh: THREE.Group;
    let leftLegMesh: THREE.Mesh;
    let rightLegMesh: THREE.Mesh;
    let leftArmMesh: THREE.Mesh;
    let rightArmMesh: THREE.Mesh;

    // --- ENGINE INITIALIZATION ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#85c1e9'); // Sky blue
    scene.fog = new THREE.FogExp2('#85c1e9', 0.025);

    const camera = new THREE.PerspectiveCamera(settings.fov, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mountRef.current.appendChild(renderer.domElement);

    // Ultra High Quality Light Setup
    // 1. Soft Hemisphere light representing sky bounce and ground bounce colors
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.45);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#85c1e9', '#2d3748', 0.35); // sky blue top, dark slate bottom
    scene.add(hemiLight);

    // 2. High Resolution Sun light with soft shadows
    const sunLight = new THREE.DirectionalLight('#fffdf2', 1.5);
    sunLight.position.set(30, 50, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096; // ULTRA high shadow resolution
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 160;
    const d = 45; // wider shadow frustum covers more chunks smoothly
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0003; // perfectly tuned shadow bias to eliminate shadow acne
    sunLight.shadow.normalBias = 0.04; // normal bias further improves shadow quality on block edges
    scene.add(sunLight);

    // 3. Ambient bounce rim light to add beautiful side shading
    const rimLight = new THREE.DirectionalLight('#a1c4fd', 0.4);
    rimLight.position.set(-30, 20, -15); // opposite to Sun for gorgeous rim lighting!
    scene.add(rimLight);

    // Custom skybox dome / stars for night
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 500;
    const starsPositions = new Float32Array(starsCount * 3);
    const starRand = new SeededRandom(seed + 999);
    for (let i = 0; i < starsCount * 3; i += 3) {
      const radius = 200 + starRand.next() * 100;
      const u = starRand.next();
      const v = starRand.next();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      starsPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starsPositions[i + 1] = Math.abs(radius * Math.sin(phi) * Math.sin(theta)); // only above ground
      starsPositions[i + 2] = radius * Math.cos(phi);
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.0,
    });
    const starsPoints = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starsPoints);

    // --- RAIN PARTICLE SYSTEM ---
    const rainCount = 1500;
    const rainGeometry = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainRand = new SeededRandom(seed + 888);

    // Distribute rain particles in a volume around coordinate center
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = (rainRand.next() - 0.5) * 45;
      rainPositions[i + 1] = rainRand.next() * 35;
      rainPositions[i + 2] = (rainRand.next() - 0.5) * 45;
    }
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMaterial = new THREE.PointsMaterial({
      color: '#a5c9eb',
      size: 0.12,
      transparent: true,
      opacity: 0.0, // Fades in smoothly
      depthWrite: false,
    });
    const rainPoints = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rainPoints);

    // Track active weather colors and densities for transitions
    let actualFogDensity = 0.025;
    const actualSkyColor = new THREE.Color('#85c1e9');
    const actualSunColor = new THREE.Color('#fffdf2');
    const actualAmbientColor = new THREE.Color('#ffffff');
    const actualFogColor = new THREE.Color('#85c1e9');
    let actualSunIntensity = 1.2;
    let actualAmbientIntensity = 0.55;
    let actualRainOpacity = 0.0;
    let actualStarsOpacity = 0.0;
    let lightningTimer = 0;

    // --- PROCEDURAL WORLD STATE ---
    const noise = new ImprovedNoise2D(seed);
    const worldBlocks = new Map<string, BlockType>(); // Key: "x,y,z" -> BlockType
    const loadedChunks = new Set<string>(); // Key: "chunkX,chunkZ"

    // Sound generation helper (synthesized audio via Web Audio API)
    const playSynthSound = (frequency: number, type: 'sine' | 'square' | 'triangle' | 'sawtooth' = 'sine', duration: number = 0.1) => {
      if (!settingsRef.current.soundEnabled) return;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {
        console.warn('Audio synthesis failed to start:', e);
      }
    };

    // Biome Detector based onTemperature and Humidity noises
    const getBiomeAt = (x: number, z: number): 'WINTER' | 'DESERT' | 'BAMBOO' | 'HILLY' | 'FOREST' => {
      if (settingsRef.current.spawnBiome && settingsRef.current.spawnBiome !== 'ANY') {
        return settingsRef.current.spawnBiome;
      }

      // Scale coordinates down to make smooth biome regions (wavelength ~250 blocks)
      const bx = x / 220;
      const bz = z / 220;
      
      const tempNoise = noise.noise(bx, bz); // temperature: ranges from -1 to 1
      const humidNoise = noise.noise(bx + 100, bz + 100); // humidity: ranges from -1 to 1

      if (tempNoise < -0.3) {
        return 'WINTER'; // cold climate
      } else if (tempNoise > 0.3) {
        if (humidNoise < -0.2) {
          return 'DESERT'; // hot and dry
        } else {
          return 'BAMBOO'; // hot and wet (lush bamboo forests)
        }
      } else {
        if (humidNoise > 0.3) {
          return 'HILLY'; // temperate but very hilly/mountainous
        } else {
          return 'FOREST'; // temperate green forest
        }
      }
    };

    // Terrain Procedural Height Generator
    const getTerrainHeight = (x: number, z: number): number => {
      const biome = getBiomeAt(x, z);
      const nx = x / 40;
      const nz = z / 40;

      let height = 6;

      if (biome === 'WINTER') {
        const plains = noise.fbm(nx, nz, 3, 0.4) * 6;
        height = 7 + plains;
      } else if (biome === 'DESERT') {
        // Smooth rolling sand dunes
        const dunes = Math.sin(x / 14) * Math.cos(z / 14) * 2.2 + noise.fbm(nx, nz, 2, 0.3) * 3;
        height = 6 + dunes;
      } else if (biome === 'BAMBOO') {
        const flat = noise.fbm(nx, nz, 2, 0.3) * 4;
        height = 6 + flat;
      } else if (biome === 'HILLY') {
        // High steep jagged peaks
        const peaks = Math.abs(noise.fbm(nx * 1.5, nz * 1.5, 4, 0.55)) * 24;
        height = 8 + peaks;
      } else {
        // FOREST
        const plains = noise.fbm(nx, nz, 3, 0.45) * 8;
        const mountains = noise.fbm(nx * 2, nz * 2, 4, 0.5) * 14;
        const blend = noise.noise(nx / 3, nz / 3); // smooth blending factor
        height = 6 + THREE.MathUtils.lerp(plains, mountains, blend);
      }

      // Beach/coastal smoothing near water (exclude desert & steep hilly peak zones)
      if (biome !== 'DESERT' && biome !== 'HILLY' && height < WATER_LEVEL + 1) {
        height = THREE.MathUtils.lerp(height, WATER_LEVEL + 0.5, 0.4);
      }

      return Math.floor(height);
    };

    // Helper to spawn a specific mob directly at a location during chunk structure loading
    const spawnMobAt = (type: MobType, x: number, y: number, z: number) => {
      const mob = spawnMobProcedural(type, new THREE.Vector3(x, y, z), getTerrainHeight, scene);
      mob.position.set(x, y + 0.5, z);
      mob.group.position.copy(mob.position);
      mobsList.push(mob);
    };

    // Village House Procedural Builder
    const buildVillageHouse = (cx: number, cy: number, cz: number) => {
      // House base (5x5, height 4)
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dy = 0; dy < 4; dy++) {
            const bx = cx + dx;
            const by = cy + dy;
            const bz = cz + dz;
            
            // Outer wall shells
            if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
              const bType = dy === 0 ? BlockType.COBBLESTONE : BlockType.PLANKS;
              // Leave door opening at front
              if (dx === 0 && dz === 2 && dy < 2) {
                // door opening
              } else if (dy === 2 && (dx === 2 || dx === -2 || dz === 2 || dz === -2)) {
                // glass window opening
              } else {
                worldBlocks.set(`${bx},${by},${bz}`, bType);
              }
            } else {
              // Interior floor
              if (dy === 0) {
                worldBlocks.set(`${bx},${by},${bz}`, BlockType.PLANKS);
              }
            }
          }
        }
      }
      
      // Pyramidal wood roof
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          const rx = cx + dx;
          const ry = cy + 4;
          const rz = cz + dz;
          if (Math.abs(dx) <= 3 - Math.abs(dz)) {
            worldBlocks.set(`${rx},${ry},${rz}`, BlockType.WOOD);
          }
        }
      }
    };

    // Pillager Outpost Tower Procedural Builder
    const buildPillagerTower = (cx: number, cy: number, cz: number) => {
      // Outpost base (6x6, height 9)
      for (let dy = 0; dy < 9; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const bx = cx + dx;
            const by = cy + dy;
            const bz = cz + dz;
            const isCorner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
            const isEdge = Math.abs(dx) === 2 || Math.abs(dz) === 2;

            if (isEdge) {
              if (dy < 6) {
                // Cobblestone base with wood pillars
                worldBlocks.set(`${bx},${by},${bz}`, isCorner ? BlockType.REDWOOD_LOG : BlockType.COBBLESTONE);
              } else if (dy === 6) {
                // Lookout balcony deck ring
                worldBlocks.set(`${bx},${by},${bz}`, BlockType.REDWOOD_LOG);
              } else if (dy < 8) {
                // Lookout fencing corner posts
                if (isCorner) {
                  worldBlocks.set(`${bx},${by},${bz}`, BlockType.REDWOOD_LOG);
                }
              } else {
                // Lookout canopy base
                worldBlocks.set(`${bx},${by},${bz}`, BlockType.PLANKS);
              }
            } else if (dy === 5) {
              // Lookout wooden floor
              worldBlocks.set(`${bx},${by},${bz}`, BlockType.PLANKS);
            }
          }
        }
      }
      
      // Outpost peak roof
      worldBlocks.set(`${cx},${cy + 9},${cz}`, BlockType.REDWOOD_LOG);
    };

    // Ancient City Portal and columns Procedural Builder
    const buildAncientCity = (cx: number, cy: number, cz: number) => {
      // Cobblestone platform arena (11x11 floor)
      for (let dx = -5; dx <= 5; dx++) {
        for (let dz = -5; dz <= 5; dz++) {
          const bx = cx + dx;
          const by = cy;
          const bz = cz + dz;
          worldBlocks.set(`${bx},${by},${bz}`, (dx + dz) % 2 === 0 ? BlockType.COBBLESTONE : BlockType.STONE);
        }
      }

      // Pillars capped by blue ice soul lanterns
      const pillarOffsets = [
        [-4, -4], [-4, 4], [4, -4], [4, 4]
      ];
      pillarOffsets.forEach(([px, pz]) => {
        for (let dy = 1; dy <= 5; dy++) {
          const bType = dy === 5 ? BlockType.ICE : BlockType.STONE;
          worldBlocks.set(`${cx + px},${cy + dy},${cz + pz}`, bType);
        }
      });

      // Central portal monument
      for (let dy = 1; dy <= 4; dy++) {
        worldBlocks.set(`${cx - 1},${cy + dy},${cz}`, BlockType.STONE);
        worldBlocks.set(`${cx + 1},${cy + dy},${cz}`, BlockType.STONE);
      }
      worldBlocks.set(`${cx},${cy + 4},${cz}`, BlockType.STONE);
      worldBlocks.set(`${cx},${cy + 2},${cz}`, BlockType.ICE); // Blue glowing portal centers
      worldBlocks.set(`${cx},${cy + 3},${cz}`, BlockType.ICE);
    };

    // Generate a single chunk at coordinates (chunkX, chunkZ)
    const generateChunk = (chunkX: number, chunkZ: number) => {
      const chunkKey = `${chunkX},${chunkZ}`;
      if (loadedChunks.has(chunkKey)) return;
      loadedChunks.add(chunkKey);

      const treeRand = new SeededRandom(seed + chunkX * 73 + chunkZ * 123);

      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const worldX = chunkX * CHUNK_SIZE + x;
          const worldZ = chunkZ * CHUNK_SIZE + z;

          const biome = getBiomeAt(worldX, worldZ);
          const heightY = getTerrainHeight(worldX, worldZ);

          for (let y = 0; y < CHUNK_HEIGHT; y++) {
            const blockKey = `${worldX},${y},${worldZ}`;
            let bType = BlockType.AIR;

            if (y === 0) {
              bType = BlockType.STONE; // Bedrock bottom
            } else if (y <= heightY) {
              if (y === heightY) {
                // Top block based on biome
                if (biome === 'WINTER') {
                  bType = BlockType.SNOW;
                } else if (biome === 'DESERT') {
                  bType = BlockType.SAND;
                } else if (biome === 'HILLY') {
                  bType = treeRand.next() < 0.4 ? BlockType.COBBLESTONE : BlockType.GRASS;
                } else {
                  if (y <= WATER_LEVEL + 1) {
                    bType = BlockType.SAND; // sand beach
                  } else {
                    bType = BlockType.GRASS;
                  }
                }
              } else if (y >= heightY - 3) {
                // Underneath layers
                if (biome === 'DESERT') {
                  bType = BlockType.SAND;
                } else if (biome === 'WINTER') {
                  bType = BlockType.DIRT;
                } else {
                  bType = heightY <= WATER_LEVEL + 1 ? BlockType.SAND : BlockType.DIRT;
                }
              } else {
                // Stone depth
                bType = BlockType.STONE;

                // 3D Caves carving (intersecting tubes using noise)
                const n1 = noise.noise(worldX / 10, worldZ / 10);
                const n2 = noise.noise(worldZ / 10, y / 6);
                const isCave = Math.abs(n1 - 0.5) < 0.12 && Math.abs(n2 - 0.5) < 0.12;

                if (isCave && y > 1) {
                  bType = BlockType.AIR;
                } else {
                  // Check if adjacent to a cave (to spawn ores/minerals on wall surfaces)
                  const isWall = (y < heightY - 3) && (
                    Math.abs(noise.noise(worldX / 10, worldZ / 10) - 0.5) < 0.15 &&
                    Math.abs(noise.noise(worldZ / 10, (y + 1) / 6) - 0.5) < 0.15
                  );

                  if (isWall) {
                    const rVal = treeRand.next();
                    if (rVal < 0.005) bType = BlockType.DIAMOND_BLOCK;
                    else if (rVal < 0.010) bType = BlockType.EMERALD_BLOCK;
                    else if (rVal < 0.018) bType = BlockType.GOLD_BLOCK;
                    else if (rVal < 0.035) bType = BlockType.DIAMOND_ORE;
                    else if (rVal < 0.055) bType = BlockType.EMERALD_ORE;
                    else if (rVal < 0.080) bType = BlockType.GOLD_ORE;
                    else {
                      // fallback to normal vein noise
                      const oreNoise = noise.noise(worldX / 3.5, y / 2.5 + worldZ / 3.5);
                      if (oreNoise > 0.84) {
                        const oreSelector = treeRand.next();
                        if (oreSelector > 0.95 && y < 4) bType = BlockType.DIAMOND_ORE;
                        else if (oreSelector > 0.85 && y < 6) bType = BlockType.GOLD_ORE;
                        else if (oreSelector > 0.60) bType = BlockType.IRON_ORE;
                        else bType = BlockType.COAL_ORE;
                      }
                    }
                  } else {
                    // Regular deep ore vein logic inside solid stone
                    if (y < 8) {
                      const oreNoise = noise.noise(worldX / 3.5, y / 2.5 + worldZ / 3.5);
                      if (oreNoise > 0.84) {
                        const oreSelector = treeRand.next();
                        if (oreSelector > 0.95 && y < 4) bType = BlockType.DIAMOND_ORE;
                        else if (oreSelector > 0.85 && y < 6) bType = BlockType.GOLD_ORE;
                        else if (oreSelector > 0.60) bType = BlockType.IRON_ORE;
                        else bType = BlockType.COAL_ORE;
                      }
                    }
                  }
                }
              }
            } else if (y <= WATER_LEVEL) {
              // Water blocks/Ice blocks at sea level
              if (biome === 'WINTER' && y === WATER_LEVEL) {
                bType = BlockType.ICE; // frozen lakes
              } else if (biome === 'DESERT') {
                bType = BlockType.SAND; // dry dunes
              } else {
                bType = BlockType.WATER;
              }
            }

            if (bType !== BlockType.AIR) {
              worldBlocks.set(blockKey, bType);
            }
          }

          // Procedural Trees & Vegetation based on biome
          const topHeight = heightY;
          if (topHeight > WATER_LEVEL + 1 || biome === 'DESERT') {
            const blockKey = `${worldX},${topHeight},${worldZ}`;
            const topBlock = worldBlocks.get(blockKey);

            if (biome === 'WINTER' && topBlock === BlockType.SNOW) {
              // 2% Conifer tree chance
              if (treeRand.next() < 0.02) {
                const trunkHeight = 5 + Math.floor(treeRand.next() * 3);
                // Pine Trunk
                for (let ty = 1; ty <= trunkHeight; ty++) {
                  worldBlocks.set(`${worldX},${topHeight + ty},${worldZ}`, BlockType.REDWOOD_LOG);
                }
                // Pine conical leaves canopy
                for (let ly = 2; ly <= trunkHeight + 1; ly++) {
                  const layerRadius = Math.max(1, Math.floor((trunkHeight - ly) * 0.5) + 1);
                  for (let lx = -layerRadius; lx <= layerRadius; lx++) {
                    for (let lz = -layerRadius; lz <= layerRadius; lz++) {
                      if (Math.abs(lx) + Math.abs(lz) <= layerRadius + 1) {
                        const leafX = worldX + lx;
                        const leafY = topHeight + ly;
                        const leafZ = worldZ + lz;
                        const leafKey = `${leafX},${leafY},${leafZ}`;
                        if (worldBlocks.get(leafKey) !== BlockType.REDWOOD_LOG) {
                          worldBlocks.set(leafKey, BlockType.REDWOOD_LEAVES);
                        }
                      }
                    }
                  }
                }
              }
            } else if (biome === 'DESERT' && topBlock === BlockType.SAND) {
              // Cactus generation (1.5% chance)
              if (treeRand.next() < 0.015) {
                const cactusHeight = 2 + Math.floor(treeRand.next() * 2);
                for (let ty = 1; ty <= cactusHeight; ty++) {
                  worldBlocks.set(`${worldX},${topHeight + ty},${worldZ}`, BlockType.CACTUS);
                }
                // Branching arms
                if (cactusHeight >= 3) {
                  worldBlocks.set(`${worldX + 1},${topHeight + 2},${worldZ}`, BlockType.CACTUS);
                  worldBlocks.set(`${worldX - 1},${topHeight + 2},${worldZ}`, BlockType.CACTUS);
                }
              }
            } else if (biome === 'BAMBOO' && topBlock === BlockType.GRASS) {
              // Dense bamboo stalks (4.5% chance)
              if (treeRand.next() < 0.045) {
                const bambooHeight = 4 + Math.floor(treeRand.next() * 4);
                for (let ty = 1; ty <= bambooHeight; ty++) {
                  worldBlocks.set(`${worldX},${topHeight + ty},${worldZ}`, BlockType.BAMBOO_STEM);
                }
              }
            } else if (biome === 'FOREST' && topBlock === BlockType.GRASS) {
              // Standard leafy oak trees (1.8% chance)
              if (treeRand.next() < 0.018) {
                const trunkHeight = 4 + Math.floor(treeRand.next() * 2);
                // Wood trunk
                for (let ty = 1; ty <= trunkHeight; ty++) {
                  worldBlocks.set(`${worldX},${topHeight + ty},${worldZ}`, BlockType.WOOD);
                }
                // Leaves canopy
                for (let ly = -2; ly <= 2; ly++) {
                  for (let lx = -2; lx <= 2; lx++) {
                    for (let lz = -2; lz <= 2; lz++) {
                      const dist = Math.sqrt(lx * lx + ly * ly + lz * lz);
                      if (dist <= 2.2) {
                        const leafX = worldX + lx;
                        const leafY = topHeight + trunkHeight + ly;
                        const leafZ = worldZ + lz;
                        const leafKey = `${leafX},${leafY},${leafZ}`;
                        if (worldBlocks.get(leafKey) !== BlockType.WOOD) {
                          worldBlocks.set(leafKey, BlockType.LEAVES);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Pre-baked Structures Spawner centered at specific coordinates near spawn
      if (chunkX === 1 && chunkZ === 1) {
        // Village house at x: 24, z: 24
        const topY = getTerrainHeight(24, 24);
        buildVillageHouse(24, topY + 1, 24);
        // Spawn villagers!
        setTimeout(() => {
          spawnMobAt(MobType.VILLAGER, 23, topY + 1, 23);
          spawnMobAt(MobType.VILLAGER, 25, topY + 1, 23);
          spawnMobAt(MobType.VILLAGER, 24, topY + 1, 25);
        }, 100);
      } else if (chunkX === -2 && chunkZ === -2) {
        // Pillager Outpost Tower at x: -32, z: -32
        const topY = getTerrainHeight(-32, -32);
        buildPillagerTower(-32, topY + 1, -32);
        // Spawn Pillagers!
        setTimeout(() => {
          spawnMobAt(MobType.PILLAGER, -30, topY + 1, -30);
          spawnMobAt(MobType.PILLAGER, -34, topY + 1, -34);
          spawnMobAt(MobType.PILLAGER, -32, topY + 6, -32); // lookout tower archer!
        }, 100);
      } else if (chunkX === 1 && chunkZ === -2) {
        // Ancient City Ruins at x: 24, z: -32
        const topY = getTerrainHeight(24, -32);
        buildAncientCity(24, topY + 1, -32);
        // Spawn guardian creepers & zombies!
        setTimeout(() => {
          spawnMobAt(MobType.CREEPER, 22, topY + 1, -30);
          spawnMobAt(MobType.ZOMBIE, 26, topY + 1, -34);
          spawnMobAt(MobType.ZOMBIE, 24, topY + 1, -32);
        }, 100);
      }
    };

    // --- INSTANCED RENDERING SETUP ---
    // Instead of thousands of separate mesh nodes, we group matching blocks by BlockType
    // and render each type with a single InstancedMesh!
    const instancedMeshesMap = new Map<BlockType, THREE.InstancedMesh>();
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

    const rebuildInstancedMeshes = () => {
      // 1. Clear old instanced meshes from scene
      instancedMeshesMap.forEach((mesh) => {
        scene.remove(mesh);
        mesh.dispose();
      });
      instancedMeshesMap.clear();

      // 2. Count instances of each block type that are currently inside our render radius
      const typeCounts = new Map<BlockType, number>();
      const typePositionsList = new Map<BlockType, THREE.Vector3[]>();

      // Get player chunk
      const playerChunkX = Math.floor(playerPos.x / CHUNK_SIZE);
      const playerChunkZ = Math.floor(playerPos.z / CHUNK_SIZE);
      const radius = settingsRef.current.renderDistance;

      let countedBlocks = 0;

      worldBlocks.forEach((bType, key) => {
        const [bx, by, bz] = key.split(',').map(Number);
        const chunkX = Math.floor(bx / CHUNK_SIZE);
        const chunkZ = Math.floor(bz / CHUNK_SIZE);

        // Render only chunks within player render radius
        if (Math.abs(chunkX - playerChunkX) <= radius && Math.abs(chunkZ - playerChunkZ) <= radius) {
          // Optimization: frustum-cull / face-cull hidden blocks (only render if adjacent is air/transparent)
          let isExposed = false;
          const neighbors = [
            `${bx+1},${by},${bz}`, `${bx-1},${by},${bz}`,
            `${bx},${by+1},${bz}`, `${bx},${by-1},${bz}`,
            `${bx},${by},${bz+1}`, `${bx},${by},${bz-1}`
          ];

          for (const nKey of neighbors) {
            const nType = worldBlocks.get(nKey);
            if (!nType || nType === BlockType.WATER || BLOCK_DEFINITIONS[nType].isTransparent) {
              isExposed = true;
              break;
            }
          }

          if (isExposed || by === CHUNK_HEIGHT - 1) {
            countedBlocks++;
            const counts = typeCounts.get(bType) || 0;
            typeCounts.set(bType, counts + 1);

            const positions = typePositionsList.get(bType) || [];
            positions.push(new THREE.Vector3(bx, by, bz));
            typePositionsList.set(bType, positions);
          }
        }
      });

      setTotalBlocks(countedBlocks);

      // 2.5. Calculate Real-time Voxel Lighting
      const lightLevels = new Map<string, number>();
      interface LightSource {
        x: number;
        y: number;
        z: number;
        level: number;
      }
      const lightQueue: LightSource[] = [];

      // Add block light sources
      worldBlocks.forEach((bType, key) => {
        const [bx, by, bz] = key.split(',').map(Number);
        const chunkX = Math.floor(bx / CHUNK_SIZE);
        const chunkZ = Math.floor(bz / CHUNK_SIZE);
        if (Math.abs(chunkX - playerChunkX) <= radius && Math.abs(chunkZ - playerChunkZ) <= radius) {
          if (bType === BlockType.TORCH) {
            lightQueue.push({ x: bx, y: by, z: bz, level: 14 });
            lightLevels.set(key, 14);
          } else if (bType === BlockType.GLOWSTONE || bType === BlockType.GLOWING_LANTERN) {
            lightQueue.push({ x: bx, y: by, z: bz, level: 15 });
            lightLevels.set(key, 15);
          }
        }
      });

      // Calculate sky light level based on current timeOfDayValue (ranges 0 - 24000)
      const hour = timeOfDayValue / 1000;
      let skyLightIntensity = 15;
      if (hour > 12 && hour < 24) {
        if (hour < 14) {
          skyLightIntensity = 15 - Math.floor((hour - 12) * 6);
        } else if (hour > 22) {
          skyLightIntensity = 3 + Math.floor((hour - 22) * 6);
        } else {
          skyLightIntensity = 3;
        }
      }
      skyLightIntensity = Math.max(3, Math.min(15, skyLightIntensity));

      // Add sky light sources near the terrain surface to propagate down
      for (let cx = -radius; cx <= radius; cx++) {
        for (let cz = -radius; cz <= radius; cz++) {
          const chunkWorldX = (playerChunkX + cx) * CHUNK_SIZE;
          const chunkWorldZ = (playerChunkZ + cz) * CHUNK_SIZE;
          for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
              const wx = chunkWorldX + x;
              const wz = chunkWorldZ + z;
              const terrainH = getTerrainHeight(wx, wz);
              for (let wy = CHUNK_HEIGHT - 1; wy >= Math.max(0, terrainH - 4); wy--) {
                const key = `${wx},${wy},${wz}`;
                const bType = worldBlocks.get(key);
                const isTrans = !bType || bType === BlockType.WATER || BLOCK_DEFINITIONS[bType]?.isTransparent;
                
                if (wy >= terrainH) {
                  const currentLight = lightLevels.get(key) || 0;
                  if (skyLightIntensity > currentLight) {
                    lightLevels.set(key, skyLightIntensity);
                    lightQueue.push({ x: wx, y: wy, z: wz, level: skyLightIntensity });
                  }
                }
              }
            }
          }
        }
      }

      // Propagate lighting values via standard 3D BFS
      let queueIdx = 0;
      while (queueIdx < lightQueue.length && queueIdx < 3000) {
        const { x, y, z, level } = lightQueue[queueIdx++];
        if (level <= 1) continue;

        const nextLevel = level - 1;
        const directions = [
          [1, 0, 0], [-1, 0, 0],
          [0, 1, 0], [0, -1, 0],
          [0, 0, 1], [0, 0, -1]
        ];

        for (const [dx, dy, dz] of directions) {
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;
          const nKey = `${nx},${ny},${nz}`;
          
          const nType = worldBlocks.get(nKey);
          const isTrans = !nType || nType === BlockType.WATER || BLOCK_DEFINITIONS[nType]?.isTransparent || nType === BlockType.TORCH;
          
          if (isTrans) {
            const currentLight = lightLevels.get(nKey) || 0;
            if (currentLight < nextLevel) {
              lightLevels.set(nKey, nextLevel);
              lightQueue.push({ x: nx, y: ny, z: nz, level: nextLevel });
            }
          }
        }
      }

      // 3. Create InstancedMesh for each active block type
      typeCounts.forEach((count, bType) => {
        const mats = getBlockMaterials(bType);
        if (mats.length === 0) return;

        const instMesh = new THREE.InstancedMesh(boxGeometry, mats, count);
        instMesh.castShadow = bType !== BlockType.GLASS && bType !== BlockType.WATER;
        instMesh.receiveShadow = true;

        const positions = typePositionsList.get(bType) || [];
        const dummy = new THREE.Object3D();

        positions.forEach((pos, idx) => {
          dummy.position.copy(pos);
          dummy.updateMatrix();
          instMesh.setMatrixAt(idx, dummy.matrix);

          // Get light level for shading
          const key = `${pos.x},${pos.y},${pos.z}`;
          let lightVal = lightLevels.get(key) || 3;
          const neighbors = [
            `${pos.x+1},${pos.y},${pos.z}`, `${pos.x-1},${pos.y},${pos.z}`,
            `${pos.x},${pos.y+1},${pos.z}`, `${pos.x},${pos.y-1},${pos.z}`,
            `${pos.x},${pos.y},${pos.z+1}`, `${pos.x},${pos.y},${pos.z-1}`
          ];
          for (const nKey of neighbors) {
            const nType = worldBlocks.get(nKey);
            if (!nType || nType === BlockType.WATER || BLOCK_DEFINITIONS[nType].isTransparent || nType === BlockType.TORCH) {
              const nLight = lightLevels.get(nKey) || 3;
              if (nLight > lightVal) {
                lightVal = nLight;
              }
            }
          }

          const multiplier = Math.max(0.12, lightVal / 15);
          let r = multiplier;
          let g = multiplier;
          let b = multiplier;
          
          if (bType === BlockType.TORCH || bType === BlockType.GLOWSTONE || bType === BlockType.GLOWING_LANTERN) {
            r = 1.0;
            g = 1.0;
            b = 1.0;
          } else {
            // Apply slight torch warmth tint when lit by block light sources
            const isBlockLit = (lightLevels.get(key) || 0) > skyLightIntensity;
            if (isBlockLit) {
              r = Math.min(1.0, r * 1.15);
              g = Math.min(1.0, g * 1.0);
              b = b * 0.85;
            }
          }

          instMesh.setColorAt(idx, new THREE.Color(r, g, b));
        });

        instMesh.instanceMatrix.needsUpdate = true;
        if (instMesh.instanceColor) {
          instMesh.instanceColor.needsUpdate = true;
        }
        scene.add(instMesh);
        instancedMeshesMap.set(bType, instMesh);
      });
    };

    // --- PLAYER MOVEMENT & COLLISION DETECTION (AABB) ---
    const playerPos = new THREE.Vector3(8, 0, 8); // Start position
    const playerVelocity = new THREE.Vector3(0, 0, 0);
    let isGrounded = false;

    // Set player spawn height based on loaded terrain
    const initializePlayerSpawn = () => {
      // Pre-load immediate chunks around 0,0
      for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) {
          generateChunk(cx, cz);
        }
      }

      const spawnY = getTerrainHeight(8, 8) + 2.5;
      playerPos.set(8.5, spawnY, 8.5);
      camera.position.copy(playerPos);
      camera.position.y += PLAYER_HEIGHT - 0.15; // Camera at head height
    };

    initializePlayerSpawn();

    // Check if player's hypothetical bounding box collides with solid blocks
    const checkCollision = (position: THREE.Vector3): boolean => {
      // Player bounding box bounds
      const minX = position.x - PLAYER_RADIUS;
      const maxX = position.x + PLAYER_RADIUS;
      const minY = position.y;
      const maxY = position.y + PLAYER_HEIGHT;
      const minZ = position.z - PLAYER_RADIUS;
      const maxZ = position.z + PLAYER_RADIUS;

      // Scan all blocks surrounding player
      const startX = Math.floor(minX);
      const endX = Math.floor(maxX);
      const startY = Math.floor(minY);
      const endY = Math.floor(maxY);
      const startZ = Math.floor(minZ);
      const endZ = Math.floor(maxZ);

      for (let bx = startX; bx <= endX; bx++) {
        for (let by = startY; by <= endY; by++) {
          for (let bz = startZ; bz <= endZ; bz++) {
            const bType = worldBlocks.get(`${bx},${by},${bz}`);
            if (bType && bType !== BlockType.WATER) {
              const def = BLOCK_DEFINITIONS[bType];
              if (def.isSolid !== false) {
                // Re-verify intersection of AABB
                const bMinX = bx;
                const bMaxX = bx + 1;
                const bMinY = by;
                const bMaxY = by + 1;
                const bMinZ = bz;
                const bMaxZ = bz + 1;

                if (
                  maxX > bMinX && minX < bMaxX &&
                  maxY > bMinY && minY < bMaxY &&
                  maxZ > bMinZ && minZ < bMaxZ
                ) {
                  return true;
                }
              }
            }
          }
        }
      }
      return false;
    };

    // Update player movement and resolve collisions
    const updatePhysics = (dt: number, keys: Record<string, boolean>) => {
      // 1. Calculate target horizontal movement vector from keys
      const moveDirection = new THREE.Vector3();
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);

      // Keep only flat plane yaw for movement direction
      const yawDir = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
      const rightDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), yawDir).normalize();

      // Combined keyboard and virtual controls
      const isForward = keys['w'] || keys['arrowup'] || virtualKeysRef.current.forward;
      const isBackward = keys['s'] || keys['arrowdown'] || virtualKeysRef.current.backward;
      const isLeft = keys['a'] || keys['arrowleft'] || virtualKeysRef.current.left;
      const isRight = keys['d'] || keys['arrowright'] || virtualKeysRef.current.right;
      const isJump = keys[' '] || virtualKeysRef.current.jump;

      if (isForward) moveDirection.add(yawDir);
      if (isBackward) moveDirection.sub(yawDir);
      if (isLeft) moveDirection.add(rightDir);
      if (isRight) moveDirection.sub(rightDir);

      moveDirection.normalize();

      // Apply speeds
      playerVelocity.x = moveDirection.x * WALK_SPEED;
      playerVelocity.z = moveDirection.z * WALK_SPEED;

      // 2. Apply gravity
      if (gameModeRef.current === 'SURVIVAL') {
        playerVelocity.y -= GRAVITY * dt;
        // Limit terminal velocity
        if (playerVelocity.y < -40) playerVelocity.y = -40;
      } else {
        // Creative flight / hovering
        if (isJump) {
          playerVelocity.y = WALK_SPEED;
        } else if (keys['shift']) {
          playerVelocity.y = -WALK_SPEED;
        } else {
          playerVelocity.y = 0;
        }
      }

      // 3. Resolve position step-by-step to prevent wall-phasing
      const tempPos = playerPos.clone();

      // Move along X axis first and check collisions
      tempPos.x += playerVelocity.x * dt;
      if (checkCollision(tempPos)) {
        // resolve step-up (stepping over 0.5 or 1 block height, classic Minecraft!)
        const stepUpPos = tempPos.clone();
        stepUpPos.y += 0.55; // attempt step up
        if (!checkCollision(stepUpPos)) {
          playerPos.copy(stepUpPos);
        } else {
          playerVelocity.x = 0; // stop movement x
          tempPos.x = playerPos.x;
        }
      } else {
        playerPos.x = tempPos.x;
      }

      // Move along Z axis and check collisions
      tempPos.z += playerVelocity.z * dt;
      if (checkCollision(tempPos)) {
        const stepUpPos = tempPos.clone();
        stepUpPos.y += 0.55;
        if (!checkCollision(stepUpPos)) {
          playerPos.copy(stepUpPos);
        } else {
          playerVelocity.z = 0; // stop movement z
          tempPos.z = playerPos.z;
        }
      } else {
        playerPos.z = tempPos.z;
      }

      // Move along Y axis and check collisions (floor / ceiling)
      tempPos.y += playerVelocity.y * dt;
      if (checkCollision(tempPos)) {
        if (playerVelocity.y < 0) {
          // Falling down on solid block
          isGrounded = true;

          // Check Fall Damage in survival
          if (gameModeRef.current === 'SURVIVAL' && playerVelocity.y < -12) {
            const fallDamage = Math.floor((Math.abs(playerVelocity.y) - 10) * 1.5);
            if (fallDamage > 0) {
              playSynthSound(150, 'sawtooth', 0.25);
              onUpdateStats({ health: Math.max(0, statsRef.current.health - fallDamage) });
            }
          }

          playerVelocity.y = 0;
        } else if (playerVelocity.y > 0) {
          // Colliding ceiling head bump
          playerVelocity.y = 0;
        }
        tempPos.y = playerPos.y;
      } else {
        playerPos.y = tempPos.y;
        if (playerVelocity.y !== 0) {
          isGrounded = false;
        }
      }

      // 4. Handle jump trigger
      if (isJump && isGrounded && gameModeRef.current === 'SURVIVAL') {
        playerVelocity.y = JUMP_FORCE;
        isGrounded = false;
        playSynthSound(300, 'triangle', 0.08);
      }

      // 5. Check if fallen below world
      if (playerPos.y < -10) {
        // Teleport back to surface
        playerPos.set(playerPos.x, getTerrainHeight(playerPos.x, playerPos.z) + 3, playerPos.z);
        playerVelocity.set(0, 0, 0);
        if (gameModeRef.current === 'SURVIVAL') {
          onUpdateStats({ health: Math.max(0, statsRef.current.health - 4) });
        }
      }

      // Update camera and player model tracking
      const mode = settingsRef.current.cameraMode || 'FIRST_PERSON';

      if (playerMesh) {
        // Position player mesh at player feet center
        playerMesh.position.copy(playerPos);
        // Rotate body around Y matching the yaw look angle
        playerMesh.rotation.y = camera.rotation.y;
        
        // Hide model in first person, show in second and third person
        playerMesh.visible = mode !== 'FIRST_PERSON';

        // Animate legs/arms when moving on the ground
        const horizontalSpeed = Math.hypot(playerVelocity.x, playerVelocity.z);
        if (horizontalSpeed > 0.15 && isGrounded) {
          const wave = Math.sin(performance.now() * 0.015) * 0.45;
          leftLegMesh.rotation.x = wave;
          rightLegMesh.rotation.x = -wave;
          leftArmMesh.rotation.x = -wave * 0.8;
          rightArmMesh.rotation.x = wave * 0.8;
        } else {
          leftLegMesh.rotation.x = 0;
          rightLegMesh.rotation.x = 0;
          leftArmMesh.rotation.x = 0;
          rightArmMesh.rotation.x = 0;
        }
      }

      // Position the camera based on selected perspective mode
      if (mode === 'FIRST_PERSON') {
        camera.position.copy(playerPos);
        camera.position.y += PLAYER_HEIGHT - 0.15; // head offset
      } else if (mode === 'THIRD_PERSON') {
        // Back-follow view: camera is behind the player looking forward
        const cameraDistance = 3.6;
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(camera.rotation.x, camera.rotation.y, 0, 'YXZ'));
        camera.position.copy(playerPos);
        camera.position.y += PLAYER_HEIGHT - 0.15;
        camera.position.addScaledVector(forward, -cameraDistance);
      } else if (mode === 'SECOND_PERSON') {
        // Front-facing view: camera is in front of the player looking backward
        const cameraDistance = 3.6;
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(camera.rotation.x, camera.rotation.y, 0, 'YXZ'));
        camera.position.copy(playerPos);
        camera.position.y += PLAYER_HEIGHT - 0.15;
        camera.position.addScaledVector(forward, cameraDistance);
      }

      // Sync coordinate text in parent overlay (throttled to every 200ms to eliminate React render lag!)
      const now = performance.now();
      if (now - lastCoordUpdate > 200) {
        onUpdateCoords({ x: playerPos.x, y: playerPos.y, z: playerPos.z });
        lastCoordUpdate = now;
      }
    };

    // --- PROCEDURAL RE-CENTERING AND WORLD LOADING ---
    let lastLoadedChunkX = 999;
    let lastLoadedChunkZ = 999;

    const manageChunksAroundPlayer = () => {
      const currentChunkX = Math.floor(playerPos.x / CHUNK_SIZE);
      const currentChunkZ = Math.floor(playerPos.z / CHUNK_SIZE);

      if (currentChunkX !== lastLoadedChunkX || currentChunkZ !== lastLoadedChunkZ) {
        lastLoadedChunkX = currentChunkX;
        lastLoadedChunkZ = currentChunkZ;

        let needsRebuild = false;
        const radius = settingsRef.current.renderDistance;

        for (let cx = -radius; cx <= radius; cx++) {
          for (let cz = -radius; cz <= radius; cz++) {
            const targetX = currentChunkX + cx;
            const targetZ = currentChunkZ + cz;
            const key = `${targetX},${targetZ}`;
            if (!loadedChunks.has(key)) {
              generateChunk(targetX, targetZ);
              needsRebuild = true;
            }
          }
        }

        if (needsRebuild) {
          rebuildInstancedMeshes();
        }
      }
    };

    // Initialize world mesh render first
    rebuildInstancedMeshes();

    // --- DYNAMIC LIGHTING / DAY-NIGHT CYCLE & WEATHER ---
    let timeOfDayValue = 6000; // start at midday (0 - 24000)

    const timeKeyframes = [
      {
        tick: 0,
        skyColor: '#ff7e5f',      // Sunrise peach/orange
        sunColor: '#ff9f43',      // Warm golden sun
        ambientColor: '#d6a2e8',  // Soft lilac ambient shadows
        sunIntensity: 0.7,
        ambientIntensity: 0.35,
        starsOpacity: 0.2,
        fogColor: '#ff7e5f'
      },
      {
        tick: 2000,
        skyColor: '#a1c4fd',      // Soft morning blue
        sunColor: '#fff2cc',      // Light yellow sun
        ambientColor: '#e3f2fd',  // Crisp blue ambient shadows
        sunIntensity: 1.1,
        ambientIntensity: 0.5,
        starsOpacity: 0.0,
        fogColor: '#a1c4fd'
      },
      {
        tick: 6000,
        skyColor: '#85c1e9',      // Midday sky blue
        sunColor: '#ffffff',      // Pure white noon sun
        ambientColor: '#ffffff',  // Balanced ambient light
        sunIntensity: 1.2,
        ambientIntensity: 0.55,
        starsOpacity: 0.0,
        fogColor: '#85c1e9'
      },
      {
        tick: 10000,
        skyColor: '#93b7eb',      // Fading day blue
        sunColor: '#ffeedd',      // Warm evening tint
        ambientColor: '#f8f9fa',  // Balanced ambient light
        sunIntensity: 1.1,
        ambientIntensity: 0.5,
        starsOpacity: 0.0,
        fogColor: '#93b7eb'
      },
      {
        tick: 11500,
        skyColor: '#f39c12',      // Rich sunset gold
        sunColor: '#e67e22',      // Deep orange sunset
        ambientColor: '#f5b041',  // Orange ambient bounces
        sunIntensity: 0.9,
        ambientIntensity: 0.4,
        starsOpacity: 0.1,
        fogColor: '#f39c12'
      },
      {
        tick: 12500,
        skyColor: '#9b59b6',      // Purple dusk / twilight
        sunColor: '#ff5e00',      // Crimson sun
        ambientColor: '#5b3a6c',  // Deep purple ambient shadows
        sunIntensity: 0.4,
        ambientIntensity: 0.25,
        starsOpacity: 0.4,
        fogColor: '#9b59b6'
      },
      {
        tick: 14000,
        skyColor: '#1f2d5a',      // Early night dark indigo
        sunColor: '#3a4f7c',      // Faded blue moonray
        ambientColor: '#182245',  // Dark blue ambient
        sunIntensity: 0.1,
        ambientIntensity: 0.18,
        starsOpacity: 0.8,
        fogColor: '#1f2d5a'
      },
      {
        tick: 18000,
        skyColor: '#050814',      // Midnight deep cosmic space
        sunColor: '#85a5ff',      // Faint blue moonlight
        ambientColor: '#0b0f19',  // Dark cold shadow ambient
        sunIntensity: 0.25,       // Soft moonlight shadows
        ambientIntensity: 0.15,
        starsOpacity: 1.0,
        fogColor: '#050814'
      },
      {
        tick: 22500,
        skyColor: '#2c1b3d',      // Deep dawn violet
        sunColor: '#ff4e50',      // Magenta horizon glow
        ambientColor: '#20142b',  // Dark crimson ambient
        sunIntensity: 0.1,
        ambientIntensity: 0.2,
        starsOpacity: 0.7,
        fogColor: '#2c1b3d'
      },
      {
        tick: 24000,
        skyColor: '#ff7e5f',      // Wrap around back to sunrise
        sunColor: '#ff9f43',
        ambientColor: '#d6a2e8',
        sunIntensity: 0.7,
        ambientIntensity: 0.35,
        starsOpacity: 0.2,
        fogColor: '#ff7e5f'
      }
    ];

    const updateDayNightCycle = (dt: number) => {
      // 1 minute in real life = 24000 ticks
      // Let's speed it up: day is ~ 3 minutes
      timeOfDayValue += dt * 100;
      if (timeOfDayValue >= 24000) {
        timeOfDayValue = 0;
      }

      // Throttle setTimeOfDay state update to every 300ms to eliminate React render lag!
      const now = performance.now();
      if (now - lastTimeUpdate > 300) {
        setTimeOfDay(timeOfDayValue);
        lastTimeUpdate = now;
      }

      // Light rotation and coloring
      const angle = (timeOfDayValue / 24000) * Math.PI * 2;
      const lx = Math.cos(angle) * 60;
      const ly = Math.sin(angle) * 60;

      // Position the Sun or the Moon (shines opposite to the sun at night so it stays in the sky!)
      if (ly >= 0) {
        sunLight.position.set(lx, ly, 10);
      } else {
        sunLight.position.set(-lx, -ly, 10);
      }

      // Find the two keyframes enclosing the current timeOfDayValue
      let kf1 = timeKeyframes[0];
      let kf2 = timeKeyframes[timeKeyframes.length - 1];

      for (let i = 0; i < timeKeyframes.length - 1; i++) {
        if (timeOfDayValue >= timeKeyframes[i].tick && timeOfDayValue <= timeKeyframes[i + 1].tick) {
          kf1 = timeKeyframes[i];
          kf2 = timeKeyframes[i + 1];
          break;
        }
      }

      // Calculate interpolation ratio (t: 0 to 1)
      const duration = kf2.tick - kf1.tick;
      const t = duration > 0 ? (timeOfDayValue - kf1.tick) / duration : 0;

      // Lerp sky, sun, ambient, and fog colors from keyframes
      const baseSkyColor = new THREE.Color(kf1.skyColor).lerp(new THREE.Color(kf2.skyColor), t);
      const baseSunColor = new THREE.Color(kf1.sunColor).lerp(new THREE.Color(kf2.sunColor), t);
      const baseAmbientColor = new THREE.Color(kf1.ambientColor).lerp(new THREE.Color(kf2.ambientColor), t);
      const baseFogColor = new THREE.Color(kf1.fogColor).lerp(new THREE.Color(kf2.fogColor), t);

      let targetSunIntensity = kf1.sunIntensity + (kf2.sunIntensity - kf1.sunIntensity) * t;
      let targetAmbientIntensity = kf1.ambientIntensity + (kf2.ambientIntensity - kf1.ambientIntensity) * t;
      let targetStarsOpacity = kf1.starsOpacity + (kf2.starsOpacity - kf1.starsOpacity) * t;
      let targetFogDensity = 0.025;

      const targetSkyColor = baseSkyColor.clone();
      const targetSunColor = baseSunColor.clone();
      const targetAmbientColor = baseAmbientColor.clone();
      const targetFogColor = baseFogColor.clone();

      // Modify based on weather condition
      const activeWeather = weatherRef.current;
      if (activeWeather === 'RAINY') {
        const rainSkyColor = new THREE.Color('#434c5e'); // dark slate grey
        targetSkyColor.lerp(rainSkyColor, 0.75);
        targetFogColor.lerp(rainSkyColor, 0.75);
        targetFogDensity = 0.055;
        targetSunIntensity *= 0.25;
        targetAmbientIntensity *= 0.6;
        targetStarsOpacity = 0.0; // cloud cover hides stars
      } else if (activeWeather === 'FOGGY') {
        const fogSkyColor = ly > 0 ? new THREE.Color('#a0aec0') : new THREE.Color('#1a202c'); // dense mist
        targetSkyColor.lerp(fogSkyColor, 0.85);
        targetFogColor.lerp(fogSkyColor, 0.85);
        targetFogDensity = 0.085; // very thick fog!
        targetSunIntensity *= 0.3;
        targetAmbientIntensity = Math.max(targetAmbientIntensity * 0.8, 0.25);
        targetStarsOpacity *= 0.1; // fog dims stars
      }

      // Smoothly transition actual values toward targets
      const transitionSpeed = 1.2; // rate of transition
      actualFogDensity += (targetFogDensity - actualFogDensity) * transitionSpeed * dt;
      actualSkyColor.lerp(targetSkyColor, transitionSpeed * dt);
      actualSunColor.lerp(targetSunColor, transitionSpeed * dt);
      actualAmbientColor.lerp(targetAmbientColor, transitionSpeed * dt);
      actualFogColor.lerp(targetFogColor, transitionSpeed * dt);
      actualSunIntensity += (targetSunIntensity - actualSunIntensity) * transitionSpeed * dt;
      actualAmbientIntensity += (targetAmbientIntensity - actualAmbientIntensity) * transitionSpeed * dt;
      actualStarsOpacity += (targetStarsOpacity - actualStarsOpacity) * transitionSpeed * dt;

      // Apply to scene elements (if lightning isn't flashing)
      if (lightningTimer <= 0) {
        scene.background = actualSkyColor;
        if (scene.fog) {
          scene.fog.color = actualFogColor;
          (scene.fog as THREE.FogExp2).density = actualFogDensity;
        }
        if (renderer) renderer.setClearColor(actualSkyColor);
      }

      sunLight.color.copy(actualSunColor);
      sunLight.intensity = actualSunIntensity;
      ambientLight.color.copy(actualAmbientColor);
      ambientLight.intensity = actualAmbientIntensity * 0.75;

      if (hemiLight) {
        hemiLight.color.copy(actualSkyColor);
        hemiLight.intensity = actualAmbientIntensity * 0.5;
      }
      if (rimLight) {
        rimLight.color.copy(actualSunColor);
        rimLight.intensity = actualSunIntensity * 0.25;
      }

      // Smoothly fade star opacity
      starsMaterial.opacity = actualStarsOpacity;
      starsPoints.visible = actualStarsOpacity > 0.01;
    };

    // --- SELECTION RAYCAST HIGHLIGHTER (CROSSHAIR BOX OUTLINE) ---
    const lineGeo = new THREE.EdgesGeometry(boxGeometry);
    const lineMat = new THREE.LineBasicMaterial({ color: '#ffffff', linewidth: 3 });
    const outlineBox = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(outlineBox);

    // --- 3D BLOCKY PLAYER CHARACTER MESH ---
    playerMesh = new THREE.Group();
    
    // Materials
    const pSkinMat = new THREE.MeshStandardMaterial({ color: '#ffd3b6', roughness: 0.8 });
    const pShirtMat = new THREE.MeshStandardMaterial({ color: '#008080', roughness: 0.7 }); // Teal shirt
    const pPantsMat = new THREE.MeshStandardMaterial({ color: '#1a5276', roughness: 0.75 }); // Dark blue pants

    // Head
    const headGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    const headMesh = new THREE.Mesh(headGeo, pSkinMat);
    headMesh.position.y = 1.35;
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    playerMesh.add(headMesh);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.36, 0.52, 0.20);
    const torsoMesh = new THREE.Mesh(torsoGeo, pShirtMat);
    torsoMesh.position.y = 0.88;
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    playerMesh.add(torsoMesh);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.11, 0.48, 0.11);
    
    leftArmMesh = new THREE.Mesh(armGeo, pSkinMat);
    leftArmMesh.geometry.translate(0, -0.2, 0); // shift pivot to shoulder
    leftArmMesh.position.set(-0.24, 1.05, 0);
    leftArmMesh.castShadow = true;
    leftArmMesh.receiveShadow = true;
    playerMesh.add(leftArmMesh);

    rightArmMesh = new THREE.Mesh(armGeo, pSkinMat);
    rightArmMesh.geometry.translate(0, -0.2, 0); // shift pivot to shoulder
    rightArmMesh.position.set(0.24, 1.05, 0);
    rightArmMesh.castShadow = true;
    rightArmMesh.receiveShadow = true;
    playerMesh.add(rightArmMesh);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.14, 0.48, 0.14);

    leftLegMesh = new THREE.Mesh(legGeo, pPantsMat);
    leftLegMesh.geometry.translate(0, -0.2, 0); // shift pivot to hip
    leftLegMesh.position.set(-0.09, 0.55, 0);
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    playerMesh.add(leftLegMesh);

    rightLegMesh = new THREE.Mesh(legGeo, pPantsMat);
    rightLegMesh.geometry.translate(0, -0.2, 0); // shift pivot to hip
    rightLegMesh.position.set(0.09, 0.55, 0);
    rightLegMesh.castShadow = true;
    rightLegMesh.receiveShadow = true;
    playerMesh.add(rightLegMesh);

    scene.add(playerMesh);

    let targetedBlockPos: THREE.Vector3 | null = null;
    let targetedBlockNormal: THREE.Vector3 | null = null;

    const updateBlockSelection = () => {
      // Raycast from camera center
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      raycaster.far = 5.5; // Max reach distance is 5.5 blocks

      // Check intersections with all InstancedMeshes
      const instancedMeshes = Array.from(instancedMeshesMap.values());
      const intersects = raycaster.intersectObjects(instancedMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const instanceId = hit.instanceId;
        const mesh = hit.object as THREE.InstancedMesh;

        if (instanceId !== undefined) {
          // Retrieve the world position of the specific block instance hit
          const matrix = new THREE.Matrix4();
          mesh.getMatrixAt(instanceId, matrix);

          const pos = new THREE.Vector3();
          pos.setFromMatrixPosition(matrix);

          targetedBlockPos = pos.clone();
          targetedBlockNormal = hit.face?.normal.clone().transformDirection(mesh.matrixWorld) || null;

          // Align the wireframe highlighter box with the targeted block
          outlineBox.position.copy(pos);
          outlineBox.visible = true;
        }
      } else {
        targetedBlockPos = null;
        targetedBlockNormal = null;
        outlineBox.visible = false;
      }
    };

    // --- BLOCK BREAKING / MINING ---
    const mineTargetBlock = () => {
      if (!targetedBlockPos) return;

      const key = `${targetedBlockPos.x},${targetedBlockPos.y},${targetedBlockPos.z}`;
      const minedType = worldBlocks.get(key);

      if (minedType) {
        // In survival, check inventory limit or count
        if (gameModeRef.current === 'SURVIVAL') {
          // Play pickaxe strike synth sound
          playSynthSound(100, 'square', 0.12);
        } else {
          playSynthSound(180, 'sine', 0.05);
        }

        // Delete from block Map
        worldBlocks.delete(key);

        // Calculate tool mining bonuses
        const activeSlotType = hotbarRef.current[activeHotbarIndexRef.current];
        let yieldMultiplier = 1;

        if (gameModeRef.current === 'SURVIVAL') {
          if (activeSlotType === BlockType.DIAMOND_PICKAXE) {
            yieldMultiplier = 3;
            addNotification("💎 Diamond Pickaxe extracted 3x resources!", "text-cyan-400 font-extrabold animate-bounce");
          } else if (activeSlotType === BlockType.IRON_PICKAXE) {
            yieldMultiplier = 2;
            addNotification("⚙️ Iron Pickaxe extracted 2x resources!", "text-slate-300 font-bold");
          } else if (activeSlotType === BlockType.STONE_PICKAXE) {
            const extra = Math.random() < 0.50;
            yieldMultiplier = extra ? 2 : 1;
            if (extra) {
              addNotification("🪨 Stone Pickaxe gave 2x resources!", "text-neutral-300 font-medium");
            }
          } else if (activeSlotType === BlockType.WOODEN_PICKAXE) {
            const extra = Math.random() < 0.25;
            yieldMultiplier = extra ? 2 : 1;
            if (extra) {
              addNotification("🪵 Wooden Pickaxe gave 2x resources!", "text-amber-500 font-medium");
            }
          }
        }

        // Tell parent state to award mined block item to player (for each multiplied block)
        for (let i = 0; i < yieldMultiplier; i++) {
          onBlockMined(minedType);
        }

        // Rebuild rendering meshes
        rebuildInstancedMeshes();
      }
    };

    // --- EATING FOOD ---
    const eatFood = (foodType: BlockType) => {
      if (gameModeRef.current === 'SURVIVAL') {
        const count = inventoryCount(foodType);
        if (count <= 0) {
          addNotification('⚠️ Out of food!', 'text-amber-400');
          return;
        }
      }

      const currentHunger = statsRef.current.hunger;
      if (currentHunger >= statsRef.current.maxHunger) {
        addNotification("You are already full! No need to eat. 😋", 'text-amber-400');
        return;
      }

      const restoreAmount = foodType === BlockType.APPLE ? 4 : 8;
      const foodName = foodType === BlockType.APPLE ? 'Apple 🍎' : 'Cooked Porkchop 🥩';
      const newHunger = Math.min(statsRef.current.maxHunger, currentHunger + restoreAmount);

      onUpdateStats({ hunger: newHunger });
      onBlockPlaced(foodType); // Consume from inventory

      // Play munching and swallowing sounds
      playSynthSound(280, 'square', 0.08);
      setTimeout(() => playSynthSound(240, 'square', 0.08), 100);
      setTimeout(() => playSynthSound(200, 'triangle', 0.16), 200);

      addNotification(`😋 Ate ${foodName}! Restored +${restoreAmount} Hunger.`, 'text-emerald-400 font-medium');
    };

    // --- BLOCK PLACING ---
    const placeSelectedBlock = () => {
      if (!targetedBlockPos || !targetedBlockNormal) return;

      // New block position is adjacent on face normal
      const placePos = targetedBlockPos.clone().add(targetedBlockNormal);

      // Verify no intersection with player's bounding box
      const minX = playerPos.x - PLAYER_RADIUS;
      const maxX = playerPos.x + PLAYER_RADIUS;
      const minY = playerPos.y;
      const maxY = playerPos.y + PLAYER_HEIGHT;
      const minZ = playerPos.z - PLAYER_RADIUS;
      const maxZ = playerPos.z + PLAYER_RADIUS;

      if (
        placePos.x + 1 > minX && placePos.x < maxX &&
        placePos.y + 1 > minY && placePos.y < maxY &&
        placePos.z + 1 > minZ && placePos.z < maxZ
      ) {
        // Block is blocked by player's physical body!
        return;
      }

      // Check current active hotbar item
      const activeSlotType = hotbarRef.current[activeHotbarIndexRef.current];
      if (!activeSlotType) return; // slot is empty

      // Prevent placing tools as blocks
      if (
        activeSlotType === BlockType.WOODEN_PICKAXE ||
        activeSlotType === BlockType.STONE_PICKAXE ||
        activeSlotType === BlockType.IRON_PICKAXE ||
        activeSlotType === BlockType.DIAMOND_PICKAXE ||
        activeSlotType === BlockType.GOLDEN_SWORD
      ) {
        addNotification("⚠️ Cannot place a tool as a physical block!", "text-amber-400 font-bold");
        return;
      }

      // Survival stock check
      if (gameModeRef.current === 'SURVIVAL') {
        const stock = inventoryCount(activeSlotType);
        if (stock <= 0) return; // out of blocks!
      }

      const placeKey = `${placePos.x},${placePos.y},${placePos.z}`;
      worldBlocks.set(placeKey, activeSlotType);

      // Play place pop synth sound
      playSynthSound(440, 'triangle', 0.05);

      onBlockPlaced(activeSlotType);

      // Rebuild meshes
      rebuildInstancedMeshes();
    };

    // Expose place and mine hooks to Virtual Actions
    triggerVirtualMineRef.current = () => {
      mineTargetBlock();
    };
    triggerVirtualPlaceRef.current = () => {
      const activeSlotType = hotbarRef.current[activeHotbarIndexRef.current];
      if (activeSlotType === BlockType.APPLE || activeSlotType === BlockType.COOKED_PORKCHOP) {
        eatFood(activeSlotType);
      } else {
        placeSelectedBlock();
      }
    };

    // --- INPUT EVENT CONTROLLERS ---
    const activeKeys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      activeKeys[key] = true;

      // Handle direct key numbers 1-9 for hotbar selection
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
        onSelectHotbarIndex(parseInt(key) - 1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys[e.key.toLowerCase()] = false;
    };

    // POINTER LOCK & MOUSE DRAG LOOK LOGIC
    let isPointerLocked = false;
    let isMouseDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let mouseDownX = 0;
    let mouseDownY = 0;
    let mouseDownTime = 0;
    const canvasElement = renderer.domElement;

    const onPointerLockChange = () => {
      isPointerLocked = document.pointerLockElement === canvasElement;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isPointerLocked) {
        // Try requesting pointer lock (if permitted by frame)
        canvasElement.requestPointerLock();
      }
      isMouseDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
      mouseDownTime = performance.now();
    };

    const handleMouseUp = (e: MouseEvent) => {
      isMouseDragging = false;

      const dragDistance = Math.hypot(e.clientX - mouseDownX, e.clientY - mouseDownY);
      
      // If pointer is locked, or if not locked and didn't drag much, trigger action
      if (isPointerLocked || dragDistance < 6) {
        // Mine on left click, Place on right click
        if (e.button === 0) {
          // Construct state updater proxy to bridge with onUpdateStats
          const setStatsProxy = (updater: any) => {
            const nextStats = typeof updater === 'function' ? updater(statsRef.current) : updater;
            onUpdateStats(nextStats);
          };

          // Try hitting an active mob first; if missed, fall back to block mining
          const activeSlotType = hotbarRef.current[activeHotbarIndexRef.current];
          const hitMob = handleAttackMobs(
            mobsList,
            camera,
            scene,
            settingsRef.current.soundEnabled,
            onBlockMined,
            setStatsProxy as any,
            addNotification,
            particleBursts,
            activeSlotType
          );

          if (!hitMob) {
            mineTargetBlock();
          }
        } else if (e.button === 2) {
          const activeSlotType = hotbarRef.current[activeHotbarIndexRef.current];
          if (activeSlotType === BlockType.APPLE || activeSlotType === BlockType.COOKED_PORKCHOP) {
            eatFood(activeSlotType);
          } else {
            placeSelectedBlock();
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const sens = settingsRef.current.mouseSensitivity / 1000;
      camera.rotation.order = 'YXZ'; // Yaw (Y) then Pitch (X)

      if (isPointerLocked) {
        camera.rotation.y -= e.movementX * sens;
        camera.rotation.x -= e.movementY * sens;
        camera.rotation.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, camera.rotation.x));
      } else if (isMouseDragging) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;

        camera.rotation.y -= dx * sens;
        camera.rotation.x -= dy * sens;
        camera.rotation.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, camera.rotation.x));

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    // TOUCH/DRAG LOOK FALLBACK (FOR MOBILE AND TABLET ENVIRONMENTS)
    let isDragging = false;
    let prevTouchX = 0;
    let prevTouchY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isDragging = true;
        prevTouchX = e.touches[0].clientX;
        prevTouchY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;

      const dx = touchX - prevTouchX;
      const dy = touchY - prevTouchY;

      const sens = 0.0055;
      camera.rotation.order = 'YXZ';
      camera.rotation.y -= dx * sens;
      camera.rotation.x -= dy * sens;
      camera.rotation.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, camera.rotation.x));

      prevTouchX = touchX;
      prevTouchY = touchY;
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    // Register Handlers
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvasElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    // Touch Support for Mobile Look
    canvasElement.addEventListener('touchstart', handleTouchStart);
    canvasElement.addEventListener('touchmove', handleTouchMove);
    canvasElement.addEventListener('touchend', handleTouchEnd);

    // Prevent default right click menu on game scene
    const preventRightClick = (e: MouseEvent) => e.preventDefault();
    canvasElement.addEventListener('contextmenu', preventRightClick);

    // --- LIGHTNING EFFECT DURING STORMS ---
    const updateLightning = (dt: number) => {
      if (weatherRef.current !== 'RAINY') {
        lightningTimer = 0;
        return;
      }

      if (lightningTimer > 0) {
        lightningTimer -= dt;
        if (lightningTimer <= 0) {
          // restore standard color
          scene.background = actualSkyColor;
          if (scene.fog) scene.fog.color = actualSkyColor;
        } else {
          // flash bright white/blue
          const flashColor = new THREE.Color('#e2e8f0');
          scene.background = flashColor;
          if (scene.fog) scene.fog.color = flashColor;
          if (renderer) renderer.setClearColor(flashColor);
        }
      } else {
        // 0.1% chance of starting a lightning flash per frame inside rainy storm
        if (Math.random() < 0.001) {
          lightningTimer = 0.15; // flash lasts for 150ms
          playSynthSound(45, 'sawtooth', 0.85); // rumble bass synth sound
          setTimeout(() => {
            playSynthSound(35, 'square', 0.6);
          }, 150);
        }
      }
    };

    // --- MOB SYSTEM SETUP ---
    const mobsList: Mob[] = [];
    const particleBursts: ParticleBurst[] = [];
    let mobSpawnTimer = 0.0;
    const MAX_MOBS = 8;

    const triggerPlayerHitFlash = () => {
      setShowHitFlash(true);
      setTimeout(() => setShowHitFlash(false), 180);
    };

    const checkMobCollision = (pos: THREE.Vector3, w: number, h: number): boolean => {
      const minX = pos.x - w / 2;
      const maxX = pos.x + w / 2;
      const minY = pos.y;
      const maxY = pos.y + h;
      const minZ = pos.z - w / 2;
      const maxZ = pos.z + w / 2;

      const startX = Math.floor(minX);
      const endX = Math.floor(maxX);
      const startY = Math.floor(minY);
      const endY = Math.floor(maxY);
      const startZ = Math.floor(minZ);
      const endZ = Math.floor(maxZ);

      for (let bx = startX; bx <= endX; bx++) {
        for (let by = startY; by <= endY; by++) {
          for (let bz = startZ; bz <= endZ; bz++) {
            const bType = worldBlocks.get(`${bx},${by},${bz}`);
            if (bType && bType !== BlockType.WATER) {
              const def = BLOCK_DEFINITIONS[bType];
              if (def && def.isSolid !== false) {
                if (
                  maxX > bx && minX < bx + 1 &&
                  maxY > by && minY < by + 1 &&
                  maxZ > bz && minZ < bz + 1
                ) {
                  return true;
                }
              }
            }
          }
        }
      }
      return false;
    };

    // --- GAME LOOP ---
    const clock = new THREE.Clock();
    let animId = 0;

    const tick = () => {
      animId = requestAnimationFrame(tick);

      const dt = Math.min(0.08, clock.getDelta()); // Cap delta to prevent clipping on frame drop

      // Update character physics
      updatePhysics(dt, activeKeys);

      // --- MOBS & PARTICLES UPDATE ---
      // Update custom visual particles
      for (let i = particleBursts.length - 1; i >= 0; i--) {
        const active = particleBursts[i].update(dt, scene);
        if (!active) {
          particleBursts.splice(i, 1);
        }
      }

      // Procedural Mob Spawning and despawn ring check
      mobSpawnTimer += dt;
      if (mobSpawnTimer > 2.5) {
        mobSpawnTimer = 0;
        const activeMobs = mobsList.filter((m) => !m.isDead);
        if (activeMobs.length < 16) { // Increase max mobs to populate the biomes!
          // Choose random coordinate inside spawn radius around player
          const angle = Math.random() * Math.PI * 2;
          const radius = 16 + Math.random() * 20;
          const spawnX = Math.floor(playerPos.x + Math.cos(angle) * radius);
          const spawnZ = Math.floor(playerPos.z + Math.sin(angle) * radius);
          const b = getBiomeAt(spawnX, spawnZ);

          // Allowed spawning creatures based on climate biome
          let allowedTypes = [MobType.SHEEP, MobType.PIG];
          if (b === 'WINTER') {
            allowedTypes = [MobType.YAK, MobType.FOX, MobType.WOLF, MobType.SHEEP, MobType.BAT];
          } else if (b === 'BAMBOO') {
            allowedTypes = [MobType.TIGER, MobType.FROG, MobType.CHICKEN, MobType.BIRD, MobType.BAT];
          } else if (b === 'DESERT') {
            allowedTypes = [MobType.FOX, MobType.BAT, MobType.CREEPER];
          } else if (b === 'HILLY') {
            allowedTypes = [MobType.YAK, MobType.WOLF, MobType.PHANTOM, MobType.BIRD];
          } else {
            // FOREST
            allowedTypes = [MobType.COW, MobType.HORSE, MobType.CHICKEN, MobType.DOG, MobType.SHEEP, MobType.PIG, MobType.BIRD];
          }

          // Add Undead hostiles at night!
          const hour = (timeOfDayValue / 1000); // ranges 0 - 24
          const isNight = hour > 12.5 && hour < 23.5;
          if (isNight) {
            allowedTypes.push(MobType.ZOMBIE, MobType.CREEPER);
            if (b === 'HILLY' || Math.random() < 0.25) {
              allowedTypes.push(MobType.PHANTOM);
            }
          }

          // Try spawning inside a cave underground!
          let spawnY = -1;
          let isCaveSpawning = false;
          let randType = MobType.SHEEP;

          if (Math.random() < 0.40) { // 40% chance to try cave spawning
            const terrainY = Math.floor(getTerrainHeight(spawnX, spawnZ));
            // Scan downwards for a hollow air pocket (cave space)
            for (let y = terrainY - 4; y > 3; y--) {
              const currentBlock = worldBlocks.get(`${spawnX},${y},${spawnZ}`);
              const blockBelow = worldBlocks.get(`${spawnX},${y - 1},${spawnZ}`);
              const blockAbove = worldBlocks.get(`${spawnX},${y + 1},${spawnZ}`);
              
              // If current and above are empty, and below is solid ground, we found a cave floor!
              if (!currentBlock && !blockAbove && blockBelow && blockBelow !== BlockType.WATER) {
                spawnY = y;
                isCaveSpawning = true;
                break;
              }
            }
          }

          if (isCaveSpawning && spawnY > 0) {
            // Hostile/Bat cave mobs!
            const cavePool = [MobType.ZOMBIE, MobType.CREEPER, MobType.BAT];
            randType = cavePool[Math.floor(Math.random() * cavePool.length)];
          } else {
            const randTypeSelected = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
            randType = randTypeSelected;
            spawnY = getTerrainHeight(spawnX, spawnZ) + 1;
          }

          const newMob = spawnMobProcedural(randType, playerPos, getTerrainHeight, scene);
          newMob.position.set(spawnX, spawnY, spawnZ);
          newMob.group.position.set(spawnX, spawnY, spawnZ);

          mobsList.push(newMob);
        }

        // Clean extremely distant offscreen mobs to free WebGL memory
        for (let i = mobsList.length - 1; i >= 0; i--) {
          const m = mobsList[i];
          if (!m.isDead && m.position.distanceTo(playerPos) > 60) {
            scene.remove(m.group);
            mobsList.splice(i, 1);
          }
        }
      }

      // Create difficulty-aware stats updater proxy to scale damage dynamically
      const difficultyAwareStatsUpdate = (updater: any) => {
        const nextStats = typeof updater === 'function' ? updater(statsRef.current) : { ...statsRef.current, ...updater };
        if (nextStats.health !== undefined && nextStats.health < statsRef.current.health) {
          const rawDamage = statsRef.current.health - nextStats.health;
          const diffSetting = settingsRef.current.difficulty || 'MEDIUM';
          let scaledDamage = rawDamage;
          if (diffSetting === 'EASY') {
            scaledDamage = Math.max(1, Math.round(rawDamage * 0.5)); // half damage
          } else if (diffSetting === 'HARDCORE') {
            scaledDamage = Math.round(rawDamage * 2.0); // double damage
          }
          nextStats.health = Math.max(0, statsRef.current.health - scaledDamage);
        }
        onUpdateStats(nextStats);
      };

      // Update AI behaviors and physical positions
      updateMobs(
        mobsList,
        dt,
        playerPos,
        checkMobCollision,
        worldBlocks,
        statsRef.current,
        difficultyAwareStatsUpdate,
        settingsRef.current.soundEnabled,
        scene,
        rebuildInstancedMeshes,
        addNotification,
        triggerPlayerHitFlash,
        gameModeRef.current,
        performance.now(),
        particleBursts
      );

      // --- SURVIVAL METABOLICS & REGENERATION ---
      const currentTime = performance.now();
      const currentHealth = statsRef.current.health;
      if (currentHealth < previousHealth) {
        lastDamageTime = currentTime;
      }
      previousHealth = currentHealth;

      if (gameModeRef.current === 'SURVIVAL') {
        // 1. Slow hunger depletion based on movement
        const isMoving = activeKeys['w'] || activeKeys['s'] || activeKeys['a'] || activeKeys['d'] || activeKeys[' '] || activeKeys['shift'];
        const depletionInterval = isMoving ? 22000 : 44000;
        if (currentTime - lastHungerDepletionTime > depletionInterval) {
          const currentHunger = statsRef.current.hunger;
          if (currentHunger > 0) {
            onUpdateStats({ hunger: Math.max(0, currentHunger - 1) });
            if (currentHunger - 1 === 4) {
              addNotification('⚠️ You are getting hungry! Find some food. 🍎', 'text-amber-400 font-semibold');
            } else if (currentHunger - 1 === 0) {
              addNotification('☠️ Starving! You are taking damage from hunger!', 'text-rose-500 font-bold');
            }
          }
          lastHungerDepletionTime = currentTime;
        }

        // 2. Starvation damage at 0 hunger (drains to 1 health every 4s)
        if (statsRef.current.hunger === 0 && currentTime - lastRegenTime > 4000) {
          if (statsRef.current.health > 1) {
            onUpdateStats({ health: Math.max(1, statsRef.current.health - 1) });
            playSynthSound(100, 'sawtooth', 0.15);
            addNotification('💔 Starving...', 'text-rose-400');
          }
          lastRegenTime = currentTime;
        }

        // 3. Health regeneration at >= 90% hunger (>= 18) and not damaged in last 6s
        if (statsRef.current.hunger >= 18) {
          const hasNotTakenDamageRecently = (currentTime - lastDamageTime) > 6000;
          if (hasNotTakenDamageRecently && statsRef.current.health < statsRef.current.maxHealth) {
            if (currentTime - lastRegenTime > 3500) {
              onUpdateStats({ health: Math.min(statsRef.current.maxHealth, statsRef.current.health + 1) });
              playSynthSound(500, 'sine', 0.1);
              addNotification('💚 Health regenerating...', 'text-emerald-300');
              lastRegenTime = currentTime;
            }
          }
        }
      }

      // Handle procedurally generating chunks as player wanders
      manageChunksAroundPlayer();

      // Run day night cycle and weather environment adjustments
      updateDayNightCycle(dt);

      // Run lightning flashes
      updateLightning(dt);

      // Rain particle physics and position wrapping
      const targetRainOpacity = weatherRef.current === 'RAINY' ? 0.75 : 0.0;
      actualRainOpacity += (targetRainOpacity - actualRainOpacity) * 2.0 * dt;
      rainMaterial.opacity = actualRainOpacity;

      if (actualRainOpacity > 0.01) {
        rainPoints.visible = true;
        const positions = rainGeometry.attributes.position.array as Float32Array;

        for (let i = 0; i < rainCount * 3; i += 3) {
          positions[i + 1] -= 26.0 * dt; // vertical speed

          // Wrap X coordinate relative to player
          const relX = positions[i] - playerPos.x;
          if (relX < -22.5) positions[i] += 45;
          else if (relX > 22.5) positions[i] -= 45;

          // Wrap Z coordinate relative to player
          const relZ = positions[i + 2] - playerPos.z;
          if (relZ < -22.5) positions[i + 2] += 45;
          else if (relZ > 22.5) positions[i + 2] -= 45;

          // Wrap Y coordinate relative to player
          if (positions[i + 1] < playerPos.y - 10) {
            positions[i + 1] = playerPos.y + 25 + Math.random() * 5;
            positions[i] = playerPos.x + (Math.random() - 0.5) * 45;
            positions[i + 2] = playerPos.z + (Math.random() - 0.5) * 45;
          }
        }
        rainGeometry.attributes.position.needsUpdate = true;
      } else {
        rainPoints.visible = false;
      }

      // Cast crosshair block highlight
      updateBlockSelection();

      // Render Frame
      renderer.render(scene, camera);
    };

    clock.start();
    tick();

    // --- HANDLE CONTAINER WINDOW RESIZES ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(mountRef.current);

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      if (canvasElement) {
        canvasElement.removeEventListener('mousedown', handleMouseDown);
        canvasElement.removeEventListener('touchstart', handleTouchStart);
        canvasElement.removeEventListener('touchmove', handleTouchMove);
        canvasElement.removeEventListener('touchend', handleTouchEnd);
        canvasElement.removeEventListener('contextmenu', preventRightClick);
      }
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();

      // Clean up procedural mobs from scene
      mobsList.forEach((m) => {
        scene.remove(m.group);
      });

      // Dispose webgl resources
      instancedMeshesMap.forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      boxGeometry.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      rainGeometry.dispose();
      rainMaterial.dispose();
      renderer.dispose();
    };
  }, [seed]); // Redraw world on seed reset

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full outline-hidden" />
      {/* Fullscreen red flashing vignette when damaged by zombies or explosions */}
      {showHitFlash && (
        <div className="absolute inset-0 bg-red-600/35 pointer-events-none transition-opacity duration-100 animate-pulse border-8 border-red-800 z-25" />
      )}
    </div>
  );
};
