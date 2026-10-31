import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BUILDINGS,
  CENTRAL_PARK_RECT,
  DHAKA_BUS_STOPS,
  FOOTBALL_STADIUM_RECT,
  PALM_TREES,
  PARK_POND_CIRCLE,
  ROADS,
  SHAHBAGH_RALLY_STAGE,
  STREET_LAMPS,
  STREET_STALLS,
  TERRAIN_ZONES,
  TRAIN_LOOP_RECT,
  TRAIN_STATIONS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../data/cityMap';
import {
  Building,
  CommunityNPCState,
  VehicleState,
  WorldSimulationRef,
} from '../types/game';
import { MAX_VOICE_HEARING_DIST } from '../utils/sound';

interface Three3DWorldProps {
  worldRef: React.MutableRefObject<WorldSimulationRef>;
  isRotatedLandscape?: boolean;
}

interface Character3DRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  hitRing: THREE.Mesh;
  labelSprite: THREE.Sprite;
  labelCanvas: HTMLCanvasElement;
  labelTexture: THREE.CanvasTexture;
  lastSpeechText: string;
  lastMoneyVal: number;
  lastHpBucket: number;
  lastTargetFlag: boolean;
}

interface Vehicle3DRig {
  root: THREE.Group;
  wheels: THREE.Mesh[];
  sirenRed?: THREE.Mesh;
  sirenBlue?: THREE.Mesh;
}

function createConfiguredCanvasTexture(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

function createDhakaProceduralTextures(renderer: THREE.WebGLRenderer) {
  // 1. Realistic Dhaka Asphalt Road Texture (Horizontal & Vertical) with Lane Markings & Zebra Crossings
  const makeRoadTex = (isHorizontal: boolean) =>
    createConfiguredCanvasTexture(
      renderer,
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#262d38';
        ctx.fillRect(0, 0, w, h);

        // Micro-asphalt aggregate grain & subtle tire wear tracks
        for (let i = 0; i < 2800; i++) {
          const gx = (i * 73) % w;
          const gy = (i * 139) % h;
          ctx.fillStyle =
            i % 3 === 0
              ? 'rgba(255,255,255,0.045)'
              : i % 2 === 0
                ? 'rgba(15,23,42,0.22)'
                : 'rgba(148,163,184,0.04)';
          ctx.fillRect(gx, gy, 2, 2);
        }

        if (isHorizontal) {
          // Darker tire wear strips
          ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
          ctx.fillRect(0, h * 0.2, w, h * 0.18);
          ctx.fillRect(0, h * 0.62, w, h * 0.18);

          // Dhaka Green-White / Black-Yellow Painted Road Edges
          for (let x = 0; x < w; x += 64) {
            ctx.fillStyle = (x / 64) % 2 === 0 ? '#facc15' : '#0f172a';
            ctx.fillRect(x, 0, 32, 12);
            ctx.fillRect(x, h - 12, 32, 12);
            ctx.fillStyle = (x / 64) % 2 === 0 ? '#0f172a' : '#facc15';
            ctx.fillRect(x + 32, 0, 32, 12);
            ctx.fillRect(x + 32, h - 12, 32, 12);
          }

          // Double Yellow Center Divider Line
          ctx.fillStyle = '#eab308';
          ctx.fillRect(0, h / 2 - 7, w, 4);
          ctx.fillRect(0, h / 2 + 3, w, 4);

          // White Dashed Lane Markings
          ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
          for (let x = 16; x < w; x += 64) {
            ctx.fillRect(x, h * 0.26, 34, 4);
            ctx.fillRect(x, h * 0.74, 34, 4);
          }
        } else {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
          ctx.fillRect(w * 0.2, 0, w * 0.18, h);
          ctx.fillRect(w * 0.62, 0, w * 0.18, h);

          for (let y = 0; y < h; y += 64) {
            ctx.fillStyle = (y / 64) % 2 === 0 ? '#facc15' : '#0f172a';
            ctx.fillRect(0, y, 12, 32);
            ctx.fillRect(w - 12, y, 12, 32);
            ctx.fillStyle = (y / 64) % 2 === 0 ? '#0f172a' : '#facc15';
            ctx.fillRect(0, y + 32, 12, 32);
            ctx.fillRect(w - 12, y + 32, 12, 32);
          }

          ctx.fillStyle = '#eab308';
          ctx.fillRect(w / 2 - 7, 0, 4, h);
          ctx.fillRect(w / 2 + 3, 0, 4, h);

          ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
          for (let y = 16; y < h; y += 64) {
            ctx.fillRect(w * 0.26, y, 4, 34);
            ctx.fillRect(w * 0.74, y, 4, 34);
          }
        }
      },
      1,
      1
    );

  // 2. Dhaka Footpath & Concrete Paver Tile Texture
  const sidewalkTex = createConfiguredCanvasTexture(
    renderer,
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, w, h);
      const tile = 32;
      for (let y = 0; y < h; y += tile) {
        for (let x = 0; x < w; x += tile) {
          const isAlt = ((x / tile + y / tile) & 1) === 0;
          ctx.fillStyle = isAlt ? '#d6dee8' : '#c0cad7';
          ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
          // Red/terracotta Dhaka footpath accent brick every 4th block
          if ((x / tile) % 4 === 0 && (y / tile) % 4 === 0) {
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x + 4, y + 4, tile - 8, tile - 8);
          }
        }
      }
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      for (let i = 0; i <= w; i += tile) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
      }
    },
    48,
    36
  );

  // 3. Ramna Park Lush Tropical Grass Texture
  const grassTex = createConfiguredCanvasTexture(
    renderer,
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1200; i++) {
        const gx = (i * 47) % w;
        const gy = (i * 89) % h;
        ctx.fillStyle =
          i % 3 === 0 ? '#16a34a' : i % 2 === 0 ? '#22c55e' : '#14532d';
        ctx.fillRect(gx, gy, 3, 7);
      }
    },
    14,
    12
  );

  // 4. Buriganga River & Ramna Lake Water Ripple Texture
  const waterTex = createConfiguredCanvasTexture(
    renderer,
    256,
    256,
    (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.5, '#0369a1');
      grad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
      ctx.lineWidth = 2.5;
      for (let y = 16; y < h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(w * 0.25, y - 8, w * 0.5, y);
        ctx.quadraticCurveTo(w * 0.75, y + 8, w, y);
        ctx.stroke();
      }
    },
    18,
    18
  );

  // 5. Football Stadium Striped Turf Texture
  const pitchTex = createConfiguredCanvasTexture(
    renderer,
    512,
    512,
    (ctx, w, h) => {
      const stripes = 10;
      const stripeW = w / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#16a34a';
        ctx.fillRect(i * stripeW, 0, stripeW, h);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, w - 40, h - 40);
      // Midline & Center Circle
      ctx.beginPath();
      ctx.moveTo(w / 2, 20);
      ctx.lineTo(w / 2, h - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 58, 0, Math.PI * 2);
      ctx.stroke();
      // Penalty boxes
      ctx.strokeRect(20, h * 0.24, 82, h * 0.52);
      ctx.strokeRect(w - 102, h * 0.24, 82, h * 0.52);
    },
    1,
    1
  );

  // 6. Building Facade Generator (Motijheel Glass Curtain-Wall, Curzon Hall Red Brick, Residential Balconies, Industrial Garments)
  const createBuildingFacadeTex = (b: Building) => {
    return createConfiguredCanvasTexture(
      renderer,
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = b.baseColor;
        ctx.fillRect(0, 0, w, h);

        // Subtle vertical concrete/brick architectural panelling
        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
        for (let x = 0; x < w; x += 32) {
          ctx.fillRect(x, 0, 4, h);
        }

        // Floor slab horizontal bands
        const floors = Math.max(4, Math.min(10, Math.round(b.height3D / 14)));
        const floorH = (h - 68) / floors;

        for (let f = 0; f < floors; f++) {
          const fy = 52 + f * floorH;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.fillRect(0, fy, w, 5);

          const cols = 8;
          const colW = (w - 32) / cols;
          for (let c = 0; c < cols; c++) {
            const wx = 16 + c * colW + 5;
            const wy = fy + 9;
            const ww = colW - 10;
            const wh = Math.max(10, floorH - 16);

            const seed = (f * 13 + c * 7 + b.x) % 11;
            const isLit = seed < 7;

            if (b.interiorType === 'NIGHTCLUB') {
              ctx.fillStyle =
                seed % 2 === 0 ? '#f43f5e' : '#a855f7';
            } else if (b.interiorType === 'OFFICE_COURT' && b.baseColor === '#991b1b') {
              // Curzon Hall / Supreme Court arched heritage windows
              ctx.fillStyle = '#fef3c7';
            } else {
              ctx.fillStyle = isLit ? '#bae6fd' : '#1e293b';
            }

            ctx.fillRect(wx, wy, ww, wh);

            // Window mullion & AC unit detail
            ctx.strokeStyle = b.accentColor || '#e2e8f0';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wx, wy, ww, wh);

            if (seed === 2) {
              // Outdoor split AC compressor box common on Dhaka buildings
              ctx.fillStyle = '#cbd5e1';
              ctx.fillRect(wx + ww - 10, wy + wh - 8, 10, 8);
            }
          }
        }

        // Top Illuminated Bangla Signboard Fascia Band
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(8, 6, w - 16, 40);
        ctx.strokeStyle = b.neonColor || '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(8, 6, w - 16, 40);

        ctx.fillStyle = '#fef08a';
        ctx.font = '900 18px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.name.slice(0, 34), w / 2, 26);
      },
      1,
      1
    );
  };

  return {
    roadHoriz: makeRoadTex(true),
    roadVert: makeRoadTex(false),
    sidewalkTex,
    grassTex,
    waterTex,
    pitchTex,
    createBuildingFacadeTex,
  };
}

function drawCharacterBadgeCanvas(
  canvas: HTMLCanvasElement,
  titleText: string,
  moneyVal: number,
  hpRatio: number,
  speechText: string,
  isPlayer: boolean,
  isTarget: boolean
) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Speech bubble (only if speechText is non-empty)
  if (speechText) {
    ctx.fillStyle = 'rgba(9, 13, 28, 0.92)';
    ctx.strokeStyle = isTarget ? '#00f0ff' : '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(10, 6, w - 20, 48, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const clippedSpeech =
      speechText.length > 36 ? speechText.slice(0, 35) + '…' : speechText;
    ctx.fillText(clippedSpeech, w / 2, 30);
  }

  // Name + Money pill
  const pillY = 60;
  const pillW = w - 60;
  const pillX = 30;
  ctx.fillStyle = isPlayer
    ? 'rgba(6, 78, 59, 0.94)'
    : isTarget
      ? 'rgba(15, 23, 42, 0.95)'
      : 'rgba(15, 23, 42, 0.84)';
  ctx.strokeStyle = isPlayer ? '#34d399' : isTarget ? '#00f0ff' : '#475569';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, 34, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const badgeLine = `${titleText} · ৳${moneyVal.toLocaleString()}`;
  ctx.fillText(badgeLine.slice(0, 32), w / 2, pillY + 17);

  // Health bar
  const barW = 140;
  const barX = (w - barW) / 2;
  const barY = 99;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(barX, barY, barW, 8);
  ctx.fillStyle =
    hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(barX + 1, barY + 1, Math.max(0, (barW - 2) * hpRatio), 6);
}

function createArticulatedCharacterRig(
  renderer: THREE.WebGLRenderer,
  opts: {
    primaryColor: string;
    secondaryColor: string;
    hairColor: string;
    isFemale?: boolean;
    role?: string;
    placardText?: string;
    isPlayer?: boolean;
  }
): Character3DRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({
    color: '#d99b72',
    roughness: 0.65,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: opts.primaryColor || '#0ea5e9',
    roughness: 0.55,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: opts.secondaryColor || '#1e293b',
    roughness: 0.7,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: opts.hairColor || '#111827',
    roughness: 0.8,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.5,
  });

  // Legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-4.2, 13, 0);
  const leftLegMesh = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 13, 5.5),
    pantsMat
  );
  leftLegMesh.position.y = -6.5;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);
  const leftShoe = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3.2, 8),
    shoeMat
  );
  leftShoe.position.set(0, -12.5, 1.2);
  leftLeg.add(leftShoe);
  bodyGroup.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(4.2, 13, 0);
  const rightLegMesh = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 13, 5.5),
    pantsMat
  );
  rightLegMesh.position.y = -6.5;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);
  const rightShoe = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3.2, 8),
    shoeMat
  );
  rightShoe.position.set(0, -12.5, 1.2);
  rightLeg.add(rightShoe);
  bodyGroup.add(rightLeg);

  // Torso (Panjabi / Shirt / Saree / Police Uniform)
  const torsoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(14.5, 16.5, 8.5),
    shirtMat
  );
  torsoMesh.position.y = 21;
  torsoMesh.castShadow = true;
  bodyGroup.add(torsoMesh);

  // Collar / Vest / Scarf accent
  const collarMesh = new THREE.Mesh(
    new THREE.BoxGeometry(15.2, 4.2, 9.1),
    pantsMat
  );
  collarMesh.position.y = 26.5;
  bodyGroup.add(collarMesh);

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-9.8, 27.5, 0);
  const leftArmUpper = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 12.5, 4.5),
    shirtMat
  );
  leftArmUpper.position.y = -6;
  leftArmUpper.castShadow = true;
  leftArm.add(leftArmUpper);
  const leftHand = new THREE.Mesh(
    new THREE.SphereGeometry(2.7, 10, 10),
    skinMat
  );
  leftHand.position.y = -12.5;
  leftArm.add(leftHand);
  bodyGroup.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(9.8, 27.5, 0);
  const rightArmUpper = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 12.5, 4.5),
    shirtMat
  );
  rightArmUpper.position.y = -6;
  rightArmUpper.castShadow = true;
  rightArm.add(rightArmUpper);
  const rightHand = new THREE.Mesh(
    new THREE.SphereGeometry(2.7, 10, 10),
    skinMat
  );
  rightHand.position.y = -12.5;
  rightArm.add(rightHand);
  bodyGroup.add(rightArm);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 34, 0);
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(6.4, 16, 16),
    skinMat
  );
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 8), eyeMat);
  leftEye.position.set(-2.2, 1.0, 5.8);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 8), eyeMat);
  rightEye.position.set(2.2, 1.0, 5.8);
  headGroup.add(leftEye, rightEye);

  // Hair or Police Cap / Leader Cap
  if (opts.role === 'COP') {
    const capCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 6.4, 4.2, 16),
      new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.4 })
    );
    capCrown.position.y = 4.6;
    const capVisor = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3 })
    );
    capVisor.position.set(0, 2.8, 4.8);
    headGroup.add(capCrown, capVisor);
  } else {
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(6.7, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCap.position.y = 0.6;
    headGroup.add(hairCap);
    if (opts.isFemale) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 10), hairMat);
      bun.position.set(0, 1.5, -6.2);
      headGroup.add(bun);
    }
  }

  // Player Golden Crown / Halo Ring or Activist Placard
  if (opts.isPlayer) {
    const playerRing = new THREE.Mesh(
      new THREE.RingGeometry(14, 18, 28),
      new THREE.MeshBasicMaterial({
        color: '#00f0ff',
        side: THREE.DoubleSide,
      })
    );
    playerRing.rotation.x = -Math.PI / 2;
    playerRing.position.y = 1.2;
    root.add(playerRing);
  } else if (opts.placardText) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 26, 8),
      new THREE.MeshStandardMaterial({ color: '#78350f' })
    );
    pole.position.set(0, 4, 3);
    rightArm.add(pole);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(22, 10, 1.4),
      new THREE.MeshStandardMaterial({ color: '#fef08a' })
    );
    board.position.set(0, 16, 3);
    rightArm.add(board);
  }

  bodyGroup.add(headGroup);

  // Target / Hit Ground Ring
  const hitRing = new THREE.Mesh(
    new THREE.RingGeometry(13, 16.5, 24),
    new THREE.MeshBasicMaterial({
      color: '#ef4444',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    })
  );
  hitRing.rotation.x = -Math.PI / 2;
  hitRing.position.y = 1.0;
  root.add(hitRing);

  // Floating Overhead Name + Money + Speech Sprite
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 384;
  labelCanvas.height = 116;
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const spriteMat = new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthTest: false,
  });
  const labelSprite = new THREE.Sprite(spriteMat);
  labelSprite.position.set(0, 56, 0);
  labelSprite.scale.set(66, 20, 1);
  labelSprite.renderOrder = 25;
  root.add(labelSprite);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    hitRing,
    labelSprite,
    labelCanvas,
    labelTexture,
    lastSpeechText: '__init__',
    lastMoneyVal: -1,
    lastHpBucket: -1,
    lastTargetFlag: false,
  };
}

function createVehicle3DRig(v: VehicleState): Vehicle3DRig {
  const root = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const wheelGeo = new THREE.CylinderGeometry(7.5, 7.5, 5, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.85,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#bae6fd',
    roughness: 0.12,
    metalness: 0.1,
    transmission: 0.45,
    transparent: true,
    opacity: 0.82,
  });
  const headlightMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
  const taillightMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });

  if (v.type === 'DHAKA_BUS') {
    // Multi-part Dhaka City Bus (Gulshan - Shahbagh - Motijheel - Jatrabari)
    const busW = v.width || 48;
    const busL = v.length || 116;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: v.primaryColor || '#059669',
      roughness: 0.35,
      metalness: 0.25,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: v.secondaryColor || '#facc15',
      roughness: 0.4,
    });

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(busW, 34, busL),
      bodyMat
    );
    chassis.position.y = 22;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    root.add(chassis);

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(busW + 0.8, 7, busL + 0.6),
      stripeMat
    );
    stripe.position.y = 18;
    root.add(stripe);

    const roofRack = new THREE.Mesh(
      new THREE.BoxGeometry(busW - 6, 3.5, busL - 14),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 })
    );
    roofRack.position.y = 40.5;
    root.add(roofRack);

    // Front & rear windshields + side windows
    const frontWindshield = new THREE.Mesh(
      new THREE.BoxGeometry(busW - 6, 13, 2),
      glassMat
    );
    frontWindshield.position.set(0, 27, busL / 2 + 0.5);
    root.add(frontWindshield);

    const sideWinBand = new THREE.Mesh(
      new THREE.BoxGeometry(busW + 1.0, 11, busL - 18),
      glassMat
    );
    sideWinBand.position.set(0, 28, 0);
    root.add(sideWinBand);

    // Headlights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 2), headlightMat);
    hlL.position.set(-busW / 2 + 6, 13, busL / 2 + 0.8);
    const hlR = hlL.clone();
    hlR.position.x = busW / 2 - 6;
    root.add(hlL, hlR);

    // 6 Bus Wheels
    const wheelOffsets: [number, number][] = [
      [-busW / 2, busL * 0.33],
      [busW / 2, busL * 0.33],
      [-busW / 2, -busL * 0.12],
      [busW / 2, -busL * 0.12],
      [-busW / 2, -busL * 0.34],
      [busW / 2, -busL * 0.34],
    ];
    for (const [wx, wz] of wheelOffsets) {
      const wm = new THREE.Mesh(wheelGeo, wheelMat);
      wm.position.set(wx, 7.5, wz);
      root.add(wm);
      wheels.push(wm);
    }
  } else if (v.type === 'RICKSHAW' || v.type === 'VAN_GARI') {
    // Colorful Dhaka Art Rickshaw / Van Gari
    const frameMat = new THREE.MeshStandardMaterial({
      color: v.primaryColor || '#f59e0b',
      roughness: 0.4,
    });
    const hoodMat = new THREE.MeshStandardMaterial({
      color: v.secondaryColor || '#ec4899',
      roughness: 0.5,
    });

    const baseDeck = new THREE.Mesh(
      new THREE.BoxGeometry(26, 5, 42),
      frameMat
    );
    baseDeck.position.y = 8;
    baseDeck.castShadow = true;
    root.add(baseDeck);

    if (v.type === 'RICKSHAW') {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(24, 9, 16),
        new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.6 })
      );
      seat.position.set(0, 14, -9);
      root.add(seat);

      const hood = new THREE.Mesh(
        new THREE.CylinderGeometry(13, 13, 25, 12, 1, false, 0, Math.PI),
        hoodMat
      );
      hood.rotation.z = Math.PI / 2;
      hood.position.set(0, 24, -10);
      hood.castShadow = true;
      root.add(hood);
    } else {
      // Wooden flatbread Van Gari
      const flatbed = new THREE.Mesh(
        new THREE.BoxGeometry(30, 3.5, 30),
        new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.8 })
      );
      flatbed.position.set(0, 11, -6);
      root.add(flatbed);
    }

    // 3 Tricycle Wheels (1 front, 2 rear)
    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.scale.set(0.7, 0.85, 0.85);
    frontWheel.position.set(0, 6.5, 18);
    const rearL = frontWheel.clone();
    rearL.position.set(-13, 6.5, -13);
    const rearR = frontWheel.clone();
    rearR.position.set(13, 6.5, -13);
    root.add(frontWheel, rearL, rearR);
    wheels.push(frontWheel, rearL, rearR);
  } else if (v.type === 'MOTORCYCLE') {
    const bikeMat = new THREE.MeshPhysicalMaterial({
      color: v.primaryColor || '#ef4444',
      metalness: 0.6,
      roughness: 0.25,
      clearcoat: 0.8,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 34), bikeMat);
    body.position.y = 13;
    body.castShadow = true;
    root.add(body);

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 18, 8),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.8 })
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 22, 10);
    root.add(handle);

    const fw = new THREE.Mesh(wheelGeo, wheelMat);
    fw.scale.set(0.6, 0.9, 0.9);
    fw.position.set(0, 7, 14);
    const rw = fw.clone();
    rw.position.set(0, 7, -14);
    root.add(fw, rw);
    wheels.push(fw, rw);
  } else {
    // DMP Police Cruiser, CNG Taxi, Muscle V8, Sports Car
    const carW = v.width || 38;
    const carL = v.length || 74;
    const carPaint = new THREE.MeshPhysicalMaterial({
      color: v.primaryColor || '#2563eb',
      metalness: 0.55,
      roughness: 0.25,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15,
    });

    const lowerBody = new THREE.Mesh(
      new THREE.BoxGeometry(carW, 13, carL),
      carPaint
    );
    lowerBody.position.y = 12;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    root.add(lowerBody);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(carW - 5, 11, carL * 0.52),
      new THREE.MeshStandardMaterial({
        color: v.secondaryColor || '#f8fafc',
        roughness: 0.3,
      })
    );
    cabin.position.set(0, 23, -3);
    cabin.castShadow = true;
    root.add(cabin);

    const cabinGlass = new THREE.Mesh(
      new THREE.BoxGeometry(carW - 3.8, 8.5, carL * 0.54),
      glassMat
    );
    cabinGlass.position.set(0, 22.8, -3);
    root.add(cabinGlass);

    // Headlights & Taillights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2), headlightMat);
    hlL.position.set(-carW / 2 + 6, 12, carL / 2 + 0.6);
    const hlR = hlL.clone();
    hlR.position.x = carW / 2 - 6;
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2), taillightMat);
    tlL.position.set(-carW / 2 + 6, 12, -carL / 2 - 0.6);
    const tlR = tlL.clone();
    tlR.position.x = carW / 2 - 6;
    root.add(hlL, hlR, tlL, tlR);

    let sirenRed: THREE.Mesh | undefined;
    let sirenBlue: THREE.Mesh | undefined;
    if (v.type === 'POLICE_CRUISER') {
      sirenRed = new THREE.Mesh(
        new THREE.BoxGeometry(8, 3.2, 4.5),
        new THREE.MeshBasicMaterial({ color: '#ef4444' })
      );
      sirenRed.position.set(-5, 30, -2);
      sirenBlue = new THREE.Mesh(
        new THREE.BoxGeometry(8, 3.2, 4.5),
        new THREE.MeshBasicMaterial({ color: '#3b82f6' })
      );
      sirenBlue.position.set(5, 30, -2);
      root.add(sirenRed, sirenBlue);
    }

    const wOffsets: [number, number][] = [
      [-carW / 2, carL * 0.3],
      [carW / 2, carL * 0.3],
      [-carW / 2, -carL * 0.3],
      [carW / 2, -carL * 0.3],
    ];
    for (const [wx, wz] of wOffsets) {
      const wm = new THREE.Mesh(wheelGeo, wheelMat);
      wm.position.set(wx, 7.5, wz);
      root.add(wm);
      wheels.push(wm);
    }

    return { root, wheels, sirenRed, sirenBlue };
  }

  return { root, wheels };
}

export const Three3DWorld: React.FC<Three3DWorldProps> = ({
  worldRef,
  isRotatedLandscape = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orbitYawOffsetRef = useRef<number>(0);
  const orbitPitchOffsetRef = useRef<number>(0);
  const dragPointerIdRef = useRef<number | null>(null);
  const lastDragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      console.error('WebGL initialization failed:', err);
      return;
    }

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererInfo = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software/i.test(
      rendererInfo
    );

    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#7dd3fc');
    scene.fog = new THREE.FogExp2('#bae6fd', 0.00024);

    // PMREM Environment Lighting for realistic glass & vehicle reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = roomEnv;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(56, 1, 4, 8500);

    // Warm Dhaka Afternoon Sunlight + Sky Hemisphere Light
    const hemiLight = new THREE.HemisphereLight('#e0f2fe', '#334155', 0.85);
    hemiLight.position.set(0, 600, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.85);
    sunLight.position.set(1600, 1450, 900);
    sunLight.target.position.set(2400, 0, 1800);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 200;
      sunLight.shadow.camera.far = 4800;
      const d = 2200;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0004;
    }
    scene.add(sunLight);
    scene.add(sunLight.target);

    const textures = createDhakaProceduralTextures(renderer);

    // =========================================================================
    // 1. BASE WATER OCEAN / BURIGANGA RIVER & DHAKA CITY CONCRETE SLAB
    // =========================================================================
    const waterPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_WIDTH + 3000, WORLD_HEIGHT + 3000),
      new THREE.MeshStandardMaterial({
        map: textures.waterTex,
        roughness: 0.2,
        metalness: 0.15,
      })
    );
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.set(WORLD_WIDTH / 2, -2, WORLD_HEIGHT / 2);
    scene.add(waterPlane);

    const sidewalkSlab = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD_WIDTH - 140, 4, WORLD_HEIGHT - 120),
      new THREE.MeshStandardMaterial({
        map: textures.sidewalkTex,
        roughness: 0.82,
      })
    );
    sidewalkSlab.position.set(
      60 + (WORLD_WIDTH - 180) / 2,
      0,
      60 + (WORLD_HEIGHT - 120) / 2
    );
    sidewalkSlab.receiveShadow = true;
    scene.add(sidewalkSlab);

    // =========================================================================
    // 2. TERRAIN ZONES (RAMNA PARK, SHAHBAGH PLAZA, TEJGAON RAIL YARD, SADARGHAT)
    // =========================================================================
    for (const tz of TERRAIN_ZONES) {
      let mat: THREE.Material;
      let yPos = 2.4;
      if (tz.type === 'TROPICAL_PARK') {
        mat = new THREE.MeshStandardMaterial({
          map: textures.grassTex,
          roughness: 0.85,
        });
      } else if (tz.type === 'OCEAN_SURF') {
        mat = new THREE.MeshStandardMaterial({
          map: textures.waterTex,
          roughness: 0.18,
          metalness: 0.2,
        });
        yPos = 1.6;
      } else if (tz.type === 'SAND_BEACH') {
        mat = new THREE.MeshStandardMaterial({
          color: '#f59e0b',
          roughness: 0.9,
        });
      } else if (tz.type === 'PLAZA_TILES') {
        mat = new THREE.MeshStandardMaterial({
          color: '#fed7aa',
          roughness: 0.65,
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: '#64748b',
          roughness: 0.75,
        });
      }

      const zoneMesh = new THREE.Mesh(
        new THREE.BoxGeometry(tz.w, 1.2, tz.h),
        mat
      );
      zoneMesh.position.set(tz.x + tz.w / 2, yPos, tz.y + tz.h / 2);
      zoneMesh.receiveShadow = true;
      scene.add(zoneMesh);
    }

    // Ramna Park Lake + Central Fountain
    const lakeDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(
        PARK_POND_CIRCLE.r,
        PARK_POND_CIRCLE.r,
        2.5,
        40
      ),
      new THREE.MeshStandardMaterial({
        map: textures.waterTex,
        roughness: 0.12,
        metalness: 0.25,
      })
    );
    lakeDisc.position.set(PARK_POND_CIRCLE.x, 2.5, PARK_POND_CIRCLE.y);
    scene.add(lakeDisc);

    const lakeRim = new THREE.Mesh(
      new THREE.TorusGeometry(PARK_POND_CIRCLE.r + 4, 5, 12, 48),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.6 })
    );
    lakeRim.rotation.x = Math.PI / 2;
    lakeRim.position.set(PARK_POND_CIRCLE.x, 4.2, PARK_POND_CIRCLE.y);
    scene.add(lakeRim);

    // Shahbagh Public Rally Stage (শাহবাগ গণমঞ্চ)
    const stageMesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        SHAHBAGH_RALLY_STAGE.w,
        10,
        SHAHBAGH_RALLY_STAGE.h
      ),
      new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.5 })
    );
    stageMesh.position.set(
      SHAHBAGH_RALLY_STAGE.x + SHAHBAGH_RALLY_STAGE.w / 2,
      7,
      SHAHBAGH_RALLY_STAGE.y + SHAHBAGH_RALLY_STAGE.h / 2
    );
    stageMesh.castShadow = true;
    scene.add(stageMesh);

    // =========================================================================
    // 3. REALISTIC DHAKA ASPHALT ROADS, MEDIANS & GOOGLE-MAPS ROAD GANTRIES
    // =========================================================================
    for (const r of ROADS) {
      const isHoriz = r.orientation === 'horizontal';
      const tex = (
        isHoriz ? textures.roadHoriz : textures.roadVert
      ).clone();
      tex.needsUpdate = true;
      if (isHoriz) {
        tex.repeat.set(Math.max(1, Math.round(r.w / 240)), 1);
      } else {
        tex.repeat.set(1, Math.max(1, Math.round(r.h / 240)));
      }

      const roadMesh = new THREE.Mesh(
        new THREE.BoxGeometry(r.w, 1.4, r.h),
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.78,
        })
      );
      roadMesh.position.set(r.x + r.w / 2, 2.5, r.y + r.h / 2);
      roadMesh.receiveShadow = true;
      scene.add(roadMesh);
    }

    // Iconic Motijheel Shapla Chattar (শাপলা চত্বর) 3D Sculpture Landmark at Central Intersection
    const shaplaGroup = new THREE.Group();
    shaplaGroup.position.set(2635, 3, 1015);
    const shaplaPool = new THREE.Mesh(
      new THREE.CylinderGeometry(36, 40, 6, 28),
      new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.4 })
    );
    shaplaPool.position.y = 3;
    shaplaGroup.add(shaplaPool);
    const shaplaStem = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 8, 28, 16),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
    );
    shaplaStem.position.y = 18;
    shaplaGroup.add(shaplaStem);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.ConeGeometry(7, 22, 8),
        new THREE.MeshStandardMaterial({
          color: '#fef08a',
          emissive: '#ca8a04',
          emissiveIntensity: 0.25,
          roughness: 0.3,
        })
      );
      petal.position.set(Math.cos(angle) * 10, 32, Math.sin(angle) * 10);
      petal.rotation.z = -Math.cos(angle) * 0.45;
      petal.rotation.x = Math.sin(angle) * 0.45;
      shaplaGroup.add(petal);
    }
    scene.add(shaplaGroup);

    // Overhead Dhaka Highway Direction Sign Gantries (শাহবাগ, মতিঝিল, কমলাপুর, কারওয়ান বাজার)
    const gantries = [
      {
        x: 1820,
        z: 1015,
        text: '⬅ নিউ মার্কেট · শাহবাগ চত্বর · মতিঝিল শাপলা চত্বর ➡',
      },
      {
        x: 1950,
        z: 450,
        text: '⬆ কমলাপুর রেল স্টেশন · ডিজে নাইট ক্লাব · গার্মেন্টস ➡',
      },
      {
        x: 3450,
        z: 1015,
        text: '⚽ জাতীয় ফুটবল স্টেডিয়াম · সুপ্রিম কোর্ট · সদরঘাট ➡',
      },
    ];
    for (const g of gantries) {
      const gGroup = new THREE.Group();
      gGroup.position.set(g.x, 3, g.z);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: '#475569',
        metalness: 0.6,
        roughness: 0.4,
      });
      const leftPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 2.5, 58, 10),
        pillarMat
      );
      leftPillar.position.set(0, 29, -68);
      const rightPillar = leftPillar.clone();
      rightPillar.position.set(0, 29, 68);
      const crossbar = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 140, 10),
        pillarMat
      );
      crossbar.rotation.x = Math.PI / 2;
      crossbar.position.set(0, 56, 0);
      gGroup.add(leftPillar, rightPillar, crossbar);

      const signTex = createConfiguredCanvasTexture(
        renderer,
        512,
        96,
        (ctx, w, h) => {
          ctx.fillStyle = '#065f46';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.strokeRect(4, 4, w - 8, h - 8);
          ctx.fillStyle = '#fef08a';
          ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(g.text, w / 2, h / 2);
        }
      );
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(3, 22, 124),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
      );
      signBoard.position.set(0, 56, 0);
      gGroup.add(signBoard);
      scene.add(gGroup);
    }

    // =========================================================================
    // 4. PERIMETER METRO RAIL TRACK, SLEEPERS, PLATFORMS & MULTI-COACH TRAIN
    // =========================================================================
    const { leftX, topY, rightX, bottomY } = TRAIN_LOOP_RECT;
    const loopW = rightX - leftX;
    const loopH = bottomY - topY;
    const railBedMat = new THREE.MeshStandardMaterial({
      color: '#292524',
      roughness: 0.9,
    });
    const steelRailMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.85,
      roughness: 0.25,
    });

    // Top, Bottom, Left, Right gravel track beds
    const topBed = new THREE.Mesh(
      new THREE.BoxGeometry(loopW + 44, 2.2, 44),
      railBedMat
    );
    topBed.position.set(leftX + loopW / 2, 3.1, topY);
    const botBed = topBed.clone();
    botBed.position.set(leftX + loopW / 2, 3.1, bottomY);
    const leftBed = new THREE.Mesh(
      new THREE.BoxGeometry(44, 2.2, loopH + 44),
      railBedMat
    );
    leftBed.position.set(leftX, 3.1, topY + loopH / 2);
    const rightBed = leftBed.clone();
    rightBed.position.set(rightX, 3.1, topY + loopH / 2);
    scene.add(topBed, botBed, leftBed, rightBed);

    // Steel rails
    for (const offset of [-9, 9]) {
      const rTop = new THREE.Mesh(
        new THREE.BoxGeometry(loopW + 20, 1.5, 2.2),
        steelRailMat
      );
      rTop.position.set(leftX + loopW / 2, 4.6, topY + offset);
      const rBot = rTop.clone();
      rBot.position.set(leftX + loopW / 2, 4.6, bottomY + offset);
      const rLeft = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.5, loopH + 20),
        steelRailMat
      );
      rLeft.position.set(leftX + offset, 4.6, topY + loopH / 2);
      const rRight = rLeft.clone();
      rRight.position.set(rightX + offset, 4.6, topY + loopH / 2);
      scene.add(rTop, rBot, rLeft, rRight);
    }

    // 4 Train Stations (Kamalapur North, Sadarghat East, Jatrabari South, Dhanmondi West)
    for (const st of TRAIN_STATIONS) {
      const stGroup = new THREE.Group();
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(st.platformW, 9, st.platformH),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6 })
      );
      platform.position.set(
        st.platformX + st.platformW / 2,
        6.5,
        st.platformY + st.platformH / 2
      );
      platform.receiveShadow = true;
      stGroup.add(platform);

      // Station Canopy Roof
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(st.platformW - 8, 4, st.platformH - 8),
        new THREE.MeshStandardMaterial({
          color: '#0284c7',
          roughness: 0.35,
          metalness: 0.3,
        })
      );
      canopy.position.set(
        st.platformX + st.platformW / 2,
        36,
        st.platformY + st.platformH / 2
      );
      canopy.castShadow = true;
      stGroup.add(canopy);
      scene.add(stGroup);
    }

    // Multi-Coach Dhaka Metro Rail Express Train
    const trainCoachMeshes: THREE.Group[] = [];
    const numCoaches = 4;
    for (let c = 0; c < numCoaches; c++) {
      const coachGroup = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(112, 28, 36),
        new THREE.MeshStandardMaterial({
          color: c === 0 ? '#065f46' : '#0f766e',
          roughness: 0.3,
          metalness: 0.4,
        })
      );
      body.position.y = 19;
      body.castShadow = true;
      coachGroup.add(body);

      const redStripe = new THREE.Mesh(
        new THREE.BoxGeometry(113, 5, 36.8),
        new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.3 })
      );
      redStripe.position.y = 17;
      coachGroup.add(redStripe);

      const windowBand = new THREE.Mesh(
        new THREE.BoxGeometry(100, 8, 37.2),
        new THREE.MeshBasicMaterial({ color: '#bae6fd' })
      );
      windowBand.position.y = 23.5;
      coachGroup.add(windowBand);

      scene.add(coachGroup);
      trainCoachMeshes.push(coachGroup);
    }

    // =========================================================================
    // 5. DHAKA CITY LANDMARK BUILDINGS, ENTERABLE INTERIORS & STADIUM
    // =========================================================================
    const buildingRoofs: Array<{
      building: Building;
      roofMesh: THREE.Mesh;
      wallMeshes: THREE.Mesh[];
    }> = [];

    for (const b of BUILDINGS) {
      const bGroup = new THREE.Group();
      const facadeTex = textures.createBuildingFacadeTex(b);

      if (b.interiorType === 'FOOTBALL_STADIUM') {
        // Baper City National Football Stadium (জাতীয় ফুটবল স্টেডিয়াম)
        const pitchMesh = new THREE.Mesh(
          new THREE.BoxGeometry(b.w - 40, 2, b.h - 40),
          new THREE.MeshStandardMaterial({
            map: textures.pitchTex,
            roughness: 0.8,
          })
        );
        pitchMesh.position.set(b.x + b.w / 2, 3.2, b.y + b.h / 2);
        pitchMesh.receiveShadow = true;
        bGroup.add(pitchMesh);

        // Stadium Grandstand Tiers around 4 sides (with left entrance gap)
        const standMat = new THREE.MeshStandardMaterial({
          color: '#1e293b',
          roughness: 0.6,
        });
        const topStand = new THREE.Mesh(
          new THREE.BoxGeometry(b.w, 38, 28),
          standMat
        );
        topStand.position.set(b.x + b.w / 2, 21, b.y + 14);
        const botStand = topStand.clone();
        botStand.position.set(b.x + b.w / 2, 21, b.y + b.h - 14);
        const rightStand = new THREE.Mesh(
          new THREE.BoxGeometry(28, 38, b.h),
          standMat
        );
        rightStand.position.set(b.x + b.w - 14, 21, b.y + b.h / 2);
        bGroup.add(topStand, botStand, rightStand);

        // Left & Right 3D Goalposts
        const goalMat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 0.2,
        });
        const pitchLeft = b.x + 56;
        const pitchRight = b.x + b.w - 56;
        const pitchMidZ = b.y + b.h / 2;
        for (const gx of [pitchLeft, pitchRight]) {
          const gPost = new THREE.Group();
          const postL = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 28, 8),
            goalMat
          );
          postL.position.set(gx, 16, pitchMidZ - 64);
          const postR = postL.clone();
          postR.position.set(gx, 16, pitchMidZ + 64);
          const crossbar = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 128, 8),
            goalMat
          );
          crossbar.rotation.x = Math.PI / 2;
          crossbar.position.set(gx, 30, pitchMidZ);
          gPost.add(postL, postR, crossbar);
          bGroup.add(gPost);
        }

        // 4 Stadium Floodlight Towers
        const cornerCoords: [number, number][] = [
          [b.x + 24, b.y + 24],
          [b.x + b.w - 24, b.y + 24],
          [b.x + 24, b.y + b.h - 24],
          [b.x + b.w - 24, b.y + b.h - 24],
        ];
        for (const [fx, fz] of cornerCoords) {
          const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 5, 115, 10),
            new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.7 })
          );
          mast.position.set(fx, 58, fz);
          const lampHead = new THREE.Mesh(
            new THREE.BoxGeometry(22, 10, 8),
            new THREE.MeshBasicMaterial({ color: '#fef9c3' })
          );
          lampHead.position.set(fx, 116, fz);
          bGroup.add(mast, lampHead);
        }

        scene.add(bGroup);
        continue;
      }

      const wallH = Math.max(55, b.height3D * 1.15);

      if (b.enterable) {
        // Enterable 3D Building: Floor + Interior Furniture + Perimeter Walls + Auto-Cutaway Roof!
        const floorColors: Record<string, string> = {
          NIGHTCLUB: '#1e1b4b',
          HOSPITAL: '#f0fdfa',
          POLICE_STATION: '#e2e8f0',
          PLAYER_HOME: '#ccfbf1',
          GARMENTS: '#e0f2fe',
          OFFICE_COURT: '#fef3c7',
          HOTEL: '#fffbeb',
        };
        const interiorFloor = new THREE.Mesh(
          new THREE.BoxGeometry(b.w - 8, 2, b.h - 8),
          new THREE.MeshStandardMaterial({
            color: floorColors[b.interiorType || ''] || '#f1f5f9',
            roughness: 0.5,
          })
        );
        interiorFloor.position.set(b.x + b.w / 2, 3.2, b.y + b.h / 2);
        interiorFloor.receiveShadow = true;
        bGroup.add(interiorFloor);

        // 3D Interior Props based on building type
        if (b.interiorType === 'NIGHTCLUB') {
          const discoFloor = new THREE.Mesh(
            new THREE.BoxGeometry(b.w * 0.5, 2.5, b.h * 0.5),
            new THREE.MeshBasicMaterial({ color: '#ec4899' })
          );
          discoFloor.position.set(b.x + b.w / 2, 4.2, b.y + b.h / 2);
          bGroup.add(discoFloor);
        } else if (b.interiorType === 'HOSPITAL') {
          for (let i = 0; i < 4; i++) {
            const bed = new THREE.Mesh(
              new THREE.BoxGeometry(42, 10, 24),
              new THREE.MeshStandardMaterial({ color: '#38bdf8' })
            );
            bed.position.set(b.x + 110 + i * 130, 9, b.y + 85);
            bGroup.add(bed);
          }
        } else if (b.interiorType === 'POLICE_STATION') {
          // Lockup Iron Bars Cell inside DMP Thana
          const lockupCage = new THREE.Mesh(
            new THREE.BoxGeometry(130, 34, 95),
            new THREE.MeshStandardMaterial({
              color: '#334155',
              wireframe: true,
            })
          );
          lockupCage.position.set(b.x + b.w - 95, 20, b.y + 80);
          bGroup.add(lockupCage);
        } else if (b.interiorType === 'GARMENTS') {
          for (let i = 0; i < 5; i++) {
            const table = new THREE.Mesh(
              new THREE.BoxGeometry(95, 11, 32),
              new THREE.MeshStandardMaterial({ color: '#0284c7' })
            );
            table.position.set(b.x + 140 + i * 155, 9, b.y + b.h / 2);
            bGroup.add(table);
          }
        } else if (b.interiorType === 'PLAYER_HOME') {
          const kingBed = new THREE.Mesh(
            new THREE.BoxGeometry(75, 12, 58),
            new THREE.MeshStandardMaterial({ color: '#14b8a6' })
          );
          kingBed.position.set(b.x + 110, 10, b.y + 75);
          const safeVault = new THREE.Mesh(
            new THREE.BoxGeometry(36, 26, 32),
            new THREE.MeshStandardMaterial({
              color: '#eab308',
              metalness: 0.7,
              roughness: 0.3,
            })
          );
          safeVault.position.set(b.x + b.w - 85, 16, b.y + 65);
          bGroup.add(kingBed, safeVault);
        }

        // Exterior Walls with Doorway Opening
        const wallMat = new THREE.MeshStandardMaterial({
          map: facadeTex,
          roughness: 0.55,
          transparent: true,
          opacity: 1,
        });
        const wt = 12;
        const doorGap = 135;
        const botSideW = Math.max(24, (b.w - doorGap) / 2);

        const topWall = new THREE.Mesh(
          new THREE.BoxGeometry(b.w, wallH, wt),
          wallMat
        );
        topWall.position.set(b.x + b.w / 2, wallH / 2 + 2, b.y + wt / 2);
        topWall.castShadow = true;

        const botLeftWall = new THREE.Mesh(
          new THREE.BoxGeometry(botSideW, wallH, wt),
          wallMat
        );
        botLeftWall.position.set(
          b.x + botSideW / 2,
          wallH / 2 + 2,
          b.y + b.h - wt / 2
        );
        botLeftWall.castShadow = true;

        const botRightWall = new THREE.Mesh(
          new THREE.BoxGeometry(botSideW, wallH, wt),
          wallMat
        );
        botRightWall.position.set(
          b.x + b.w - botSideW / 2,
          wallH / 2 + 2,
          b.y + b.h - wt / 2
        );
        botRightWall.castShadow = true;

        const leftWall = new THREE.Mesh(
          new THREE.BoxGeometry(wt, wallH, b.h),
          wallMat
        );
        leftWall.position.set(b.x + wt / 2, wallH / 2 + 2, b.y + b.h / 2);
        leftWall.castShadow = true;

        const rightWall = new THREE.Mesh(
          new THREE.BoxGeometry(wt, wallH, b.h),
          wallMat
        );
        rightWall.position.set(
          b.x + b.w - wt / 2,
          wallH / 2 + 2,
          b.y + b.h / 2
        );
        rightWall.castShadow = true;

        bGroup.add(topWall, botLeftWall, botRightWall, leftWall, rightWall);

        // Roof Cap (automatically becomes translucent/cutaway when player approaches or enters!)
        const roofMat = new THREE.MeshStandardMaterial({
          color: b.roofColor || '#f1f5f9',
          roughness: 0.65,
          transparent: true,
          opacity: 1,
        });
        const roofMesh = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 4, 6, b.h + 4),
          roofMat
        );
        roofMesh.position.set(b.x + b.w / 2, wallH + 5, b.y + b.h / 2);
        roofMesh.castShadow = true;
        bGroup.add(roofMesh);

        buildingRoofs.push({
          building: b,
          roofMesh,
          wallMeshes: [
            topWall,
            botLeftWall,
            botRightWall,
            leftWall,
            rightWall,
          ],
        });
      } else {
        // Solid Architectural Landmark Building
        const roofMat = new THREE.MeshStandardMaterial({
          color: b.roofColor || '#e2e8f0',
          roughness: 0.6,
        });
        const wallMat = new THREE.MeshStandardMaterial({
          map: facadeTex,
          roughness: 0.5,
        });
        const blockMesh = new THREE.Mesh(
          new THREE.BoxGeometry(b.w, wallH, b.h),
          [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]
        );
        blockMesh.position.set(b.x + b.w / 2, wallH / 2 + 2, b.y + b.h / 2);
        blockMesh.castShadow = true;
        blockMesh.receiveShadow = true;
        bGroup.add(blockMesh);
      }

      // Rooftop Water Tank & Solar Panel Details (authentic Dhaka rooftop skyline)
      const waterTank = new THREE.Mesh(
        new THREE.CylinderGeometry(12, 12, 20, 14),
        new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4 })
      );
      waterTank.position.set(b.x + b.w - 45, wallH + 14, b.y + 42);
      bGroup.add(waterTank);

      scene.add(bGroup);
    }

    // =========================================================================
    // 6. DHAKA BUS STOPS, STREET FOOD VANS, PALM/BANYAN TREES & STREET LAMPS
    // =========================================================================
    for (const bs of DHAKA_BUS_STOPS) {
      const bsGroup = new THREE.Group();
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(bs.w, 3.5, bs.h + 12),
        new THREE.MeshStandardMaterial({ color: '#065f46', roughness: 0.4 })
      );
      roof.position.set(bs.x + bs.w / 2, 26, bs.y + (bs.h + 12) / 2);
      roof.castShadow = true;
      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(bs.w - 6, 24, 3),
        new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.5 })
      );
      backWall.position.set(bs.x + bs.w / 2, 14, bs.y + 3);
      bsGroup.add(roof, backWall);
      scene.add(bsGroup);
    }

    for (const st of STREET_STALLS) {
      const stallGroup = new THREE.Group();
      stallGroup.position.set(st.x, 2, st.y);
      stallGroup.rotation.y = -st.angle;

      const cartBase = new THREE.Mesh(
        new THREE.BoxGeometry(st.w, 12, st.h),
        new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 })
      );
      cartBase.position.y = 8;
      cartBase.castShadow = true;
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(st.w, st.h) * 0.68, 14, 8),
        new THREE.MeshStandardMaterial({
          color: st.canopyColor1,
          roughness: 0.5,
        })
      );
      canopy.position.y = 26;
      canopy.castShadow = true;
      stallGroup.add(cartBase, canopy);
      scene.add(stallGroup);
    }

    // Tropical Trees in Ramna Park & Buriganga Waterfront
    const trunkMat = new THREE.MeshStandardMaterial({
      color: '#78350f',
      roughness: 0.85,
    });
    const foliageMat1 = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.7,
    });
    const foliageMat2 = new THREE.MeshStandardMaterial({
      color: '#16a34a',
      roughness: 0.65,
    });
    for (const tree of PALM_TREES) {
      const tGroup = new THREE.Group();
      tGroup.position.set(tree.x, 2, tree.y);
      tGroup.scale.setScalar(tree.scale * 1.15);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 5.2, 42, 10),
        trunkMat
      );
      trunk.position.y = 21;
      trunk.castShadow = true;
      tGroup.add(trunk);

      const crownMain = new THREE.Mesh(
        new THREE.DodecahedronGeometry(19, 1),
        foliageMat1
      );
      crownMain.position.set(0, 45, 0);
      crownMain.castShadow = true;
      const crownTop = new THREE.Mesh(
        new THREE.DodecahedronGeometry(14, 1),
        foliageMat2
      );
      crownTop.position.set(6, 54, 4);
      tGroup.add(crownMain, crownTop);
      scene.add(tGroup);
    }

    // Street Lamps
    for (const lamp of STREET_LAMPS) {
      const lGroup = new THREE.Group();
      lGroup.position.set(lamp.x, 2, lamp.y);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 2, 48, 8),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7 })
      );
      pole.position.y = 24;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(4, 10, 10),
        new THREE.MeshBasicMaterial({ color: lamp.color })
      );
      bulb.position.y = 49;
      lGroup.add(pole, bulb);
      scene.add(lGroup);
    }

    // 3D Football Mesh
    const footballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.3,
        metalness: 0.1,
      })
    );
    footballMesh.castShadow = true;
    scene.add(footballMesh);

    // =========================================================================
    // 7. DYNAMIC 3D RIGS FOR PLAYER, 46+ NPCs & ALL VEHICLES
    // =========================================================================
    const playerRig = createArticulatedCharacterRig(renderer, {
      primaryColor: '#10b981',
      secondaryColor: '#0f172a',
      hairColor: '#111827',
      isPlayer: true,
    });
    scene.add(playerRig.root);

    const npcRigs = new Map<string, Character3DRig>();
    for (const npc of worldRef.current.npcs) {
      const rig = createArticulatedCharacterRig(renderer, {
        primaryColor: npc.primaryColor,
        secondaryColor: npc.secondaryColor,
        hairColor: npc.hairColor,
        isFemale: npc.isFemale,
        role: npc.role,
        placardText: npc.placardText,
        isPlayer: false,
      });
      scene.add(rig.root);
      npcRigs.set(npc.id, rig);
    }

    const vehicleRigs = new Map<string, Vehicle3DRig>();
    for (const v of worldRef.current.vehicles) {
      const vRig = createVehicle3DRig(v);
      scene.add(vRig.root);
      vehicleRigs.set(v.id, vRig);
    }

    // =========================================================================
    // 8. POINTER / TOUCH 360° FREE-LOOK HANDLERS (GTA / FREE FIRE RIGHT-THUMB SWIPE)
    // =========================================================================
    // Initialize camera yaw to match player's initial forward direction
    if (worldRef.current.camera.yaw3D === undefined) {
      worldRef.current.camera.yaw3D = worldRef.current.player.angle || Math.PI / 2;
    }
    if (worldRef.current.camera.pitch3D === undefined) {
      worldRef.current.camera.pitch3D = 0.16;
    }
    orbitYawOffsetRef.current = worldRef.current.camera.yaw3D;
    orbitPitchOffsetRef.current = worldRef.current.camera.pitch3D;

    let lastLookTouchTime = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragPointerIdRef.current = e.pointerId;
      lastDragPosRef.current = { x: e.clientX, y: e.clientY };
      lastLookTouchTime = performance.now();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragPointerIdRef.current !== e.pointerId) return;
      const rawDx = e.clientX - lastDragPosRef.current.x;
      const rawDy = e.clientY - lastDragPosRef.current.y;
      lastDragPosRef.current = { x: e.clientX, y: e.clientY };
      lastLookTouchTime = performance.now();

      // Transform screen drag delta correctly whether portrait-rotated or standard landscape
      const dx = isRotatedLandscape ? rawDy : rawDx;
      const dy = isRotatedLandscape ? -rawDx : rawDy;

      const sensitivity = 0.0058;
      orbitYawOffsetRef.current += dx * sensitivity;
      orbitPitchOffsetRef.current = Math.max(
        -0.22,
        Math.min(0.68, orbitPitchOffsetRef.current + dy * 0.0042)
      );

      worldRef.current.camera.yaw3D = orbitYawOffsetRef.current;
      worldRef.current.camera.pitch3D = orbitPitchOffsetRef.current;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (dragPointerIdRef.current === e.pointerId) {
        dragPointerIdRef.current = null;
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // 3D Atmospheric Sky Dome + Glowing Sun Disc for horizon-looking TPS view
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 64;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d')!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.48, '#38bdf8');
    skyGrad.addColorStop(0.82, '#bae6fd');
    skyGrad.addColorStop(1, '#fef3c7');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 64, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(5200, 24, 16),
      new THREE.MeshBasicMaterial({
        map: skyTex,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      })
    );
    skyDome.position.set(WORLD_WIDTH / 2, 0, WORLD_HEIGHT / 2);
    scene.add(skyDome);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth || window.innerWidth);
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // =========================================================================
    // 9. REAL-TIME 3D FRAME SYNC LOOP (GTA / FREE FIRE TPS CAMERA & CONTROLS)
    // =========================================================================
    let rafId = 0;
    let isDisposed = false;
    const smoothCamPos = new THREE.Vector3(2185, 65, 720);
    const smoothLookAt = new THREE.Vector3(2185, 34, 920);

    const updateCharacterPose = (
      rig: Character3DRig,
      x: number,
      y: number,
      jumpHeight: number,
      angle: number,
      walkCycle: number,
      punchTimer: number,
      punchHand: 'left' | 'right',
      hitFlash: boolean,
      isDancing: boolean,
      timeSec: number
    ) => {
      rig.root.position.set(x, 2.5 + jumpHeight, y);
      // Convert 2D angle (atan2(dy, dx)) to Three.js yaw where +Z is local forward
      rig.bodyGroup.rotation.y = -angle + Math.PI / 2;

      const stride = Math.sin(walkCycle * 1.4) * 0.72;
      if (jumpHeight > 2) {
        // Mid-air Free Fire / GTA Jump Pose
        rig.bodyGroup.position.y = 0;
        rig.leftLeg.rotation.x = -0.55;
        rig.rightLeg.rotation.x = 0.45;
        rig.leftArm.rotation.x = -0.85;
        rig.rightArm.rotation.x = -0.65;
      } else if (isDancing) {
        rig.bodyGroup.position.y = Math.abs(Math.sin(timeSec * 8)) * 3.5;
        rig.leftArm.rotation.x = -2.2 + Math.sin(timeSec * 10) * 0.5;
        rig.rightArm.rotation.x = -2.2 - Math.sin(timeSec * 10) * 0.5;
        rig.leftLeg.rotation.x = Math.sin(timeSec * 8) * 0.45;
        rig.rightLeg.rotation.x = -Math.sin(timeSec * 8) * 0.45;
      } else {
        rig.bodyGroup.position.y = Math.abs(Math.sin(walkCycle * 1.4)) * 1.4;
        rig.leftLeg.rotation.x = stride;
        rig.rightLeg.rotation.x = -stride;
        rig.leftArm.rotation.x = -stride * 0.8;
        rig.rightArm.rotation.x = stride * 0.8;
      }

      if (punchTimer > 0) {
        if (punchHand === 'left') {
          rig.leftArm.rotation.x = -Math.PI / 2;
        } else {
          rig.rightArm.rotation.x = -Math.PI / 2;
        }
      }

      const ringMat = rig.hitRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity = hitFlash ? 0.85 : 0;
    };

    const afterDraw = (cb: FrameRequestCallback) => {
      if (isDisposed) return;
      if (!isSoftwareGl || !(gl as WebGL2RenderingContext).fenceSync) {
        rafId = requestAnimationFrame(cb);
        return;
      }
      const gl2 = gl as WebGL2RenderingContext;
      const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl2.flush();
      const poll = () => {
        if (isDisposed) return;
        if (!sync) {
          rafId = requestAnimationFrame(cb);
          return;
        }
        const status = gl2.clientWaitSync(sync, 0, 0);
        if (
          status === gl2.CONDITION_SATISFIED ||
          status === gl2.ALREADY_SIGNALED
        ) {
          gl2.deleteSync(sync);
          rafId = requestAnimationFrame(cb);
        } else {
          setTimeout(poll, 4);
        }
      };
      setTimeout(poll, 4);
    };

    const tick: FrameRequestCallback = (now) => {
      if (isDisposed) return;
      const timeSec = now / 1000;
      const w = worldRef.current;
      const p = w.player;

      w.camera.is3DMode = true;

      // Animate water texture UV offset
      textures.waterTex.offset.x = (timeSec * 0.03) % 1;
      textures.waterTex.offset.y = (timeSec * 0.02) % 1;

      // 1. Cutaway Roof Opacity when Player is inside or right next to an Enterable Building
      for (const item of buildingRoofs) {
        const b = item.building;
        const insideOrVeryNear =
          p.x >= b.x - 45 &&
          p.x <= b.x + b.w + 45 &&
          p.y >= b.y - 45 &&
          p.y <= b.y + b.h + 45;
        const roofMat = item.roofMesh.material as THREE.MeshStandardMaterial;
        const targetRoofOpacity = insideOrVeryNear ? 0.08 : 1.0;
        roofMat.opacity += (targetRoofOpacity - roofMat.opacity) * 0.18;
        item.roofMesh.visible = roofMat.opacity > 0.12;
      }

      // 2. Sync Player 3D Rig
      const playerOnFoot = !p.inVehicleId && !p.inTrain;
      playerRig.root.visible = playerOnFoot;
      // Hide player's own overhead label in close Over-The-Shoulder TPS view (Level 1) so view is unobstructed like Free Fire
      playerRig.labelSprite.visible = (w.camera.angleLevel || 1) >= 2;
      if (playerOnFoot) {
        updateCharacterPose(
          playerRig,
          p.x,
          p.y,
          p.jumpY || 0,
          p.angle,
          p.walkCycle,
          p.punchTimer,
          p.punchHand || 'right',
          p.hitFlashTimer > 0,
          false,
          timeSec
        );
        const hpBucket = Math.round((p.hp / Math.max(1, p.maxHp)) * 20);
        const moneyVal = Math.round(p.money || 0);
        if (
          playerRig.lastMoneyVal !== moneyVal ||
          playerRig.lastHpBucket !== hpBucket
        ) {
          playerRig.lastMoneyVal = moneyVal;
          playerRig.lastHpBucket = hpBucket;
          drawCharacterBadgeCanvas(
            playerRig.labelCanvas,
            '👑 আপনি (বাপের সিটি)',
            moneyVal,
            p.hp / Math.max(1, p.maxHp),
            '',
            true,
            false
          );
          playerRig.labelTexture.needsUpdate = true;
        }
      }

      // 3. Sync All 46+ Community NPCs
      for (const npc of w.npcs) {
        const rig = npcRigs.get(npc.id);
        if (!rig) continue;

        const visible =
          npc.hp > 0 &&
          !npc.drivingVehicleId &&
          !npc.ridingVehicleId &&
          !npc.inTrain;
        rig.root.visible = visible;
        if (!visible) continue;

        const distToPlayer = Math.hypot(npc.x - p.x, npc.y - p.y);
        // Hide far-away labels to keep 3D skyline crisp & fast
        rig.labelSprite.visible = distToPlayer < 650;

        updateCharacterPose(
          rig,
          npc.x,
          npc.y,
          0,
          npc.angle,
          npc.walkCycle,
          npc.punchTimer,
          npc.punchHand || 'right',
          npc.hitFlashTimer > 0,
          npc.behavior === 'DANCE',
          timeSec
        );

        if (rig.labelSprite.visible) {
          const isPrimaryTarget =
            w.nearestNpcId === npc.id &&
            w.nearestNpcDist <= MAX_VOICE_HEARING_DIST;
          const shownSpeech =
            distToPlayer <= MAX_VOICE_HEARING_DIST ? npc.speech || '' : '';
          const moneyVal = Math.round(npc.money ?? 5000);
          const hpBucket = Math.round((npc.hp / Math.max(1, npc.maxHp)) * 10);

          if (
            rig.lastSpeechText !== shownSpeech ||
            rig.lastMoneyVal !== moneyVal ||
            rig.lastHpBucket !== hpBucket ||
            rig.lastTargetFlag !== isPrimaryTarget
          ) {
            rig.lastSpeechText = shownSpeech;
            rig.lastMoneyVal = moneyVal;
            rig.lastHpBucket = hpBucket;
            rig.lastTargetFlag = isPrimaryTarget;

            const shortName = npc.bengaliName.split('·')[0].trim();
            drawCharacterBadgeCanvas(
              rig.labelCanvas,
              `${npc.analysis.emotionEmoji} ${shortName}`,
              moneyVal,
              npc.hp / Math.max(1, npc.maxHp),
              shownSpeech,
              false,
              isPrimaryTarget
            );
            rig.labelTexture.needsUpdate = true;
          }
        }
      }

      // 4. Sync All Vehicles (Dhaka Buses, Rickshaws, Police Cruiser, Motorcycles, Cars)
      for (const v of w.vehicles) {
        const vRig = vehicleRigs.get(v.id);
        if (!vRig) continue;
        vRig.root.position.set(v.x, 2.2, v.y);
        vRig.root.rotation.y = -v.angle + Math.PI / 2;

        const spinDelta = v.speed * 0.0025;
        for (const wheel of vRig.wheels) {
          wheel.rotation.x += spinDelta;
        }

        if (vRig.sirenRed && vRig.sirenBlue) {
          const flash = Math.floor(timeSec * 8) % 2 === 0;
          (vRig.sirenRed.material as THREE.MeshBasicMaterial).color.set(
            v.sirenOn && flash ? '#ff0000' : '#450a0a'
          );
          (vRig.sirenBlue.material as THREE.MeshBasicMaterial).color.set(
            v.sirenOn && !flash ? '#38bdf8' : '#172554'
          );
        }
      }

      // 5. Sync Perimeter Dhaka Metro Train Coaches
      const trainAngle = w.train.angle || 0;
      const dirX = Math.cos(trainAngle);
      const dirZ = Math.sin(trainAngle);
      const spacing = 122;
      for (let c = 0; c < trainCoachMeshes.length; c++) {
        const coach = trainCoachMeshes[c];
        const cx = w.train.x - dirX * c * spacing;
        const cz = w.train.y - dirZ * c * spacing;
        coach.position.set(cx, 3, cz);
        coach.rotation.y = -trainAngle;
      }

      // 6. Sync Stadium Football
      if (w.football) {
        const ballSpeed = Math.hypot(w.football.vx, w.football.vy);
        const bounceY =
          8.5 + Math.min(18, ballSpeed * 0.025) * Math.abs(Math.sin(timeSec * 12));
        footballMesh.position.set(w.football.x, bounceY, w.football.y);
        footballMesh.rotation.x += w.football.vy * 0.003;
        footballMesh.rotation.z -= w.football.vx * 0.003;
      }

      // =======================================================================
      // 7. GTA / FREE FIRE 3D CAMERA SYSTEM (🎥 ভিউ ১ থেকে ৫)
      // =======================================================================
      const lvl = w.camera.angleLevel || 1;
      const focusX = Number.isFinite(p.x) ? p.x : 2185;
      const focusZ = Number.isFinite(p.y) ? p.y : 825;
      const jumpOffset = p.jumpY || 0;

      // Active vehicle or train auto-aligns camera yaw smoothly behind vehicle when driving
      let activeVehicleSpeed = 0;
      if (p.inVehicleId) {
        const activeCar = w.vehicles.find((v) => v.id === p.inVehicleId);
        if (activeCar) {
          activeVehicleSpeed = Math.abs(activeCar.speed);
          if (
            dragPointerIdRef.current === null &&
            now - lastLookTouchTime > 1200
          ) {
            let diff = activeCar.angle - orbitYawOffsetRef.current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            orbitYawOffsetRef.current += diff * 0.08;
            w.camera.yaw3D = orbitYawOffsetRef.current;
          }
        }
      } else if (p.inTrain) {
        if (
          dragPointerIdRef.current === null &&
          now - lastLookTouchTime > 1200
        ) {
          const tAng = w.train.angle || 0;
          let diff = tAng - orbitYawOffsetRef.current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          orbitYawOffsetRef.current += diff * 0.06;
          w.camera.yaw3D = orbitYawOffsetRef.current;
        }
      }

      const aimYaw = orbitYawOffsetRef.current;
      const aimPitch = orbitPitchOffsetRef.current;
      const fwdX = Math.cos(aimYaw);
      const fwdZ = Math.sin(aimYaw);
      const rightX = -Math.sin(aimYaw);
      const rightZ = Math.cos(aimYaw);

      // Dynamic FOV boost when sprinting or driving fast (GTA / Free Fire speed feel)
      const isSprinting = Boolean(
        p.isRunning && Math.hypot(p.vx, p.vy) > 180 && !p.inVehicleId
      );
      const targetFov =
        p.inVehicleId && activeVehicleSpeed > 150
          ? 68
          : isSprinting
            ? 64
            : 58;
      if (Math.abs(camera.fov - targetFov) > 0.2) {
        camera.fov += (targetFov - camera.fov) * 0.12;
        camera.updateProjectionMatrix();
      }

      // 5 Camera View Presets:
      // Level 1: Authentic Free Fire / GTA Over-The-Shoulder Third-Person (TPS) Street View
      // Level 2: GTA Action Wide Chase Camera (ideal for vehicles & combat)
      // Level 3: Tactical High Chase View
      // Level 4: Drone 3D City View
      // Level 5: Bird's-Eye Dhaka 3D Map Overview
      const camPresets: Record<
        1 | 2 | 3 | 4 | 5,
        {
          backDist: number;
          baseHeight: number;
          shoulderOffset: number;
          lookDist: number;
          lookBaseY: number;
        }
      > = {
        1: {
          backDist: p.inVehicleId ? 155 : 96,
          baseHeight: p.inVehicleId ? 58 : 44,
          shoulderOffset: p.inVehicleId ? 0 : 14,
          lookDist: 210,
          lookBaseY: 32,
        },
        2: {
          backDist: p.inVehicleId ? 225 : 165,
          baseHeight: p.inVehicleId ? 92 : 76,
          shoulderOffset: p.inVehicleId ? 0 : 10,
          lookDist: 190,
          lookBaseY: 28,
        },
        3: {
          backDist: 295,
          baseHeight: 165,
          shoulderOffset: 0,
          lookDist: 145,
          lookBaseY: 22,
        },
        4: {
          backDist: 520,
          baseHeight: 410,
          shoulderOffset: 0,
          lookDist: 80,
          lookBaseY: 15,
        },
        5: {
          backDist: 820,
          baseHeight: 880,
          shoulderOffset: 0,
          lookDist: 20,
          lookBaseY: 10,
        },
      };

      const cfg = camPresets[lvl];
      const shakeX =
        w.camera.shake > 0 ? (Math.random() - 0.5) * w.camera.shake * 0.8 : 0;
      const shakeY =
        w.camera.shake > 0 ? (Math.random() - 0.5) * w.camera.shake * 0.6 : 0;

      // Camera positioned behind player along -fwd + right shoulder offset
      const desiredCamX =
        focusX -
        fwdX * cfg.backDist +
        rightX * cfg.shoulderOffset +
        shakeX;
      const desiredCamZ =
        focusZ -
        fwdZ * cfg.backDist +
        rightZ * cfg.shoulderOffset +
        shakeX;
      const desiredCamY = Math.max(
        14,
        cfg.baseHeight +
          jumpOffset * 0.6 +
          aimPitch * (lvl <= 2 ? 95 : 180) +
          shakeY
      );

      smoothCamPos.lerp(
        new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ),
        lvl <= 2 ? 0.24 : 0.16
      );

      // Look target ahead of player along +fwd so buildings, road & sky fill the viewport
      const targetLookX =
        focusX + fwdX * cfg.lookDist + rightX * (cfg.shoulderOffset * 0.45);
      const targetLookZ =
        focusZ + fwdZ * cfg.lookDist + rightZ * (cfg.shoulderOffset * 0.45);
      const targetLookY = Math.max(
        6,
        cfg.lookBaseY + jumpOffset * 0.4 - aimPitch * (lvl <= 2 ? 75 : 40)
      );

      smoothLookAt.lerp(
        new THREE.Vector3(targetLookX, targetLookY, targetLookZ),
        lvl <= 2 ? 0.28 : 0.2
      );

      camera.position.copy(smoothCamPos);
      camera.lookAt(smoothLookAt);

      // Keep directional shadow frustum centered near player
      sunLight.position.set(focusX + 900, 1300, focusZ + 700);
      sunLight.target.position.set(focusX, 0, focusZ);
      sunLight.target.updateMatrixWorld();

      renderer.render(scene, camera);
      afterDraw(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [worldRef, isRotatedLandscape]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden touch-none select-none"
    />
  );
};
