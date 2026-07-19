import React from 'react';
import * as THREE from 'three';
import { BlockType, BLOCK_DEFINITIONS, PlayerStats } from '../types';

export enum MobType {
  SHEEP = 'SHEEP',
  PIG = 'PIG',
  ZOMBIE = 'ZOMBIE',
  CREEPER = 'CREEPER'
}

export interface Mob {
  id: string;
  type: MobType;
  group: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  isGrounded: boolean;
  state: 'WANDERING' | 'CHASING' | 'FLEEING' | 'EXPLODING';
  stateTimer: number;
  width: number;
  height: number;
  damageFlashTimer: number;
  isDead: boolean;
  targetPos: THREE.Vector3 | null;
  leftLegs: THREE.Mesh[];
  rightLegs: THREE.Mesh[];
  fuseTimer?: number; // for Creepers
}

// Helper to save original colors on meshes for damage flash overrides
const saveOriginalColors = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.userData.originalColors = child.material.map((m: THREE.Material) => {
          if ('color' in m) {
            return (m as any).color.clone();
          }
          return null;
        });
      } else if (child.material && 'color' in child.material) {
        child.userData.originalColor = (child.material as any).color.clone();
      }
    }
  });
};

// Helper to set or restore damage flash color
export const setMobFlashColor = (object: THREE.Object3D, colorStr: string | null) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (colorStr) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: THREE.Material) => {
            if ('color' in m) (m as any).color.set(colorStr);
          });
        } else if (child.material && 'color' in child.material) {
          (child.material as any).color.set(colorStr);
        }
      } else {
        // Restore
        if (Array.isArray(child.material) && child.userData.originalColors) {
          child.material.forEach((m: THREE.Material, idx: number) => {
            if (child.userData.originalColors[idx] && 'color' in m) {
              (m as any).color.copy(child.userData.originalColors[idx]);
            }
          });
        } else if (child.userData.originalColor && child.material && 'color' in child.material) {
          (child.material as any).color.copy(child.userData.originalColor);
        }
      }
    }
  });
};

// --- MODEL GENERATION FUNCTIONS ---

export const createSheepMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'sheep';

  const woolMat = new THREE.MeshStandardMaterial({ color: '#f8f9fa', roughness: 0.95 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#ffd3b6', roughness: 0.8 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: '#855b41', roughness: 0.8 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#101010' });

  // Body (Wool)
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.7, 1.2);
  const body = new THREE.Mesh(bodyGeo, woolMat);
  body.position.set(0, 0.6, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.45);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 1.0, 0.6);
  head.castShadow = true;

  // Wool cap on head
  const capGeo = new THREE.BoxGeometry(0.42, 0.2, 0.3);
  const cap = new THREE.Mesh(capGeo, woolMat);
  cap.position.set(0, 0.2, -0.05);
  head.add(cap);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const leftEye = new THREE.Mesh(eyeGeo, blackMat);
  leftEye.position.set(-0.21, 0.05, 0.15);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.21;
  head.add(leftEye, rightEye);

  group.add(head);

  // Legs (4 of them)
  const legGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
  const flLeg = new THREE.Mesh(legGeo, woolMat);
  flLeg.position.set(-0.25, 0.25, 0.45);
  flLeg.castShadow = true;

  // Hoof
  const hoofGeo = new THREE.BoxGeometry(0.18, 0.12, 0.18);
  const flHoof = new THREE.Mesh(hoofGeo, hoofMat);
  flHoof.position.set(0, -0.22, 0);
  flLeg.add(flHoof);

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.25;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.45;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.45;

  group.add(flLeg, frLeg, blLeg, brLeg);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head: head,
  };

  saveOriginalColors(group);
  return group;
};

export const createPigMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'pig';

  const pigMat = new THREE.MeshStandardMaterial({ color: '#ff8da1', roughness: 0.75 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: '#ff5c7c', roughness: 0.75 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#101010' });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.75, 0.65, 1.15);
  const body = new THREE.Mesh(bodyGeo, pigMat);
  body.position.set(0, 0.55, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const head = new THREE.Mesh(headGeo, pigMat);
  head.position.set(0, 0.85, 0.55);
  head.castShadow = true;

  // Snout
  const snoutGeo = new THREE.BoxGeometry(0.2, 0.12, 0.12);
  const snout = new THREE.Mesh(snoutGeo, snoutMat);
  snout.position.set(0, -0.08, 0.22);
  head.add(snout);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.06, 0.08, 0.06);
  const leftEye = new THREE.Mesh(eyeGeo, blackMat);
  leftEye.position.set(-0.21, 0.05, 0.1);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.21;
  head.add(leftEye, rightEye);

  group.add(head);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
  const flLeg = new THREE.Mesh(legGeo, pigMat);
  flLeg.position.set(-0.22, 0.225, 0.4);
  flLeg.castShadow = true;

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.22;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.4;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.4;

  group.add(flLeg, frLeg, blLeg, brLeg);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head: head,
  };

  saveOriginalColors(group);
  return group;
};

export const createZombieMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'zombie';

  const skinMat = new THREE.MeshStandardMaterial({ color: '#52796f', roughness: 0.8 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: '#00b4d8', roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: '#03045e', roughness: 0.85 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#9d0208' });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
  const body = new THREE.Mesh(bodyGeo, shirtMat);
  body.position.set(0, 0.975, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 1.55, 0);
  head.castShadow = true;

  // Red zombie eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.05, 0.05);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.11, 0.04, 0.2);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.11;
  head.add(leftEye, rightEye);

  group.add(head);

  // Zombie Arms - Extended directly forward!
  const armGeo = new THREE.BoxGeometry(0.15, 0.65, 0.15);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(-0.32, 1.25, 0.25);
  leftArm.rotation.x = -Math.PI / 2.1; // Extended forward
  leftArm.castShadow = true;

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.32;

  group.add(leftArm, rightArm);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.13, 0.325, 0);
  leftLeg.castShadow = true;

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.13;

  group.add(leftLeg, rightLeg);

  group.userData = {
    leftLegs: [leftLeg],
    rightLegs: [rightLeg],
    head: head,
  };

  saveOriginalColors(group);
  return group;
};

export const createCreeperMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'creeper';

  // Distinct blocky green creeper materials
  const greenMat = new THREE.MeshStandardMaterial({ color: '#38b000', roughness: 0.9 });
  const darkGreenMat = new THREE.MeshStandardMaterial({ color: '#007200', roughness: 0.9 });
  const faceMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.35, 0.85, 0.25);
  const body = new THREE.Mesh(bodyGeo, greenMat);
  body.position.set(0, 0.825, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const head = new THREE.Mesh(headGeo, greenMat);
  head.position.set(0, 1.45, 0);
  head.castShadow = true;

  // Icon Face elements: black eyes and mouth
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
  const mouthGeo = new THREE.BoxGeometry(0.14, 0.16, 0.04);

  const leftEye = new THREE.Mesh(eyeGeo, faceMat);
  leftEye.position.set(-0.11, 0.08, 0.21);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.11;

  const mouth = new THREE.Mesh(mouthGeo, faceMat);
  mouth.position.set(0, -0.08, 0.21);

  head.add(leftEye, rightEye, mouth);
  group.add(head);

  // Legs - Creeper has 4 small stubby legs
  const legGeo = new THREE.BoxGeometry(0.16, 0.4, 0.22);
  
  const flLeg = new THREE.Mesh(legGeo, darkGreenMat);
  flLeg.position.set(-0.12, 0.2, 0.15);
  flLeg.castShadow = true;

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.12;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.15;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.15;

  group.add(flLeg, frLeg, blLeg, brLeg);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head: head,
    body: body,
  };

  saveOriginalColors(group);
  return group;
};

// --- AUDIO HELPERS FOR MOBS ---

export const playMobSound = (
  soundType: 'hit' | 'death' | 'sheep' | 'pig' | 'zombie' | 'fuse' | 'explosion',
  soundEnabled: boolean
) => {
  if (!soundEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const currentTime = audioCtx.currentTime;

    switch (soundType) {
      case 'hit': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(currentTime + 0.15);
        break;
      }
      case 'death': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(currentTime + 0.3);
        break;
      }
      case 'sheep': {
        // "Baaa" sound (triangle/sawtooth wave with vibrato/frequency modulate)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, currentTime);
        osc.frequency.linearRampToValueAtTime(290, currentTime + 0.4);
        
        // Tremolo
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.value = 16;
        lfoGain.gain.value = 25;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.08, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        lfo.start();
        osc.start();
        lfo.stop(currentTime + 0.5);
        osc.stop(currentTime + 0.5);
        break;
      }
      case 'pig': {
        // "Oink" sound (low frequency sawtooth)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, currentTime + 0.18);
        gain.gain.setValueAtTime(0.08, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(currentTime + 0.2);
        break;
      }
      case 'zombie': {
        // "Urrghhh" sound (very low pitch square wave)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(85, currentTime);
        osc.frequency.linearRampToValueAtTime(65, currentTime + 0.6);
        gain.gain.setValueAtTime(0.08, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.65);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(currentTime + 0.65);
        break;
      }
      case 'fuse': {
        // "Sssss" noise sound (fm modulated noise or just rapid sawtooth frequencies)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1500, currentTime);
        osc.frequency.linearRampToValueAtTime(1800, currentTime + 0.4);
        
        // modulation to emulate noise
        const mod = audioCtx.createOscillator();
        const modGain = audioCtx.createGain();
        mod.frequency.value = 80;
        modGain.gain.value = 600;
        mod.connect(modGain);
        modGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.12, currentTime);
        gain.gain.linearRampToValueAtTime(0.1, currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.45);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        mod.start();
        osc.start();
        mod.stop(currentTime + 0.45);
        osc.stop(currentTime + 0.45);
        break;
      }
      case 'explosion': {
        // Bass drop explosion boom + high noise burst
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, currentTime + 0.85);
        gain.gain.setValueAtTime(0.4, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.9);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(currentTime + 0.9);

        // Crackly high noise top end
        const crackle = audioCtx.createOscillator();
        const crackleGain = audioCtx.createGain();
        crackle.type = 'square';
        crackle.frequency.setValueAtTime(600, currentTime);
        crackle.frequency.exponentialRampToValueAtTime(40, currentTime + 0.4);
        crackleGain.gain.setValueAtTime(0.2, currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.45);
        crackle.connect(crackleGain);
        crackleGain.connect(audioCtx.destination);
        crackle.start();
        crackle.stop(currentTime + 0.45);
        break;
      }
    }
  } catch (e) {
    // AudioContext blocked
  }
};

// --- SPARK / EXPLOSION GEOMETRIC PARTICLE BURST ---
export class ParticleBurst {
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private velocities: number[] = [];
  private colors: Float32Array;
  private maxLife = 0.8; // seconds
  private life = 0.8;
  private active = true;

  constructor(position: THREE.Vector3, scene: THREE.Scene, type: 'smoke' | 'spark' | 'blood') {
    const pCount = type === 'smoke' ? 40 : type === 'blood' ? 15 : 60;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(pCount * 3);
    this.colors = new Float32Array(pCount * 3);

    const baseColor = new THREE.Color(
      type === 'blood' ? '#d90429' : type === 'smoke' ? '#8d99ae' : '#ffb703'
    );

    for (let i = 0; i < pCount; i++) {
      const idx = i * 3;
      this.positions[idx] = position.x + (Math.random() - 0.5) * 0.5;
      this.positions[idx + 1] = position.y + (Math.random() - 0.5) * 0.5 + 0.5;
      this.positions[idx + 2] = position.z + (Math.random() - 0.5) * 0.5;

      // Velocities
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2.0 * Math.random() - 1.0);
      const speed = (type === 'smoke' ? 1.5 : type === 'blood' ? 2.5 : 4.5) * (0.3 + Math.random() * 0.7);

      this.velocities.push(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta) + (type === 'blood' ? 1.5 : 0.5), // some upward drift
        speed * Math.cos(phi)
      );

      // Colors variation
      const c = baseColor.clone();
      if (type === 'smoke') {
        const grey = 0.4 + Math.random() * 0.3;
        c.setRGB(grey, grey, grey);
      } else if (type === 'spark') {
        if (Math.random() > 0.5) c.set('#ff4d00'); // mix fire red with yellow
      }
      this.colors[idx] = c.r;
      this.colors[idx + 1] = c.g;
      this.colors[idx + 2] = c.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: type === 'smoke' ? 0.4 : 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.geometry, material);
    scene.add(this.particles);
  }

  update(dt: number, scene: THREE.Scene): boolean {
    if (!this.active) return false;
    this.life -= dt;
    if (this.life <= 0) {
      scene.remove(this.particles);
      this.geometry.dispose();
      (this.particles.material as THREE.PointsMaterial).dispose();
      this.active = false;
      return false;
    }

    const posAttr = this.geometry.attributes.position;
    const positions = posAttr.array as Float32Array;

    for (let i = 0; i < positions.length / 3; i++) {
      const idx = i * 3;
      positions[idx] += this.velocities[idx] * dt;
      positions[idx + 1] += this.velocities[idx + 1] * dt;
      positions[idx + 2] += this.velocities[idx + 2] * dt;

      // Apply drag & gravity
      this.velocities[idx] *= 0.94;
      this.velocities[idx + 1] -= 9.8 * dt; // gravity
      this.velocities[idx + 1] *= 0.94;
      this.velocities[idx + 2] *= 0.94;
    }

    posAttr.needsUpdate = true;
    (this.particles.material as THREE.PointsMaterial).opacity = Math.max(0, this.life / this.maxLife);
    return true;
  }
}

// --- CORE MOB SYSTEM CLASS/MANAGER ---

export const spawnMobProcedural = (
  type: MobType,
  playerPos: THREE.Vector3,
  getTerrainHeight: (x: number, z: number) => number,
  scene: THREE.Scene
): Mob => {
  // Spawn in a ring around the player (between 16 and 32 blocks away)
  const angle = Math.random() * Math.PI * 2;
  const radius = 16 + Math.random() * 16;
  const spawnX = Math.floor(playerPos.x + Math.cos(angle) * radius);
  const spawnZ = Math.floor(playerPos.z + Math.sin(angle) * radius);
  const spawnY = getTerrainHeight(spawnX, spawnZ) + 1;

  let group: THREE.Group;
  let health = 10;
  let height = 0.9;
  let width = 0.6;

  switch (type) {
    case MobType.SHEEP:
      group = createSheepMesh();
      health = 8;
      height = 1.1;
      break;
    case MobType.PIG:
      group = createPigMesh();
      health = 10;
      height = 0.95;
      break;
    case MobType.ZOMBIE:
      group = createZombieMesh();
      health = 15;
      height = 1.8;
      width = 0.5;
      break;
    case MobType.CREEPER:
      group = createCreeperMesh();
      health = 12;
      height = 1.7;
      width = 0.55;
      break;
  }

  group.position.set(spawnX, spawnY, spawnZ);
  scene.add(group);

  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    group,
    position: group.position,
    velocity: new THREE.Vector3(0, 0, 0),
    health,
    maxHealth: health,
    isGrounded: false,
    state: 'WANDERING',
    stateTimer: 2 + Math.random() * 3,
    width,
    height,
    damageFlashTimer: 0,
    isDead: false,
    targetPos: null,
    leftLegs: group.userData.leftLegs || [],
    rightLegs: group.userData.rightLegs || [],
    fuseTimer: type === MobType.CREEPER ? 0 : undefined
  };
};

export const updateMobs = (
  mobs: Mob[],
  dt: number,
  playerPos: THREE.Vector3,
  checkCollision: (pos: THREE.Vector3, w: number, h: number) => boolean,
  worldBlocks: Map<string, BlockType>,
  stats: PlayerStats,
  onUpdateStats: (stats: Partial<PlayerStats>) => void,
  soundEnabled: boolean,
  scene: THREE.Scene,
  rebuildInstancedMeshes: () => void,
  addNotification: (txt: string, col?: string) => void,
  triggerPlayerHitFlash: () => void,
  gameMode: string,
  currentTime: number,
  particleBursts: ParticleBurst[]
) => {
  const GRAVITY = 20;
  const ZOMBIE_ATTACK_COOLDOWN = 1.3; // seconds
  const ZOMBIE_ATTACK_DAMAGE = 2.0; // 1 heart
  
  // Track static attack timer for zombie bite timing
  if (!(window as any)._zombieLastBite) {
    (window as any)._zombieLastBite = 0;
  }

  mobs.forEach((mob) => {
    if (mob.isDead) return;

    // 1. Damage flash timer countdown
    if (mob.damageFlashTimer > 0) {
      mob.damageFlashTimer -= dt;
      if (mob.damageFlashTimer <= 0) {
        setMobFlashColor(mob.group, null); // restore colors
      } else {
        setMobFlashColor(mob.group, '#ff3333'); // flash deep crimson
      }
    }

    const distToPlayer = mob.position.distanceTo(playerPos);

    // 2. AI Decision Trees
    mob.stateTimer -= dt;

    // Passive sound emitter (ambient mooing / oinking / grunting)
    if (Math.random() < 0.0018) {
      if (mob.type === MobType.SHEEP) playMobSound('sheep', soundEnabled);
      if (mob.type === MobType.PIG) playMobSound('pig', soundEnabled);
      if (mob.type === MobType.ZOMBIE) playMobSound('zombie', soundEnabled);
    }

    // STATE CONTROLLER
    if (mob.state === 'EXPLODING' && mob.type === MobType.CREEPER) {
      // Creeper is currently swelling to explode!
      if (mob.fuseTimer !== undefined) {
        mob.fuseTimer += dt;

        // Scale swelling animation pulse
        const swell = 1.0 + mob.fuseTimer * 0.28;
        mob.group.scale.set(swell, swell, swell);
        
        // Rapid red blinking visual
        const isRedFlash = Math.floor(mob.fuseTimer * 14) % 2 === 0;
        setMobFlashColor(mob.group, isRedFlash ? '#ffffff' : '#ff0000');

        // Stop moving
        mob.velocity.x = 0;
        mob.velocity.z = 0;

        // Escape if player flees very far
        if (distToPlayer > 4.5) {
          mob.state = 'CHASING';
          mob.fuseTimer = 0;
          mob.group.scale.set(1, 1, 1);
          setMobFlashColor(mob.group, null);
        }

        // EXPLOSION DETONATION!
        if (mob.fuseTimer >= 1.5) {
          mob.isDead = true;
          playMobSound('explosion', soundEnabled);

          // Add visual sparks and smoke particles
          particleBursts.push(new ParticleBurst(mob.position, scene, 'spark'));
          particleBursts.push(new ParticleBurst(mob.position, scene, 'smoke'));

          // Calculate distance damage and knockback force to player
          if (distToPlayer < 4.5 && gameMode === 'SURVIVAL') {
            const damageFactor = Math.max(0, 1.0 - distToPlayer / 4.5);
            const rawDamage = Math.floor(10 * damageFactor) + 2; // high damage
            if (rawDamage > 0) {
              onUpdateStats({ health: Math.max(0, stats.health - rawDamage) });
              addNotification(`💣 Creeper exploded! Took ${rawDamage / 2} hearts of damage!`, 'text-red-400 font-extrabold');
              triggerPlayerHitFlash();
            }
          }

          // Blasting the world blocks in a 2.5 block radius!
          const blastRadius = 2.5;
          const px = Math.round(mob.position.x);
          const py = Math.round(mob.position.y);
          const pz = Math.round(mob.position.z);
          let blockCountDestroyed = 0;

          for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
              for (let dz = -3; dz <= 3; dz++) {
                const targetX = px + dx;
                const targetY = py + dy;
                const targetZ = pz + dz;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (dist <= blastRadius && targetY > 0) {
                  const bKey = `${targetX},${targetY},${targetZ}`;
                  if (worldBlocks.has(bKey)) {
                    worldBlocks.delete(bKey);
                    blockCountDestroyed++;
                  }
                }
              }
            }
          }

          if (blockCountDestroyed > 0) {
            rebuildInstancedMeshes();
          }
          return;
        }
      }
    } else if (mob.state === 'FLEEING') {
      if (mob.stateTimer <= 0) {
        mob.state = 'WANDERING';
        mob.stateTimer = 3 + Math.random() * 3;
      }
      // Run directly away from player XZ
      const runDir = new THREE.Vector3().subVectors(mob.position, playerPos);
      runDir.y = 0;
      runDir.normalize();

      const speed = 4.2;
      mob.velocity.x = runDir.x * speed;
      mob.velocity.z = runDir.z * speed;
    } else {
      // HOSTILE aggro check
      const isHostile = mob.type === MobType.ZOMBIE || mob.type === MobType.CREEPER;
      if (isHostile && distToPlayer < 15 && gameMode === 'SURVIVAL') {
        mob.state = 'CHASING';
      } else if (mob.state === 'CHASING' && (distToPlayer > 18 || gameMode === 'CREATIVE')) {
        mob.state = 'WANDERING';
        mob.stateTimer = 2 + Math.random() * 4;
      }

      if (mob.state === 'CHASING') {
        // Move towards the player
        const chaseDir = new THREE.Vector3().subVectors(playerPos, mob.position);
        chaseDir.y = 0;
        chaseDir.normalize();

        const speed = mob.type === MobType.ZOMBIE ? 2.5 : 2.8;
        mob.velocity.x = chaseDir.x * speed;
        mob.velocity.z = chaseDir.z * speed;

        // Face player
        const angle = Math.atan2(chaseDir.x, chaseDir.z);
        mob.group.rotation.y = angle;

        // Zombie attack trigger
        if (mob.type === MobType.ZOMBIE && distToPlayer < 1.4 && gameMode === 'SURVIVAL') {
          const now = currentTime;
          if (now - (window as any)._zombieLastBite > ZOMBIE_ATTACK_COOLDOWN * 1000) {
            (window as any)._zombieLastBite = now;
            onUpdateStats({ health: Math.max(0, stats.health - ZOMBIE_ATTACK_DAMAGE) });
            playMobSound('hit', soundEnabled);
            addNotification(`🧟 Zombie bit you! Took 1 heart of damage!`, 'text-red-400');
            triggerPlayerHitFlash();
          }
        }

        // Creeper explosion fuse trigger
        if (mob.type === MobType.CREEPER && distToPlayer < 2.2 && gameMode === 'SURVIVAL') {
          mob.state = 'EXPLODING';
          mob.fuseTimer = 0;
          playMobSound('fuse', soundEnabled);
        }
      } else {
        // WANDERING STATE
        if (mob.stateTimer <= 0) {
          mob.stateTimer = 3 + Math.random() * 5;
          if (Math.random() < 0.6) {
            // Pick random walking direction
            const angle = Math.random() * Math.PI * 2;
            mob.targetPos = new THREE.Vector3(
              mob.position.x + Math.cos(angle) * 8,
              mob.position.y,
              mob.position.z + Math.sin(angle) * 8
            );
          } else {
            mob.targetPos = null; // stand idle
          }
        }

        if (mob.targetPos) {
          const dir = new THREE.Vector3().subVectors(mob.targetPos, mob.position);
          dir.y = 0;
          if (dir.length() < 0.5) {
            mob.targetPos = null;
            mob.velocity.x = 0;
            mob.velocity.z = 0;
          } else {
            dir.normalize();
            const speed = 1.4;
            mob.velocity.x = dir.x * speed;
            mob.velocity.z = dir.z * speed;

            // Face direction of travel
            mob.group.rotation.y = Math.atan2(dir.x, dir.z);
          }
        } else {
          mob.velocity.x = 0;
          mob.velocity.z = 0;
        }
      }
    }

    // 3. APPLY GRAVITY
    mob.velocity.y -= GRAVITY * dt;
    if (mob.velocity.y < -30) mob.velocity.y = -30;

    // 4. STEP-BY-STEP COLLISION PHYSICS
    const tempPos = mob.position.clone();
    let collidedHorizontally = false;

    // Move X and test
    tempPos.x += mob.velocity.x * dt;
    if (checkCollision(tempPos, mob.width, mob.height)) {
      collidedHorizontally = true;
      // Step Up check: try step over blocks (0.55 blocks threshold)
      const stepUp = tempPos.clone();
      stepUp.y += 0.52;
      if (!checkCollision(stepUp, mob.width, mob.height)) {
        mob.position.copy(stepUp);
      } else {
        mob.velocity.x = 0;
        tempPos.x = mob.position.x;
      }
    } else {
      mob.position.x = tempPos.x;
    }

    // Move Z and test
    tempPos.z += mob.velocity.z * dt;
    if (checkCollision(tempPos, mob.width, mob.height)) {
      collidedHorizontally = true;
      const stepUp = tempPos.clone();
      stepUp.y += 0.52;
      if (!checkCollision(stepUp, mob.width, mob.height)) {
        mob.position.copy(stepUp);
      } else {
        mob.velocity.z = 0;
        tempPos.z = mob.position.z;
      }
    } else {
      mob.position.z = tempPos.z;
    }

    // Move Y (vertical falling / jumping) and test
    tempPos.y += mob.velocity.y * dt;
    if (checkCollision(tempPos, mob.width, mob.height)) {
      if (mob.velocity.y < 0) {
        mob.isGrounded = true;
        mob.velocity.y = 0;
      } else {
        mob.velocity.y = 0;
      }
      tempPos.y = mob.position.y;
    } else {
      mob.position.y = tempPos.y;
      mob.isGrounded = false;
    }

    // Jump automatic step over walls!
    if (collidedHorizontally && mob.isGrounded) {
      mob.velocity.y = 5.2; // jump height
      mob.isGrounded = false;
    }

    // 5. ANIMATIONS (Swing legs)
    const horizSpeed = Math.hypot(mob.velocity.x, mob.velocity.z);
    if (horizSpeed > 0.2) {
      const swingSpeed = mob.state === 'FLEEING' ? 14 : 9;
      const swingAngle = Math.sin(currentTime * 0.001 * swingSpeed) * 0.55;
      mob.leftLegs.forEach((leg) => leg.rotation.x = swingAngle);
      mob.rightLegs.forEach((leg) => leg.rotation.x = -swingAngle);
    } else {
      // Return legs to neutral resting position
      mob.leftLegs.forEach((leg) => leg.rotation.x *= 0.85);
      mob.rightLegs.forEach((leg) => leg.rotation.x *= 0.85);
    }

    // Render group adjustment
    mob.group.position.copy(mob.position);
  });
};

// --- COMBAT INTERACTION (HIT/ATTACK MOB) ---

export const handleAttackMobs = (
  mobs: Mob[],
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  soundEnabled: boolean,
  onBlockMined: (bType: BlockType) => void,
  setStats: React.Dispatch<React.SetStateAction<PlayerStats>>,
  addNotification: (txt: string, col?: string) => void,
  particleBursts: ParticleBurst[]
): boolean => {
  // Raycast forward from camera core
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  raycaster.far = 4.5; // attack range is 4.5 blocks

  const mobGroups = mobs.filter((m) => !m.isDead).map((m) => m.group);
  const intersects = raycaster.intersectObjects(mobGroups, true);

  if (intersects.length > 0) {
    const hit = intersects[0];
    
    // Trace parent to find matching Mob
    let parent: THREE.Object3D | null = hit.object;
    let foundMob: Mob | null = null;

    while (parent && parent !== scene) {
      foundMob = mobs.find((m) => m.group === parent) || null;
      if (foundMob) break;
      parent = parent.parent;
    }

    if (foundMob) {
      // Deal 3 damage (out of 8-15)
      const damage = 3;
      foundMob.health -= damage;
      foundMob.damageFlashTimer = 0.2; // 200ms flash

      // Spark / blood hit particle effects
      particleBursts.push(new ParticleBurst(foundMob.position, scene, foundMob.type === MobType.ZOMBIE ? 'smoke' : 'blood'));

      // Knockback push away from camera horizontal direction
      const knockDir = new THREE.Vector3();
      camera.getWorldDirection(knockDir);
      knockDir.y = 0.2; // slight lift
      knockDir.normalize();
      foundMob.velocity.copy(knockDir.multiplyScalar(5.5));
      foundMob.isGrounded = false;

      // React to attack
      if (foundMob.state !== 'EXPLODING') {
        foundMob.state = 'FLEEING';
        foundMob.stateTimer = 3.0; // run like wind
      }

      if (foundMob.health <= 0) {
        // MOB DIES!
        foundMob.isDead = true;
        playMobSound('death', soundEnabled);
        scene.remove(foundMob.group);

        // Disperse particle cloud poof
        particleBursts.push(new ParticleBurst(foundMob.position, scene, 'smoke'));

        // Award kill score points
        const points = foundMob.type === MobType.ZOMBIE || foundMob.type === MobType.CREEPER ? 60 : 25;
        setStats((prev) => ({ ...prev, score: prev.score + points }));

        // Drops rewards to player!
        let dropType = BlockType.DIRT;
        let dropCount = 1;
        let dropName = 'Drops';

        if (foundMob.type === MobType.SHEEP) {
          dropType = BlockType.LEAVES; // Fluffy wool block!
          dropCount = 2;
          dropName = 'Wool (Leaves)';
        } else if (foundMob.type === MobType.PIG) {
          dropType = BlockType.BRICK; // Raw Porkchop red brick proxy!
          dropCount = 2;
          dropName = 'Raw Porkchop (Bricks)';
        } else if (foundMob.type === MobType.ZOMBIE) {
          // rare reward
          const rand = Math.random();
          if (rand > 0.85) {
            dropType = BlockType.IRON_ORE;
            dropName = 'Iron Ore';
          } else {
            dropType = BlockType.COBBLESTONE;
            dropName = 'Cobblestone';
          }
          dropCount = 1;
        } else if (foundMob.type === MobType.CREEPER) {
          // rare reward
          const rand = Math.random();
          if (rand > 0.9) {
            dropType = BlockType.DIAMOND_ORE;
            dropName = 'Diamond Ore';
          } else {
            dropType = BlockType.COAL_ORE; // Gunpowder coal proxy!
            dropName = 'Gunpowder (Coal)';
          }
          dropCount = 1;
        }

        // Add to inventory directly using onBlockMined callback
        for (let i = 0; i < dropCount; i++) {
          onBlockMined(dropType);
        }
        addNotification(`☠️ Slain ${foundMob.type}! Dropped ${dropCount}x ${dropName}!`, 'text-emerald-300 font-bold');
      } else {
        playMobSound('hit', soundEnabled);
        addNotification(`💥 Hit ${foundMob.type}! Health: ${foundMob.health} / ${foundMob.maxHealth}`, 'text-neutral-200');
      }

      return true; // Click successfully hit a mob instead of block mining!
    }
  }

  return false;
};
