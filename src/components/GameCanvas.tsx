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

    // --- GAME ENGINE CONSTANTS ---
    const CHUNK_SIZE = 16;
    const CHUNK_HEIGHT = 24;
    const WATER_LEVEL = 5;
    const GRAVITY = 22;
    const PLAYER_HEIGHT = 1.75;
    const PLAYER_RADIUS = 0.3;
    const JUMP_FORCE = 7.5;
    const WALK_SPEED = 5.0;

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

    // Light Setup
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fffdf2', 1.2);
    sunLight.position.set(20, 40, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const d = 30;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

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
    const starsMaterial = new THREE.PointsMaterial({ color: '#ffffff', size: 1.5, sizeAttenuation: false });
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
    let actualSunIntensity = 1.2;
    let actualAmbientIntensity = 0.55;
    let actualRainOpacity = 0.0;
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

    // Terrain Procedural Height Generator
    const getTerrainHeight = (x: number, z: number): number => {
      // Scale coordinates down to make gentle rolling hills
      const nx = x / 40;
      const nz = z / 40;

      // Base flat plains + some bigger hills
      const plains = noise.fbm(nx, nz, 3, 0.45) * 8;
      const mountains = noise.fbm(nx * 2, nz * 2, 4, 0.5) * 16;
      const blend = noise.noise(nx / 3, nz / 3); // smooth blending factor

      let height = 6 + THREE.MathUtils.lerp(plains, mountains, blend);

      // Beach/coastal smoothing near water
      if (height < WATER_LEVEL + 1) {
        height = THREE.MathUtils.lerp(height, WATER_LEVEL + 0.5, 0.4);
      }

      return Math.floor(height);
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

          const heightY = getTerrainHeight(worldX, worldZ);

          for (let y = 0; y < CHUNK_HEIGHT; y++) {
            const blockKey = `${worldX},${y},${worldZ}`;
            let bType = BlockType.AIR;

            if (y === 0) {
              bType = BlockType.STONE; // Bedrock bottom
            } else if (y <= heightY) {
              if (y === heightY) {
                // Top block
                if (y <= WATER_LEVEL + 1) {
                  bType = BlockType.SAND; // sand beach
                } else {
                  bType = BlockType.GRASS;
                }
              } else if (y >= heightY - 3) {
                // Underneath dirt/sand
                bType = heightY <= WATER_LEVEL + 1 ? BlockType.SAND : BlockType.DIRT;
              } else {
                // Stone depth
                bType = BlockType.STONE;

                // Procedural Ore veins deep in the stone
                if (y < 8) {
                  const oreNoise = noise.noise(worldX / 3.5, y / 2.5 + worldZ / 3.5);
                  if (oreNoise > 0.84) {
                    // Random ore based on depth
                    const oreSelector = treeRand.next();
                    if (oreSelector > 0.95 && y < 4) bType = BlockType.DIAMOND_ORE;
                    else if (oreSelector > 0.85 && y < 6) bType = BlockType.GOLD_ORE;
                    else if (oreSelector > 0.60) bType = BlockType.IRON_ORE;
                    else bType = BlockType.COAL_ORE;
                  }
                }
              }
            } else if (y <= WATER_LEVEL) {
              // Fill with water up to water level
              bType = BlockType.WATER;
            }

            if (bType !== BlockType.AIR) {
              worldBlocks.set(blockKey, bType);
            }
          }

          // Procedural Trees (Only on top of Grass)
          const topHeight = heightY;
          if (topHeight > WATER_LEVEL + 1) {
            const blockKey = `${worldX},${topHeight},${worldZ}`;
            if (worldBlocks.get(blockKey) === BlockType.GRASS) {
              // 1.5% chance for a tree
              if (treeRand.next() < 0.018) {
                const trunkHeight = 4 + Math.floor(treeRand.next() * 2);

                // Trunk
                for (let ty = 1; ty <= trunkHeight; ty++) {
                  worldBlocks.set(`${worldX},${topHeight + ty},${worldZ}`, BlockType.WOOD);
                }

                // Leaves canopy
                for (let ly = -2; ly <= 2; ly++) {
                  for (let lx = -2; lx <= 2; lx++) {
                    for (let lz = -2; lz <= 2; lz++) {
                      // Rounded leaf sphere
                      const dist = Math.sqrt(lx * lx + ly * ly + lz * lz);
                      if (dist <= 2.2) {
                        const leafX = worldX + lx;
                        const leafY = topHeight + trunkHeight + ly;
                        const leafZ = worldZ + lz;
                        const leafKey = `${leafX},${leafY},${leafZ}`;

                        // Don't replace wood
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
        });

        instMesh.instanceMatrix.needsUpdate = true;
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

      // Update camera tracking
      camera.position.copy(playerPos);
      camera.position.y += PLAYER_HEIGHT - 0.15; // head offset

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

      sunLight.position.set(lx, ly, 10);

      // Base Day/Night calculations
      const targetSkyColor = new THREE.Color();
      let targetFogDensity = 0.025;
      let targetSunIntensity = 0;
      let targetAmbientIntensity = 0.15;
      let targetStarsVisible = false;

      if (ly > 0) {
        // Daytime base values
        targetSunIntensity = Math.min(1.2, (ly / 10) * 1.2);
        targetAmbientIntensity = Math.min(0.55, 0.2 + (ly / 15) * 0.35);

        const dayColor = new THREE.Color('#85c1e9');
        const sunsetColor = new THREE.Color('#e67e22');
        const sunInterpolate = Math.max(0, Math.min(1, ly / 12));
        targetSkyColor.copy(sunsetColor).lerp(dayColor, sunInterpolate);

        targetStarsVisible = ly < 15;
      } else {
        // Nighttime base values
        targetSunIntensity = 0;
        targetAmbientIntensity = 0.15;
        targetSkyColor.set('#0b1021');
        targetStarsVisible = true;
      }

      // Modify based on weather condition
      const activeWeather = weatherRef.current;
      if (activeWeather === 'RAINY') {
        const rainSkyColor = new THREE.Color('#434c5e'); // dark slate grey
        targetSkyColor.lerp(rainSkyColor, 0.75);
        targetFogDensity = 0.055;
        targetSunIntensity *= 0.25;
        targetAmbientIntensity *= 0.6;
        targetStarsVisible = false;
      } else if (activeWeather === 'FOGGY') {
        const fogSkyColor = ly > 0 ? new THREE.Color('#a0aec0') : new THREE.Color('#1a202c'); // dense mist
        targetSkyColor.lerp(fogSkyColor, 0.85);
        targetFogDensity = 0.085; // very thick fog!
        targetSunIntensity *= 0.3;
        targetAmbientIntensity = Math.max(targetAmbientIntensity * 0.8, 0.25);
        targetStarsVisible = false;
      }

      // Smoothly transition actual values toward targets
      const transitionSpeed = 1.2; // rate of transition
      actualFogDensity += (targetFogDensity - actualFogDensity) * transitionSpeed * dt;
      actualSkyColor.lerp(targetSkyColor, transitionSpeed * dt);
      actualSunIntensity += (targetSunIntensity - actualSunIntensity) * transitionSpeed * dt;
      actualAmbientIntensity += (targetAmbientIntensity - actualAmbientIntensity) * transitionSpeed * dt;

      // Apply to scene elements (if lightning isn't flashing)
      if (lightningTimer <= 0) {
        scene.background = actualSkyColor;
        if (scene.fog) {
          scene.fog.color = actualSkyColor;
          (scene.fog as THREE.FogExp2).density = actualFogDensity;
        }
        if (renderer) renderer.setClearColor(actualSkyColor);
      }

      sunLight.intensity = actualSunIntensity;
      ambientLight.intensity = actualAmbientIntensity;
      starsPoints.visible = targetStarsVisible;
    };

    // --- SELECTION RAYCAST HIGHLIGHTER (CROSSHAIR BOX OUTLINE) ---
    const lineGeo = new THREE.EdgesGeometry(boxGeometry);
    const lineMat = new THREE.LineBasicMaterial({ color: '#ffffff', linewidth: 3 });
    const outlineBox = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(outlineBox);

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

        // Tell parent state to award mined block item to player
        onBlockMined(minedType);

        // Rebuild rendering meshes
        rebuildInstancedMeshes();
      }
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
      placeSelectedBlock();
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
          const hitMob = handleAttackMobs(
            mobsList,
            camera,
            scene,
            settingsRef.current.soundEnabled,
            onBlockMined,
            setStatsProxy as any,
            addNotification,
            particleBursts
          );

          if (!hitMob) {
            mineTargetBlock();
          }
        } else if (e.button === 2) {
          placeSelectedBlock();
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
      if (mobSpawnTimer > 3.0) {
        mobSpawnTimer = 0;
        const activeMobs = mobsList.filter((m) => !m.isDead);
        if (activeMobs.length < MAX_MOBS) {
          const types = [MobType.SHEEP, MobType.PIG, MobType.ZOMBIE, MobType.CREEPER];
          const randType = types[Math.floor(Math.random() * types.length)];
          const newMob = spawnMobProcedural(randType, playerPos, getTerrainHeight, scene);
          mobsList.push(newMob);
        }

        // Clean extremely distant offscreen mobs to free WebGL memory
        for (let i = mobsList.length - 1; i >= 0; i--) {
          const m = mobsList[i];
          if (!m.isDead && m.position.distanceTo(playerPos) > 55) {
            scene.remove(m.group);
            mobsList.splice(i, 1);
          }
        }
      }

      // Update AI behaviors and physical positions
      updateMobs(
        mobsList,
        dt,
        playerPos,
        checkMobCollision,
        worldBlocks,
        statsRef.current,
        onUpdateStats,
        settingsRef.current.soundEnabled,
        scene,
        rebuildInstancedMeshes,
        addNotification,
        triggerPlayerHitFlash,
        gameModeRef.current,
        performance.now(),
        particleBursts
      );

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
