import React, { useEffect, useRef } from 'react';
import {
  BUILDINGS,
  CENTRAL_PARK_RECT,
  DHAKA_BUS_STOPS,
  FOOTBALL_STADIUM_RECT,
  PALM_TREES,
  PARK_POND_CIRCLE,
  PLAYER_HOME_RECT,
  ROADS,
  SHAHBAGH_RALLY_STAGE,
  STREET_LAMPS,
  STREET_STALLS,
  TERRAIN_ZONES,
  TRAIN_LOOP_RECT,
  TRAIN_STATIONS,
  TRAIN_STATION_RECT,
  TRAIN_TRACK_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  resolveCircleBuildingCollision,
} from '../data/cityMap';
import {
  BUS_CONDUCTOR_CALLS,
  FUNNY_DHAKA_DIALOGUES,
  MICHIL_SLOGANS,
  NPC_DIALOGUE_BANKS,
  pickRandomLine,
  triggerCommunityCrimeReaction,
  updateLocalNPCAnalysis,
} from '../data/localNpcs';
import {
  CommunityNPCState,
  GameState,
  VehicleState,
  WorldSimulationRef,
} from '../types/game';
import {
  MAX_SFX_HEARING_DIST,
  MAX_VOICE_HEARING_DIST,
  sound,
} from '../utils/sound';

interface Canvas2DWorldProps {
  worldRef: React.MutableRefObject<WorldSimulationRef>;
  gameState: GameState;
  isRotatedLandscape?: boolean;
  onSyncHud: () => void;
  onGameEnd: (state: 'VICTORY' | 'GAME_OVER') => void;
}

interface ProceduralPatterns {
  sidewalk: CanvasPattern | null;
  asphalt: CanvasPattern | null;
  grass: CanvasPattern | null;
  water: CanvasPattern | null;
  sand: CanvasPattern | null;
  plaza: CanvasPattern | null;
}

function fillStrokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  doFill = true,
  doStroke = false
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (doFill) ctx.fill();
  if (doStroke) ctx.stroke();
}

function createProceduralPatterns(ctx: CanvasRenderingContext2D): ProceduralPatterns {
  // 1. Realistic Concrete & Brick Paver Sidewalk Pattern
  const swCanvas = document.createElement('canvas');
  swCanvas.width = 64;
  swCanvas.height = 64;
  const swCtx = swCanvas.getContext('2d')!;
  swCtx.fillStyle = '#cbd5e1';
  swCtx.fillRect(0, 0, 64, 64);
  swCtx.fillStyle = '#d8e0e9';
  swCtx.fillRect(2, 2, 28, 28);
  swCtx.fillRect(34, 34, 28, 28);
  swCtx.fillStyle = '#c3cdd9';
  swCtx.fillRect(34, 2, 28, 28);
  swCtx.fillRect(2, 34, 28, 28);
  swCtx.strokeStyle = '#94a3b8';
  swCtx.lineWidth = 1.5;
  swCtx.strokeRect(0, 0, 32, 32);
  swCtx.strokeRect(32, 0, 32, 32);
  swCtx.strokeRect(0, 32, 32, 32);
  swCtx.strokeRect(32, 32, 32, 32);

  // 2. Realistic Gray Asphalt Tarmac Road Pattern
  const asCanvas = document.createElement('canvas');
  asCanvas.width = 96;
  asCanvas.height = 96;
  const asCtx = asCanvas.getContext('2d')!;
  asCtx.fillStyle = '#334155';
  asCtx.fillRect(0, 0, 96, 96);
  for (let i = 0; i < 180; i++) {
    asCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.16)';
    asCtx.fillRect((i * 37) % 96, (i * 53) % 96, 2, 2);
  }

  // 3. Lush Green Park Grass Pattern
  const grCanvas = document.createElement('canvas');
  grCanvas.width = 80;
  grCanvas.height = 80;
  const grCtx = grCanvas.getContext('2d')!;
  grCtx.fillStyle = '#15803d';
  grCtx.fillRect(0, 0, 80, 80);
  for (let i = 0; i < 95; i++) {
    const gx = (i * 23) % 80;
    const gy = (i * 41) % 80;
    grCtx.fillStyle = i % 2 === 0 ? '#16a34a' : '#22c55e';
    grCtx.fillRect(gx, gy, 3, 6);
  }

  // 4. Daytime Turquoise River & Lake Water Pattern
  const wtCanvas = document.createElement('canvas');
  wtCanvas.width = 128;
  wtCanvas.height = 128;
  const wtCtx = wtCanvas.getContext('2d')!;
  wtCtx.fillStyle = '#0284c7';
  wtCtx.fillRect(0, 0, 128, 128);
  wtCtx.strokeStyle = 'rgba(224, 242, 254, 0.35)';
  wtCtx.lineWidth = 1.8;
  for (let y = 16; y < 128; y += 32) {
    wtCtx.beginPath();
    wtCtx.moveTo(0, y);
    wtCtx.quadraticCurveTo(32, y - 6, 64, y);
    wtCtx.quadraticCurveTo(96, y + 6, 128, y);
    wtCtx.stroke();
  }

  // 5. Warm Golden Beach Sand Pattern
  const sdCanvas = document.createElement('canvas');
  sdCanvas.width = 64;
  sdCanvas.height = 64;
  const sdCtx = sdCanvas.getContext('2d')!;
  sdCtx.fillStyle = '#f59e0b';
  sdCtx.fillRect(0, 0, 64, 64);
  sdCtx.fillStyle = '#d97706';
  for (let i = 0; i < 90; i++) {
    sdCtx.fillRect((i * 19) % 64, (i * 31) % 64, 2, 2);
  }
  sdCtx.fillStyle = '#fde68a';
  for (let i = 0; i < 60; i++) {
    sdCtx.fillRect((i * 29) % 64, (i * 13) % 64, 2, 2);
  }

  // 6. Terracotta & Cream Market Plaza Tiles
  const pzCanvas = document.createElement('canvas');
  pzCanvas.width = 48;
  pzCanvas.height = 48;
  const pzCtx = pzCanvas.getContext('2d')!;
  pzCtx.fillStyle = '#f1f5f9';
  pzCtx.fillRect(0, 0, 48, 48);
  pzCtx.fillStyle = '#fed7aa';
  pzCtx.fillRect(0, 0, 24, 24);
  pzCtx.fillRect(24, 24, 24, 24);
  pzCtx.strokeStyle = '#cbd5e1';
  pzCtx.lineWidth = 1;
  pzCtx.strokeRect(0, 0, 48, 48);

  return {
    sidewalk: ctx.createPattern(swCanvas, 'repeat'),
    asphalt: ctx.createPattern(asCanvas, 'repeat'),
    grass: ctx.createPattern(grCanvas, 'repeat'),
    water: ctx.createPattern(wtCanvas, 'repeat'),
    sand: ctx.createPattern(sdCanvas, 'repeat'),
    plaza: ctx.createPattern(pzCanvas, 'repeat'),
  };
}

export function notifyPoliceWitnesses(w: WorldSimulationRef, crimeX: number, crimeY: number) {
  const policeCar = w.vehicles.find((v) => v.id === 'car-police');
  if (policeCar) {
    policeCar.sirenOn = true;
  }

  for (const npc of w.npcs) {
    if (npc.hp <= 0) continue;
    const dist = Math.hypot(npc.x - crimeX, npc.y - crimeY);
    const distToPlayer = Math.hypot(npc.x - w.player.x, npc.y - w.player.y);
    if (npc.role === 'COP' && dist < 800) {
      if (npc.behavior !== 'PURSUIT') {
        sound.playPoliceSiren(distToPlayer);
      }
      if (policeCar && !w.player.inVehicleId?.includes('car-police') && !policeCar.driverNpcId) {
        policeCar.driverNpcId = npc.id;
        npc.drivingVehicleId = policeCar.id;
      }
      npc.behavior = 'PURSUIT';
      npc.mood = 'Angry';
      npc.behaviorTimer = 20;
      const line = pickRandomLine(NPC_DIALOGUE_BANKS[npc.id]?.aggro || []);
      npc.speech = line;
      sound.speakCharacterLine({
        npcId: npc.id,
        text: line,
        pitch: npc.voicePitch,
        rate: npc.voiceRate,
        distanceToPlayer: distToPlayer,
      });
    } else if (
      (npc.role === 'JOGGER' || npc.role === 'VAN_VENDOR' || npc.role === 'SHOPKEEPER') &&
      dist < 280
    ) {
      npc.behavior = 'PANIC_FLEE';
      npc.mood = 'Scared';
      npc.behaviorTimer = 9;
      const line = pickRandomLine(NPC_DIALOGUE_BANKS[npc.id]?.flee || []);
      npc.speech = line;
      sound.speakCharacterLine({
        npcId: npc.id,
        text: line,
        pitch: npc.voicePitch,
        rate: npc.voiceRate,
        distanceToPlayer: distToPlayer,
      });
    }
  }
}

export function stepWorldSimulation(
  w: WorldSimulationRef,
  dt: number,
  gameState: GameState,
  onGameEnd: (state: 'VICTORY' | 'GAME_OVER') => void
) {
  if (gameState !== 'PLAYING') return;

  if (w.hitstopTimer > 0) {
    w.hitstopTimer = Math.max(0, w.hitstopTimer - dt);
    return;
  }

  if (w.mobAlertTimer > 0) {
    w.mobAlertTimer = Math.max(0, w.mobAlertTimer - dt);
    if (w.mobAlertTimer <= 0) {
      const policeCar = w.vehicles.find((v) => v.id === 'car-police');
      if (policeCar && w.player.inVehicleId !== 'car-police') {
        policeCar.sirenOn = false;
      }
    }
  }

  const { player, vehicles, npcs, keys, joystick } = w;

  // 1. Step Kamalapur Express Metro Train along Railway Track (y = TRAIN_TRACK_Y)
  stepExpressTrain(w, dt);

  // 2. Combine Keyboard + Joystick input for On-Foot Movement
  let kbX = 0;
  let kbY = 0;
  if (keys['KeyW'] || keys['ArrowUp'] || keys['w'] || keys['arrowup']) kbY -= 1;
  if (keys['KeyS'] || keys['ArrowDown'] || keys['s'] || keys['arrowdown']) kbY += 1;
  if (keys['KeyA'] || keys['ArrowLeft'] || keys['a'] || keys['arrowleft']) kbX -= 1;
  if (keys['KeyD'] || keys['ArrowRight'] || keys['d'] || keys['arrowright']) kbX += 1;

  if (kbX !== 0 && kbY !== 0) {
    const inv = 1 / Math.hypot(kbX, kbY);
    kbX *= inv;
    kbY *= inv;
  }

  let inputX = kbX;
  let inputY = kbY;
  if (joystick.active && (Math.abs(joystick.dx) > 0.05 || Math.abs(joystick.dy) > 0.05)) {
    inputX = joystick.dx;
    inputY = joystick.dy;
  }

  if (player.punchTimer > 0) player.punchTimer = Math.max(0, player.punchTimer - dt);
  if (player.punchCooldown > 0) player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  if (player.hitFlashTimer > 0) player.hitFlashTimer = Math.max(0, player.hitFlashTimer - dt);

  const playerCar = player.inVehicleId
    ? vehicles.find((v) => v.id === player.inVehicleId) || null
    : null;

  // 3. Player Movement, Train Ride, Co-Passenger Ride, or Dedicated Button Driving Physics
  if (player.inTrain) {
    player.vx = 0;
    player.vy = 0;
  } else if (playerCar && player.inVehicleSeat === 'passenger') {
    player.x = playerCar.x;
    player.y = playerCar.y;
    player.angle = playerCar.angle;
  } else if (playerCar) {
    // Player is Driving: Controlled by Dedicated Forward/Backward & Left/Right Buttons (or WASD/Arrow keys)
    let throttle = 0;
    let steerInput = 0;

    if (keys['KeyW'] || keys['ArrowUp'] || keys['w'] || keys['arrowup']) throttle = 1;
    else if (keys['KeyS'] || keys['ArrowDown'] || keys['s'] || keys['arrowdown']) throttle = -0.65;

    if (keys['KeyA'] || keys['ArrowLeft'] || keys['a'] || keys['arrowleft']) steerInput = -1;
    else if (keys['KeyD'] || keys['ArrowRight'] || keys['d'] || keys['arrowright']) steerInput = 1;

    const accelRate =
      playerCar.type === 'MOTORCYCLE'
        ? 620
        : playerCar.type === 'RICKSHAW' || playerCar.type === 'VAN_GARI'
          ? 280
          : 490;
    const maxForward = playerCar.maxSpeed;
    const maxReverse = playerCar.type === 'RICKSHAW' ? -80 : -210;

    if (Math.abs(throttle) > 0.05) {
      playerCar.speed += throttle * accelRate * dt;
    } else {
      playerCar.speed *= Math.pow(0.18, dt);
      if (Math.abs(playerCar.speed) < 4) playerCar.speed = 0;
    }

    playerCar.speed = Math.max(maxReverse, Math.min(maxForward, playerCar.speed));

    const speedFactor = Math.min(1, Math.abs(playerCar.speed) / 95);
    const turnDir = playerCar.speed >= 0 ? 1 : -1;
    const turnAgility =
      playerCar.type === 'MOTORCYCLE' || playerCar.type === 'RICKSHAW' ? 3.5 : 2.9;
    playerCar.steerAngle = steerInput * 0.55;
    playerCar.angle += steerInput * turnAgility * Math.max(0.28, speedFactor) * turnDir * dt;

    const prevX = playerCar.x;
    const prevY = playerCar.y;

    playerCar.vx = Math.cos(playerCar.angle) * playerCar.speed;
    playerCar.vy = Math.sin(playerCar.angle) * playerCar.speed;

    const resolvedCar = resolveCircleBuildingCollision(
      playerCar.x + playerCar.vx * dt,
      playerCar.y + playerCar.vy * dt,
      playerCar.type === 'MOTORCYCLE' || playerCar.type === 'RICKSHAW' ? 22 : 32
    );
    playerCar.x = resolvedCar.x;
    playerCar.y = resolvedCar.y;

    if (resolvedCar.collided && Math.abs(playerCar.speed) > 150) {
      playerCar.speed *= -0.35;
      w.camera.shake = Math.min(14, w.camera.shake + 6);
      sound.playHitImpact(true, 0);
    }

    if (playerCar.type === 'POLICE_CRUISER' && playerCar.sirenOn) {
      if (playerCar.sirenAudioCooldown <= 0) {
        playerCar.sirenAudioCooldown = 0.72;
        sound.playPoliceSiren(10);
      }
    }

    if (
      Math.abs(steerInput) > 0.42 &&
      Math.abs(playerCar.speed) > 220 &&
      playerCar.type !== 'RICKSHAW' &&
      playerCar.type !== 'VAN_GARI'
    ) {
      const perpX = -Math.sin(playerCar.angle) * 14;
      const perpY = Math.cos(playerCar.angle) * 14;
      w.skidMarks.push(
        {
          x1: prevX + perpX,
          y1: prevY + perpY,
          x2: playerCar.x + perpX,
          y2: playerCar.y + perpY,
          alpha: 0.55,
        },
        {
          x1: prevX - perpX,
          y1: prevY - perpY,
          x2: playerCar.x - perpX,
          y2: playerCar.y - perpY,
          alpha: 0.55,
        }
      );
      if (w.skidMarks.length > 140) w.skidMarks.splice(0, 2);
    }

    player.x = playerCar.x;
    player.y = playerCar.y;
    player.angle = playerCar.angle;

    if (playerCar.passengerNpcId) {
      const pax = npcs.find((n) => n.id === playerCar.passengerNpcId);
      if (pax) {
        pax.x = playerCar.x;
        pax.y = playerCar.y;
        pax.angle = playerCar.angle;
      }
    }

    // Check high-speed vehicle collision with any NPC
    for (const npc of npcs) {
      if (
        npc.hp <= 0 ||
        npc.drivingVehicleId ||
        npc.ridingVehicleId ||
        npc.inTrain ||
        npc.carHitCooldown > 0
      ) {
        continue;
      }
      const distToNpc = Math.hypot(playerCar.x - npc.x, playerCar.y - npc.y);
      if (distToNpc < 44 && Math.abs(playerCar.speed) > 95) {
        const dmg = Math.min(40, Math.max(18, Math.round(Math.abs(playerCar.speed) / 15)));
        npc.hp = Math.max(0, npc.hp - dmg);
        npc.hitFlashTimer = 0.28;
        npc.carHitCooldown = 0.85;
        npc.timesAttackedByPlayer += 1;

        const knockAngle = Math.atan2(npc.y - playerCar.y, npc.x - playerCar.x);
        npc.vx = Math.cos(knockAngle) * 380;
        npc.vy = Math.sin(knockAngle) * 380;

        w.hitstopTimer = 0.045;
        w.camera.shake = 12;
        sound.playHitImpact(true, 0);

        const reaction = triggerCommunityCrimeReaction(npc, player, npcs, vehicles);
        if (!reaction.isHeroicAction && reaction.mobCount > 0) {
          w.mobAlertTimer = 18;
          sound.playPoliceSiren(100);
        }

        w.floatingDamages.push({
          id: Date.now() + Math.random(),
          x: npc.x,
          y: npc.y - 38,
          text: `-${dmg} HP (CAR HIT!)`,
          color: '#ff2a85',
          life: 1.0,
        });

        const bank = NPC_DIALOGUE_BANKS[npc.id] || NPC_DIALOGUE_BANKS.viper;
        if (npc.hp <= 0) {
          npc.respawnTimer = 16;
          npc.speech = npc.speaksEnglishOnly
            ? 'Oh no... I got knocked down on the street!'
            : 'আহ... রাস্তায় পড়ে গেলাম!';
          player.score += 120;
          if (npc.id === 'jahangir') {
            onGameEnd('VICTORY');
          }
        } else if (npc.role === 'CHANDABAJ' && npc.hp <= 30) {
          npc.behavior = 'PANIC_FLEE';
          npc.mood = 'Scared';
          npc.behaviorTimer = 10;
          npc.speech = pickRandomLine(bank.flee);
        } else {
          npc.behavior = npc.role === 'COP' ? 'PURSUIT' : 'MOB_CHASE';
          npc.mood = 'Angry';
          npc.behaviorTimer = 16;
          npc.speech = pickRandomLine(bank.aggro);
        }

        sound.speakCharacterLine({
          npcId: npc.id,
          text: npc.speech,
          pitch: npc.voicePitch,
          rate: npc.voiceRate,
          distanceToPlayer: distToNpc,
          forceImmediate: true,
        });
      }
    }
  } else {
    // Player on-foot movement
    const walkSpeed = 242;
    player.vx = inputX * walkSpeed;
    player.vy = inputY * walkSpeed;

    if (Math.hypot(inputX, inputY) > 0.05) {
      player.angle = Math.atan2(inputY, inputX);
      player.walkCycle += dt * 12;
    }

    const nextPos = resolveCircleBuildingCollision(
      player.x + player.vx * dt,
      player.y + player.vy * dt,
      19
    );
    player.x = nextPos.x;
    player.y = nextPos.y;
  }

  // 4. Step All Vehicles
  stepAllVehicles(w, dt, onGameEnd);

  // 4.5. Step Live Football Stadium Match & Ball Physics
  stepFootballMatch(w, dt);

  // 5. Step All Community NPCs & Autonomous Character-to-Character AI Logic
  stepAllCommunityNPCs(w, dt, onGameEnd);

  // 6. Find Nearest Vehicle & Nearest Characters in Front of Player
  updateProximityTargets(w);

  // 7. Particles & Floating Damages
  for (let i = w.particles.length - 1; i >= 0; i--) {
    const p = w.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) w.particles.splice(i, 1);
  }

  for (let i = w.floatingDamages.length - 1; i >= 0; i--) {
    const fd = w.floatingDamages[i];
    fd.y -= 32 * dt;
    fd.life -= dt;
    if (fd.life <= 0) w.floatingDamages.splice(i, 1);
  }

  // 8. Smooth Camera Damping
  const damp = 1 - Math.exp(-8 * dt);
  const lookAheadX =
    playerCar && player.inVehicleSeat === 'driver'
      ? Math.cos(playerCar.angle) * (playerCar.speed * 0.22)
      : 0;
  const lookAheadY =
    playerCar && player.inVehicleSeat === 'driver'
      ? Math.sin(playerCar.angle) * (playerCar.speed * 0.22)
      : 0;
  const targetCamX = player.x + lookAheadX;
  const targetCamY = player.y + lookAheadY;

  if (Number.isFinite(targetCamX) && Number.isFinite(targetCamY)) {
    w.camera.x += (targetCamX - w.camera.x) * damp;
    w.camera.y += (targetCamY - w.camera.y) * damp;
  }

  if (w.camera.shake > 0) {
    w.camera.shake = Math.max(0, w.camera.shake - 28 * dt);
  }
}

function stepExpressTrain(w: WorldSimulationRef, dt: number) {
  const { train, player, npcs } = w;
  if (train.hornCooldown > 0) train.hornCooldown = Math.max(0, train.hornCooldown - dt);
  if (train.chugCooldown > 0) train.chugCooldown = Math.max(0, train.chugCooldown - dt);

  if (train.legIndex === undefined) train.legIndex = 0;
  if (train.angle === undefined) train.angle = 0;
  if (!train.passengerNpcIds) train.passengerNpcIds = [];

  const { leftX, topY, rightX, bottomY } = TRAIN_LOOP_RECT;
  const distToTrain = Math.hypot(player.x - train.x, player.y - train.y);

  // Check if player is near any of the 4 Train Stations or near the train coaches
  const nearAnyStation = TRAIN_STATIONS.some(
    (st) => Math.hypot(player.x - st.stopX, player.y - st.stopY) <= 185
  );
  const nearTrainCoaches = distToTrain <= 210;

  w.canBoardTrain = Boolean(
    player.inTrain || nearTrainCoaches || (nearAnyStation && train.stationStopTimer > 0)
  );

  // Sync NPC passengers currently riding the train
  for (const npc of npcs) {
    if (npc.inTrain && npc.hp > 0) {
      npc.x = train.x;
      npc.y = train.y;
      npc.angle = train.angle || 0;
      npc.rideTimer = (npc.rideTimer || 0) + dt;
    }
  }

  if (train.stationStopTimer > 0) {
    train.stationStopTimer -= dt;
    train.speed = 0;
    if (player.inTrain) {
      player.x = train.x;
      player.y = train.y;
      player.angle = train.angle || 0;
    }
    return;
  }

  const targetSpeed = 320;
  train.speed += (targetSpeed - train.speed) * Math.min(1, dt * 3.2);

  // Move train clockwise around the 4 sides of the city map (TRAIN_LOOP_RECT)
  if (train.legIndex === 0) {
    // Top Track: Left -> Right (y = topY)
    train.y = topY;
    train.trackY = topY;
    train.angle = 0;
    train.x += train.speed * dt;
    if (train.x >= rightX) {
      train.x = rightX;
      train.legIndex = 1;
      train.angle = Math.PI / 2;
    }
  } else if (train.legIndex === 1) {
    // Right Track: Top -> Bottom (x = rightX)
    train.x = rightX;
    train.angle = Math.PI / 2;
    train.y += train.speed * dt;
    train.trackY = train.y;
    if (train.y >= bottomY) {
      train.y = bottomY;
      train.legIndex = 2;
      train.angle = Math.PI;
    }
  } else if (train.legIndex === 2) {
    // Bottom Track: Right -> Left (y = bottomY)
    train.y = bottomY;
    train.trackY = bottomY;
    train.angle = Math.PI;
    train.x -= train.speed * dt;
    if (train.x <= leftX) {
      train.x = leftX;
      train.legIndex = 3;
      train.angle = -Math.PI / 2;
    }
  } else {
    // Left Track: Bottom -> Top (x = leftX)
    train.x = leftX;
    train.angle = -Math.PI / 2;
    train.y -= train.speed * dt;
    train.trackY = train.y;
    if (train.y <= topY) {
      train.y = topY;
      train.legIndex = 0;
      train.angle = 0;
    }
  }

  // Strictly play train track chug sound ONLY when train is right near the player
  if (
    train.speed > 40 &&
    train.chugCooldown <= 0 &&
    (distToTrain <= MAX_SFX_HEARING_DIST || player.inTrain)
  ) {
    train.chugCooldown = 0.26;
    sound.playTrainChug(player.inTrain ? 20 : distToTrain);
  }

  // Check if train reached any of the 4 Perimeter Train Stations
  for (const st of TRAIN_STATIONS) {
    if (
      st.legIndex === train.legIndex &&
      Math.hypot(train.x - st.stopX, train.y - st.stopY) < 20 &&
      train.hornCooldown <= 0
    ) {
      train.stationStopTimer = 5.5;
      train.hornCooldown = 9.0;
      train.currentStationName = st.name;

      if (distToTrain <= MAX_SFX_HEARING_DIST + 40 || player.inTrain) {
        sound.playTrainHorn(player.inTrain ? 20 : distToTrain);
      }

      // 1. Disembark NPC passengers who have ridden to this station!
      for (const npc of npcs) {
        if (npc.inTrain && (npc.rideTimer || 0) >= 6.5) {
          npc.inTrain = false;
          npc.rideTimer = 0;
          npc.x = st.waitX + (Math.random() - 0.5) * 40;
          npc.y = st.waitY + (Math.random() - 0.5) * 24;
          npc.behavior = 'WAIT_TRAIN';
          npc.waypoints = [
            { x: st.waitX - 30, y: st.waitY },
            { x: st.waitX + 30, y: st.waitY },
          ];
          npc.ownThought = `চিন্তা: ${st.name.split(' ')[0]} স্টেশনে নিরাপদে নামলাম!`;
          npc.currentDecision = 'সিদ্ধান্ত: স্টেশনে নেমে কাজ সেরে আবার পরের ট্রেনে উঠবো';
          npc.speech = `🚆 ${st.name.split(' ')[0]} স্টেশনে ট্রেন থেকে নামলাম! মেট্রো ভ্রমণ দারুণ ছিল!`;
        }
      }

      // 2. Board waiting NPC passengers at this station!
      for (const npc of npcs) {
        if (
          npc.hp > 0 &&
          !npc.inTrain &&
          !npc.drivingVehicleId &&
          !npc.ridingVehicleId &&
          npc.behavior === 'WAIT_TRAIN' &&
          Math.hypot(npc.x - st.waitX, npc.y - st.waitY) <= 170
        ) {
          npc.inTrain = true;
          npc.rideTimer = 0;
          npc.x = train.x;
          npc.y = train.y;
          npc.ownThought = 'চিন্তা: মেট্রো ট্রেনে উঠে বসেছি, ম্যাপের চারপাশ ঘুরে পরের স্টেশনে নামবো!';
          npc.currentDecision = 'সিদ্ধান্ত: ট্রেনে বসে শহর প্রদক্ষিণ করছি';
          npc.speech = '🚆 এই তো ট্রেন এসেছে! মেট্রো ট্রেনে উঠে পড়লাম!';
        }
      }
      break;
    }
  }

  if (player.inTrain) {
    player.x = train.x;
    player.y = train.y;
    player.angle = train.angle || 0;
    return;
  }

  // Knockback player if standing directly in front of the moving train engine
  if (train.speed > 80 && distToTrain < 48) {
    const pushAng = (train.angle || 0) + Math.PI / 2;
    player.x += Math.cos(pushAng) * 56;
    player.y += Math.sin(pushAng) * 56;
    player.hp = Math.max(10, player.hp - 18);
    w.camera.shake = 14;
    sound.playHitImpact(true, 0);
    w.floatingDamages.push({
      id: Date.now() + Math.random(),
      x: player.x,
      y: player.y - 40,
      text: '-18 HP (METRO TRAIN!)',
      color: '#ff2a85',
      life: 1.1,
    });
  }
}

function stepAllVehicles(
  w: WorldSimulationRef,
  dt: number,
  onGameEnd: (state: 'VICTORY' | 'GAME_OVER') => void
) {
  const { vehicles, npcs, player, train } = w;

  for (const v of vehicles) {
    if (v.hitCooldown > 0) v.hitCooldown = Math.max(0, v.hitCooldown - dt);
    if (v.sirenAudioCooldown > 0) v.sirenAudioCooldown = Math.max(0, v.sirenAudioCooldown - dt);

    if (player.inVehicleId === v.id && player.inVehicleSeat === 'driver') {
      continue;
    }

    const distToPlayer = Math.hypot(player.x - v.x, player.y - v.y);

    const driver = v.driverNpcId
      ? npcs.find((n) => n.id === v.driverNpcId && n.hp > 0) || null
      : null;

    // Special Case 1: DMP Police Van Active Crime Pursuit with Police Siren!
    const isPolicePursuit =
      v.id === 'car-police' &&
      driver &&
      (w.mobAlertTimer > 0 || v.sirenOn || driver.behavior === 'PURSUIT') &&
      !player.inTrain;

    if (isPolicePursuit && driver) {
      v.sirenOn = true;
      // Strictly play Police Siren ONLY when within hearing range of player
      if (v.sirenAudioCooldown <= 0 && distToPlayer <= MAX_SFX_HEARING_DIST + 40) {
        v.sirenAudioCooldown = 0.68;
        sound.playPoliceSiren(distToPlayer);
      }

      const dx = player.x - v.x;
      const dy = player.y - v.y;
      const desiredAngle = Math.atan2(dy, dx);
      let angleDiff = desiredAngle - v.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      v.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, angleDiff * 4.5 * dt));

      const chaseSpeed = v.maxSpeed * 0.72;
      v.speed += (chaseSpeed - v.speed) * Math.min(1, dt * 3.0);
      v.vx = Math.cos(v.angle) * v.speed;
      v.vy = Math.sin(v.angle) * v.speed;

      const resolved = resolveCircleBuildingCollision(
        v.x + v.vx * dt,
        v.y + v.vy * dt,
        30
      );
      v.x = resolved.x;
      v.y = resolved.y;

      driver.x = v.x;
      driver.y = v.y;
      driver.angle = v.angle;

      if (distToPlayer < 54 && v.hitCooldown <= 0) {
        v.hitCooldown = 1.6;
        const policeDmg = 14;
        player.hp = Math.max(0, player.hp - policeDmg);
        player.hitFlashTimer = 0.25;
        w.camera.shake = 10;
        sound.playHitImpact(true, distToPlayer);
        driver.speech = 'ডিএমপি পুলিশ! গাড়ি থামাও! আইন নিজের হাতে তুলে নেওয়া চলবে না!';
        sound.speakCharacterLine({
          npcId: driver.id,
          text: driver.speech,
          pitch: driver.voicePitch,
          rate: driver.voiceRate,
          distanceToPlayer: distToPlayer,
          forceImmediate: true,
        });
        w.floatingDamages.push({
          id: Date.now() + Math.random(),
          x: player.x,
          y: player.y - 40,
          text: `-${policeDmg} HP (POLICE INTERCEPT!)`,
          color: '#3b82f6',
          life: 1.0,
        });
        if (player.hp <= 0) {
          onGameEnd('GAME_OVER');
        }
      }
      continue;
    }

    // Special Case 2: AI Driver following Baper City Route (Bus, Rickshaw, CNG, Police Patrol)
    if (driver && v.routeWaypoints.length > 0) {
      // Sync all NPC passengers currently riding this vehicle (including multi-passengers on Dhaka Bus!)
      for (const paxNpc of npcs) {
        if (paxNpc.ridingVehicleId === v.id && paxNpc.hp > 0) {
          paxNpc.x = v.x;
          paxNpc.y = v.y;
          paxNpc.angle = v.angle;
          paxNpc.rideTimer = (paxNpc.rideTimer || 0) + dt;
        }
      }

      // Dhaka Bus Stops at Bus Stop Shelters so waiting passengers can board and disembark!
      if (v.type === 'DHAKA_BUS') {
        if (v.busStopTimer && v.busStopTimer > 0) {
          v.busStopTimer = Math.max(0, v.busStopTimer - dt);
          v.speed = 0;
          driver.x = v.x;
          driver.y = v.y;
          if (player.inVehicleId === v.id && player.inVehicleSeat === 'passenger') {
            player.x = v.x;
            player.y = v.y;
          }
          continue;
        }

        for (const stop of DHAKA_BUS_STOPS) {
          const stopCenterX = stop.x + stop.w / 2;
          const stopCenterY = stop.y + stop.h / 2;
          if (
            v.lastBusStopId !== stop.id &&
            Math.hypot(v.x - stopCenterX, v.y - stopCenterY) < 72
          ) {
            v.busStopTimer = 3.6;
            v.lastBusStopId = stop.id;
            v.speed = 0;

            // 1. Disembark bus passengers who have ridden for >= 6 seconds
            for (const pax of npcs) {
              if (pax.ridingVehicleId === v.id && (pax.rideTimer || 0) >= 6.0) {
                pax.ridingVehicleId = null;
                pax.rideTimer = 0;
                if (v.passengerNpcId === pax.id) v.passengerNpcId = null;
                pax.x = stopCenterX + (Math.random() - 0.5) * 44;
                pax.y = stop.y - 10;
                pax.behavior = 'WAIT_BUS';
                pax.waypoints = [
                  { x: stop.x + 15, y: stop.y - 8 },
                  { x: stop.x + stop.w - 15, y: stop.y - 8 },
                ];
                pax.ownThought = `চিন্তা: ${stop.name.split('·')[1]?.trim() || 'বাস স্টপে'} নিরাপদে নামলাম!`;
                pax.currentDecision = 'সিদ্ধান্ত: বাস থেকে নেমে গন্তব্যের কাজ শেষ করে আবার বাস ধরবো';
                pax.speech = `🚌 কাদের ভাই ধন্যবাদ! ${stop.name.split('·')[1]?.trim() || 'স্টপেজে'} বাস থেকে নামলাম!`;
              }
            }

            // 2. Board waiting passengers at this Bus Stop shelter!
            for (const waiter of npcs) {
              if (
                waiter.hp > 0 &&
                !waiter.ridingVehicleId &&
                !waiter.drivingVehicleId &&
                !waiter.inTrain &&
                waiter.behavior === 'WAIT_BUS' &&
                Math.hypot(waiter.x - stopCenterX, waiter.y - stopCenterY) <= 155
              ) {
                waiter.ridingVehicleId = v.id;
                waiter.rideTimer = 0;
                if (!v.passengerNpcId) v.passengerNpcId = waiter.id;
                waiter.x = v.x;
                waiter.y = v.y;
                waiter.ownThought = 'চিন্তা: বাস স্টপ থেকে বাসে উঠে বসেছি, পরের স্টপেজে নামবো!';
                waiter.currentDecision = 'সিদ্ধান্ত: লোকাল বাসে চড়ে গন্তব্যে যাচ্ছি';
                waiter.speech = '🚌 এই তো বাস থেমেছে! তাড়াতাড়ি বাসে উঠে সিটে বসলাম!';
              }
            }
            break;
          }
        }
      }

      const wp = v.routeWaypoints[v.routeIndex % v.routeWaypoints.length];
      const dx = wp.x - v.x;
      const dy = wp.y - v.y;
      const distToWp = Math.hypot(dx, dy);

      if (distToWp < 48) {
        v.routeIndex = (v.routeIndex + 1) % v.routeWaypoints.length;
      }

      const desiredAngle = Math.atan2(dy, dx);
      let angleDiff = desiredAngle - v.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      v.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, angleDiff * 4 * dt));

      // Authentic Dhaka Bus Conductor Calls ONLY when bus is right near the player (<= 250px)
      if (
        v.type === 'DHAKA_BUS' &&
        v.sirenAudioCooldown <= 0 &&
        distToPlayer <= MAX_VOICE_HEARING_DIST
      ) {
        v.sirenAudioCooldown = 6.2;
        const busCall = pickRandomLine(BUS_CONDUCTOR_CALLS);
        driver.speech = busCall;
        sound.speakCharacterLine({
          npcId: driver.id,
          text: busCall,
          pitch: driver.voicePitch,
          rate: driver.voiceRate,
          distanceToPlayer: distToPlayer,
        });
      }

      // Authentic Dhaka Rickshaw Bell ("ক্রিং ক্রিং!") ONLY when rickshaw is right near the player (<= 250px)
      if (
        v.type === 'RICKSHAW' &&
        v.sirenAudioCooldown <= 0 &&
        distToPlayer <= MAX_VOICE_HEARING_DIST
      ) {
        v.sirenAudioCooldown = 4.8;
        sound.playRickshawBell(distToPlayer);
      }

      const lookX = v.x + Math.cos(v.angle) * 90;
      const lookY = v.y + Math.sin(v.angle) * 90;
      const playerInThisVehicle = player.inVehicleId === v.id;
      const playerBlocking =
        !playerInThisVehicle && !player.inTrain && Math.hypot(lookX - player.x, lookY - player.y) < 68;
      const trainCrossingBlock = Math.hypot(lookX - train.x, lookY - train.y) < 135;

      // Also check if another NPC pedestrian is crossing directly in front of the AI vehicle
      const npcPedestrianBlocking = npcs.some(
        (n) =>
          n.hp > 0 &&
          !n.drivingVehicleId &&
          !n.ridingVehicleId &&
          !n.inTrain &&
          Math.hypot(lookX - n.x, lookY - n.y) < 48
      );

      const playerWaitingToBoard =
        !player.inVehicleId &&
        v.allowsPlayerPassenger &&
        distToPlayer < 95 &&
        Math.hypot(player.vx, player.vy) < 30;

      if (playerBlocking || trainCrossingBlock || playerWaitingToBoard || npcPedestrianBlocking) {
        v.speed *= Math.pow(0.05, dt);
        if (playerBlocking && v.hitCooldown <= 0) {
          v.hitCooldown = 3.5;
          if (v.type === 'RICKSHAW') {
            sound.playRickshawBell(distToPlayer);
          } else {
            sound.playCarHorn(v.type === 'TAXI_CAB' ? 1.15 : 0.9, distToPlayer);
          }
          const bank = NPC_DIALOGUE_BANKS[driver.id];
          if (bank) {
            driver.speech = pickRandomLine(bank.carReact);
            sound.speakCharacterLine({
              npcId: driver.id,
              text: driver.speech,
              pitch: driver.voicePitch,
              rate: driver.voiceRate,
              distanceToPlayer: distToPlayer,
            });
          }
        }
      } else {
        const cruiseFactor =
          v.type === 'RICKSHAW' ? 0.58 : v.type === 'DHAKA_BUS' ? 0.48 : 0.44;
        const cruiseSpeed = v.maxSpeed * cruiseFactor;
        v.speed += (cruiseSpeed - v.speed) * Math.min(1, dt * 2.5);
      }

      v.vx = Math.cos(v.angle) * v.speed;
      v.vy = Math.sin(v.angle) * v.speed;

      const resolved = resolveCircleBuildingCollision(
        v.x + v.vx * dt,
        v.y + v.vy * dt,
        v.type === 'RICKSHAW' ? 22 : 30
      );
      v.x = resolved.x;
      v.y = resolved.y;

      driver.x = v.x;
      driver.y = v.y;
      driver.angle = v.angle;

      if (player.inVehicleId === v.id && player.inVehicleSeat === 'passenger') {
        player.x = v.x;
        player.y = v.y;
        player.angle = v.angle;
      }

      if (v.passengerNpcId) {
        const pax = npcs.find((n) => n.id === v.passengerNpcId);
        if (pax) {
          pax.x = v.x;
          pax.y = v.y;
          pax.angle = v.angle;
        }
      }
    } else {
      if (Math.abs(v.speed) > 1) {
        v.speed *= Math.pow(0.1, dt);
        const resolved = resolveCircleBuildingCollision(
          v.x + Math.cos(v.angle) * v.speed * dt,
          v.y + Math.sin(v.angle) * v.speed * dt,
          26
        );
        v.x = resolved.x;
        v.y = resolved.y;
      }
    }
  }
}

function stepFootballMatch(w: WorldSimulationRef, dt: number) {
  const ball = w.football;
  if (!ball) return;

  if (ball.goalCelebrationTimer > 0) {
    ball.goalCelebrationTimer = Math.max(0, ball.goalCelebrationTimer - dt);
  }

  const pitchLeft = FOOTBALL_STADIUM_RECT.x + 56;
  const pitchRight = FOOTBALL_STADIUM_RECT.x + FOOTBALL_STADIUM_RECT.w - 56;
  const pitchTop = FOOTBALL_STADIUM_RECT.y + 54;
  const pitchBottom = FOOTBALL_STADIUM_RECT.y + FOOTBALL_STADIUM_RECT.h - 46;
  const pitchMidX = (pitchLeft + pitchRight) / 2;
  const pitchMidY = (pitchTop + pitchBottom) / 2;
  const goalHalfH = 68;

  // Player touches / kicks the football when running near it!
  if (!w.player.inVehicleId && !w.player.inTrain) {
    const dxP = ball.x - w.player.x;
    const dyP = ball.y - w.player.y;
    const distP = Math.hypot(dxP, dyP);
    if (distP < 34) {
      const kickAngle =
        Math.hypot(w.player.vx, w.player.vy) > 20
          ? Math.atan2(w.player.vy, w.player.vx)
          : w.player.angle;
      const kickPower = w.player.punchTimer > 0 ? 540 : 360;
      ball.vx = Math.cos(kickAngle) * kickPower;
      ball.vy = Math.sin(kickAngle) * kickPower;
      ball.lastTouchedBy = 'আপনি (Player)';
      sound.playHitImpact(false, 0);
    }
  }

  // Footballer NPCs kick the ball toward opponent goals
  for (const npc of w.npcs) {
    if (npc.hp <= 0 || npc.role !== 'FOOTBALLER') continue;
    const dxN = ball.x - npc.x;
    const dyN = ball.y - npc.y;
    const distN = Math.hypot(dxN, dyN);
    if (distN < 32 && npc.attackCooldown <= 0) {
      npc.attackCooldown = 0.65;
      npc.punchTimer = 0.18;
      const targetGoalX = npc.id === 'jamal_striker' ? pitchRight : pitchLeft;
      const targetGoalY = pitchMidY + (Math.random() - 0.5) * 75;
      const shotAngle = Math.atan2(targetGoalY - ball.y, targetGoalX - ball.x);
      ball.vx = Math.cos(shotAngle) * (330 + Math.random() * 120);
      ball.vy = Math.sin(shotAngle) * (330 + Math.random() * 120);
      ball.lastTouchedBy = npc.bengaliName.split('·')[0].trim();
      const distPlayer = Math.hypot(w.player.x - ball.x, w.player.y - ball.y);
      if (distPlayer <= MAX_SFX_HEARING_DIST) {
        sound.playHitImpact(false, distPlayer);
      }
    }
  }

  // Advance ball position & apply grass friction
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.vx *= Math.pow(0.28, dt);
  ball.vy *= Math.pow(0.28, dt);
  if (Math.hypot(ball.vx, ball.vy) < 5) {
    ball.vx = 0;
    ball.vy = 0;
  }

  // Check Goal Scored on Left or Right Goalpost!
  const inGoalMouthY = Math.abs(ball.y - pitchMidY) <= goalHalfH;
  if (inGoalMouthY && (ball.x <= pitchLeft + 8 || ball.x >= pitchRight - 8)) {
    const scoredRight = ball.x >= pitchRight - 8;
    if (scoredRight) {
      ball.homeScore += 1;
    } else {
      ball.awayScore += 1;
    }
    ball.goalCelebrationTimer = 3.2;

    const playerNearStadium =
      Math.hypot(w.player.x - pitchMidX, w.player.y - pitchMidY) < 620;
    const playerScored = ball.lastTouchedBy.includes('আপনি');

    if (playerScored) {
      const goalReward = 800;
      w.player.money = (w.player.money || 0) + goalReward;
      w.player.popularity = Math.min(100, (w.player.popularity || 50) + 6);
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: w.player.x,
        y: w.player.y - 46,
        text: `⚽ গোওওল!! +৳${goalReward} পুরস্কার!`,
        color: '#fde047',
        life: 1.6,
      });
    } else if (playerNearStadium) {
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: ball.x,
        y: ball.y - 36,
        text: `⚽ গোল! (${ball.lastTouchedBy})`,
        color: '#38bdf8',
        life: 1.3,
      });
    }

    // Reset ball to center spot after goal
    ball.x = pitchMidX;
    ball.y = pitchMidY;
    ball.vx = 0;
    ball.vy = 0;
    return;
  }

  // Bounce off stadium pitch sidelines
  if (ball.x < pitchLeft) {
    ball.x = pitchLeft;
    ball.vx = Math.abs(ball.vx) * 0.75;
  } else if (ball.x > pitchRight) {
    ball.x = pitchRight;
    ball.vx = -Math.abs(ball.vx) * 0.75;
  }
  if (ball.y < pitchTop) {
    ball.y = pitchTop;
    ball.vy = Math.abs(ball.vy) * 0.75;
  } else if (ball.y > pitchBottom) {
    ball.y = pitchBottom;
    ball.vy = -Math.abs(ball.vy) * 0.75;
  }
}

function getDefaultRoleBehavior(npc: CommunityNPCState): CommunityNPCState['behavior'] {
  if (npc.role === 'POLITICAL_LEADER') return 'MEETING_SPEECH';
  if (npc.role === 'ACTIVIST') return 'MICHIL_RALLY';
  if (npc.role === 'CHANDABAJ') return 'EXTORTION';
  if (npc.role === 'STREET_CRIMINAL') return 'CRIME_SPREE';
  if (npc.role === 'CLUB_DANCER') return 'DANCE';
  if (npc.role === 'FOOTBALLER') return 'PLAY_FOOTBALL';
  if (npc.role === 'LOCKUP_PRISONER') return 'LOCKED_UP';
  if (npc.role === 'BEGGAR') return 'BEGGING';
  if (npc.role === 'QUARRELER') return 'QUARREL';
  if (npc.role === 'GARMENT_WORKER') return 'WORK_GARMENTS';
  if (npc.role === 'LAWYER' || npc.role === 'JUDGE' || npc.role === 'OFFICE_EXECUTIVE') {
    return 'WORK_OFFICE_COURT';
  }
  if (npc.id === 'rashed_bus_pax' || npc.id === 'farhana_bus_pax') return 'WAIT_BUS';
  if (
    npc.id === 'salma_commuter' ||
    npc.id === 'mitu_train_pax' ||
    npc.id === 'ashik_train_pax'
  ) {
    return 'WAIT_TRAIN';
  }
  if (
    npc.role === 'VAN_VENDOR' ||
    npc.role === 'SHOPKEEPER' ||
    npc.role === 'HOTEL_CHEF' ||
    npc.role === 'MUDI_SHOPKEEPER'
  ) {
    return 'VENDOR_DUTY';
  }
  if (npc.role === 'INFORMANT') return 'STALK';
  return 'PATROL';
}

function stepAllCommunityNPCs(
  w: WorldSimulationRef,
  dt: number,
  onGameEnd: (state: 'VICTORY' | 'GAME_OVER') => void
) {
  const { player, npcs, vehicles } = w;

  for (const npc of npcs) {
    if (npc.hp <= 0) {
      npc.respawnTimer -= dt;
      if (npc.respawnTimer <= 0) {
        npc.hp = npc.maxHp;
        npc.x = npc.spawnX;
        npc.y = npc.spawnY;
        npc.vx = 0;
        npc.vy = 0;
        npc.timesAttackedByPlayer = 0;
        npc.mood = npc.role === 'CHANDABAJ' ? 'Suspicious' : 'Calm';
        npc.behavior = getDefaultRoleBehavior(npc);
        npc.speech = pickRandomLine(NPC_DIALOGUE_BANKS[npc.id]?.idle || []);
      }
      continue;
    }

    if (npc.punchTimer > 0) npc.punchTimer = Math.max(0, npc.punchTimer - dt);
    if (npc.attackCooldown > 0) npc.attackCooldown = Math.max(0, npc.attackCooldown - dt);
    if (npc.hitFlashTimer > 0) npc.hitFlashTimer = Math.max(0, npc.hitFlashTimer - dt);
    if (npc.carHitCooldown > 0) npc.carHitCooldown = Math.max(0, npc.carHitCooldown - dt);

    const dxToPlayer = player.x - npc.x;
    const dyToPlayer = player.y - npc.y;
    const distToPlayer = Math.hypot(dxToPlayer, dyToPlayer) || 0.001;

    // Immediately silence ongoing speech if the player moved far away from this NPC
    sound.silenceIfTooFar(npc.id, distToPlayer);

    // Run Local Automatic Human Emotion & Routine Analyzing System
    updateLocalNPCAnalysis(npc, player, npcs, distToPlayer);

    if (npc.drivingVehicleId || npc.ridingVehicleId || npc.inTrain) {
      npc.behavior = 'DRIVING';
      continue;
    }

    if (npc.behaviorTimer > 0) {
      npc.behaviorTimer -= dt;
      if (npc.behaviorTimer <= 0) {
        npc.behavior = getDefaultRoleBehavior(npc);
        npc.mood = npc.role === 'CHANDABAJ' ? 'Suspicious' : 'Calm';
      }
    }

    // =========================================================================
    // AUTONOMOUS CHARACTER-TO-CHARACTER AI LOGIC (ক্যারেক্টারগুলোর নিজস্ব লজিক)
    // =========================================================================

    // Logic A: Police Officer or Political Activist automatically confronts nearby Chandabaj OR Street Criminal (চাঁদাবাজ ও কৃত্রিম অপরাধী ধাওয়া লজিক)
    if (
      (npc.role === 'COP' || npc.role === 'ACTIVIST') &&
      npc.behavior !== 'MOB_CHASE' &&
      npc.behavior !== 'PURSUIT' &&
      npc.attackCooldown <= 0
    ) {
      const nearbyCriminal = npcs.find(
        (other) =>
          other.hp > 25 &&
          (other.role === 'CHANDABAJ' || other.role === 'STREET_CRIMINAL') &&
          Math.hypot(other.x - npc.x, other.y - npc.y) < 320
      );
      if (nearbyCriminal) {
        npc.angle = Math.atan2(nearbyCriminal.y - npc.y, nearbyCriminal.x - npc.x);
        const distToCriminal = Math.hypot(nearbyCriminal.x - npc.x, nearbyCriminal.y - npc.y);
        if (npc.role === 'COP' && distToCriminal > 54) {
          npc.behavior = 'POLICE_CHASE_CRIMINAL';
          npc.behaviorTimer = 5;
        }
        if (distToCriminal < 58) {
          npc.punchTimer = 0.24;
          npc.attackCooldown = 2.6;
          nearbyCriminal.hp = Math.max(25, nearbyCriminal.hp - 12);
          nearbyCriminal.hitFlashTimer = 0.2;
          nearbyCriminal.behavior = 'PANIC_FLEE';
          nearbyCriminal.behaviorTimer = 6;
          nearbyCriminal.mood = 'Scared';
          nearbyCriminal.speech = 'ও ভাইরে! পুলিশ আর জনতা তাড়া করেছে, পালাই!';
          npc.speech =
            npc.role === 'COP'
              ? 'ডিএমপি পুলিশ! অপরাধী থাম! মেইন ক্যারেক্টার ভাই, ওকে ধরতে সাহায্য করলে নগদ টাকা পুরস্কার পাবেন!'
              : 'চাঁদাবাজ ও ছিনতাইকারীদের কালো হাত—ভেঙে দাও গুঁড়িয়ে দাও!';
          sound.playHitImpact(false, distToPlayer);
        }
      }
    }

    // Logic B: Pedestrians & Commuters buy Tea / Fuchka when passing a Street Vendor (দোকানে কেনাকাটা ও আড্ডা লজিক)
    if (
      (npc.role === 'COMMUTER' || npc.role === 'JOGGER' || npc.role === 'INFORMANT') &&
      npc.behavior === 'PATROL' &&
      npc.attackCooldown <= 0
    ) {
      const nearbyVendor = npcs.find(
        (v) =>
          v.hp > 0 &&
          (v.role === 'VAN_VENDOR' || v.role === 'SHOPKEEPER') &&
          Math.hypot(v.x - npc.x, v.y - npc.y) < 82
      );
      if (nearbyVendor) {
        npc.attackCooldown = 9.0;
        npc.angle = Math.atan2(nearbyVendor.y - npc.y, nearbyVendor.x - npc.x);
        nearbyVendor.angle = Math.atan2(npc.y - nearbyVendor.y, npc.x - nearbyVendor.x);
        npc.mood = 'Happy';
        npc.speech = npc.speaksEnglishOnly
          ? 'Hello! Could I get some fresh street snacks or a cup of hot tea please?'
          : 'মামা, এক প্লেট স্পেশাল খাবার বা গরম চা দিন তো!';
        nearbyVendor.speech = nearbyVendor.speaksEnglishOnly
          ? `Here you go ${npc.name.split(' ')[0]}! Freshly served just for you!`
          : `এই নিন ${npc.bengaliName.split(' ')[0]}, গরম গরম পরিবেশন করলাম!`;
        if (npc.hp < npc.maxHp) {
          npc.hp = Math.min(npc.maxHp, npc.hp + 10);
        }
      }
    }

    // Logic C: Doctor Maya & Nurse Rupa automatically heal any injured citizen OR player nearby (ডাক্তার ও নার্সের স্বয়ংক্রিয় চিকিৎসা লজিক)
    if (
      (npc.role === 'MEDIC' || npc.role === 'NURSE') &&
      npc.behavior !== 'AGGRO' &&
      npc.behavior !== 'MOB_CHASE' &&
      npc.attackCooldown <= 0
    ) {
      if (!player.inVehicleId && distToPlayer < 105 && player.hp < player.maxHp) {
        npc.attackCooldown = 4.2;
        const heal = 20;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        npc.speech = 'হাসপাতাল ওয়ার্ডে আপনার ক্ষতস্থানে ব্যান্ডেজ ও ওষুধ দিয়েছি (+20 HP)!';
        w.floatingDamages.push({
          id: Date.now() + Math.random(),
          x: player.x,
          y: player.y - 42,
          text: `+${heal} HP (${npc.bengaliName.split(' ')[0]})`,
          color: '#10b981',
          life: 1.1,
        });
      } else {
        const injuredCitizen = npcs.find(
          (other) =>
            other.id !== npc.id &&
            other.hp > 0 &&
            other.hp < other.maxHp - 10 &&
            Math.hypot(other.x - npc.x, other.y - npc.y) < 120
        );
        if (injuredCitizen) {
          npc.attackCooldown = 5.0;
          injuredCitizen.hp = Math.min(injuredCitizen.maxHp, injuredCitizen.hp + 20);
          npc.speech = `${injuredCitizen.bengaliName.split(' ')[0]}-কে প্রাথমিক চিকিৎসা দেওয়া হয়েছে (+20 HP)!`;
        }
      }
    }

    // Periodic Spoken Community Chatter (STRICTLY audible only when distToPlayer <= MAX_VOICE_HEARING_DIST!)
    npc.speechCooldown -= dt;
    if (npc.speechCooldown <= 0) {
      npc.speechCooldown = 5.2 + Math.random() * 4.5;
      const bank = NPC_DIALOGUE_BANKS[npc.id] || NPC_DIALOGUE_BANKS.viper;
      let newLine = npc.speech;

      if (
        npc.behavior === 'AGGRO' ||
        npc.behavior === 'PURSUIT' ||
        npc.behavior === 'MOB_CHASE'
      ) {
        newLine = pickRandomLine(bank.aggro);
      } else if (npc.behavior === 'PANIC_FLEE') {
        newLine = pickRandomLine(bank.flee);
      } else if (npc.behavior === 'MICHIL_RALLY') {
        newLine = pickRandomLine(MICHIL_SLOGANS);
        w.activeMichilSlogan = newLine;
      } else if (npc.id === 'kader_bus') {
        newLine = pickRandomLine(BUS_CONDUCTOR_CALLS);
      } else if (
        !npc.speaksEnglishOnly &&
        (npc.role === 'CHANDABAJ' ||
          npc.role === 'STREET_CRIMINAL' ||
          npc.role === 'QUARRELER' ||
          Math.random() < 0.28)
      ) {
        newLine =
          Math.random() < 0.55
            ? pickRandomLine(FUNNY_DHAKA_DIALOGUES)
            : pickRandomLine(bank.idle);
      } else if (npc.analysis.socialTargetName && Math.random() < 0.45) {
        newLine = pickRandomLine(bank.socialChat);
      } else {
        newLine = pickRandomLine(bank.idle);
      }

      if (newLine) {
        npc.speech = newLine;
        // STRICT PROXIMITY CHECK: Only speak out loud if right near the player!
        if (distToPlayer <= MAX_VOICE_HEARING_DIST) {
          sound.speakCharacterLine({
            npcId: npc.id,
            text: newLine,
            pitch: npc.voicePitch,
            rate: npc.voiceRate,
            distanceToPlayer: distToPlayer,
          });
        }
      }
    }

    let targetVx = 0;
    let targetVy = 0;

    if (
      npc.behavior === 'AGGRO' ||
      npc.behavior === 'PURSUIT' ||
      npc.behavior === 'MOB_CHASE'
    ) {
      npc.angle = Math.atan2(dyToPlayer, dxToPlayer);
      const chaseSpeed =
        npc.behavior === 'MOB_CHASE' ? npc.runSpeed * 1.05 : npc.runSpeed;
      if (distToPlayer > 42) {
        targetVx = (dxToPlayer / distToPlayer) * chaseSpeed;
        targetVy = (dyToPlayer / distToPlayer) * chaseSpeed;
        npc.walkCycle += dt * 11.5;
      } else if (npc.attackCooldown <= 0) {
        npc.punchTimer = 0.25;
        npc.punchHand = npc.punchHand === 'left' ? 'right' : 'left';
        npc.attackCooldown = 1.15;
        sound.playPunchSwing(distToPlayer);

        if (!player.inVehicleId && !player.inTrain && distToPlayer < 55) {
          player.hp = Math.max(0, player.hp - npc.attackDamage);
          player.hitFlashTimer = 0.22;
          w.camera.shake = 6;
          sound.playHitImpact(false, distToPlayer);

          w.floatingDamages.push({
            id: Date.now() + Math.random(),
            x: player.x,
            y: player.y - 38,
            text: `-${npc.attackDamage} HP (${npc.bengaliName.split(' ')[0]})`,
            color: '#f43f5e',
            life: 0.9,
          });

          if (player.hp <= 0) {
            onGameEnd('GAME_OVER');
          }
        }
      }
    } else if (npc.behavior === 'PANIC_FLEE') {
      const fleeAngle = Math.atan2(-dyToPlayer, -dxToPlayer);
      npc.angle = fleeAngle;
      targetVx = Math.cos(fleeAngle) * npc.runSpeed;
      targetVy = Math.sin(fleeAngle) * npc.runSpeed;
      npc.walkCycle += dt * 14;
    } else if (npc.behavior === 'MEETING_SPEECH') {
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);

      if (distToPlayer < 220) {
        npc.angle = Math.atan2(dyToPlayer, dxToPlayer);
      } else if (wDist > 14) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * (npc.walkSpeed * 0.55);
        targetVy = (wy / wDist) * (npc.walkSpeed * 0.55);
        npc.walkCycle += dt * 4.5;
      } else {
        npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
      }
    } else if (npc.behavior === 'MICHIL_RALLY') {
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);

      if (wDist < 28) {
        npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
      } else if (wDist > 0.01) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * npc.walkSpeed;
        targetVy = (wy / wDist) * npc.walkSpeed;
        npc.walkCycle += dt * 8.5;
      }
    } else if (npc.behavior === 'EXTORTION') {
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);

      if (wDist < 26) {
        npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
        for (const vNpc of npcs) {
          if (
            (vNpc.role === 'VAN_VENDOR' || vNpc.role === 'SHOPKEEPER') &&
            Math.hypot(vNpc.x - npc.x, vNpc.y - npc.y) < 150
          ) {
            vNpc.mood = 'Scared';
            vNpc.speech = vNpc.speaksEnglishOnly
              ? `Oh no! Extortionist ${npc.name.split(' ')[0]} is demanding protection money again! Somebody stop him!`
              : `আরে ভাই! চাঁদাবাজ ${npc.bengaliName.split(' ')[0]} আবার চাঁদা চাইতে এসেছে! কেউ ওকে থামান!`;
            vNpc.speechTimer = 4.5;
          }
        }
      } else if (wDist > 0.01) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * npc.walkSpeed;
        targetVy = (wy / wDist) * npc.walkSpeed;
        npc.walkCycle += dt * 7;
      }
    } else if (npc.behavior === 'QUARREL') {
      // Street Quarrel: face the rival quarreler and gesture heatedly
      const rival = npcs.find((o) => o.id !== npc.id && o.role === 'QUARRELER' && o.hp > 0);
      if (rival) {
        npc.angle = Math.atan2(rival.y - npc.y, rival.x - npc.x);
      }
      npc.walkCycle += dt * 9;
      if (npc.attackCooldown <= 0) {
        npc.attackCooldown = 1.6 + Math.random() * 1.4;
        npc.punchTimer = 0.18;
        npc.punchHand = npc.punchHand === 'left' ? 'right' : 'left';
      }
    } else if (npc.behavior === 'BEGGING') {
      // Beggar: face the player when nearby and slowly pace
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);
      if (distToPlayer < 210) {
        npc.angle = Math.atan2(dyToPlayer, dxToPlayer);
      } else if (wDist > 10) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * (npc.walkSpeed * 0.55);
        targetVy = (wy / wDist) * (npc.walkSpeed * 0.55);
        npc.walkCycle += dt * 3.5;
      } else {
        npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
      }
    } else if (npc.behavior === 'VENDOR_DUTY') {
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);

      if (distToPlayer < 190) {
        npc.angle = Math.atan2(dyToPlayer, dxToPlayer);
      } else if (wDist > 12) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * (npc.walkSpeed * 0.6);
        targetVy = (wy / wDist) * (npc.walkSpeed * 0.6);
        npc.walkCycle += dt * 4;
      } else {
        npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
      }
    } else if (npc.behavior === 'LOCKED_UP') {
      // Prisoner Akbar locked inside the Police Station Lockup Cell behind iron bars
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);
      if (distToPlayer < 160) {
        npc.angle = Math.atan2(dyToPlayer, dxToPlayer);
      } else if (wDist > 8) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * 45;
        targetVy = (wy / wDist) * 45;
        npc.walkCycle += dt * 4;
      } else {
        npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
      }
    } else if (npc.behavior === 'DANCE') {
      // Nightclub Dancer & Singer: energetic disco dance moves on the club floor
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);
      npc.walkCycle += dt * 15;
      npc.angle = Math.sin(performance.now() * 0.005 + (npc.id === 'dj_rocky' ? 0 : 1.5)) * 1.2;
      if (wDist > 12) {
        targetVx = (wx / wDist) * 65;
        targetVy = (wy / wDist) * 65;
      } else {
        npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
      }
    } else if (npc.behavior === 'PLAY_FOOTBALL') {
      // Footballer chasing the live football inside the Stadium Pitch
      const ball = w.football;
      if (ball) {
        const bx = ball.x - npc.x;
        const by = ball.y - npc.y;
        const bDist = Math.hypot(bx, by) || 1;
        npc.angle = Math.atan2(by, bx);
        targetVx = (bx / bDist) * npc.walkSpeed;
        targetVy = (by / bDist) * npc.walkSpeed;
        npc.walkCycle += dt * 12;
      }
    } else if (npc.behavior === 'CRIME_SPREE') {
      // Street Criminal running around committing artificial street crimes
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);
      if (wDist < 32) {
        npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
      } else if (wDist > 0.01) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * (npc.walkSpeed * 1.18);
        targetVy = (wy / wDist) * (npc.walkSpeed * 1.18);
        npc.walkCycle += dt * 10.5;
      }
    } else if (npc.behavior === 'POLICE_CHASE_CRIMINAL') {
      const criminal = npcs.find(
        (o) => o.hp > 0 && (o.role === 'STREET_CRIMINAL' || o.role === 'CHANDABAJ')
      );
      if (criminal) {
        const cx = criminal.x - npc.x;
        const cy = criminal.y - npc.y;
        const cDist = Math.hypot(cx, cy) || 1;
        npc.angle = Math.atan2(cy, cx);
        targetVx = (cx / cDist) * (npc.runSpeed * 0.92);
        targetVy = (cy / cDist) * (npc.runSpeed * 0.92);
        npc.walkCycle += dt * 11;
      }
    } else if (npc.behavior === 'WORK_GARMENTS') {
      // Garments Factory Workers: actively operate sewing machines & cutting tables, earning overtime wages
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);

      npc.workProgress = ((npc.workProgress || 0) + dt * 14) % 100;
      if (npc.workProgress > 96 && npc.attackCooldown <= 0) {
        npc.attackCooldown = 3.2;
        npc.money = (npc.money || 9500) + 50;
      }

      if (wDist > 12) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * (npc.walkSpeed * 0.65);
        targetVy = (wy / wDist) * (npc.walkSpeed * 0.65);
        npc.walkCycle += dt * 6;
      } else {
        // Working at sewing machine / cutting table (facing north toward the machine)
        npc.angle = -Math.PI / 2;
        npc.walkCycle += dt * 11;
        if (npc.attackCooldown <= 0) {
          npc.attackCooldown = 0.85;
          npc.punchTimer = 0.16;
          npc.punchHand = npc.punchHand === 'left' ? 'right' : 'left';
        }
        if (Math.random() < dt * 0.22) {
          npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
        }
      }
      npc.ownThought = `চিন্তা: গার্মেন্টসে পোশাক সেলাই চলছে (${Math.round(npc.workProgress || 0)}% সম্পন্ন)`;
      npc.currentDecision = 'সিদ্ধান্ত: এক্সপোর্ট অর্ডার শেষ করে ওভারটাইম মজুরি নিচ্ছি';
    } else if (npc.behavior === 'WORK_OFFICE_COURT') {
      // Lawyers, Judges, and Office Executives actively working at Court Benches & Office Desks
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);

      npc.workProgress = ((npc.workProgress || 0) + dt * 11) % 100;
      if (wDist > 12) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * (npc.walkSpeed * 0.6);
        targetVy = (wy / wDist) * (npc.walkSpeed * 0.6);
        npc.walkCycle += dt * 5;
      } else {
        npc.angle = npc.role === 'JUDGE' ? Math.PI / 2 : -Math.PI / 2;
        if (npc.attackCooldown <= 0) {
          npc.attackCooldown = 1.4;
          npc.punchTimer = 0.14;
        }
        if (Math.random() < dt * 0.18) {
          npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
        }
      }
      npc.ownThought =
        npc.role === 'JUDGE'
          ? 'চিন্তা: এজলাসে সাক্ষ্যপ্রমাণ যাচাই করে ন্যায়সঙ্গত রায় দিচ্ছি'
          : npc.role === 'LAWYER'
            ? 'চিন্তা: মক্কেলের জামিন শুনানির দলিল জজ সাহেবের সামনে পেশ করছি'
            : `চিন্তা: অফিসের কম্পিউটারে ফাইল প্রসেসিং করছি (${Math.round(npc.workProgress || 0)}%)`;
      npc.currentDecision = 'সিদ্ধান্ত: অফিস-আদালতের দাফতরিক কাজ সম্পন্ন করছি';
    } else if (npc.behavior === 'WAIT_BUS') {
      // Commuter waiting at nearest Bus Stop shelter for the Dhaka Bus to arrive
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);
      if (wDist > 10) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * (npc.walkSpeed * 0.55);
        targetVy = (wy / wDist) * (npc.walkSpeed * 0.55);
        npc.walkCycle += dt * 4.5;
      } else {
        npc.angle = Math.PI / 2; // Face the road waiting for the bus
        if (Math.random() < dt * 0.25) {
          npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
        }
      }
      npc.ownThought = 'চিন্তা: বাস স্টপে দাঁড়িয়ে আছি, কাদের ভাইয়ের বাস থামলেই উঠে পড়বো!';
      npc.currentDecision = 'সিদ্ধান্ত: বাস স্টপে বাসের জন্য অপেক্ষা করছি';
    } else if (npc.behavior === 'WAIT_TRAIN') {
      // Commuter waiting on the Railway Station Platform for the Perimeter Loop Train
      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);
      if (wDist > 10) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * (npc.walkSpeed * 0.55);
        targetVy = (wy / wDist) * (npc.walkSpeed * 0.55);
        npc.walkCycle += dt * 4.5;
      } else {
        npc.angle = Math.atan2(w.train.y - npc.y, w.train.x - npc.x);
        if (Math.random() < dt * 0.25) {
          npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
        }
      }
      npc.ownThought = 'চিন্তা: রেল স্টেশনের প্ল্যাটফর্মে দাঁড়িয়ে আছি, মেট্রো ট্রেন থামলেই উঠবো!';
      npc.currentDecision = 'সিদ্ধান্ত: স্টেশনে ট্রেনের জন্য অপেক্ষা করছি';
    } else if (npc.behavior === 'STALK') {
      if (distToPlayer < 420 && distToPlayer > 165) {
        npc.angle = Math.atan2(dyToPlayer, dxToPlayer);
        targetVx = (dxToPlayer / distToPlayer) * npc.walkSpeed;
        targetVy = (dyToPlayer / distToPlayer) * npc.walkSpeed;
        npc.walkCycle += dt * 7;
      } else if (distToPlayer < 130) {
        const backAngle = Math.atan2(-dyToPlayer, -dxToPlayer);
        npc.angle = Math.atan2(dyToPlayer, dxToPlayer);
        targetVx = Math.cos(backAngle) * (npc.walkSpeed * 0.7);
        targetVy = Math.sin(backAngle) * (npc.walkSpeed * 0.7);
        npc.walkCycle += dt * 6;
      }
    } else {
      // PATROL + Autonomous Decision Engine for General Citizens
      npc.decisionTimer = (npc.decisionTimer ?? 10) - dt;
      if (npc.decisionTimer <= 0 && npc.role === 'COMMUTER') {
        npc.decisionTimer = 18 + Math.random() * 10;
        if (Math.random() < 0.45) {
          // Autonomously decide to walk to a Bus Stop to catch the bus!
          const stop = DHAKA_BUS_STOPS[Math.floor(Math.random() * DHAKA_BUS_STOPS.length)];
          npc.behavior = 'WAIT_BUS';
          npc.behaviorTimer = 28;
          npc.waypoints = [
            { x: stop.x + 20, y: stop.y - 8 },
            { x: stop.x + stop.w - 20, y: stop.y - 8 },
          ];
          npc.ownThought = `চিন্তা: হাঁটতে হাঁটতে ক্লান্ত লাগছে, ${stop.name.split('·')[1]?.trim() || 'বাস স্টপে'} গিয়ে বাস ধরবো!`;
          npc.currentDecision = 'সিদ্ধান্ত: নিজে নিজে বাস স্টপে গিয়ে বাসে ওঠার সিদ্ধান্ত নিয়েছি';
        } else if (Math.random() < 0.75) {
          // Autonomously decide to walk to a Train Station to catch the loop train!
          const st = TRAIN_STATIONS[Math.floor(Math.random() * TRAIN_STATIONS.length)];
          npc.behavior = 'WAIT_TRAIN';
          npc.behaviorTimer = 28;
          npc.waypoints = [
            { x: st.waitX - 25, y: st.waitY },
            { x: st.waitX + 25, y: st.waitY },
          ];
          npc.ownThought = `চিন্তা: দ্রুত যাওয়ার জন্য ${st.name.split(' ')[0]} রেল স্টেশন থেকে মেট্রো ট্রেনে উঠবো!`;
          npc.currentDecision = 'সিদ্ধান্ত: নিজে নিজে রেল স্টেশনে গিয়ে ট্রেনে ওঠার সিদ্ধান্ত নিয়েছি';
        }
      }

      const wp = npc.waypoints[npc.waypointIndex % npc.waypoints.length];
      const wx = wp.x - npc.x;
      const wy = wp.y - npc.y;
      const wDist = Math.hypot(wx, wy);

      if (distToPlayer < 135 && !player.inVehicleId) {
        npc.angle = Math.atan2(dyToPlayer, dxToPlayer);
      } else if (wDist < 26) {
        npc.waypointIndex = (npc.waypointIndex + 1) % npc.waypoints.length;
      } else if (wDist > 0.01) {
        npc.angle = Math.atan2(wy, wx);
        targetVx = (wx / wDist) * npc.walkSpeed;
        targetVy = (wy / wDist) * npc.walkSpeed;
        npc.walkCycle += dt * 6.5;
      }
    }

    // Logic D: Smart Traffic Dodge Logic — NPCs step out of the way of fast incoming vehicles!
    for (const v of vehicles) {
      if (Math.abs(v.speed) > 90) {
        const dxCar = npc.x - v.x;
        const dyCar = npc.y - v.y;
        const dCar = Math.hypot(dxCar, dyCar);
        if (dCar < 95 && dCar > 1) {
          const dodgeAngle = v.angle + Math.PI / 2;
          targetVx += Math.cos(dodgeAngle) * 140;
          targetVy += Math.sin(dodgeAngle) * 140;
        }
      }
    }

    npc.vx = npc.vx * Math.pow(0.05, dt) + targetVx * (1 - Math.pow(0.05, dt));
    npc.vy = npc.vy * Math.pow(0.05, dt) + targetVy * (1 - Math.pow(0.05, dt));

    const resolved = resolveCircleBuildingCollision(
      npc.x + npc.vx * dt,
      npc.y + npc.vy * dt,
      19
    );
    npc.x = resolved.x;
    npc.y = resolved.y;

    // Strictly keep Lockup Prisoner inside the Police Station Lockup Cell behind bars!
    if (npc.role === 'LOCKUP_PRISONER') {
      npc.x = Math.max(3035, Math.min(3220, npc.x));
      npc.y = Math.max(1700, Math.min(1785, npc.y));
    }

    // Keep Footballers inside the Football Stadium pitch!
    if (npc.role === 'FOOTBALLER') {
      npc.x = Math.max(
        FOOTBALL_STADIUM_RECT.x + 60,
        Math.min(FOOTBALL_STADIUM_RECT.x + FOOTBALL_STADIUM_RECT.w - 60, npc.x)
      );
      npc.y = Math.max(
        FOOTBALL_STADIUM_RECT.y + 60,
        Math.min(FOOTBALL_STADIUM_RECT.y + FOOTBALL_STADIUM_RECT.h - 55, npc.y)
      );
    }

    if (!player.inVehicleId && !player.inTrain) {
      const overlapDist = Math.hypot(player.x - npc.x, player.y - npc.y);
      const minSpacing = 35;
      if (overlapDist < minSpacing && overlapDist > 0.001) {
        const push = (minSpacing - overlapDist) * 0.5;
        const nx = (player.x - npc.x) / overlapDist;
        const ny = (player.y - npc.y) / overlapDist;
        player.x += nx * push;
        player.y += ny * push;
        npc.x -= nx * push;
        npc.y -= ny * push;
      }
    }
  }
}

function updateProximityTargets(w: WorldSimulationRef) {
  const { player, vehicles, npcs } = w;

  let bestCarId: string | null = null;
  let bestCarDist = 125;
  if (!player.inVehicleId && !player.inTrain) {
    for (const v of vehicles) {
      const d = Math.hypot(v.x - player.x, v.y - player.y);
      if (d < bestCarDist) {
        bestCarDist = d;
        bestCarId = v.id;
      }
    }
  }
  w.nearestVehicleId = bestCarId;
  w.nearestVehicleDist = Math.round(bestCarDist);

  const forwardX = Math.cos(player.angle);
  const forwardY = Math.sin(player.angle);

  const scoredNpcs: Array<{ id: string; dist: number; score: number }> = [];
  for (const n of npcs) {
    if (n.hp <= 0) continue;
    const dx = n.x - player.x;
    const dy = n.y - player.y;
    const dist = Math.hypot(dx, dy);
    const dirDot = dist > 1 ? (dx / dist) * forwardX + (dy / dist) * forwardY : 1;
    const effectiveScore = dist - dirDot * 45;
    scoredNpcs.push({ id: n.id, dist, score: effectiveScore });
  }

  scoredNpcs.sort((a, b) => a.score - b.score);

  if (scoredNpcs.length > 0) {
    w.nearestNpcId = scoredNpcs[0].id;
    w.nearestNpcDist = Math.round(scoredNpcs[0].dist);
  } else {
    w.nearestNpcId = 'neta';
    w.nearestNpcDist = 999;
  }

  // Only list characters within the strict hearing radius (MAX_VOICE_HEARING_DIST = 250px)
  w.nearbyNpcIds = scoredNpcs
    .filter((item) => item.dist <= MAX_VOICE_HEARING_DIST)
    .slice(0, 3)
    .map((item) => item.id);
}

export const Canvas2DWorld: React.FC<Canvas2DWorldProps> = ({
  worldRef,
  gameState,
  isRotatedLandscape = false,
  onSyncHud,
  onGameEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const patternsRef = useRef<ProceduralPatterns | null>(null);
  const stateRef = useRef({ gameState, isRotatedLandscape, onSyncHud, onGameEnd });

  useEffect(() => {
    stateRef.current = { gameState, isRotatedLandscape, onSyncHud, onGameEnd };
  }, [gameState, isRotatedLandscape, onSyncHud, onGameEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    patternsRef.current = createProceduralPatterns(ctx);

    let animId = 0;
    let isMounted = true;
    let lastTime = performance.now();
    let hudSyncAccum = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const getLogicalDimensions = () => {
      const parent = canvas.parentElement;
      if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
        return { w: parent.clientWidth, h: parent.clientHeight };
      }
      const rotated = stateRef.current.isRotatedLandscape;
      return {
        w: rotated ? window.innerHeight : window.innerWidth,
        h: rotated ? window.innerWidth : window.innerHeight,
      };
    };

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { w: logicalW, h: logicalH } = getLogicalDimensions();
      canvas.width = Math.max(1, Math.floor(logicalW * dpr));
      canvas.height = Math.max(1, Math.floor(logicalH * dpr));
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const renderFrame = (now: number) => {
      if (!isMounted) return;
      animId = requestAnimationFrame(renderFrame);

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.max(0.001, Math.min(rawDt, 0.05));

      const {
        gameState: currentGameState,
        onSyncHud: syncHud,
        onGameEnd: endGame,
      } = stateRef.current;

      const { w: logicalW, h: logicalH } = getLogicalDimensions();

      if (
        canvas.width !== Math.max(1, Math.floor(logicalW * dpr)) ||
        canvas.height !== Math.max(1, Math.floor(logicalH * dpr))
      ) {
        canvas.width = Math.max(1, Math.floor(logicalW * dpr));
        canvas.height = Math.max(1, Math.floor(logicalH * dpr));
      }

      try {
        stepWorldSimulation(worldRef.current, dt, currentGameState, endGame);

        hudSyncAccum += dt;
        if (hudSyncAccum >= 0.1) {
          hudSyncAccum = 0;
          syncHud();
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw2DWorld(
          ctx,
          logicalW,
          logicalH,
          worldRef.current,
          patternsRef.current,
          now / 1000
        );
      } catch (err) {
        console.error('Frame recovery:', err);
      }
    };

    animId = requestAnimationFrame(renderFrame);
    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [worldRef]);

  return <canvas ref={canvasRef} className="block w-full h-full touch-none" />;
};

function draw2DWorld(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  w: WorldSimulationRef,
  patterns: ProceduralPatterns | null,
  timeSec: number
) {
  ctx.save();

  ctx.fillStyle = patterns?.water || '#0284c7';
  ctx.fillRect(0, 0, viewW, viewH);

  const shakeX = w.camera.shake > 0 ? (Math.random() - 0.5) * w.camera.shake : 0;
  const shakeY = w.camera.shake > 0 ? (Math.random() - 0.5) * w.camera.shake : 0;

  const camX = (Number.isFinite(w.camera.x) ? w.camera.x : 1450) - viewW / 2 + shakeX;
  const camY = (Number.isFinite(w.camera.y) ? w.camera.y : 1020) - viewH / 2 + shakeY;

  ctx.translate(-camX, -camY);

  // 1. Island Seawall & Realistic Concrete Paver Sidewalk Base
  ctx.fillStyle = '#64748b';
  ctx.fillRect(40, 40, WORLD_WIDTH - 80, WORLD_HEIGHT - 80);
  ctx.fillStyle = patterns?.sidewalk || '#cbd5e1';
  ctx.fillRect(60, 60, WORLD_WIDTH - 180, WORLD_HEIGHT - 120);

  // 2. Diverse Terrain Zones
  drawTerrainZones(ctx, patterns, timeSec);

  // 3. Central Park & Rally Stage
  drawCentralPark(ctx, patterns, timeSec);

  // 4. Detailed Asphalt Roads & Zebra Crosswalks
  drawDetailedRoads(ctx, patterns);

  // 5. Bus Stop Shelters
  drawDhakaBusStops(ctx, timeSec);

  // 6. Railway Track & Station Platform
  drawRailwayAndStation(ctx, w, timeSec);

  // 7. Street Vendors & Sidewalk Shops
  drawStreetStallsAndVans(ctx, timeSec);

  // 7.5. Open-Roof Cutaway Building Interiors & Rooms (কোঠা: হাসপাতাল, শপিং মল, কাঁচাবাজার, থানা, নাইট ক্লাব, ফুটবল স্টেডিয়াম, হোটেল, মুদি দোকান, অফিস-আদালত, গার্মেন্টস)
  drawEnterableBuildingInteriors(ctx, w, timeSec);

  // 8. Tire Skid Marks
  for (const s of w.skidMarks) {
    ctx.strokeStyle = `rgba(8, 8, 12, ${s.alpha})`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  // 9. Streetlamps Neon Pools
  for (const lamp of STREET_LAMPS) {
    const grad = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 70);
    grad.addColorStop(0, lamp.color + '66');
    grad.addColorStop(0.5, lamp.color + '22');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 10. All 8 Vehicles
  for (const v of w.vehicles) {
    drawVehicleByType(ctx, v, w, timeSec);
  }

  // 11. Moving Express Train
  drawExpressTrain(ctx, w.train, w.player.inTrain, timeSec);

  // 12. All Community Characters (when on foot)
  for (const npc of w.npcs) {
    if (npc.hp > 0 && !npc.drivingVehicleId && !npc.ridingVehicleId && !npc.inTrain) {
      drawDetailedCharacter(ctx, {
        x: npc.x,
        y: npc.y,
        angle: npc.angle,
        walkCycle: npc.walkCycle,
        punchTimer: npc.punchTimer,
        punchHand: npc.punchHand,
        hitFlash: npc.hitFlashTimer > 0,
        isPlayer: false,
        npc,
        isPrimaryChatTarget:
          w.nearestNpcId === npc.id && w.nearestNpcDist <= MAX_VOICE_HEARING_DIST,
        timeSec,
      });
    }
  }

  // 13. Player Character (when on foot)
  if (!w.player.inVehicleId && !w.player.inTrain) {
    drawDetailedCharacter(ctx, {
      x: w.player.x,
      y: w.player.y,
      angle: w.player.angle,
      walkCycle: w.player.walkCycle,
      punchTimer: w.player.punchTimer,
      punchHand: w.player.punchHand || 'right',
      hitFlash: w.player.hitFlashTimer > 0,
      isPlayer: true,
      isPrimaryChatTarget: false,
      timeSec,
    });
  }

  // 14. Particles
  for (const p of w.particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 15. 2.5D Perspective Landmark Buildings
  draw25DBuildings(ctx, camX + viewW / 2, camY + viewH / 2, timeSec);

  // 16. Swaying Tropical Palm & Banyan Trees
  for (const tree of PALM_TREES) {
    drawDetailedPalmTree(ctx, tree.x, tree.y, tree.scale, tree.seed, timeSec);
  }

  // 17. Floating Damage & Event Popups
  for (const fd of w.floatingDamages) {
    ctx.save();
    ctx.font = '700 14px JetBrains Mono, monospace';
    ctx.strokeStyle = '#07060e';
    ctx.lineWidth = 3;
    ctx.strokeText(fd.text, fd.x, fd.y);
    ctx.fillStyle = fd.color;
    ctx.textAlign = 'center';
    ctx.fillText(fd.text, fd.x, fd.y);
    ctx.restore();
  }

  // 18. Community Characters Overhead HUD (Speech bubbles strictly shown ONLY for nearby characters!)
  for (const npc of w.npcs) {
    if (npc.hp > 0 && !npc.inTrain) {
      drawNPCOverheadUI(
        ctx,
        npc,
        w.player.x,
        w.player.y,
        w.nearestNpcId === npc.id && w.nearestNpcDist <= MAX_VOICE_HEARING_DIST
      );
    }
  }

  // 19. Proximity Vehicle Drive / 2-Seat Passenger Prompt
  if (w.nearestVehicleId && !w.player.inVehicleId && !w.player.inTrain) {
    const nearCar = w.vehicles.find((v) => v.id === w.nearestVehicleId);
    if (nearCar) {
      ctx.save();
      ctx.font = '700 11px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(9, 8, 18, 0.94)';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      const label =
        nearCar.driverNpcId && nearCar.allowsPlayerPassenger
          ? `[G] যাত্রী হয়ে উঠুন · [F] নিজে চালান (${nearCar.name.split(' ')[0]})`
          : `[F] চালান: ${nearCar.name}`;
      const boxW = Math.max(165, ctx.measureText(label).width + 24);
      fillStrokeRoundedRect(ctx, nearCar.x - boxW / 2, nearCar.y - 58, boxW, 24, 6, true, true);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(label, nearCar.x, nearCar.y - 42);
      ctx.restore();
    }
  }

  // 20. Train Station Boarding Prompt
  if (w.canBoardTrain && !w.player.inVehicleId) {
    ctx.save();
    ctx.font = '800 12px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    const promptX = w.player.x;
    const promptY = w.player.y - 62;
    const text = w.player.inTrain
      ? '[T] ট্রেন থেকে স্টেশনে নামুন'
      : '[T] কমলাপুর মেট্রো ট্রেনে উঠুন!';
    const bw = Math.max(190, ctx.measureText(text).width + 26);
    ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    fillStrokeRoundedRect(ctx, promptX - bw / 2, promptY - 18, bw, 26, 6, true, true);
    ctx.fillStyle = '#fef08a';
    ctx.fillText(text, promptX, promptY - 1);
    ctx.restore();
  }

  ctx.restore();

  // 21. Top-Left Mini-Map Radar
  drawRadarMinimap(ctx, w, viewW, viewH);
}

function drawDhakaBusStops(ctx: CanvasRenderingContext2D, timeSec: number) {
  for (const bs of DHAKA_BUS_STOPS) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    fillStrokeRoundedRect(ctx, bs.x + 4, bs.y + 4, bs.w, bs.h + 12, 6, true, false);

    ctx.fillStyle = '#065f46';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    fillStrokeRoundedRect(ctx, bs.x, bs.y, bs.w, bs.h + 12, 6, true, true);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(bs.x + 10, bs.y + 4, bs.w - 20, 4);

    ctx.fillStyle = Math.floor(timeSec * 3) % 2 === 0 ? '#fde047' : '#ef4444';
    ctx.beginPath();
    ctx.arc(bs.x + 9, bs.y + (bs.h + 12) / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    const stopTitle = bs.name.split('·')[1]?.trim() || bs.name;
    ctx.fillText(`🚌 ${stopTitle}`, bs.x + bs.w / 2, bs.y + 19);

    ctx.fillStyle = '#fef08a';
    ctx.font = '700 8px JetBrains Mono, monospace';
    ctx.fillText(bs.routeHint, bs.x + bs.w / 2, bs.y + 31);
    ctx.restore();
  }
}

function drawTerrainZones(
  ctx: CanvasRenderingContext2D,
  patterns: ProceduralPatterns | null,
  timeSec: number
) {
  for (const tz of TERRAIN_ZONES) {
    if (tz.type === 'INDUSTRIAL_CONCRETE') {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(tz.x, tz.y, tz.w, tz.h);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.strokeRect(tz.x, tz.y, tz.w, tz.h);
      const containers = [
        { x: tz.x + 80, y: tz.y + 70, c: '#dc2626' },
        { x: tz.x + 80, y: tz.y + 115, c: '#2563eb' },
        { x: tz.x + 210, y: tz.y + 70, c: '#d97706' },
      ];
      for (const ct of containers) {
        ctx.fillStyle = ct.c;
        ctx.fillRect(ct.x, ct.y, 96, 34);
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(ct.x, ct.y, 96, 34);
      }
      ctx.fillStyle = '#1e293b';
      ctx.font = '800 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('তেজগাঁও ট্রাক ও ভ্যান স্ট্যান্ড (BAPER CITY DEPOT)', tz.x + tz.w / 2, tz.y + 30);
    } else if (tz.type === 'PLAZA_TILES') {
      ctx.fillStyle = patterns?.plaza || '#f1f5f9';
      ctx.fillRect(tz.x, tz.y, tz.w, tz.h);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(tz.x, tz.y, tz.w, tz.h);
      ctx.fillStyle = '#9a3412';
      ctx.font = '800 14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('গাউছিয়া ও নিউ মার্কেট চত্বর (BAPER CITY PLAZA)', tz.x + tz.w / 2, tz.y + 26);
    } else if (tz.type === 'SAND_BEACH') {
      ctx.fillStyle = patterns?.sand || '#d97706';
      ctx.fillRect(tz.x, tz.y, tz.w, tz.h);
      for (let by = 380; by <= 2600; by += 360) {
        const ux = tz.x + 180;
        ctx.fillStyle = by % 720 === 0 ? '#ec4899' : '#06b6d4';
        ctx.fillRect(ux - 22, by + 18, 44, 22);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(ux + 5, by + 6, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = by % 720 === 0 ? '#ff2a85' : '#fde047';
        ctx.beginPath();
        ctx.arc(ux, by, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (tz.type === 'OCEAN_SURF') {
      const surfGrad = ctx.createLinearGradient(tz.x, 0, tz.x + tz.w, 0);
      surfGrad.addColorStop(0, '#38bdf8');
      surfGrad.addColorStop(0.35, '#0284c7');
      surfGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = surfGrad;
      ctx.fillRect(tz.x, tz.y, tz.w, tz.h);

      const waveOffset = Math.sin(timeSec * 2.2) * 18;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let wy = tz.y; wy <= tz.y + tz.h; wy += 60) {
        ctx.moveTo(tz.x + waveOffset, wy);
        ctx.quadraticCurveTo(tz.x + 12 + waveOffset, wy + 30, tz.x + waveOffset, wy + 60);
      }
      ctx.stroke();
    }
  }
}

function drawRailwayAndStation(
  ctx: CanvasRenderingContext2D,
  w: WorldSimulationRef,
  timeSec: number
) {
  const { leftX, topY, rightX, bottomY } = TRAIN_LOOP_RECT;
  const loopW = rightX - leftX;
  const loopH = bottomY - topY;

  ctx.save();

  // 1. Gravel Track Bed around all 4 sides of the city map (ম্যাপের চারপাশ ঘিরে রেললাইন)
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 48;
  ctx.lineJoin = 'round';
  ctx.strokeRect(leftX, topY, loopW, loopH);

  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 50;
  ctx.strokeRect(leftX, topY, loopW, loopH);
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 44;
  ctx.strokeRect(leftX, topY, loopW, loopH);

  // 2. Wooden Railway Sleepers along Top, Bottom, Left, and Right tracks
  ctx.fillStyle = '#451a03';
  for (let tx = leftX; tx <= rightX; tx += 24) {
    ctx.fillRect(tx - 4, topY - 19, 8, 38);
    ctx.fillRect(tx - 4, bottomY - 19, 8, 38);
  }
  for (let ty = topY; ty <= bottomY; ty += 24) {
    ctx.fillRect(leftX - 19, ty - 4, 38, 8);
    ctx.fillRect(rightX - 19, ty - 4, 38, 8);
  }

  // 3. Dual Steel Rails around the entire 4-sided loop
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3.2;
  ctx.strokeRect(leftX - 10, topY - 10, loopW + 20, loopH + 20);
  ctx.strokeRect(leftX + 10, topY + 10, loopW - 20, loopH - 20);

  // 4. Draw all 4 Perimeter Train Stations (North, East, South, West)
  for (const st of TRAIN_STATIONS) {
    ctx.fillStyle = '#1e293b';
    fillStrokeRoundedRect(
      ctx,
      st.platformX,
      st.platformY,
      st.platformW,
      st.platformH,
      8,
      true,
      false
    );
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(st.platformX, st.platformY, st.platformW, st.platformH);

    // Yellow safety line on station platform
    ctx.fillStyle = '#facc15';
    if (st.platformW > st.platformH) {
      ctx.fillRect(st.platformX + 8, st.platformY + st.platformH - 6, st.platformW - 16, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 11.5px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `🚉 ${st.name} · (ট্রেনে উঠতে T চাপুন)`,
        st.platformX + st.platformW / 2,
        st.platformY + 40
      );
    } else {
      ctx.fillRect(st.platformX + st.platformW - 6, st.platformY + 8, 4, st.platformH - 16);
      ctx.save();
      ctx.translate(st.platformX + st.platformW / 2, st.platformY + st.platformH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 10.5px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🚉 ${st.name}`, 0, 4);
      ctx.restore();
    }
  }

  // 5. Flashing Railway Crossing Signals
  const crossingXs = [245, 1255, 2635, 3370, 4560];
  const blink = Math.floor(timeSec * 4) % 2 === 0;
  for (const cx of crossingXs) {
    const trainNear = Math.hypot(w.train.x - cx, w.train.y - topY) < 600;
    ctx.fillStyle = trainNear ? (blink ? '#ef4444' : '#7f1d1d') : '#10b981';
    ctx.beginPath();
    ctx.arc(cx - 55, topY - 34, 6, 0, Math.PI * 2);
    ctx.arc(cx + 55, topY + 34, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawExpressTrain(
  ctx: CanvasRenderingContext2D,
  train: WorldSimulationRef['train'],
  isPlayerInTrain: boolean,
  timeSec: number
) {
  ctx.save();
  const coachW = 114;
  const coachH = 38;
  const gap = 10;
  const angle = train.angle || 0;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  // Headlight beam in front of engine
  ctx.save();
  ctx.translate(train.x, train.y);
  ctx.rotate(angle);
  const beamGrad = ctx.createLinearGradient(15, 0, 260, 0);
  beamGrad.addColorStop(0, 'rgba(0, 240, 255, 0.5)');
  beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(15, -16);
  ctx.lineTo(260, -70);
  ctx.lineTo(260, 70);
  ctx.lineTo(15, 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Draw each coach along the loop direction
  for (let i = 0; i < train.numCoaches; i++) {
    const offsetDist = i * (coachW + gap) + coachW / 2;
    const coachCenterX = train.x - dirX * offsetDist;
    const coachCenterY = train.y - dirY * offsetDist;

    ctx.save();
    ctx.translate(coachCenterX, coachCenterY);
    ctx.rotate(angle);

    const cx = -coachW / 2;
    const cy = -coachH / 2;

    if (i > 0) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(coachW / 2, -5, gap, 10);
    }

    ctx.fillStyle = i === 0 ? '#064e3b' : '#0f172a';
    ctx.strokeStyle = isPlayerInTrain && i === 1 ? '#00f0ff' : i === 0 ? '#10b981' : '#ef4444';
    ctx.lineWidth = isPlayerInTrain && i === 1 ? 3 : 2;
    fillStrokeRoundedRect(ctx, cx, cy, coachW, coachH, 8, true, true);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(cx + 8, cy + 5, coachW - 16, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx + 8, cy + coachH - 9, coachW - 16, 4);

    // Lit passenger windows + passenger silhouettes inside train!
    for (let wx = cx + 14; wx < cx + coachW - 22; wx += 22) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(wx, cy + 12, 14, 14);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(wx + 7, cy + 19, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isPlayerInTrain && i === 1) {
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (i === 0) {
      ctx.fillStyle = '#38bdf8';
      fillStrokeRoundedRect(ctx, cx + coachW - 16, cy + 6, 12, coachH - 12, 4, true, false);
    }

    ctx.restore();
  }

  if (train.stationStopTimer > 0) {
    ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.6;
    ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
    const label = `🚉 ট্রেন স্টেশনে থেমেছে · যাত্রী উঠছে/নামছে (${Math.ceil(train.stationStopTimer)}s)`;
    const bw = Math.max(190, ctx.measureText(label).width + 18);
    fillStrokeRoundedRect(ctx, train.x - bw / 2, train.y - 46, bw, 20, 5, true, true);
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText(label, train.x, train.y - 33);
  } else if (train.speed > 50 && Math.sin(timeSec * 24) > 0.4) {
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(train.x - dirX * 40, train.y - dirY * 40, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawStreetStallsAndVans(ctx: CanvasRenderingContext2D, timeSec: number) {
  for (const st of STREET_STALLS) {
    ctx.save();
    ctx.translate(st.x, st.y);

    const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 58);
    glow.addColorStop(0, st.canopyColor1 + '44');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.fill();

    const hw = st.w / 2;
    const hh = st.h / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    fillStrokeRoundedRect(ctx, -hw + 4, -hh + 5, st.w, st.h, 6, true, false);

    if (st.kind === 'CART_VAN') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-hw + 4, -hh - 4, 12, 4);
      ctx.fillRect(-hw + 4, hh, 12, 4);
      ctx.beginPath();
      ctx.arc(hw + 7, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      fillStrokeRoundedRect(ctx, -hw + 4, hh + 6, st.w - 8, 8, 2, true, true);
    }

    ctx.fillStyle = '#27272a';
    ctx.strokeStyle = st.canopyColor1;
    ctx.lineWidth = 2;
    fillStrokeRoundedRect(ctx, -hw, -hh, st.w, st.h, 5, true, true);

    const stripeCount = 6;
    const stripeW = st.w / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? st.canopyColor1 : st.canopyColor2;
      ctx.fillRect(-hw + i * stripeW, -hh + 2, stripeW, st.h - 4);
    }

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(-hw + 14, 0, 6 + Math.sin(timeSec * 5) * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(9, 8, 18, 0.9)';
    ctx.strokeStyle = st.canopyColor2;
    ctx.lineWidth = 1.2;
    ctx.font = '700 10px Plus Jakarta Sans, sans-serif';
    const labelW = Math.max(115, ctx.measureText(st.bengaliName).width + 16);
    fillStrokeRoundedRect(ctx, -labelW / 2, -hh - 24, labelW, 18, 4, true, true);
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText(st.bengaliName, 0, -hh - 11);

    ctx.restore();
  }
}

function drawOccupantHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  torsoColor: string,
  headColor = '#f59e0b'
) {
  ctx.fillStyle = torsoColor;
  fillStrokeRoundedRect(ctx, x - 6, y - 8, 12, 16, 4, true, false);
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.arc(x, y, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x - 1, y, 4.8, Math.PI * 0.45, Math.PI * 1.55);
  ctx.fill();
}

function drawVehicleByType(
  ctx: CanvasRenderingContext2D,
  car: VehicleState,
  w: WorldSimulationRef,
  timeSec: number
) {
  const isPlayerInside = w.player.inVehicleId === car.id;
  const hasDriver =
    Boolean(car.driverNpcId) || (isPlayerInside && w.player.inVehicleSeat === 'driver');
  const hasPassenger =
    Boolean(car.passengerNpcId) || (isPlayerInside && w.player.inVehicleSeat === 'passenger');

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  const hl = car.length / 2;
  const hw = car.width / 2;

  if (car.headlightsOn && car.type !== 'RICKSHAW' && car.type !== 'VAN_GARI') {
    const beamLen = car.type === 'MOTORCYCLE' ? 140 : 185;
    const beamGrad = ctx.createLinearGradient(hl - 4, 0, hl + beamLen, 0);
    beamGrad.addColorStop(0, 'rgba(0, 240, 255, 0.34)');
    beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    if (car.type === 'MOTORCYCLE') {
      ctx.moveTo(hl, -3);
      ctx.lineTo(hl + beamLen, -32);
      ctx.lineTo(hl + beamLen, 32);
      ctx.lineTo(hl, 3);
    } else {
      ctx.moveTo(hl, -hw + 4);
      ctx.lineTo(hl + beamLen, -hw - 48);
      ctx.lineTo(hl + beamLen, hw + 48);
      ctx.lineTo(hl, hw - 4);
    }
    ctx.closePath();
    ctx.fill();
  }

  const glowGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, hl + 12);
  glowGrad.addColorStop(0, (isPlayerInside ? '#00f0ff' : car.neonColor) + '44');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(-hl - 12, -hw - 12, car.length + 24, car.width + 24);

  if (car.type === 'RICKSHAW') {
    ctx.fillStyle = '#09090b';
    fillStrokeRoundedRect(ctx, hl - 9, -2, 10, 4, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 2, -hw - 2, 12, 4, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 2, hw - 2, 12, 4, 2, true, false);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-hl + 10, 0);
    ctx.lineTo(hl - 4, 0);
    ctx.moveTo(hl - 7, -9);
    ctx.lineTo(hl - 7, 9);
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    fillStrokeRoundedRect(ctx, -hl + 4, -hw + 2, 24, car.width - 4, 4, true, false);

    ctx.fillStyle = '#ec4899';
    fillStrokeRoundedRect(ctx, -hl + 6, -hw + 4, 14, car.width - 8, 3, true, false);

    if (hasPassenger) {
      drawOccupantHead(
        ctx,
        -hl + 13,
        0,
        isPlayerInside && w.player.inVehicleSeat === 'passenger' ? '#06b6d4' : '#10b981'
      );
    }

    ctx.fillStyle = car.primaryColor;
    ctx.strokeStyle = car.secondaryColor;
    ctx.lineWidth = 2;
    fillStrokeRoundedRect(ctx, -hl + 2, -hw, 16, car.width, 6, true, true);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(-hl + 6, -hw + 3, 6, car.width - 6);

    if (hasDriver) {
      drawOccupantHead(
        ctx,
        hl - 16,
        0,
        isPlayerInside && w.player.inVehicleSeat === 'driver' ? '#06b6d4' : '#f97316'
      );
    }
    ctx.restore();
    return;
  }

  if (car.type === 'VAN_GARI') {
    ctx.fillStyle = '#09090b';
    fillStrokeRoundedRect(ctx, hl - 10, -2.5, 11, 5, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 4, -hw - 3, 13, 5, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 4, hw - 2, 13, 5, 2, true, false);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(hl - 5, 0);
    ctx.moveTo(hl - 8, -10);
    ctx.lineTo(hl - 8, 10);
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = car.primaryColor;
    ctx.lineWidth = 2.2;
    fillStrokeRoundedRect(ctx, -hl + 2, -hw, 32, car.width, 4, true, true);

    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.2;
    for (let px = -hl + 8; px < -hl + 30; px += 6) {
      ctx.beginPath();
      ctx.moveTo(px, -hw + 2);
      ctx.lineTo(px, hw - 2);
      ctx.stroke();
    }

    if (hasDriver) {
      drawOccupantHead(
        ctx,
        hl - 17,
        0,
        isPlayerInside && w.player.inVehicleSeat === 'driver' ? '#06b6d4' : '#0284c7'
      );
    }
    if (hasPassenger) {
      drawOccupantHead(
        ctx,
        -hl + 16,
        0,
        isPlayerInside && w.player.inVehicleSeat === 'passenger' ? '#06b6d4' : '#f43f5e'
      );
    }
    ctx.restore();
    return;
  }

  if (car.type === 'MOTORCYCLE') {
    ctx.fillStyle = '#09090b';
    fillStrokeRoundedRect(ctx, hl - 9, -3.5, 11, 7, 3, true, false);
    fillStrokeRoundedRect(ctx, -hl - 1, -4, 12, 8, 3, true, false);

    ctx.fillStyle = car.primaryColor;
    ctx.strokeStyle = car.secondaryColor;
    ctx.lineWidth = 1.8;
    fillStrokeRoundedRect(ctx, -hl + 6, -7, car.length - 12, 14, 6, true, true);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(hl - 10, -12);
    ctx.lineTo(hl - 6, 0);
    ctx.lineTo(hl - 10, 12);
    ctx.stroke();

    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(hl - 3, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(-hl + 3, -3, 3, 6);

    if (hasDriver) {
      drawOccupantHead(
        ctx,
        4,
        0,
        isPlayerInside && w.player.inVehicleSeat === 'driver' ? '#06b6d4' : '#dc2626'
      );
    }
    if (hasPassenger) {
      drawOccupantHead(
        ctx,
        -11,
        0,
        isPlayerInside && w.player.inVehicleSeat === 'passenger' ? '#06b6d4' : '#facc15'
      );
    }
    ctx.restore();
    return;
  }

  if (car.type === 'DHAKA_BUS') {
    ctx.fillStyle = '#09090b';
    fillStrokeRoundedRect(ctx, hl - 22, -hw - 3, 16, 6, 2, true, false);
    fillStrokeRoundedRect(ctx, hl - 22, hw - 3, 16, 6, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 10, -hw - 3, 16, 6, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 10, hw - 3, 16, 6, 2, true, false);

    ctx.fillStyle = car.primaryColor;
    ctx.strokeStyle = car.secondaryColor;
    ctx.lineWidth = 2.2;
    fillStrokeRoundedRect(ctx, -hl, -hw, car.length, car.width, 9, true, true);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-hl + 6, -hw + 3, car.length - 12, 4);
    ctx.fillRect(-hl + 6, hw - 7, car.length - 12, 4);

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    fillStrokeRoundedRect(ctx, hl - 20, -hw + 5, 14, car.width - 10, 4, true, true);

    ctx.fillStyle = '#090812';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;
    fillStrokeRoundedRect(ctx, -hl + 14, -11, car.length - 40, 22, 4, true, true);
    ctx.fillStyle = '#fef08a';
    ctx.font = '800 8.5px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(car.routeBanner || 'গুলশান ⇄ যাত্রাবাড়ী', -4, 3);

    // Draw passenger heads inside the bus windows!
    const busPaxCount = w.npcs.filter((n) => n.ridingVehicleId === car.id && n.hp > 0).length;
    for (let pi = 0; pi < Math.min(4, Math.max(1, busPaxCount)); pi++) {
      drawOccupantHead(ctx, -hl + 22 + pi * 16, -hw + 6, '#38bdf8');
    }

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(hl - 3, -hw + 5, 3, 7);
    ctx.fillRect(hl - 3, hw - 12, 3, 7);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(-hl - 1, -hw + 5, 3, 7);
    ctx.fillRect(-hl - 1, hw - 12, 3, 7);

    ctx.restore();

    if (car.busStopTimer && car.busStopTimer > 0) {
      ctx.save();
      ctx.font = '800 9px Plus Jakarta Sans, sans-serif';
      const msg = '🚌 বাস স্টপে যাত্রী উঠছে/নামছে...';
      const mw = ctx.measureText(msg).width + 16;
      ctx.fillStyle = 'rgba(6, 95, 70, 0.94)';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.4;
      fillStrokeRoundedRect(ctx, car.x - mw / 2, car.y - 44, mw, 18, 5, true, true);
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(msg, car.x, car.y - 32);
      ctx.restore();
    }
    return;
  }

  ctx.fillStyle = '#09090b';
  if (car.type === 'TAXI_CAB') {
    fillStrokeRoundedRect(ctx, hl - 10, -3, 10, 6, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 5, -hw - 3, 12, 5, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 5, hw - 2, 12, 5, 2, true, false);
  } else {
    fillStrokeRoundedRect(ctx, hl - 18, -hw - 3, 14, 6, 2, true, false);
    fillStrokeRoundedRect(ctx, hl - 18, hw - 3, 14, 6, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 6, -hw - 3, 14, 6, 2, true, false);
    fillStrokeRoundedRect(ctx, -hl + 6, hw - 3, 14, 6, 2, true, false);
  }

  ctx.fillStyle = car.primaryColor;
  ctx.strokeStyle = car.secondaryColor;
  ctx.lineWidth = 1.8;
  fillStrokeRoundedRect(ctx, -hl, -hw, car.length, car.width, 8, true, true);

  if (car.type === 'COUNTACH_GT') {
    ctx.fillStyle = car.secondaryColor;
    ctx.fillRect(-hl + 3, -4, car.length - 6, 2.5);
    ctx.fillRect(-hl + 3, 1.5, car.length - 6, 2.5);
    ctx.fillStyle = '#1e1b4b';
    fillStrokeRoundedRect(ctx, -hl, -hw + 2, 7, car.width - 4, 2, true, true);
  } else if (car.type === 'TAXI_CAB') {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(-hl + 6, -hw + 3, car.length - 16, car.width - 6);
  } else if (car.type === 'POLICE_CRUISER') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-14, -hw + 2, 28, car.width - 4);
  }

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.2;
  fillStrokeRoundedRect(ctx, -14, -hw + 5, 30, car.width - 10, 4, true, true);

  if (hasDriver) {
    drawOccupantHead(ctx, 2, -6, '#06b6d4');
  }
  if (hasPassenger) {
    drawOccupantHead(ctx, 2, 6, '#10b981');
  }

  if (car.type === 'POLICE_CRUISER') {
    const flash = Math.floor(timeSec * (car.sirenOn ? 14 : 6)) % 2 === 0;
    ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
    ctx.fillRect(-4, -hw + 5, 7, 9);
    ctx.fillStyle = flash ? '#3b82f6' : '#ef4444';
    ctx.fillRect(-4, hw - 14, 7, 9);

    if (car.sirenOn) {
      const ringR = 26 + ((timeSec * 65) % 45);
      ctx.strokeStyle = flash ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (car.type === 'TAXI_CAB') {
    ctx.fillStyle = '#fef08a';
    fillStrokeRoundedRect(ctx, -6, -6, 12, 12, 2, true, false);
  }

  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(hl - 3, -hw + 4, 3, 6);
  ctx.fillRect(hl - 3, hw - 10, 3, 6);

  ctx.fillStyle = '#ff0055';
  ctx.fillRect(-hl - 1, -hw + 4, 3, 7);
  ctx.fillRect(-hl - 1, hw - 11, 3, 7);

  ctx.restore();
}

function drawCentralPark(
  ctx: CanvasRenderingContext2D,
  patterns: ProceduralPatterns | null,
  timeSec: number
) {
  const { x, y, w, h } = CENTRAL_PARK_RECT;

  // Outer Stone Retaining Wall around Ramna Park
  ctx.fillStyle = '#78716c';
  fillStrokeRoundedRect(ctx, x - 10, y - 10, w + 20, h + 20, 14, true, false);
  ctx.strokeStyle = '#f5f5f4';
  ctx.lineWidth = 2;
  fillStrokeRoundedRect(ctx, x - 6, y - 6, w + 12, h + 12, 12, false, true);

  // Lush Green Park Lawn
  ctx.fillStyle = patterns?.grass || '#15803d';
  ctx.fillRect(x, y, w, h);

  // Alternating Mowed Grass Stripes for Realistic Park Texture
  ctx.fillStyle = 'rgba(134, 239, 172, 0.14)';
  for (let stripeX = x; stripeX < x + w; stripeX += 90) {
    ctx.fillRect(stripeX, y, 45, h);
  }

  // Warm Stone-Paved Park Walkways (হাঁটার বাঁধানো রাস্তা)
  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 44;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + h / 2);
  ctx.lineTo(x + w - 12, y + h / 2);
  ctx.moveTo(x + w / 2, y + 12);
  ctx.lineTo(x + w / 2, y + h - 12);
  ctx.stroke();

  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + h / 2);
  ctx.lineTo(x + w - 12, y + h / 2);
  ctx.moveTo(x + w / 2, y + 12);
  ctx.lineTo(x + w / 2, y + h - 12);
  ctx.stroke();

  // Colorful Flower Beds & Wooden Park Benches
  const flowerBeds = [
    { fx: x + 180, fy: y + 180 },
    { fx: x + w - 240, fy: y + 180 },
    { fx: x + 180, fy: y + h - 220 },
    { fx: x + w - 240, fy: y + h - 220 },
  ];
  for (const fb of flowerBeds) {
    ctx.fillStyle = '#3f6212';
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 2;
    fillStrokeRoundedRect(ctx, fb.fx, fb.fy, 76, 38, 8, true, true);
    const colors = ['#f43f5e', '#facc15', '#ec4899', '#fb923c'];
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(fb.fx + 12 + (i % 4) * 17, fb.fy + 12 + Math.floor(i / 4) * 14, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wooden Park Bench next to flower bed
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    fillStrokeRoundedRect(ctx, fb.fx + 10, fb.fy + 48, 56, 12, 3, true, true);
  }

  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);

  // Shahbagh / Baper City Rally Stage
  const stg = SHAHBAGH_RALLY_STAGE;
  ctx.save();
  ctx.fillStyle = '#991b1b';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  fillStrokeRoundedRect(ctx, stg.x, stg.y, stg.w, stg.h, 8, true, true);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(stg.x + 12, stg.y + 10, stg.w - 24, stg.h - 20);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(stg.x + stg.w / 2 - 22, stg.y + 6, 44, 14);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  fillStrokeRoundedRect(ctx, stg.x - 16, stg.y + stg.h + 4, stg.w + 32, 24, 6, true, true);
  ctx.fillStyle = '#fef08a';
  ctx.font = '800 11px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('বাপের সিটি জনসভা মঞ্চ · BAPER CITY RALLY STAGE', stg.x + stg.w / 2, stg.y + stg.h + 20);
  ctx.restore();

  // Stone Promenade Ring Around Park Lake
  ctx.fillStyle = '#e7e5e4';
  ctx.beginPath();
  ctx.arc(PARK_POND_CIRCLE.x, PARK_POND_CIRCLE.y, PARK_POND_CIRCLE.r + 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a8a29e';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Crystal-Clear Turquoise Park Lake
  const pondGrad = ctx.createRadialGradient(
    PARK_POND_CIRCLE.x,
    PARK_POND_CIRCLE.y,
    12,
    PARK_POND_CIRCLE.x,
    PARK_POND_CIRCLE.y,
    PARK_POND_CIRCLE.r
  );
  pondGrad.addColorStop(0, '#67e8f9');
  pondGrad.addColorStop(0.45, '#06b6d4');
  pondGrad.addColorStop(0.82, '#0284c7');
  pondGrad.addColorStop(1, '#0369a1');
  ctx.fillStyle = pondGrad;
  ctx.beginPath();
  ctx.arc(PARK_POND_CIRCLE.x, PARK_POND_CIRCLE.y, PARK_POND_CIRCLE.r, 0, Math.PI * 2);
  ctx.fill();

  // Swimming Gold & Koi Fish
  for (let f = 0; f < 6; f++) {
    const fishAngle = timeSec * (0.45 + f * 0.1) + f * 1.2;
    const orbitR = 52 + (f % 2) * 52;
    const fx = PARK_POND_CIRCLE.x + Math.cos(fishAngle) * orbitR;
    const fy = PARK_POND_CIRCLE.y + Math.sin(fishAngle) * orbitR;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(fishAngle + Math.PI / 2);
    ctx.fillStyle = f % 2 === 0 ? '#f97316' : '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Central White Marble Fountain with Water Ripples
  const rippleR = 28 + ((timeSec * 22) % 26);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(PARK_POND_CIRCLE.x, PARK_POND_CIRCLE.y, rippleR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(PARK_POND_CIRCLE.x, PARK_POND_CIRCLE.y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(PARK_POND_CIRCLE.x, PARK_POND_CIRCLE.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 1.5;
  fillStrokeRoundedRect(ctx, PARK_POND_CIRCLE.x - 195, y + h - 40, 390, 26, 6, true, true);
  ctx.fillStyle = '#bbf7d0';
  ctx.font = '800 13px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('বাপের সিটি সেন্ট্রাল পার্ক ও লেক (রমনা পার্ক)', PARK_POND_CIRCLE.x, y + h - 22);
}

function drawDetailedRoads(ctx: CanvasRenderingContext2D, patterns: ProceduralPatterns | null) {
  // 1. Road Outer Concrete Shoulder & Dhaka Yellow-Black Curb
  for (const r of ROADS) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20);

    // Yellow & Dark-Slate Curb Stripes along road edges
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 18]);
    ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
    ctx.restore();
  }

  // 2. Realistic Gray Asphalt Tarmac Surface & Highway Road Markings
  for (const r of ROADS) {
    ctx.fillStyle = patterns?.asphalt || '#334155';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    ctx.save();
    if (r.orientation === 'horizontal') {
      const midY = r.y + r.h / 2;
      // Double Yellow Center Divider Line
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(r.x + 20, midY - 3);
      ctx.lineTo(r.x + r.w - 20, midY - 3);
      ctx.moveTo(r.x + 20, midY + 3);
      ctx.lineTo(r.x + r.w - 20, midY + 3);
      ctx.stroke();

      // White Dashed Lane Markings
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.78)';
      ctx.lineWidth = 2;
      ctx.setLineDash([22, 22]);
      ctx.beginPath();
      ctx.moveTo(r.x + 24, r.y + r.h * 0.25);
      ctx.lineTo(r.x + r.w - 24, r.y + r.h * 0.25);
      ctx.moveTo(r.x + 24, r.y + r.h * 0.75);
      ctx.lineTo(r.x + r.w - 24, r.y + r.h * 0.75);
      ctx.stroke();
    } else {
      const midX = r.x + r.w / 2;
      // Double Yellow Center Divider Line
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(midX - 3, r.y + 20);
      ctx.lineTo(midX - 3, r.y + r.h - 20);
      ctx.moveTo(midX + 3, r.y + 20);
      ctx.lineTo(midX + 3, r.y + r.h - 20);
      ctx.stroke();

      // White Dashed Lane Markings
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.78)';
      ctx.lineWidth = 2;
      ctx.setLineDash([22, 22]);
      ctx.beginPath();
      ctx.moveTo(r.x + r.w * 0.25, r.y + 24);
      ctx.lineTo(r.x + r.w * 0.25, r.y + r.h - 24);
      ctx.moveTo(r.x + r.w * 0.75, r.y + 24);
      ctx.lineTo(r.x + r.w * 0.75, r.y + r.h - 24);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Crisp White Pedestrian Zebra Crossings
  const zebraCrossings = [
    { x: 1320, y: 950, vertical: true },
    { x: 2540, y: 950, vertical: true },
    { x: 1320, y: 2015, vertical: true },
    { x: 2540, y: 2015, vertical: true },
  ];
  ctx.save();
  ctx.fillStyle = 'rgba(248, 250, 252, 0.82)';
  for (const zc of zebraCrossings) {
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(zc.x, zc.y + 8 + i * 20, 38, 11);
    }
  }
  ctx.restore();
}

function drawDetailedCharacter(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    angle: number;
    walkCycle: number;
    punchTimer: number;
    punchHand: 'left' | 'right';
    hitFlash: boolean;
    isPlayer: boolean;
    npc?: CommunityNPCState;
    isPrimaryChatTarget: boolean;
    timeSec: number;
  }
) {
  ctx.save();
  ctx.translate(opts.x, opts.y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 16, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  const auraColor = opts.isPlayer
    ? '#00f0ff'
    : opts.isPrimaryChatTarget
      ? '#10b981'
      : opts.npc?.primaryColor || '#ff2a85';

  ctx.strokeStyle = opts.isPrimaryChatTarget ? '#10b981' : auraColor + '66';
  ctx.lineWidth = opts.isPrimaryChatTarget ? 3 : 2;
  ctx.beginPath();
  ctx.arc(0, 0, 19 + Math.sin(opts.timeSec * 5) * 1.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.rotate(opts.angle);

  const isPunching = opts.punchTimer > 0;
  const punchSign = opts.punchHand === 'left' ? -1 : 1;
  const torsoTwist = isPunching ? punchSign * 0.26 : Math.sin(opts.walkCycle) * 0.08;

  if (isPunching) {
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(14, 0, 23, -0.85, 0.85);
    ctx.stroke();
  }

  const stride = Math.sin(opts.walkCycle) * 7.5;
  const shoeMain = opts.isPlayer ? '#e2e8f0' : '#18181b';
  const shoeStripe = opts.isPlayer ? '#00f0ff' : opts.npc?.secondaryColor || '#ff2a85';

  ctx.fillStyle = shoeMain;
  fillStrokeRoundedRect(ctx, stride - 4, -12, 10, 5.5, 2.5, true, false);
  ctx.fillStyle = shoeStripe;
  ctx.fillRect(stride + 2, -12, 3, 5.5);

  ctx.fillStyle = shoeMain;
  fillStrokeRoundedRect(ctx, -stride - 4, 6.5, 10, 5.5, 2.5, true, false);
  ctx.fillStyle = shoeStripe;
  ctx.fillRect(-stride + 2, 6.5, 3, 5.5);

  ctx.save();
  ctx.rotate(torsoTwist);

  const leftPunchExt = isPunching && opts.punchHand === 'left' ? 16 : 0;
  const rightPunchExt = isPunching && opts.punchHand === 'right' ? 16 : 0;
  const armSwing = Math.cos(opts.walkCycle) * 3.5;

  const sleeveColor = opts.hitFlash
    ? '#ffffff'
    : opts.isPlayer
      ? '#0891b2'
      : opts.npc?.primaryColor || '#881337';

  ctx.fillStyle = sleeveColor;
  fillStrokeRoundedRect(ctx, -3 + armSwing, -17, 12 + leftPunchExt * 0.6, 6, 3, true, false);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(10 + armSwing + leftPunchExt, -14, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = sleeveColor;
  fillStrokeRoundedRect(ctx, -3 - armSwing, 11, 12 + rightPunchExt * 0.6, 6, 3, true, false);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(10 - armSwing + rightPunchExt, 14, 3.5, 0, Math.PI * 2);
  ctx.fill();

  if (opts.isPlayer) {
    ctx.fillStyle = opts.hitFlash ? '#ffffff' : '#06b6d4';
    ctx.strokeStyle = '#0e7490';
    ctx.lineWidth = 1.5;
    fillStrokeRoundedRect(ctx, -11, -14, 21, 28, 8, true, true);
    ctx.fillStyle = '#ff2a85';
    fillStrokeRoundedRect(ctx, -4, -9, 13, 18, 3, true, false);
  } else if (opts.npc) {
    ctx.fillStyle = opts.hitFlash ? '#ffffff' : opts.npc.primaryColor;
    ctx.strokeStyle = opts.npc.secondaryColor;
    ctx.lineWidth = 1.5;
    fillStrokeRoundedRect(ctx, -11, -14, 21, 28, 8, true, true);
    ctx.fillStyle = opts.npc.secondaryColor;
    fillStrokeRoundedRect(ctx, -4, -9, 9, 18, 2, true, false);
  }

  ctx.fillStyle = opts.hitFlash ? '#ffffff' : '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(1, 0, 9, 8.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = opts.isPlayer ? '#0284c7' : opts.npc?.glassesColor || '#eab308';
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 0.8;
  fillStrokeRoundedRect(ctx, 6.5, -6.5, 3.5, 5.5, 1.2, true, true);
  fillStrokeRoundedRect(ctx, 6.5, 1, 3.5, 5.5, 1.2, true, true);

  ctx.fillStyle = opts.isPlayer ? '#0f172a' : opts.npc?.hairColor || '#1e1b4b';
  ctx.beginPath();
  ctx.arc(-1.5, 0, 8.3, Math.PI * 0.42, Math.PI * 1.58);
  ctx.closePath();
  ctx.fill();

  // Feminine Flowing Ponytail & Hair Accessory for Female Characters
  if (!opts.isPlayer && opts.npc?.isFemale) {
    const ponySway = Math.sin(opts.walkCycle * 0.8 + opts.timeSec * 3) * 2.2;
    ctx.fillStyle = opts.npc.hairColor || '#451a03';
    ctx.beginPath();
    ctx.ellipse(-10.5, ponySway, 5.5, 3.6, ponySway * 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Hair ribbon / scrunchy
    ctx.fillStyle = opts.npc.secondaryColor || '#f472b6';
    ctx.beginPath();
    ctx.arc(-6.8, ponySway * 0.3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

function drawNPCOverheadUI(
  ctx: CanvasRenderingContext2D,
  npc: CommunityNPCState,
  playerX: number,
  playerY: number,
  isTarget: boolean
) {
  const distToPlayer = Math.hypot(npc.x - playerX, npc.y - playerY);
  if (distToPlayer > 360) return;

  ctx.save();
  const baseX = npc.x;
  const baseY = npc.y - 25;

  if (npc.placardText && npc.behavior !== 'MOB_CHASE') {
    ctx.font = '700 7.5px Plus Jakarta Sans, sans-serif';
    const pw = Math.max(82, ctx.measureText(npc.placardText).width + 10);
    ctx.fillStyle = '#065f46';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    fillStrokeRoundedRect(ctx, baseX - pw / 2, baseY + 2, pw, 12, 3, true, true);
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText(`✊ ${npc.placardText}`, baseX, baseY + 10.5);
  }

  const badgeColor = isTarget
    ? '#10b981'
    : npc.behavior === 'AGGRO' ||
        npc.behavior === 'PURSUIT' ||
        npc.behavior === 'MOB_CHASE'
      ? '#f43f5e'
      : npc.role === 'CHANDABAJ'
        ? '#f97316'
        : npc.role === 'QUARRELER'
          ? '#ef4444'
          : npc.role === 'BEGGAR'
            ? '#eab308'
            : npc.secondaryColor;

  // Compact Mini Overhead Badge with Character Name + Wealth (৳) so player sees how rich everyone is!
  const npcMoney = npc.money ?? 5000;
  const moneyStr =
    npcMoney >= 100000
      ? `৳${(npcMoney / 100000).toFixed(1)}লাখ`
      : npcMoney >= 1000
        ? `৳${(npcMoney / 1000).toFixed(1)}K`
        : `৳${npcMoney}`;
  const emotionEmoji = npc.analysis.emotionEmoji || '🙂';
  const shortName = npc.bengaliName.split(' ')[0];
  const badgeLabel = `${emotionEmoji}${shortName} · ${moneyStr}`;

  ctx.font = '700 7.5px Plus Jakarta Sans, sans-serif';
  const barW = Math.max(84, Math.min(124, ctx.measureText(badgeLabel).width + 10));
  const barH = 3.2;
  ctx.fillStyle = 'rgba(9, 8, 18, 0.86)';
  ctx.strokeStyle = badgeColor;
  ctx.lineWidth = isTarget ? 1.5 : 0.9;
  fillStrokeRoundedRect(ctx, baseX - barW / 2 - 4, baseY - 14, barW + 8, 16, 4, true, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = isTarget ? '#34d399' : '#fef08a';
  ctx.fillText(badgeLabel, baseX, baseY - 5);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(baseX - barW / 2, baseY - 2.2, barW, barH);
  ctx.fillStyle = badgeColor;
  ctx.fillRect(baseX - barW / 2, baseY - 2.2, (Math.max(0, npc.hp) / npc.maxHp) * barW, barH);

  // Live Autonomous Thought Pill (নিজস্ব চিন্তাভাবনা ও সিদ্ধান্ত) when close to player
  if (npc.ownThought && distToPlayer <= 230) {
    ctx.font = '600 7px Plus Jakarta Sans, sans-serif';
    const thoughtShort =
      npc.ownThought.length > 38 ? npc.ownThought.slice(0, 38) + '…' : npc.ownThought;
    const tw = Math.max(88, ctx.measureText(thoughtShort).width + 10);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 0.9;
    fillStrokeRoundedRect(ctx, baseX - tw / 2, baseY - 27, tw, 11, 3, true, true);
    ctx.fillStyle = '#e9d5ff';
    ctx.textAlign = 'center';
    ctx.fillText(`💭 ${thoughtShort}`, baseX, baseY - 19);
  }

  // Compact Spoken Speech Bubble above Character ONLY when right around the player (<= MAX_VOICE_HEARING_DIST)
  const activeSpeakerId = sound.getActiveSpeakerId();
  const isCurrentlySpeaking = activeSpeakerId === npc.id;

  if (npc.speech && distToPlayer <= MAX_VOICE_HEARING_DIST) {
    ctx.font = '600 8.5px Plus Jakarta Sans, sans-serif';
    const maxBubbleW = 158;
    const prefix = isCurrentlySpeaking ? '🔊 ' : '';
    const fullSpeech = prefix + npc.speech;
    const words = fullSpeech.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(test).width > maxBubbleW - 14 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    const displayLines = lines.slice(0, 2);
    const bubbleW = Math.min(
      maxBubbleW,
      Math.max(76, ...displayLines.map((l) => ctx.measureText(l).width + 14))
    );
    const bubbleH = displayLines.length * 11 + 8;
    const bx = baseX - bubbleW / 2;
    const by = baseY - 17 - bubbleH;

    ctx.fillStyle = isCurrentlySpeaking ? 'rgba(15, 23, 42, 0.94)' : 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = isCurrentlySpeaking
      ? '#facc15'
      : npc.behavior === 'MOB_CHASE'
        ? '#f43f5e'
        : isTarget
          ? '#10b981'
          : '#38bdf8';
    ctx.lineWidth = isCurrentlySpeaking ? 1.6 : 1;
    fillStrokeRoundedRect(ctx, bx, by, bubbleW, bubbleH, 5, true, true);

    ctx.fillStyle = isCurrentlySpeaking ? '#fef08a' : '#f1f5f9';
    displayLines.forEach((line, idx) => {
      ctx.fillText(line, baseX, by + 11 + idx * 11);
    });
  }

  ctx.restore();
}

function drawHospitalPatientBed(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bedNum: number,
  hasPatient: boolean,
  blanketColor: string,
  timeSec: number
) {
  ctx.save();
  // Bed frame shadow & steel frame
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  fillStrokeRoundedRect(ctx, bx + 2, by + 3, 56, 30, 4, true, false);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  fillStrokeRoundedRect(ctx, bx, by, 56, 30, 4, true, true);

  // Headboard (left side)
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(bx, by, 5, 30);

  // Soft white pillow
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  fillStrokeRoundedRect(ctx, bx + 7, by + 5, 12, 20, 3, true, true);

  // Blanket covering lower 60% of bed
  ctx.fillStyle = blanketColor;
  fillStrokeRoundedRect(ctx, bx + 22, by + 3, 31, 24, 3, true, false);

  // Patient lying on the bed!
  if (hasPatient) {
    // Patient head on pillow
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(bx + 14, by + 15, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Patient hair
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(bx + 12.5, by + 15, 5.2, Math.PI * 0.45, Math.PI * 1.55);
    ctx.fill();
    // White forehead bandage on patient
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 12, by + 10.5, 3.5, 9);
  }

  // IV Saline Stand next to bed
  ctx.fillStyle = '#38bdf8';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(bx + 10, by - 5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bed number tag
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 7.5px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`বেড-${bedNum}`, bx + 38, by + 17);
  ctx.restore();
}

function drawEnterableBuildingInteriors(
  ctx: CanvasRenderingContext2D,
  w: WorldSimulationRef,
  timeSec: number
) {
  for (const b of BUILDINGS) {
    if (!b.enterable) continue;
    ctx.save();

    // 1. Exterior Drop Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);

    // 2. Interior Floor Base & Room-by-Room Cutaway Design (ভেতরের ছোট ছোট কোঠা)
    if (b.interiorType === 'HOSPITAL') {
      // Clinical Mint & White Tiled Floor
      ctx.fillStyle = '#ecfeff';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(13, 148, 136, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = b.x + 32; gx < b.x + b.w; gx += 32) {
        ctx.moveTo(gx, b.y);
        ctx.lineTo(gx, b.y + b.h);
      }
      for (let gy = b.y + 32; gy < b.y + b.h; gy += 32) {
        ctx.moveTo(b.x, gy);
        ctx.lineTo(b.x + b.w, gy);
      }
      ctx.stroke();

      const r1X = b.x + 230;
      const r2X = b.x + 430;
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(r1X, b.y + 12, 8, 95);
      ctx.fillRect(r1X, b.y + 195, 8, b.h - 207);
      ctx.fillRect(r2X, b.y + 12, 8, 95);
      ctx.fillRect(r2X, b.y + 195, 8, b.h - 207);

      ctx.fillStyle = '#ccfbf1';
      ctx.fillRect(b.x + 14, b.y + 14, 210, 90);
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(b.x + 22, b.y + 18, 140, 14);
      ctx.fillStyle = '#115e59';
      fillStrokeRoundedRect(ctx, b.x + 55, b.y + 125, 95, 36, 5, true, false);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(b.x + 96, b.y + 220, 24, 8);
      ctx.fillRect(b.x + 104, b.y + 212, 8, 24);
      ctx.fillStyle = '#0f766e';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('কোঠা ১: ডাক্তার চেম্বার ও ফার্মেসি', b.x + 118, b.y + 52);

      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(r1X + 10, b.y + 14, 186, 90);
      ctx.fillStyle = '#0284c7';
      fillStrokeRoundedRect(ctx, r1X + 35, b.y + 58, 130, 28, 5, true, false);
      ctx.fillStyle = '#0369a1';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.fillText('কোঠা ২: নার্স স্টেশন ও জরুরি সেবা', r1X + 100, b.y + 38);

      ctx.fillStyle = '#0f766e';
      ctx.font = '800 10px Plus Jakarta Sans, sans-serif';
      ctx.fillText('কোঠা ৩: রোগীদের ইনডোর বেড ওয়ার্ড (রোগী ও বেড)', r2X + 165, b.y + 28);

      drawHospitalPatientBed(ctx, r2X + 26, b.y + 46, 1, true, '#2dd4bf', timeSec);
      drawHospitalPatientBed(ctx, r2X + 126, b.y + 46, 2, true, '#38bdf8', timeSec);
      drawHospitalPatientBed(ctx, r2X + 226, b.y + 46, 3, false, '#2dd4bf', timeSec);
      drawHospitalPatientBed(ctx, r2X + 26, b.y + 235, 4, true, '#38bdf8', timeSec);
      drawHospitalPatientBed(ctx, r2X + 126, b.y + 235, 5, true, '#2dd4bf', timeSec);
      drawHospitalPatientBed(ctx, r2X + 226, b.y + 235, 6, true, '#38bdf8', timeSec);
    } else if (b.interiorType === 'SHOPPING_MALL') {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(217, 119, 6, 0.12)';
      for (let gx = b.x; gx < b.x + b.w; gx += 40) {
        for (let gy = b.y; gy < b.y + b.h; gy += 40) {
          if (((gx + gy) / 40) % 2 === 0) {
            ctx.fillRect(gx, gy, 40, 40);
          }
        }
      }

      const m1X = b.x + 250;
      const m2X = b.x + 510;
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(m1X, b.y + 12, 7, 65);
      ctx.fillRect(m2X, b.y + 12, 7, 65);

      const rackColors = ['#ec4899', '#8b5cf6', '#f43f5e', '#10b981'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = rackColors[i];
        fillStrokeRoundedRect(ctx, b.x + 28 + i * 50, b.y + 42, 38, 18, 4, true, false);
      }
      ctx.fillStyle = '#991b1b';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('কোঠা ১: শাড়ি ও পোশাক শোরুম', b.x + 125, b.y + 28);

      ctx.fillStyle = '#0284c7';
      fillStrokeRoundedRect(ctx, m1X + 30, b.y + 40, 90, 22, 4, true, false);
      fillStrokeRoundedRect(ctx, m1X + 140, b.y + 40, 90, 22, 4, true, false);
      ctx.fillStyle = '#7c2d12';
      ctx.fillText('কোঠা ২: ঘড়ি, চশমা ও মোবাইল শোরুম', m1X + 130, b.y + 28);

      ctx.fillStyle = '#b45309';
      fillStrokeRoundedRect(ctx, m2X + 40, b.y + 42, 160, 24, 5, true, false);
      ctx.fillStyle = '#78350f';
      ctx.fillText('কোঠা ৩: ক্যাশ কাউন্টার ও শপিং জোন', m2X + 120, b.y + 28);
    } else if (b.interiorType === 'KACHA_BAZAR') {
      ctx.fillStyle = '#ecfccb';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      const k1Y = b.y + 150;
      ctx.fillStyle = '#15803d';
      ctx.fillRect(b.x + 180, b.y + 12, 7, 100);
      ctx.fillRect(b.x + 180, k1Y, b.w - 192, 7);

      const vegColors = ['#16a34a', '#ef4444', '#eab308', '#9333ea', '#22c55e', '#f97316'];
      for (let i = 0; i < 6; i++) {
        const vx = b.x + 215 + (i % 3) * 82;
        const vy = b.y + 52 + Math.floor(i / 3) * 44;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(vx, vy, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = vegColors[i];
        ctx.beginPath();
        ctx.arc(vx, vy, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#14532d';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('কোঠা ১: তাজা শাক-সবজি ও ফলমূল', b.x + 330, b.y + 26);

      ctx.fillStyle = '#bae6fd';
      fillStrokeRoundedRect(ctx, b.x + 210, k1Y + 35, 115, 34, 5, true, false);
      fillStrokeRoundedRect(ctx, b.x + 345, k1Y + 35, 115, 34, 5, true, false);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(b.x + 250, k1Y + 52, 14, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(b.x + 285, k1Y + 52, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14532d';
      ctx.fillText('কোঠা ২: পদ্মার ইলিশ মাছ ও মাংসের আড়ত', b.x + 335, k1Y + 24);
    } else if (b.interiorType === 'POLICE_STATION') {
      // Police Station Floor & Iron-Barred Lockup Cell (থানা ও হাজতখানা)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Partition wall separating Duty Room and Lockup Cell
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(b.x + 245, b.y + 12, 8, 125);
      // Officer Duty Desk
      ctx.fillStyle = '#1d4ed8';
      fillStrokeRoundedRect(ctx, b.x + 55, b.y + 58, 130, 34, 5, true, false);
      // Lockup Cell Dark Floor
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(b.x + 253, b.y + 14, b.w - 267, 120);
      // Lockup Cell Horizontal & Vertical Iron Bars (লোহার শিক দেওয়া হাজতখানা)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(b.x + 253, b.y + 134);
      ctx.lineTo(b.x + b.w - 14, b.y + 134);
      ctx.stroke();
      for (let bx = b.x + 262; bx < b.x + b.w - 16; bx += 14) {
        ctx.beginPath();
        ctx.moveTo(bx, b.y + 122);
        ctx.lineTo(bx, b.y + 144);
        ctx.stroke();
      }
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('কোঠা ১: ওসি ও ডিউটি অফিসার কক্ষ', b.x + 125, b.y + 30);
      ctx.fillStyle = '#991b1b';
      ctx.fillText('কোঠা ২: থানা লকআপ / হাজতখানা (কয়েদি বন্দী)', b.x + 365, b.y + 30);
    } else if (b.interiorType === 'NIGHTCLUB') {
      // Nightclub Pulsing Neon Disco Floor & DJ Stage
      ctx.fillStyle = '#090418';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      const discoColors = ['#db2777', '#7c3aed', '#00f0ff', '#facc15', '#10b981'];
      const phase = Math.floor(timeSec * 4);
      for (let gx = b.x + 24; gx < b.x + b.w - 24; gx += 44) {
        for (let gy = b.y + 52; gy < b.y + b.h - 24; gy += 44) {
          const idx = Math.abs(Math.floor((gx + gy) / 44) + phase) % discoColors.length;
          ctx.fillStyle = discoColors[idx] + '55';
          ctx.fillRect(gx, gy, 40, 40);
        }
      }
      // DJ Stage & Turntable Console
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      fillStrokeRoundedRect(ctx, b.x + b.w / 2 - 85, b.y + 16, 170, 32, 6, true, true);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎧 ডিজে রকি ও মিলা নাইট ক্লাব ডিস্কো ফ্লোর 💃', b.x + b.w / 2, b.y + 36);
    } else if (b.interiorType === 'FOOTBALL_STADIUM') {
      // Football Stadium Lush Green Striped Turf Pitch
      ctx.fillStyle = '#15803d';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      for (let sx = b.x + 20; sx < b.x + b.w - 20; sx += 80) {
        ctx.fillStyle = 'rgba(134, 239, 172, 0.16)';
        ctx.fillRect(sx, b.y + 18, 40, b.h - 36);
      }

      const pLeft = b.x + 56;
      const pRight = b.x + b.w - 56;
      const pTop = b.y + 54;
      const pBot = b.y + b.h - 46;
      const pW = pRight - pLeft;
      const pH = pBot - pTop;
      const pMidX = (pLeft + pRight) / 2;
      const pMidY = (pTop + pBot) / 2;

      // White Pitch Lines, Center Circle & Penalty Boxes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(pLeft, pTop, pW, pH);
      ctx.beginPath();
      ctx.moveTo(pMidX, pTop);
      ctx.lineTo(pMidX, pBot);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pMidX, pMidY, 58, 0, Math.PI * 2);
      ctx.stroke();

      // Left & Right Penalty Boxes
      ctx.strokeRect(pLeft, pMidY - 105, 110, 210);
      ctx.strokeRect(pRight - 110, pMidY - 105, 110, 210);

      // Left & Right Goalposts (গোলপোস্ট)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.fillRect(pLeft - 24, pMidY - 68, 24, 136);
      ctx.strokeRect(pLeft - 24, pMidY - 68, 24, 136);
      ctx.fillRect(pRight, pMidY - 68, 24, 136);
      ctx.strokeRect(pRight, pMidY - 68, 24, 136);

      // Stadium Live Scoreboard at Top
      const ball = w.football;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      fillStrokeRoundedRect(ctx, pMidX - 185, b.y + 16, 370, 28, 6, true, true);
      ctx.fillStyle = '#fef08a';
      ctx.font = '800 10.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `⚽ বাপের সিটি একাদশ ${ball?.homeScore ?? 0} - ${ball?.awayScore ?? 0} স্ট্রাইকার্স (মাঠে ঢুকে গোল দিন!)`,
        pMidX,
        b.y + 34
      );

      // Draw the Live Moving Football on the Pitch!
      if (ball) {
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath();
        ctx.arc(2, 4, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (b.interiorType === 'HOTEL') {
      // Sultan's Kacchi Biryani & Residential Hotel Rooms
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(b.x + 250, b.y + 12, 8, b.h - 24);

      // Left Room: Shahi Kacchi Biryani Cauldrons (কাচ্চির ডেকচি) & Dining Tables
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(b.x + 65, b.y + 62, 20, 0, Math.PI * 2);
      ctx.arc(b.x + 115, b.y + 62, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      fillStrokeRoundedRect(ctx, b.x + 45, b.y + 115, 80, 32, 5, true, false);
      fillStrokeRoundedRect(ctx, b.x + 145, b.y + 115, 80, 32, 5, true, false);

      // Right Room: VIP Residential Hotel Beds
      drawHospitalPatientBed(ctx, b.x + 285, b.y + 58, 1, false, '#f59e0b', timeSec);
      drawHospitalPatientBed(ctx, b.x + 375, b.y + 58, 2, false, '#ec4899', timeSec);

      ctx.fillStyle = '#92400e';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('কোঠা ১: শাহী কাচ্চি বিরিয়ানি ও ডাইনিং হল', b.x + 125, b.y + 28);
      ctx.fillText('কোঠা ২: আবাসিক হোটেল ভিআইপি রুম', b.x + 365, b.y + 28);
    } else if (b.interiorType === 'MUDI_DOKAN') {
      // Bismillah Mudi Dokan & Grocery Wholesale Store
      ctx.fillStyle = '#f0fdf4';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Sacks of Rice, Lentils, Sugar & Oil Drums
      const sackColors = ['#d97706', '#eab308', '#ca8a04', '#65a30d', '#0284c7'];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = sackColors[i];
        fillStrokeRoundedRect(ctx, b.x + 35 + i * 82, b.y + 46, 62, 34, 6, true, false);
      }
      ctx.fillStyle = '#166534';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('কোঠা ১: চাল, ডাল, তেল, চিনি ও বিস্কুটের পাইকারি মুদি ভান্ডার', b.x + b.w / 2, b.y + 28);
    } else if (b.interiorType === 'OFFICE_COURT') {
      // High Courtroom & Corporate Secretariat Office with Active Desks & Judge's Bench
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#334155';
      ctx.fillRect(b.x + b.w / 2, b.y + 12, 8, b.h - 24);

      // Judge's Bench & Witness Stand (এজলাস ও কাঠগড়া)
      ctx.fillStyle = '#78350f';
      fillStrokeRoundedRect(ctx, b.x + 48, b.y + 44, 165, 34, 5, true, false);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(b.x + 115, b.y + 52, 28, 16); // Judge's Law Book & Gavel

      // Witness box
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(b.x + 75, b.y + 102, 110, 38);

      // Office Executive Computer Desks (কর্পোরেট অফিস ও কম্পিউটার ডেস্ক)
      const deskOffsets = [40, 175, 310];
      for (const dox of deskOffsets) {
        if (b.w / 2 + dox + 105 < b.w - 14) {
          ctx.fillStyle = '#1e3a8a';
          fillStrokeRoundedRect(ctx, b.x + b.w / 2 + dox, b.y + 50, 102, 30, 4, true, false);
          // Glowing Computer Monitor on Desk
          ctx.fillStyle = Math.floor(timeSec * 3 + dox) % 2 === 0 ? '#38bdf8' : '#22c55e';
          ctx.fillRect(b.x + b.w / 2 + dox + 22, b.y + 55, 24, 14);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(b.x + b.w / 2 + dox + 58, b.y + 56, 26, 16);
        }
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚖️ কোঠা ১: জজ কোর্ট এজলাস ও কাঠগড়া (শুনানি চলছে)', b.x + b.w * 0.25, b.y + 28);
      ctx.fillText('💻 কোঠা ২: সচিবালয় ও কর্পোরেট অফিস (ফাইল ও ব্যাংকিং কাজ)', b.x + b.w * 0.75, b.y + 28);
    } else if (b.interiorType === 'GARMENTS') {
      // Padma Textiles & Garments Factory Active Sewing & Cutting Floor
      ctx.fillStyle = '#f0fdfa';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Rows of Active Sewing Machine Tables & Fabric Rolls
      const stitchPulse = Math.sin(timeSec * 14) * 3;
      for (let gx = b.x + 48; gx < b.x + b.w - 110; gx += 135) {
        ctx.fillStyle = '#0f766e';
        fillStrokeRoundedRect(ctx, gx, b.y + 52, 108, 28, 4, true, false);
        // Animated Sewing Machine Head & Moving Cloth
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(gx + 14, b.y + 56, 18, 16);
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(gx + 34 + stitchPulse, b.y + 58, 22, 14);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(gx + 68 - stitchPulse, b.y + 58, 22, 14);

        // Second row of packing/inspection tables
        ctx.fillStyle = '#115e59';
        fillStrokeRoundedRect(ctx, gx, b.y + 118, 108, 24, 4, true, false);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(gx + 18, b.y + 122, 26, 14);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(gx + 58, b.y + 122, 26, 14);
      }
      ctx.fillStyle = '#115e59';
      ctx.font = '800 10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        '🧵 কোঠা ১ ও ২: গার্মেন্টস সেলাই মেশিন লাইন, কাটিং টেবিল ও এক্সপোর্ট গোডাউন (কাজ চলছে)',
        b.x + b.w / 2,
        b.y + 28
      );
    } else if (b.interiorType === 'PLAYER_HOME') {
      // মেইন ক্যারেক্টারের নির্দিষ্ট নিজস্ব ঘর (Main Character's Dedicated Own House / Villa)
      ctx.fillStyle = '#f0fdfa';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Decorative Golden & Teal Marble Carpet Floor
      ctx.fillStyle = 'rgba(20, 184, 166, 0.14)';
      for (let gx = b.x; gx < b.x + b.w; gx += 36) {
        for (let gy = b.y; gy < b.y + b.h; gy += 36) {
          if (((gx + gy) / 36) % 2 === 0) {
            ctx.fillRect(gx, gy, 36, 36);
          }
        }
      }

      // Room Partition Walls inside Player's Own Villa
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(b.x + 215, b.y + 12, 8, 125);
      ctx.fillRect(b.x + 430, b.y + 12, 8, 125);

      // Room 1: Royal Master Bedroom (আপনার শোবার ঘর ও রাজকীয় খাট)
      drawHospitalPatientBed(ctx, b.x + 65, b.y + 56, 1, false, '#06b6d4', timeSec);
      ctx.fillStyle = '#0f766e';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛏️ আপনার মাস্টার বেডরুম (বিশ্রামে 100% HP)', b.x + 112, b.y + 30);

      // Room 2: Personal Money Safe Vault & Study (আপনার টাকার সিন্দুক ও লকার)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      fillStrokeRoundedRect(ctx, b.x + 265, b.y + 48, 115, 42, 6, true, true);
      ctx.fillStyle = '#fde047';
      ctx.font = '800 9px JetBrains Mono, monospace';
      ctx.fillText('💰 ব্যক্তিগত সিন্দুক (VAULT)', b.x + 322, b.y + 73);
      ctx.fillStyle = '#0f766e';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.fillText('🔐 আপনার টাকার সিন্দুক ও স্টাডি রুম', b.x + 322, b.y + 30);

      // Room 3: VIP Living Lounge & Home Theater TV (আপনার ড্রয়িং রুম ও সোফা)
      ctx.fillStyle = '#0284c7';
      fillStrokeRoundedRect(ctx, b.x + 475, b.y + 54, 130, 32, 6, true, false);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(b.x + 500, b.y + 18, 80, 10); // Wall-mounted Big Screen TV
      ctx.fillStyle = '#0f766e';
      ctx.fillText('🛋️ আপনার ভিআইপি ড্রয়িং রুম', b.x + 540, b.y + 42);
    } else if (b.interiorType === 'RESIDENTIAL') {
      // Residential Apartment Rooms (ড্রয়িং রুম, বেডরুম ও ডাইনিং কোঠা)
      ctx.fillStyle = '#fef2f2';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(b.x + 260, b.y + 12, 8, 160);
      ctx.fillRect(b.x + 510, b.y + 12, 8, 160);
      // Bedroom beds & Living room sofa
      drawHospitalPatientBed(ctx, b.x + 60, b.y + 65, 1, false, '#f43f5e', timeSec);
      drawHospitalPatientBed(ctx, b.x + 320, b.y + 65, 2, false, '#8b5cf6', timeSec);
      ctx.fillStyle = '#ea580c';
      fillStrokeRoundedRect(ctx, b.x + 560, b.y + 65, 120, 32, 6, true, false);
      ctx.fillStyle = '#7c2d12';
      ctx.font = '800 9.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('কোঠা ১: শোবার ঘর (বেডরুম)', b.x + 130, b.y + 34);
      ctx.fillText('কোঠা ২: মাস্টার বেডরুম', b.x + 385, b.y + 34);
      ctx.fillText('কোঠা ৩: ড্রয়িং ও ডাইনিং রুম', b.x + 625, b.y + 34);
    }

    // 3. Outer Perimeter Walls with Open Doorways (দরজা খোলা যাতে ভেতরে ঢোকা যায়!)
    const wt = 12;
    const doorGap = 135;
    const midX = b.x + b.w / 2;
    const midY = b.y + b.h / 2;
    const botLeftW = Math.max(20, (b.w - doorGap) / 2);

    ctx.fillStyle = b.baseColor;
    // Top wall
    ctx.fillRect(b.x, b.y, b.w, wt);
    // Bottom wall with center doorway opening
    ctx.fillRect(b.x, b.y + b.h - wt, botLeftW, wt);
    ctx.fillRect(midX + doorGap / 2, b.y + b.h - wt, botLeftW, wt);

    // Entrance Doormat at Bottom Doorway
    ctx.fillStyle = '#fde047';
    ctx.fillRect(midX - doorGap / 2 + 8, b.y + b.h - wt - 4, doorGap - 16, wt + 8);
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 8.5px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚪 ভেতরে প্রবেশ পথ (ENTER)', midX, b.y + b.h - 3);

    // Left wall
    if (b.doorSide === 'left') {
      const sideTopH = Math.max(20, (b.h - doorGap) / 2);
      ctx.fillStyle = b.baseColor;
      ctx.fillRect(b.x, b.y, wt, sideTopH);
      ctx.fillRect(b.x, midY + doorGap / 2, wt, sideTopH);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(b.x - 4, midY - doorGap / 2 + 8, wt + 8, doorGap - 16);
    } else {
      ctx.fillStyle = b.baseColor;
      ctx.fillRect(b.x, b.y, wt, b.h);
    }

    // Right wall
    if (b.doorSide === 'right') {
      const sideTopH = Math.max(20, (b.h - doorGap) / 2);
      ctx.fillStyle = b.baseColor;
      ctx.fillRect(b.x + b.w - wt, b.y, wt, sideTopH);
      ctx.fillRect(b.x + b.w - wt, midY + doorGap / 2, wt, sideTopH);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(b.x + b.w - wt - 4, midY - doorGap / 2 + 8, wt + 8, doorGap - 16);
    } else {
      ctx.fillStyle = b.baseColor;
      ctx.fillRect(b.x + b.w - wt, b.y, wt, b.h);
    }

    ctx.restore();
  }
}

function draw25DBuildings(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  timeSec: number
) {
  for (const b of BUILDINGS) {
    // Enterable buildings have open-roof cutaway rooms; only draw their top-edge header banner!
    if (b.enterable) {
      ctx.save();
      ctx.font = '800 11px Plus Jakarta Sans, Outfit, sans-serif';
      const textWidth = ctx.measureText(b.name).width;
      const signW = Math.min(b.w - 20, Math.max(160, textWidth + 24));
      const signH = 22;
      const sx = b.x + b.w / 2 - signW / 2;
      const sy = b.y - 10;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = b.accentColor;
      ctx.lineWidth = 1.8;
      fillStrokeRoundedRect(ctx, sx, sy, signW, signH, 5, true, true);
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, sy + 14.5);
      ctx.restore();
      continue;
    }

    const centerX = b.x + b.w / 2;
    const centerY = b.y + b.h / 2;

    const factor = b.height3D * 0.00034;
    const offsetX = Math.max(-26, Math.min(26, (centerX - camX) * factor));
    const offsetY = Math.max(-26, Math.min(26, (centerY - camY) * factor));

    const roofX = b.x + offsetX;
    const roofY = b.y + offsetY;

    // 1. Soft Ambient Ground Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(b.x + 14, b.y + 16, b.w, b.h);

    // 2. 3D Building Facade Walls with Architectural Window Grids
    ctx.fillStyle = b.baseColor;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;

    if (offsetY > 0) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.w, b.y);
      ctx.lineTo(roofX + b.w, roofY);
      ctx.lineTo(roofX, roofY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Facade Windows along Top Wall
      ctx.fillStyle = '#bae6fd';
      for (let wx = b.x + 18; wx < b.x + b.w - 22; wx += 28) {
        ctx.fillRect(wx + offsetX * 0.4, b.y + offsetY * 0.3, 14, Math.max(4, offsetY * 0.45));
      }
    } else if (offsetY < 0) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.h);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.lineTo(roofX + b.w, roofY + b.h);
      ctx.lineTo(roofX, roofY + b.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Facade Windows along Bottom Wall
      ctx.fillStyle = '#bae6fd';
      for (let wx = b.x + 18; wx < b.x + b.w - 22; wx += 28) {
        ctx.fillRect(
          wx + offsetX * 0.4,
          roofY + b.h + Math.abs(offsetY) * 0.2,
          14,
          Math.max(4, Math.abs(offsetY) * 0.45)
        );
      }
    }

    if (offsetX > 0) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y + b.h);
      ctx.lineTo(roofX, roofY + b.h);
      ctx.lineTo(roofX, roofY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (offsetX < 0) {
      ctx.beginPath();
      ctx.moveTo(b.x + b.w, b.y);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.lineTo(roofX + b.w, roofY + b.h);
      ctx.lineTo(roofX + b.w, roofY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 3. Realistic Building Rooftop Concrete / Terracotta Slab & Parapet Wall
    ctx.fillStyle = b.roofColor;
    ctx.fillRect(roofX, roofY, b.w, b.h);
    ctx.strokeStyle = b.neonColor;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(roofX, roofY, b.w, b.h);

    // Inner Rooftop Terrace & Skylight / Garden Inset
    const inset = 18;
    ctx.fillStyle = b.accentColor + '33';
    ctx.fillRect(roofX + inset, roofY + inset, b.w - inset * 2, b.h - inset * 2);
    ctx.strokeStyle = b.baseColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(roofX + inset, roofY + inset, b.w - inset * 2, b.h - inset * 2);

    // Architectural Rooftop Tile Grid Lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = roofX + inset + 36; gx < roofX + b.w - inset; gx += 36) {
      ctx.moveTo(gx, roofY + inset);
      ctx.lineTo(gx, roofY + b.h - inset);
    }
    for (let gy = roofY + inset + 36; gy < roofY + b.h - inset; gy += 36) {
      ctx.moveTo(roofX + inset, gy);
      ctx.lineTo(roofX + b.w - inset, gy);
    }
    ctx.stroke();

    // 4. Authentic Dhaka Rooftop Details: Blue Water Tank (গাজী ট্যাংক), Solar Panels, Rooftop Greenery
    const hvacX = roofX + 36;
    const hvacY = roofY + 36;
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.fillRect(hvacX - 13, hvacY - 13, 26, 26);
    ctx.strokeRect(hvacX - 13, hvacY - 13, 26, 26);
    ctx.save();
    ctx.translate(hvacX, hvacY);
    ctx.rotate(timeSec * 3.5);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(9, 0);
    ctx.moveTo(0, -9);
    ctx.lineTo(0, 9);
    ctx.stroke();
    ctx.restore();

    const tankX = roofX + b.w - 42;
    const tankY = roofY + 38;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.arc(tankX + 3, tankY + 3, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tankX, tankY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.arc(tankX, tankY, 5, 0, Math.PI * 2);
    ctx.fill();

    if (b.w >= 260 && b.h >= 190) {
      const spX = roofX + 26;
      const spY = roofY + b.h - 54;
      ctx.fillStyle = '#1e3a8a';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.2;
      ctx.fillRect(spX, spY, 48, 26);
      ctx.strokeRect(spX, spY, 48, 26);
      ctx.beginPath();
      ctx.moveTo(spX + 16, spY);
      ctx.lineTo(spX + 16, spY + 26);
      ctx.moveTo(spX + 32, spY);
      ctx.lineTo(spX + 32, spY + 26);
      ctx.moveTo(spX, spY + 13);
      ctx.lineTo(spX + 48, spY + 13);
      ctx.stroke();

      const gdX = roofX + b.w - 78;
      const gdY = roofY + b.h - 54;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(gdX, gdY, 50, 26);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(gdX + 14, gdY + 13, 9, 0, Math.PI * 2);
      ctx.arc(gdX + 26, gdY + 11, 10, 0, Math.PI * 2);
      ctx.arc(gdX + 38, gdY + 14, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Auto-Sized Architectural Building Signboard
    ctx.font = '800 11.5px Plus Jakarta Sans, Outfit, sans-serif';
    const textWidth = ctx.measureText(b.name).width;
    const signW = Math.min(b.w - 16, Math.max(155, textWidth + 24));
    const signH = 28;
    const sx = roofX + b.w / 2 - signW / 2;
    const sy = roofY + b.h / 2 - signH / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = b.neonColor;
    ctx.lineWidth = 2;
    fillStrokeRoundedRect(ctx, sx, sy, signW, signH, 6, true, true);

    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, roofX + b.w / 2, roofY + b.h / 2 + 4);
  }
}

function drawDetailedPalmTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  seed: number,
  timeSec: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const sway = Math.sin(timeSec * 1.7 + seed) * 0.065;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.arc(8, 10, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(sway);

  const frondCount = 8;
  for (let i = 0; i < frondCount; i++) {
    const a = (i / frondCount) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#059669';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(15, -8, 29, 0);
    ctx.quadraticCurveTo(15, 8, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRadarMinimap(
  ctx: CanvasRenderingContext2D,
  w: WorldSimulationRef,
  viewW: number,
  viewH: number
) {
  const isCompactMobile = viewH < 480 || viewW < 760;
  const mapW = isCompactMobile ? 96 : 154;
  const mapH = isCompactMobile ? 72 : 116;
  const padX = isCompactMobile ? 8 : 14;
  const padY = isCompactMobile ? 46 : 66;
  const scaleX = mapW / WORLD_WIDTH;
  const scaleY = mapH / WORLD_HEIGHT;

  ctx.save();
  ctx.translate(padX, padY);

  ctx.fillStyle = 'rgba(9, 8, 18, 0.92)';
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  fillStrokeRoundedRect(ctx, 0, 0, mapW, mapH, 8, true, true);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.fillRect(3480 * scaleX, 100 * scaleY, 440 * scaleX, 3000 * scaleY);

  ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.fillRect(
    CENTRAL_PARK_RECT.x * scaleX,
    CENTRAL_PARK_RECT.y * scaleY,
    CENTRAL_PARK_RECT.w * scaleX,
    CENTRAL_PARK_RECT.h * scaleY
  );

  // 4-Sided Perimeter Railway Loop on Minimap
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(
    TRAIN_LOOP_RECT.leftX * scaleX,
    TRAIN_LOOP_RECT.topY * scaleY,
    (TRAIN_LOOP_RECT.rightX - TRAIN_LOOP_RECT.leftX) * scaleX,
    (TRAIN_LOOP_RECT.bottomY - TRAIN_LOOP_RECT.topY) * scaleY
  );

  // Moving Train Blip on Minimap
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(w.train.x * scaleX - 4, w.train.y * scaleY - 4, 8, 8);

  // Player's Own Home Highlight on Minimap
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(
    PLAYER_HOME_RECT.x * scaleX,
    PLAYER_HOME_RECT.y * scaleY,
    PLAYER_HOME_RECT.w * scaleX,
    PLAYER_HOME_RECT.h * scaleY
  );

  ctx.fillStyle = '#334155';
  for (const b of BUILDINGS) {
    ctx.fillRect(b.x * scaleX, b.y * scaleY, b.w * scaleX, b.h * scaleY);
  }

  for (const v of w.vehicles) {
    ctx.fillStyle = v.id === 'car-police' && v.sirenOn ? '#ef4444' : '#facc15';
    ctx.fillRect(v.x * scaleX - 2, v.y * scaleY - 2, 4, 4);
  }

  for (const npc of w.npcs) {
    if (npc.hp > 0) {
      ctx.fillStyle = npc.id === 'viper' ? '#ff2a85' : npc.secondaryColor;
      ctx.beginPath();
      ctx.arc(npc.x * scaleX, npc.y * scaleY, npc.id === 'viper' ? 3.5 : 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player Hearing Radius Ring on Minimap + Player Blip
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.38)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(
    w.player.x * scaleX,
    w.player.y * scaleY,
    MAX_VOICE_HEARING_DIST * scaleX,
    0,
    Math.PI * 2
  );
  ctx.stroke();

  ctx.fillStyle = '#00f0ff';
  ctx.beginPath();
  ctx.arc(w.player.x * scaleX, w.player.y * scaleY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
