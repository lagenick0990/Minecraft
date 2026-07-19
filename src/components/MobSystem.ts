import React from 'react';
import * as THREE from 'three';
import { BlockType, BLOCK_DEFINITIONS, PlayerStats } from '../types';

export enum MobType {
  SHEEP = 'SHEEP',
  PIG = 'PIG',
  ZOMBIE = 'ZOMBIE',
  CREEPER = 'CREEPER',
  BAT = 'BAT',
  PHANTOM = 'PHANTOM',
  BIRD = 'BIRD',
  TIGER = 'TIGER',
  CHICKEN = 'CHICKEN',
  FOX = 'FOX',
  WOLF = 'WOLF',
  DOG = 'DOG',
  FROG = 'FROG',
  HORSE = 'HORSE',
  COW = 'COW',
  YAK = 'YAK',
  VILLAGER = 'VILLAGER',
  PILLAGER = 'PILLAGER',
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

export const createBatMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'bat';

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#4b382a', roughness: 0.9 });
  const wingMat = new THREE.MeshStandardMaterial({ color: '#2b1d12', roughness: 0.9 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#ff4d4d' });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.18, 0.28, 0.18);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.4, 0);
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 0.21, 0);
  body.add(head);

  // Ears
  const earGeo = new THREE.BoxGeometry(0.04, 0.1, 0.04);
  const leftEar = new THREE.Mesh(earGeo, bodyMat);
  leftEar.position.set(-0.05, 0.1, 0);
  leftEar.rotation.z = -0.2;
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.05;
  rightEar.rotation.z = 0.2;
  head.add(leftEar, rightEar);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.04, 0.02, 0.06);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.04;
  head.add(leftEye, rightEye);

  // Wings (Flapping parts)
  const wingGeo = new THREE.BoxGeometry(0.3, 0.2, 0.02);
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-0.21, 0.05, 0);
  body.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0.21, 0.05, 0);
  body.add(rightWing);

  group.userData = {
    leftWings: [leftWing],
    rightWings: [rightWing],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createPhantomMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'phantom';

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#2b3a67', roughness: 0.8 });
  const wingMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#10b981' }); // glowing green

  // Flat broad body
  const bodyGeo = new THREE.BoxGeometry(0.45, 0.1, 0.65);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.5, 0);
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.2, 0.1, 0.18);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 0, 0.38);
  body.add(head);

  // Glowing eyes
  const eyeGeo = new THREE.BoxGeometry(0.05, 0.04, 0.04);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.07, 0.02, 0.08);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.07;
  head.add(leftEye, rightEye);

  // Long whip tail
  const tailGeo = new THREE.BoxGeometry(0.06, 0.04, 0.45);
  const tail = new THREE.Mesh(tailGeo, bodyMat);
  tail.position.set(0, 0, -0.45);
  body.add(tail);

  // Huge flapping wings
  const wingGeo = new THREE.BoxGeometry(0.65, 0.04, 0.35);
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-0.5, 0, 0.05);
  body.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0.5, 0, 0.05);
  body.add(rightWing);

  group.userData = {
    leftWings: [leftWing],
    rightWings: [rightWing],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createBirdMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'bird';

  const isBlue = Math.random() > 0.5;
  const bodyMat = new THREE.MeshStandardMaterial({ color: isBlue ? '#3b82f6' : '#ef4444', roughness: 0.8 });
  const wingMat = new THREE.MeshStandardMaterial({ color: isBlue ? '#1d4ed8' : '#b91c1c', roughness: 0.8 });
  const beakMat = new THREE.MeshStandardMaterial({ color: '#f59e0b' });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#101010' });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.18, 0.18, 0.24);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.3, 0);
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 0.14, 0.06);
  body.add(head);

  // Beak
  const beakGeo = new THREE.BoxGeometry(0.04, 0.04, 0.08);
  const beak = new THREE.Mesh(beakGeo, beakMat);
  beak.position.set(0, -0.02, 0.09);
  head.add(beak);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
  const leftEye = new THREE.Mesh(eyeGeo, blackMat);
  leftEye.position.set(-0.06, 0.02, 0.02);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.06;
  head.add(leftEye, rightEye);

  // Little wings
  const wingGeo = new THREE.BoxGeometry(0.03, 0.12, 0.16);
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-0.1, 0, 0);
  body.add(leftWing);

  const rightWing = leftWing.clone();
  rightWing.position.x = 0.1;
  body.add(rightWing);

  // Tiny tail
  const tailGeo = new THREE.BoxGeometry(0.08, 0.02, 0.1);
  const tail = new THREE.Mesh(tailGeo, wingMat);
  tail.position.set(0, -0.04, -0.15);
  body.add(tail);

  group.userData = {
    leftWings: [leftWing],
    rightWings: [rightWing],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createTigerMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'tiger';

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.8 }); // Orange
  const stripeMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 }); // Black
  const snoutMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const noseMat = new THREE.MeshStandardMaterial({ color: '#111827' });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.6, 0.55, 1.1);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.5, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Simple black tiger stripe box ornaments embedded on the body
  const stripeGeo = new THREE.BoxGeometry(0.62, 0.3, 0.06);
  for (let i = -0.4; i <= 0.4; i += 0.25) {
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0.1, i);
    body.add(stripe);
  }

  // Head
  const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 0.75, 0.55);
  head.castShadow = true;

  // Snout
  const snoutGeo = new THREE.BoxGeometry(0.2, 0.14, 0.12);
  const snout = new THREE.Mesh(snoutGeo, snoutMat);
  snout.position.set(0, -0.08, 0.2);
  head.add(snout);

  const noseGeo = new THREE.BoxGeometry(0.08, 0.06, 0.04);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, 0.06, 0.08);
  snout.add(nose);

  // Ears
  const earGeo = new THREE.BoxGeometry(0.1, 0.1, 0.06);
  const leftEar = new THREE.Mesh(earGeo, bodyMat);
  leftEar.position.set(-0.15, 0.22, -0.05);
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.15;
  head.add(leftEar, rightEar);

  group.add(head);

  // 4 Legs
  const legGeo = new THREE.BoxGeometry(0.16, 0.4, 0.16);
  const flLeg = new THREE.Mesh(legGeo, bodyMat);
  flLeg.position.set(-0.2, 0.2, 0.4);
  flLeg.castShadow = true;

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.2;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.4;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.4;

  group.add(flLeg, frLeg, blLeg, brLeg);

  // Tail
  const tailGeo = new THREE.BoxGeometry(0.08, 0.08, 0.45);
  const tail = new THREE.Mesh(tailGeo, bodyMat);
  tail.position.set(0, 0.2, -0.7);
  tail.rotation.x = -0.5;
  body.add(tail);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createChickenMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'chicken';

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
  const beakMat = new THREE.MeshStandardMaterial({ color: '#eab308' });
  const wattleMat = new THREE.MeshStandardMaterial({ color: '#ef4444' });
  const legMat = new THREE.MeshStandardMaterial({ color: '#f59e0b' });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.35, 0.35, 0.42);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.35, 0);
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.2, 0.25, 0.2);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 0.55, 0.14);
  head.castShadow = true;
  group.add(head);

  // Beak
  const beakGeo = new THREE.BoxGeometry(0.1, 0.06, 0.1);
  const beak = new THREE.Mesh(beakGeo, beakMat);
  beak.position.set(0, 0.02, 0.12);
  head.add(beak);

  // Wattle (red throat dangling block)
  const wattleGeo = new THREE.BoxGeometry(0.06, 0.08, 0.06);
  const wattle = new THREE.Mesh(wattleGeo, wattleMat);
  wattle.position.set(0, -0.08, 0.06);
  head.add(wattle);

  // Thin legs
  const legGeo = new THREE.BoxGeometry(0.06, 0.22, 0.06);
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.08, 0.11, 0);
  leftLeg.castShadow = true;

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.08;

  group.add(leftLeg, rightLeg);

  // Small wings
  const wingGeo = new THREE.BoxGeometry(0.04, 0.18, 0.24);
  const leftWing = new THREE.Mesh(wingGeo, bodyMat);
  leftWing.position.set(-0.19, 0.02, 0);
  body.add(leftWing);

  const rightWing = leftWing.clone();
  rightWing.position.x = 0.19;
  body.add(rightWing);

  group.userData = {
    leftLegs: [leftLeg],
    rightLegs: [rightLeg],
    leftWings: [leftWing],
    rightWings: [rightWing],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createFoxMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'fox';

  const orangeMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.8 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#111827' });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.35, 0.35, 0.7);
  const body = new THREE.Mesh(bodyGeo, orangeMat);
  body.position.set(0, 0.35, 0);
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const head = new THREE.Mesh(headGeo, orangeMat);
  head.position.set(0, 0.52, 0.35);
  head.castShadow = true;

  // Snout
  const snoutGeo = new THREE.BoxGeometry(0.12, 0.1, 0.14);
  const snout = new THREE.Mesh(snoutGeo, whiteMat);
  snout.position.set(0, -0.06, 0.16);
  head.add(snout);

  const noseGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);
  const nose = new THREE.Mesh(noseGeo, blackMat);
  nose.position.set(0, 0.04, 0.08);
  snout.add(nose);

  // Ears
  const earGeo = new THREE.BoxGeometry(0.08, 0.1, 0.04);
  const leftEar = new THREE.Mesh(earGeo, orangeMat);
  leftEar.position.set(-0.1, 0.16, -0.05);
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.1;
  head.add(leftEar, rightEar);

  group.add(head);

  // 4 Legs
  const legGeo = new THREE.BoxGeometry(0.1, 0.22, 0.1);
  const flLeg = new THREE.Mesh(legGeo, orangeMat);
  flLeg.position.set(-0.11, 0.11, 0.22);
  flLeg.castShadow = true;

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.11;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.22;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.22;

  group.add(flLeg, frLeg, blLeg, brLeg);

  // Bushy fox tail
  const tailGeo = new THREE.BoxGeometry(0.18, 0.18, 0.35);
  const tail = new THREE.Mesh(tailGeo, orangeMat);
  tail.position.set(0, 0.08, -0.42);
  tail.rotation.x = -0.4;
  body.add(tail);

  // White tip on tail
  const tipGeo = new THREE.BoxGeometry(0.18, 0.18, 0.1);
  const tip = new THREE.Mesh(tipGeo, whiteMat);
  tip.position.set(0, 0, -0.18);
  tail.add(tip);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createWolfMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'wolf';

  const greyMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.85 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1' });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.42, 0.42, 0.8);
  const body = new THREE.Mesh(bodyGeo, greyMat);
  body.position.set(0, 0.42, 0);
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
  const head = new THREE.Mesh(headGeo, greyMat);
  head.position.set(0, 0.62, 0.4);
  head.castShadow = true;

  // Snout
  const snoutGeo = new THREE.BoxGeometry(0.12, 0.1, 0.12);
  const snout = new THREE.Mesh(snoutGeo, snoutMat);
  snout.position.set(0, -0.05, 0.15);
  head.add(snout);

  const noseGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);
  const nose = new THREE.Mesh(noseGeo, blackMat);
  nose.position.set(0, 0.04, 0.07);
  snout.add(nose);

  // Ears
  const earGeo = new THREE.BoxGeometry(0.06, 0.08, 0.04);
  const leftEar = new THREE.Mesh(earGeo, greyMat);
  leftEar.position.set(-0.09, 0.14, -0.04);
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.09;
  head.add(leftEar, rightEar);

  group.add(head);

  // 4 Legs
  const legGeo = new THREE.BoxGeometry(0.12, 0.28, 0.12);
  const flLeg = new THREE.Mesh(legGeo, greyMat);
  flLeg.position.set(-0.13, 0.14, 0.25);
  flLeg.castShadow = true;

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.13;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.25;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.25;

  group.add(flLeg, frLeg, blLeg, brLeg);

  // Tail
  const tailGeo = new THREE.BoxGeometry(0.1, 0.1, 0.3);
  const tail = new THREE.Mesh(tailGeo, greyMat);
  tail.position.set(0, 0.12, -0.45);
  tail.rotation.x = -0.6;
  body.add(tail);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createDogMesh = (): THREE.Group => {
  // Dog is a Wolf but with brown coat and a bright RED collar!
  const group = new THREE.Group();
  group.name = 'dog';

  const brownMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.85 }); // light golden brown
  const snoutMat = new THREE.MeshStandardMaterial({ color: '#f59e0b' });
  const redCollarMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.7 }); // bright red collar!
  const blackMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.4, 0.4, 0.78);
  const body = new THREE.Mesh(bodyGeo, brownMat);
  body.position.set(0, 0.4, 0);
  body.castShadow = true;
  group.add(body);

  // Red Collar!
  const collarGeo = new THREE.BoxGeometry(0.42, 0.1, 0.42);
  const collar = new THREE.Mesh(collarGeo, redCollarMat);
  collar.position.set(0, 0.15, 0.35);
  body.add(collar);

  // Head
  const headGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
  const head = new THREE.Mesh(headGeo, brownMat);
  head.position.set(0, 0.6, 0.4);
  head.castShadow = true;

  // Snout
  const snoutGeo = new THREE.BoxGeometry(0.12, 0.08, 0.12);
  const snout = new THREE.Mesh(snoutGeo, snoutMat);
  snout.position.set(0, -0.05, 0.14);
  head.add(snout);

  const noseGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);
  const nose = new THREE.Mesh(noseGeo, blackMat);
  nose.position.set(0, 0.03, 0.07);
  snout.add(nose);

  // Ears (floppy dog ears!)
  const earGeo = new THREE.BoxGeometry(0.04, 0.12, 0.06);
  const leftEar = new THREE.Mesh(earGeo, brownMat);
  leftEar.position.set(-0.11, 0.05, -0.02);
  leftEar.rotation.z = 0.15;
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.11;
  rightEar.rotation.z = -0.15;
  head.add(leftEar, rightEar);

  group.add(head);

  // 4 Legs
  const legGeo = new THREE.BoxGeometry(0.11, 0.26, 0.11);
  const flLeg = new THREE.Mesh(legGeo, brownMat);
  flLeg.position.set(-0.12, 0.13, 0.24);
  flLeg.castShadow = true;

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.12;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.24;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.24;

  group.add(flLeg, frLeg, blLeg, brLeg);

  // Happy wagging tail
  const tailGeo = new THREE.BoxGeometry(0.08, 0.08, 0.28);
  const tail = new THREE.Mesh(tailGeo, brownMat);
  tail.position.set(0, 0.1, -0.42);
  tail.rotation.x = -0.5;
  body.add(tail);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head,
    tail, // wag it!
  };

  saveOriginalColors(group);
  return group;
};

export const createFrogMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'frog';

  const greenMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.9 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: '#facc15' }); // pale yellow underbelly
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#f97316' }); // orange bulging eyes
  const blackMat = new THREE.MeshStandardMaterial({ color: '#111827' });

  // Squatty body
  const bodyGeo = new THREE.BoxGeometry(0.32, 0.24, 0.35);
  const body = new THREE.Mesh(bodyGeo, greenMat);
  body.position.set(0, 0.15, 0);
  body.castShadow = true;
  group.add(body);

  // Underbelly
  const bellyGeo = new THREE.BoxGeometry(0.24, 0.04, 0.28);
  const belly = new THREE.Mesh(bellyGeo, yellowMat);
  belly.position.set(0, -0.11, 0);
  body.add(belly);

  // Bulging eyes on top of the head/body
  const eyeHolderGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const leftEyeHolder = new THREE.Mesh(eyeHolderGeo, greenMat);
  leftEyeHolder.position.set(-0.1, 0.14, 0.08);
  body.add(leftEyeHolder);

  const rightEyeHolder = leftEyeHolder.clone();
  rightEyeHolder.position.x = 0.1;
  body.add(rightEyeHolder);

  const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0, 0.02, 0.03);
  leftEyeHolder.add(leftEye);

  const leftPupil = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), blackMat);
  leftPupil.position.set(0, 0, 0.031);
  leftEye.add(leftPupil);

  const rightEye = leftEye.clone();
  rightEyeHolder.add(rightEye);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.1, 0.1, 0.18);
  const flLeg = new THREE.Mesh(legGeo, greenMat);
  flLeg.position.set(-0.16, -0.06, 0.08);
  body.add(flLeg);

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.16;
  body.add(frLeg);

  // Large folded back legs
  const backLegGeo = new THREE.BoxGeometry(0.12, 0.16, 0.24);
  const blLeg = new THREE.Mesh(backLegGeo, greenMat);
  blLeg.position.set(-0.17, -0.03, -0.08);
  blLeg.rotation.z = -0.2;
  body.add(blLeg);

  const brLeg = blLeg.clone();
  brLeg.position.x = 0.17;
  brLeg.rotation.z = 0.2;
  body.add(brLeg);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
  };

  saveOriginalColors(group);
  return group;
};

export const createHorseMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'horse';

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 }); // chestnut brown
  const hairMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9 }); // black mane/tail
  const hoofMat = new THREE.MeshStandardMaterial({ color: '#451a03' });

  // Large Body
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.75, 1.4);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.85, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Neck rising up
  const neckGeo = new THREE.BoxGeometry(0.3, 0.65, 0.35);
  const neck = new THREE.Mesh(neckGeo, bodyMat);
  neck.position.set(0, 0.5, 0.55);
  neck.rotation.x = -0.4;
  neck.castShadow = true;
  body.add(neck);

  // Mane hair on back of neck
  const maneGeo = new THREE.BoxGeometry(0.1, 0.55, 0.15);
  const mane = new THREE.Mesh(maneGeo, hairMat);
  mane.position.set(0, 0.05, -0.18);
  neck.add(mane);

  // Head
  const headGeo = new THREE.BoxGeometry(0.28, 0.28, 0.5);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 0.3, 0.15);
  head.rotation.x = 0.5;
  neck.add(head);

  // Ears
  const earGeo = new THREE.BoxGeometry(0.06, 0.12, 0.06);
  const leftEar = new THREE.Mesh(earGeo, bodyMat);
  leftEar.position.set(-0.1, 0.16, -0.1);
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.1;
  head.add(leftEar, rightEar);

  // 4 Long Legs
  const legGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
  const flLeg = new THREE.Mesh(legGeo, bodyMat);
  flLeg.position.set(-0.25, 0.325, 0.45);
  flLeg.castShadow = true;

  // Hoof bottom
  const hoofGeo = new THREE.BoxGeometry(0.19, 0.1, 0.19);
  const flHoof = new THREE.Mesh(hoofGeo, hoofMat);
  flHoof.position.set(0, -0.3, 0);
  flLeg.add(flHoof);

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.25;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.45;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.45;

  group.add(flLeg, frLeg, blLeg, brLeg);

  // Tail
  const tailGeo = new THREE.BoxGeometry(0.12, 0.65, 0.12);
  const tail = new THREE.Mesh(tailGeo, hairMat);
  tail.position.set(0, 0.1, -0.75);
  tail.rotation.x = 0.2;
  body.add(tail);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createCowMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'cow';

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#3d251d', roughness: 0.85 }); // brown/black base
  const spotMat = new THREE.MeshStandardMaterial({ color: '#f3f4f6', roughness: 0.85 }); // white spots
  const hornMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0' });
  const udderMat = new THREE.MeshStandardMaterial({ color: '#fda4af' }); // pink udders!

  // Large chunky body
  const bodyGeo = new THREE.BoxGeometry(0.85, 0.8, 1.3);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Large white spot plates embedded
  const spotGeo = new THREE.BoxGeometry(0.87, 0.4, 0.45);
  const spot1 = new THREE.Mesh(spotGeo, spotMat);
  spot1.position.set(0, 0.1, 0.25);
  body.add(spot1);

  const spot2 = new THREE.Mesh(spotGeo, spotMat);
  spot2.position.set(0, -0.1, -0.35);
  body.add(spot2);

  // Pink Udder under the belly!
  const udderGeo = new THREE.BoxGeometry(0.18, 0.12, 0.24);
  const udder = new THREE.Mesh(udderGeo, udderMat);
  udder.position.set(0, -0.42, -0.1);
  body.add(udder);

  // Head
  const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 1.05, 0.55);
  head.castShadow = true;

  // Horns
  const hornGeo = new THREE.BoxGeometry(0.08, 0.14, 0.08);
  const leftHorn = new THREE.Mesh(hornGeo, hornMat);
  leftHorn.position.set(-0.21, 0.16, -0.05);
  leftHorn.rotation.z = -0.4;
  const rightHorn = leftHorn.clone();
  rightHorn.position.x = 0.21;
  rightHorn.rotation.z = 0.4;
  head.add(leftHorn, rightHorn);

  group.add(head);

  // 4 Stocky legs
  const legGeo = new THREE.BoxGeometry(0.2, 0.48, 0.2);
  const flLeg = new THREE.Mesh(legGeo, bodyMat);
  flLeg.position.set(-0.26, 0.24, 0.4);
  flLeg.castShadow = true;

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.26;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.4;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.4;

  group.add(flLeg, frLeg, blLeg, brLeg);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createYakMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'yak';

  const woolMat = new THREE.MeshStandardMaterial({ color: '#2d1500', roughness: 0.98 }); // ultra shaggy deep brown
  const skinMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 });
  const hornMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.8 }); // big white horns

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.95, 0.9, 1.45);
  const body = new THREE.Mesh(bodyGeo, woolMat);
  body.position.set(0, 0.85, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Shaggy fringe skirt dangling down
  const skirtGeo = new THREE.BoxGeometry(0.97, 0.25, 1.47);
  const skirt = new THREE.Mesh(skirtGeo, woolMat);
  skirt.position.set(0, -0.38, 0);
  body.add(skirt);

  // Massive wooly hump
  const humpGeo = new THREE.BoxGeometry(0.8, 0.22, 0.6);
  const hump = new THREE.Mesh(humpGeo, woolMat);
  hump.position.set(0, 0.52, 0.25);
  body.add(hump);

  // Head
  const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 1.05, 0.65);
  head.castShadow = true;

  // Huge curled curved horns
  // Base segment
  const hornGeo = new THREE.BoxGeometry(0.12, 0.12, 0.3);
  const leftHornBase = new THREE.Mesh(hornGeo, hornMat);
  leftHornBase.position.set(-0.25, 0.1, 0.05);
  leftHornBase.rotation.y = -0.5;
  head.add(leftHornBase);

  const leftHornTip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), hornMat);
  leftHornTip.position.set(-0.06, 0.12, 0.1);
  leftHornTip.rotation.z = 0.5;
  leftHornBase.add(leftHornTip);

  const rightHornBase = new THREE.Mesh(hornGeo, hornMat);
  rightHornBase.position.set(0.25, 0.1, 0.05);
  rightHornBase.rotation.y = 0.5;
  head.add(rightHornBase);

  const rightHornTip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), hornMat);
  rightHornTip.position.set(0.06, 0.12, 0.1);
  rightHornTip.rotation.z = -0.5;
  rightHornBase.add(rightHornTip);

  group.add(head);

  // 4 Stocky legs (shorter due to shaggy skirt)
  const legGeo = new THREE.BoxGeometry(0.24, 0.45, 0.24);
  const flLeg = new THREE.Mesh(legGeo, skinMat);
  flLeg.position.set(-0.28, 0.225, 0.45);
  flLeg.castShadow = true;

  const frLeg = flLeg.clone();
  frLeg.position.x = 0.28;

  const blLeg = flLeg.clone();
  blLeg.position.z = -0.45;

  const brLeg = frLeg.clone();
  brLeg.position.z = -0.45;

  group.add(flLeg, frLeg, blLeg, brLeg);

  group.userData = {
    leftLegs: [flLeg, brLeg],
    rightLegs: [frLeg, blLeg],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createVillagerMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'villager';

  const robeMat = new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.9 }); // brown robe
  const skinMat = new THREE.MeshStandardMaterial({ color: '#ffd3b6', roughness: 0.8 });
  const noseMat = new THREE.MeshStandardMaterial({ color: '#e0a982', roughness: 0.8 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a' });

  // Tall Robe Body
  const bodyGeo = new THREE.BoxGeometry(0.45, 1.1, 0.45);
  const body = new THREE.Mesh(bodyGeo, robeMat);
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.38, 0.45, 0.38);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 1.5, 0);
  head.castShadow = true;
  group.add(head);

  // Huge Nose block!
  const noseGeo = new THREE.BoxGeometry(0.1, 0.22, 0.12);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, -0.06, 0.23);
  head.add(nose);

  // Eyes (monobrow/villager style)
  const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.04);
  const leftEye = new THREE.Mesh(eyeGeo, blackMat);
  leftEye.position.set(-0.09, 0.08, 0.19);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.09;
  head.add(leftEye, rightEye);

  // Uni-brow!
  const browGeo = new THREE.BoxGeometry(0.26, 0.04, 0.04);
  const brow = new THREE.Mesh(browGeo, blackMat);
  brow.position.set(0, 0.13, 0.195);
  head.add(brow);

  // Crossed arms (single horizontal box bar!)
  const armsGeo = new THREE.BoxGeometry(0.55, 0.18, 0.22);
  const arms = new THREE.Mesh(armsGeo, robeMat);
  arms.position.set(0, 0.1, 0.28);
  body.add(arms);

  // Two legs
  const legGeo = new THREE.BoxGeometry(0.16, 0.35, 0.16);
  const leftLeg = new THREE.Mesh(legGeo, robeMat);
  leftLeg.position.set(-0.11, 0.175, 0);
  leftLeg.castShadow = true;

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.11;

  group.add(leftLeg, rightLeg);

  group.userData = {
    leftLegs: [leftLeg],
    rightLegs: [rightLeg],
    head,
  };

  saveOriginalColors(group);
  return group;
};

export const createPillagerMesh = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'pillager';

  const skinMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8 }); // Grey skin
  const coatMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 }); // dark grey coat
  const trimMat = new THREE.MeshStandardMaterial({ color: '#7c2d12' }); // leather brown boots/shoulder
  const woodMat = new THREE.MeshStandardMaterial({ color: '#b45309' }); // wooden crossbow

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.45, 1.05, 0.42);
  const body = new THREE.Mesh(bodyGeo, coatMat);
  body.position.set(0, 0.775, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.38, 0.42, 0.38);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 1.45, 0);
  head.castShadow = true;
  group.add(head);

  // Nose
  const noseGeo = new THREE.BoxGeometry(0.1, 0.2, 0.1);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.position.set(0, -0.05, 0.22);
  head.add(nose);

  // Crossed Arms or Extended Arm with Crossbow! Let's extend one arm out with a crossbow!
  const armGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
  const leftArm = new THREE.Mesh(armGeo, coatMat);
  leftArm.position.set(-0.3, 1.05, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  // Right arm extended forward holding crossbow
  const rightArm = new THREE.Mesh(armGeo, coatMat);
  rightArm.position.set(0.3, 1.05, 0.25);
  rightArm.rotation.x = -Math.PI / 2.2;
  rightArm.castShadow = true;
  group.add(rightArm);

  // Voxel Crossbow attached to right hand
  const crossbowGeo = new THREE.BoxGeometry(0.1, 0.1, 0.45);
  const crossbow = new THREE.Mesh(crossbowGeo, woodMat);
  crossbow.position.set(0, -0.28, 0.15);
  rightArm.add(crossbow);

  const crossbarGeo = new THREE.BoxGeometry(0.42, 0.04, 0.08);
  const crossbar = new THREE.Mesh(crossbarGeo, woodMat);
  crossbar.position.set(0, 0, 0.12);
  crossbow.add(crossbar);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.16, 0.6, 0.16);
  const leftLeg = new THREE.Mesh(legGeo, trimMat);
  leftLeg.position.set(-0.11, 0.3, 0);
  leftLeg.castShadow = true;

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.11;

  group.add(leftLeg, rightLeg);

  group.userData = {
    leftLegs: [leftLeg],
    rightLegs: [rightLeg],
    head,
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
    case MobType.BAT:
      group = createBatMesh();
      health = 4;
      height = 0.5;
      width = 0.4;
      break;
    case MobType.PHANTOM:
      group = createPhantomMesh();
      health = 12;
      height = 0.6;
      width = 1.0;
      break;
    case MobType.BIRD:
      group = createBirdMesh();
      health = 4;
      height = 0.4;
      width = 0.3;
      break;
    case MobType.TIGER:
      group = createTigerMesh();
      health = 18;
      height = 1.0;
      width = 0.8;
      break;
    case MobType.CHICKEN:
      group = createChickenMesh();
      health = 4;
      height = 0.6;
      width = 0.45;
      break;
    case MobType.FOX:
      group = createFoxMesh();
      health = 8;
      height = 0.7;
      width = 0.5;
      break;
    case MobType.WOLF:
      group = createWolfMesh();
      health = 10;
      height = 0.8;
      width = 0.55;
      break;
    case MobType.DOG:
      group = createDogMesh();
      health = 12;
      height = 0.8;
      width = 0.55;
      break;
    case MobType.FROG:
      group = createFrogMesh();
      health = 6;
      height = 0.45;
      width = 0.45;
      break;
    case MobType.HORSE:
      group = createHorseMesh();
      health = 20;
      height = 1.5;
      width = 0.85;
      break;
    case MobType.COW:
      group = createCowMesh();
      health = 12;
      height = 1.3;
      width = 0.85;
      break;
    case MobType.YAK:
      group = createYakMesh();
      health = 22;
      height = 1.4;
      width = 0.95;
      break;
    case MobType.VILLAGER:
      group = createVillagerMesh();
      health = 20;
      height = 1.95;
      width = 0.5;
      break;
    case MobType.PILLAGER:
      group = createPillagerMesh();
      health = 24;
      height = 1.95;
      width = 0.5;
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
      const isHostile = mob.type === MobType.ZOMBIE || mob.type === MobType.CREEPER || mob.type === MobType.PILLAGER;
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

        const speed = mob.type === MobType.ZOMBIE ? 2.5 : mob.type === MobType.PILLAGER ? 3.0 : 2.8;
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

        // Pillager attack trigger (crossbow arrow damage)
        if (mob.type === MobType.PILLAGER && distToPlayer < 1.6 && gameMode === 'SURVIVAL') {
          const now = currentTime;
          if (now - (window as any)._zombieLastBite > ZOMBIE_ATTACK_COOLDOWN * 1000) {
            (window as any)._zombieLastBite = now;
            onUpdateStats({ health: Math.max(0, stats.health - 3.0) }); // 1.5 hearts
            playMobSound('hit', soundEnabled);
            addNotification(`🏹 Pillager shot you with crossbow! Took 1.5 hearts of damage!`, 'text-red-500 font-extrabold');
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

    // 3. APPLY GRAVITY & FLOATING
    const isFlying = mob.type === MobType.BAT || mob.type === MobType.PHANTOM || mob.type === MobType.BIRD;
    if (isFlying) {
      // Gentle floating sine wave bobbing in mid-air
      mob.velocity.y = Math.sin(currentTime * 0.003 + (mob.position.x * 0.05)) * 0.4;
    } else {
      mob.velocity.y -= GRAVITY * dt;
      if (mob.velocity.y < -30) mob.velocity.y = -30;
    }

    // Frog Hop automatic movement trigger
    if (mob.type === MobType.FROG && mob.isGrounded && Math.random() < 0.04) {
      mob.velocity.y = 4.2;
      mob.isGrounded = false;
      const angle = mob.group.rotation.y;
      mob.velocity.x = Math.sin(angle) * 3.5;
      mob.velocity.z = Math.cos(angle) * 3.5;
    }

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
      if (!isFlying) mob.isGrounded = false;
    }

    // Jump automatic step over walls!
    if (collidedHorizontally && mob.isGrounded && !isFlying) {
      mob.velocity.y = 5.2; // jump height
      mob.isGrounded = false;
    }

    // 5. ANIMATIONS (Swing legs / Flap wings)
    const horizSpeed = Math.hypot(mob.velocity.x, mob.velocity.z);
    if (isFlying) {
      const flap = Math.sin(currentTime * 0.016) * 0.7;
      if (mob.group.userData.leftWings) {
        mob.group.userData.leftWings.forEach((w: any) => { w.rotation.z = flap; });
      }
      if (mob.group.userData.rightWings) {
        mob.group.userData.rightWings.forEach((w: any) => { w.rotation.z = -flap; });
      }
    } else if (horizSpeed > 0.2) {
      const swingSpeed = mob.state === 'FLEEING' ? 14 : 9;
      const swingAngle = Math.sin(currentTime * 0.001 * swingSpeed) * 0.55;
      mob.leftLegs.forEach((leg) => { leg.rotation.x = swingAngle; });
      mob.rightLegs.forEach((leg) => { leg.rotation.x = -swingAngle; });

      if (mob.type === MobType.DOG && mob.group.userData.tail) {
        mob.group.userData.tail.rotation.y = Math.sin(currentTime * 0.015) * 0.45;
      }
    } else {
      // Return legs to neutral resting position
      mob.leftLegs.forEach((leg) => { leg.rotation.x *= 0.85; });
      mob.rightLegs.forEach((leg) => { leg.rotation.x *= 0.85; });
      if (mob.type === MobType.DOG && mob.group.userData.tail) {
        mob.group.userData.tail.rotation.y *= 0.85;
      }
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
          dropType = BlockType.SNOW; // Wool proxy!
          dropCount = 2;
          dropName = 'Fluffy Wool (Snow)';
        } else if (foundMob.type === MobType.PIG) {
          dropType = BlockType.BRICK; // Porkchop proxy!
          dropCount = 2;
          dropName = 'Raw Porkchop (Bricks)';
        } else if (foundMob.type === MobType.ZOMBIE) {
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
          const rand = Math.random();
          if (rand > 0.9) {
            dropType = BlockType.DIAMOND_ORE;
            dropName = 'Diamond Ore';
          } else {
            dropType = BlockType.COAL_ORE;
            dropName = 'Gunpowder (Coal)';
          }
          dropCount = 1;
        } else if (foundMob.type === MobType.BAT) {
          dropType = BlockType.COAL_ORE;
          dropCount = 1;
          dropName = 'Bat wing (Coal)';
        } else if (foundMob.type === MobType.PHANTOM) {
          dropType = BlockType.ICE;
          dropCount = 1;
          dropName = 'Phantom Membrane (Ice)';
        } else if (foundMob.type === MobType.BIRD) {
          dropType = BlockType.REDWOOD_LEAVES;
          dropCount = 1;
          dropName = 'Feather (Pine Needles)';
        } else if (foundMob.type === MobType.TIGER) {
          dropType = BlockType.BRICK;
          dropCount = 3;
          dropName = 'Tiger Pelt (Bricks)';
        } else if (foundMob.type === MobType.CHICKEN) {
          dropType = BlockType.SAND;
          dropCount = 1;
          dropName = 'Chicken Egg (Sand)';
        } else if (foundMob.type === MobType.FOX) {
          dropType = BlockType.PLANKS;
          dropCount = 1;
          dropName = 'Fox fur (Planks)';
        } else if (foundMob.type === MobType.WOLF || foundMob.type === MobType.DOG) {
          dropType = BlockType.STONE;
          dropCount = 1;
          dropName = 'Bone (Stone)';
        } else if (foundMob.type === MobType.FROG) {
          dropType = BlockType.BAMBOO_STEM;
          dropCount = 2;
          dropName = 'Slimeball (Bamboo)';
        } else if (foundMob.type === MobType.HORSE) {
          dropType = BlockType.REDWOOD_LOG;
          dropCount = 2;
          dropName = 'Leather (Pine Log)';
        } else if (foundMob.type === MobType.COW) {
          dropType = BlockType.PLANKS;
          dropCount = 2;
          dropName = 'Leather (Planks)';
        } else if (foundMob.type === MobType.YAK) {
          dropType = BlockType.SNOW;
          dropCount = 3;
          dropName = 'Yak Hair (Snow)';
        } else if (foundMob.type === MobType.VILLAGER) {
          dropType = BlockType.GOLD_ORE;
          dropCount = 2;
          dropName = 'Emerald (Gold)';
        } else if (foundMob.type === MobType.PILLAGER) {
          dropType = BlockType.IRON_ORE;
          dropCount = 2;
          dropName = 'Crossbow trigger (Iron Ore)';
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
