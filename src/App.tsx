import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CarFront,
  Swords,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Heart,
  Navigation,
  Sparkles,
  TrainFront,
  Store,
  Cpu,
  Users,
  Radio,
  Megaphone,
  AlertTriangle,
  Smartphone,
  Award,
  MessageSquare,
  UserPlus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import type {
  GameState,
  WorldSimulationRef,
  ChatMessage,
  CommunityNPCState,
  VehicleState,
} from './types/game';
import { Canvas2DWorld } from './components/Canvas2DWorld';
import { MAX_VOICE_HEARING_DIST, sound } from './utils/sound';
import { TRAIN_TRACK_Y, resolveCircleBuildingCollision } from './data/cityMap';
import {
  MICHIL_SLOGANS,
  NPC_DIALOGUE_BANKS,
  createInitialCommunityNPCs,
  createInitialVehicles,
  generateLocalConversationReply,
  pickRandomLine,
  triggerCommunityCrimeReaction,
  updateLocalNPCAnalysis,
} from './data/localNpcs';

const createInitialWorld = (): WorldSimulationRef => ({
  player: {
    x: 2185,
    y: 825,
    vx: 0,
    vy: 0,
    angle: Math.PI / 2,
    hp: 100,
    maxHp: 100,
    inVehicleId: null,
    inVehicleSeat: null,
    inTrain: false,
    punchTimer: 0,
    punchHand: 'right',
    punchCooldown: 0,
    hitFlashTimer: 0,
    walkCycle: 0,
    score: 0,
    popularity: 65,
    money: 2500,
    isRunning: false,
  },
  vehicles: createInitialVehicles(),
  npcs: createInitialCommunityNPCs(),
  train: {
    x: 1650,
    y: 660,
    trackY: 660,
    angle: 0,
    legIndex: 0,
    currentStationName: 'কমলাপুর উত্তর স্টেশন',
    passengerNpcIds: [],
    speed: 310,
    direction: 1,
    numCoaches: 4,
    hornCooldown: 2,
    stationStopTimer: 0,
    chugCooldown: 0,
  },
  football: {
    x: 3970,
    y: 1400,
    vx: 0,
    vy: 0,
    homeScore: 1,
    awayScore: 1,
    lastTouchedBy: 'জামাল ভূঁইয়া',
    goalCelebrationTimer: 0,
  },
  activeCrimeNpcId: 'bicho_chora',
  crimeTimer: 0,
  particles: [],
  skidMarks: [],
  floatingDamages: [],
  camera: {
    x: 2185,
    y: 825,
    shake: 0,
    angleLevel: 1,
    zoom: 1.0,
  },
  hitstopTimer: 0,
  mobAlertTimer: 0,
  activeMichilSlogan: MICHIL_SLOGANS[0],
  keys: {},
  joystick: {
    active: false,
    dx: 0,
    dy: 0,
  },
  nearestVehicleId: null,
  nearestVehicleDist: Infinity,
  nearestNpcId: 'kader_bus',
  nearestNpcDist: 110,
  nearbyNpcIds: ['kader_bus', 'jalil_rickshaw', 'neta'],
  canBoardTrain: false,
});

export default function App() {
  const worldRef = useRef<WorldSimulationRef>(createInitialWorld());

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [endReason, setEndReason] = useState<string>('');
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Exact container dimensions so rotated landscape never clips on mobile preview frames
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 450,
  }));

  const isPortraitScreen = containerSize.h > containerSize.w;
  const [forceLandscapeOnPortrait, setForceLandscapeOnPortrait] = useState<boolean>(true);
  const isRotatedLandscape = isPortraitScreen && forceLandscapeOnPortrait;

  // HUD Snapshot State
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [popularity, setPopularity] = useState<number>(65);
  const [playerMoney, setPlayerMoney] = useState<number>(2500);
  const [mobAlertSeconds, setMobAlertSeconds] = useState<number>(0);
  const [mobChasersCount, setMobChasersCount] = useState<number>(0);
  const [inVehicle, setInVehicle] = useState<VehicleState | null>(null);
  const [inVehicleSeat, setInVehicleSeat] = useState<'driver' | 'passenger' | null>(null);
  const [inTrain, setInTrain] = useState<boolean>(false);
  const [canBoardTrain, setCanBoardTrain] = useState<boolean>(false);
  const [nearestVehicle, setNearestVehicle] = useState<VehicleState | null>(null);
  const [targetNpc, setTargetNpc] = useState<CommunityNPCState | null>(null);
  const [nearbyClusterNpcs, setNearbyClusterNpcs] = useState<CommunityNPCState[]>([]);
  const [aliveNpcCount, setAliveNpcCount] = useState<number>(15);
  const [trainStatus, setTrainStatus] = useState<string>('বাপের সিটি এক্সপ্রেস চলছে');
  const [communityBannerText, setCommunityBannerText] = useState<string>(
    'বাপের সিটিতে স্বাগতম! আশপাশে থাকা মানুষের কথা ও আওয়াজ শুনুন, আর বাটন চেপে আরামে গাড়ি, বাস, রিকশা ও বাইক চালান!'
  );
  // Default chat drawer closed on compact mobile screens so bottom controls never get crowded
  const [chatDrawerOpen, setChatDrawerOpen] = useState<boolean>(false);
  const [missionDrawerOpen, setMissionDrawerOpen] = useState<boolean>(false);
  const [isRunningMode, setIsRunningMode] = useState<boolean>(false);
  const [cameraAngleLevel, setCameraAngleLevel] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [currentInteriorZone, setCurrentInteriorZone] = useState<
    | 'PLAYER_HOME'
    | 'GARMENTS'
    | 'OFFICE_COURT'
    | 'SHOPPING_MALL'
    | 'KACHA_BAZAR'
    | 'HOSPITAL'
    | 'NIGHTCLUB'
    | 'FOOTBALL_STADIUM'
    | 'HOTEL'
    | 'MUDI_DOKAN'
    | null
  >('PLAYER_HOME');

  // মেইন ক্যারেক্টারের মিশন লিস্ট (Main Character Missions)
  const [missions, setMissions] = useState([
    { id: 'catch_chandabaj', title: 'অপরাধী/চাঁদাবাজ ধরে পুলিশ পুরস্কার পাওয়া', done: false },
    { id: 'join_michil', title: 'মিছিলে যোগ দিয়ে স্লোগান দেওয়া', done: false },
    { id: 'shop_bazar_mall', title: 'বাজার, শপিং মল বা মুদি দোকানে কেনাকাটা', done: false },
    { id: 'nightclub_football', title: 'নাইট ক্লাবে নাচ বা স্টেডিয়ামে ফুটবল খেলা', done: false },
    { id: 'visit_hospital', title: 'হাসপাতাল বা হোটেলে সেবা গ্রহণ করা', done: false },
  ]);

  const completeMission = useCallback((missionId: string) => {
    setMissions((prev) =>
      prev.map((m) => (m.id === missionId && !m.done ? { ...m, done: true } : m))
    );
  }, []);

  // Active state for dedicated on-screen vehicle driving buttons
  const [driveBtnState, setDriveBtnState] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  // Chat UI State
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome-baper-city',
      senderId: 'kader_bus',
      senderName: 'কাদের ভাই (বাস কন্ডাক্টর)',
      isPlayer: false,
      text: 'বাপের সিটিতে স্বাগতম ভাই! এই গুলশান, শাহবাগ, যাত্রাবাড়ী! গাড়িতে উঠলে সামনে-পিছনে ও ডানে-বামে যাওয়ার বাটন দিয়ে খুব সহজে গাড়ি চালাতে পারবেন!',
      mood: 'Friendly',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Joystick direct DOM refs for on-foot walking control
  const joystickZoneRef = useRef<HTMLDivElement | null>(null);
  const joystickKnobRef = useRef<HTMLDivElement | null>(null);
  const activeJoystickPointerId = useRef<number | null>(null);

  useEffect(() => {
    const updateSize = () => {
      const el = viewportRef.current;
      if (el && el.clientWidth > 0 && el.clientHeight > 0) {
        setContainerSize({ w: el.clientWidth, h: el.clientHeight });
      } else {
        setContainerSize({ w: window.innerWidth, h: window.innerHeight });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && viewportRef.current) {
      ro = new ResizeObserver(updateSize);
      ro.observe(viewportRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateSize);
      ro?.disconnect();
    };
  }, []);

  const clearDrivingKeys = useCallback(() => {
    const k = worldRef.current.keys;
    k['ArrowUp'] = false;
    k['ArrowDown'] = false;
    k['ArrowLeft'] = false;
    k['ArrowRight'] = false;
    setDriveBtnState({ forward: false, backward: false, left: false, right: false });
  }, []);

  const setDrivingDirection = useCallback(
    (dir: 'forward' | 'backward' | 'left' | 'right', active: boolean) => {
      const k = worldRef.current.keys;
      if (dir === 'forward') k['ArrowUp'] = active;
      if (dir === 'backward') k['ArrowDown'] = active;
      if (dir === 'left') k['ArrowLeft'] = active;
      if (dir === 'right') k['ArrowRight'] = active;
      setDriveBtnState((prev) =>
        prev[dir] === active ? prev : { ...prev, [dir]: active }
      );
    },
    []
  );

  // Toggle between Normal Walk Mode (নরমাল হাঁটা) and Fast Run Mode (দ্রুত দৌড়)
  const handleToggleRunMode = useCallback(() => {
    setIsRunningMode((prev) => {
      const next = !prev;
      worldRef.current.player.isRunning = next;
      setCommunityBannerText(
        next
          ? '🏃 রান মোড চালু হয়েছে! এখন জয়স্টিক দিয়ে দ্রুত দৌড়াতে পারবেন।'
          : '🚶 নরমাল হাঁটা মোড চালু হয়েছে! এখন জয়স্টিক দিয়ে স্বাভাবিকভাবে হাঁটতে পারবেন।'
      );
      return next;
    });
  }, []);

  // Set or Cycle 5 Camera Angles (১ থেকে ৫ পর্যন্ত উপর থেকে ম্যাপ দেখার ভিউ মোড)
  const handleSetCameraAngle = useCallback((level: 1 | 2 | 3 | 4 | 5) => {
    setCameraAngleLevel(level);
    worldRef.current.camera.angleLevel = level;
    const labels: Record<1 | 2 | 3 | 4 | 5, string> = {
      1: '🎥 ক্যামেরা অ্যাঙ্গেল ১/৫: জেনারেল ভিউ (সাধারণ ক্লোজ ভিউ)',
      2: '🎥 ক্যামেরা অ্যাঙ্গেল ২/৫: মিডিয়াম ভিউ (একটু উপর থেকে ম্যাপ দেখা যাচ্ছে)',
      3: '🎥 ক্যামেরা অ্যাঙ্গেল ৩/৫: ড্রোন ভিউ (মাঝারি উচ্চতা থেকে শহর দেখা যাচ্ছে)',
      4: '🎥 ক্যামেরা অ্যাঙ্গেল ৪/৫: হাই ভিউ (অনেক উপর থেকে বড় এলাকা দেখা যাচ্ছে)',
      5: '🎥 ক্যামেরা অ্যাঙ্গেল ৫/৫: ফুল ম্যাপ ভিউ (সবচেয়ে উপর থেকে চারপাশ দেখা যাচ্ছে)',
    };
    setCommunityBannerText(labels[level]);
  }, []);

  const handleCycleCameraAngle = useCallback(() => {
    setCameraAngleLevel((prev) => {
      const next = ((prev % 5) + 1) as 1 | 2 | 3 | 4 | 5;
      worldRef.current.camera.angleLevel = next;
      const labels: Record<1 | 2 | 3 | 4 | 5, string> = {
        1: '🎥 ক্যামেরা অ্যাঙ্গেল ১/৫: জেনারেল ভিউ (সাধারণ ক্লোজ ভিউ)',
        2: '🎥 ক্যামেরা অ্যাঙ্গেল ২/৫: মিডিয়াম ভিউ (একটু উপর থেকে ম্যাপ দেখা যাচ্ছে)',
        3: '🎥 ক্যামেরা অ্যাঙ্গেল ৩/৫: ড্রোন ভিউ (মাঝারি উচ্চতা থেকে শহর দেখা যাচ্ছে)',
        4: '🎥 ক্যামেরা অ্যাঙ্গেল ৪/৫: হাই ভিউ (অনেক উপর থেকে বড় এলাকা দেখা যাচ্ছে)',
        5: '🎥 ক্যামেরা অ্যাঙ্গেল ৫/৫: ফুল ম্যাপ ভিউ (সবচেয়ে উপর থেকে চারপাশ দেখা যাচ্ছে)',
      };
      setCommunityBannerText(labels[next]);
      return next;
    });
  }, []);

  const syncHudFromWorld = useCallback(() => {
    const w = worldRef.current;
    const px = w.player.x;
    const py = w.player.y;
    setPlayerHp(Math.round(w.player.hp));
    setPopularity(Math.round(w.player.popularity || 50));
    setPlayerMoney(Math.round(w.player.money ?? 2500));
    setMobAlertSeconds(Math.ceil(w.mobAlertTimer || 0));

    if (px >= 1850 && px <= 2520 && py >= 700 && py <= 915) {
      setCurrentInteriorZone('PLAYER_HOME');
    } else if (
      (px >= 3490 && px <= 4450 && py >= 115 && py <= 355) ||
      (px >= 3490 && px <= 4450 && py >= 2910 && py <= 3410)
    ) {
      setCurrentInteriorZone('GARMENTS');
    } else if (
      (px >= 1950 && px <= 2530 && py >= 115 && py <= 355) ||
      (px >= 3490 && px <= 4450 && py >= 700 && py <= 915)
    ) {
      setCurrentInteriorZone('OFFICE_COURT');
    } else if (px >= 350 && px <= 1130 && py >= 700 && py <= 925) {
      setCurrentInteriorZone('SHOPPING_MALL');
    } else if (px >= 2740 && px <= 3260 && py >= 1130 && py <= 1460) {
      setCurrentInteriorZone('KACHA_BAZAR');
    } else if (px >= 350 && px <= 1140 && py >= 1660 && py <= 2000) {
      setCurrentInteriorZone('HOSPITAL');
    } else if (
      (px >= 1370 && px <= 1910 && py >= 115 && py <= 355) ||
      (px >= 2750 && px <= 3260 && py >= 2910 && py <= 3410)
    ) {
      setCurrentInteriorZone('NIGHTCLUB');
    } else if (px >= 3490 && px <= 4450 && py >= 1130 && py <= 1670) {
      setCurrentInteriorZone('FOOTBALL_STADIUM');
    } else if (
      (px >= 2750 && px <= 3260 && py >= 115 && py <= 355) ||
      (px >= 350 && px <= 1130 && py >= 2910 && py <= 3410)
    ) {
      setCurrentInteriorZone('HOTEL');
    } else if (
      (px >= 2750 && px <= 3260 && py >= 700 && py <= 915) ||
      (px >= 1370 && px <= 1910 && py >= 2910 && py >= 3410)
    ) {
      setCurrentInteriorZone('MUDI_DOKAN');
    } else {
      setCurrentInteriorZone(null);
    }

    const chasers = w.npcs.filter(
      (n) =>
        n.hp > 0 &&
        (n.behavior === 'MOB_CHASE' || n.behavior === 'PURSUIT' || n.behavior === 'AGGRO')
    ).length;
    setMobChasersCount(chasers);

    const currentCar = w.player.inVehicleId
      ? w.vehicles.find((v) => v.id === w.player.inVehicleId) || null
      : null;
    setInVehicle(currentCar ? { ...currentCar } : null);
    setInVehicleSeat(w.player.inVehicleSeat);
    setInTrain(Boolean(w.player.inTrain));
    setCanBoardTrain(Boolean(w.canBoardTrain));

    const nearCar =
      w.nearestVehicleId && w.nearestVehicleDist <= 130
        ? w.vehicles.find((v) => v.id === w.nearestVehicleId) || null
        : null;
    setNearestVehicle(nearCar ? { ...nearCar } : null);

    // Only focus on targetNpc if within reasonable range
    const focusedNpc =
      w.nearestNpcId && w.nearestNpcDist <= MAX_VOICE_HEARING_DIST + 60
        ? w.npcs.find((n) => n.id === w.nearestNpcId) || null
        : null;
    setTargetNpc(focusedNpc ? { ...focusedNpc, analysis: { ...focusedNpc.analysis } } : null);

    const cluster = w.nearbyNpcIds
      .map((id) => w.npcs.find((n) => n.id === id))
      .filter((n): n is CommunityNPCState => Boolean(n && n.hp > 0));
    setNearbyClusterNpcs(cluster.map((n) => ({ ...n, analysis: { ...n.analysis } })));

    setAliveNpcCount(w.npcs.filter((n) => n.hp > 0).length);
    setTrainStatus(
      w.player.inTrain
        ? 'আপনি ট্রেনে ভ্রমণ করছেন!'
        : w.train.stationStopTimer > 0
          ? `স্টেশনে থেমেছে (${Math.ceil(w.train.stationStopTimer)}s)`
          : 'বাপের সিটি এক্সপ্রেস চলছে'
    );
  }, []);

  const resetJoystickState = useCallback(() => {
    activeJoystickPointerId.current = null;
    worldRef.current.joystick.active = false;
    worldRef.current.joystick.dx = 0;
    worldRef.current.joystick.dy = 0;
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
    }
  }, []);

  const updateJoystickFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const zone = joystickZoneRef.current;
      if (!zone) return;

      const rect = zone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const maxRadius = Math.min(rect.width, rect.height) * 0.42;

      const screenDx = clientX - centerX;
      const screenDy = clientY - centerY;

      const rawDx = isRotatedLandscape ? screenDy : screenDx;
      const rawDy = isRotatedLandscape ? -screenDx : screenDy;

      const dist = Math.hypot(rawDx, rawDy);
      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(rawDy, rawDx);

      const offsetX = Math.cos(angle) * clampedDist;
      const offsetY = Math.sin(angle) * clampedDist;

      worldRef.current.joystick.active = true;
      worldRef.current.joystick.dx = maxRadius > 0 ? offsetX / maxRadius : 0;
      worldRef.current.joystick.dy = maxRadius > 0 ? offsetY / maxRadius : 0;

      if (joystickKnobRef.current) {
        joystickKnobRef.current.style.transform = `translate3d(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px, 0px)`;
      }
    },
    [isRotatedLandscape]
  );

  // Player Melee Attack / Vehicle Horn or Bell / Police Siren Toggle
  const handlePlayerAttack = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const w = worldRef.current;
    const p = w.player;

    if (p.inTrain) {
      sound.playTrainHorn?.(0);
      return;
    }

    if (p.inVehicleId) {
      const currentCar = w.vehicles.find((v) => v.id === p.inVehicleId);
      if (currentCar?.type === 'RICKSHAW') {
        sound.playRickshawBell?.(0);
      } else if (currentCar?.type === 'POLICE_CRUISER') {
        currentCar.sirenOn = !currentCar.sirenOn;
        sound.playPoliceSiren?.(0);
      } else {
        sound.playCarHorn?.(1, 0);
      }

      for (const npc of w.npcs) {
        if (npc.hp <= 0 || npc.drivingVehicleId || npc.ridingVehicleId) continue;
        const d = Math.hypot(npc.x - p.x, npc.y - p.y);
        if (d <= MAX_VOICE_HEARING_DIST && npc.speechTimer <= 0) {
          const bank = NPC_DIALOGUE_BANKS[npc.id];
          if (!bank) continue;

          npc.speech = pickRandomLine(bank.carReact);
          npc.speechTimer = 4.2;
          sound.speakCharacterLine?.({
            npcId: npc.id,
            text: npc.speech,
            pitch: npc.voicePitch,
            rate: npc.voiceRate,
            distanceToPlayer: d,
            forceImmediate: false,
          });
          break;
        }
      }
      return;
    }

    if (p.punchCooldown > 0) return;
    p.punchCooldown = 0.35;
    p.punchTimer = 0.22;
    p.punchHand = p.punchHand === 'right' ? 'left' : 'right';
    sound.playPunchSwing?.(0);

    const punchReach = 76;
    const hitX = p.x + Math.cos(p.angle) * 34;
    const hitY = p.y + Math.sin(p.angle) * 34;

    // Power-kick the Football if player presses Attack near the Football in the Stadium!
    if (w.football) {
      const distBall = Math.hypot(w.football.x - p.x, w.football.y - p.y);
      if (distBall <= 88) {
        const kickAng = Math.atan2(w.football.y - p.y, w.football.x - p.x);
        w.football.vx = Math.cos(kickAng) * 620;
        w.football.vy = Math.sin(kickAng) * 620;
        w.football.lastTouchedBy = 'আপনি (Player)';
        sound.playHitImpact?.(false, 0);
        completeMission('nightclub_football');
        w.floatingDamages.push({
          id: Date.now() + Math.random(),
          x: w.football.x,
          y: w.football.y - 30,
          text: '⚽ পাওয়ার শট!',
          color: '#fde047',
          life: 0.9,
        });
      }
    }

    let hitSomeone = false;

    for (const npc of w.npcs) {
      if (npc.hp <= 0 || npc.drivingVehicleId || npc.ridingVehicleId || npc.inTrain) continue;
      const distToNpc = Math.hypot(npc.x - hitX, npc.y - hitY);
      if (distToNpc <= punchReach) {
        hitSomeone = true;
        const dmg = 20 + Math.floor(Math.random() * 8);
        npc.hp = Math.max(0, npc.hp - dmg);
        npc.hitFlashTimer = 0.22;
        npc.timesAttackedByPlayer += 1;
        npc.vx += Math.cos(p.angle) * 310;
        npc.vy += Math.sin(p.angle) * 310;

        sound.playHitImpact?.(false, 0);
        w.camera.shake = 8;

        // Loot Money from the character based on how rich they are!
        const currentNpcMoney = npc.money ?? 5000;
        const lootFraction = npc.hp <= 0 ? 0.25 : 0.08;
        const lootedMoney = Math.max(
          20,
          Math.min(currentNpcMoney, Math.round(currentNpcMoney * lootFraction))
        );
        if (lootedMoney > 0 && currentNpcMoney > 0) {
          npc.money = Math.max(0, currentNpcMoney - lootedMoney);
          p.money = (p.money || 0) + lootedMoney;
          w.floatingDamages.push({
            id: Date.now() + Math.random(),
            x: npc.x,
            y: npc.y - 46,
            text: `+৳${lootedMoney} টাকা পেলেন!`,
            color: '#facc15',
            life: 1.25,
          });
        }

        w.floatingDamages.push({
          id: Date.now() + Math.random(),
          x: npc.x,
          y: npc.y - 28,
          text: `-${dmg} HP`,
          color:
            npc.role === 'CHANDABAJ' || npc.role === 'STREET_CRIMINAL'
              ? '#10b981'
              : '#ff2a85',
          life: 0.9,
        });

        for (let i = 0; i < 12; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 60 + Math.random() * 190;
          w.particles.push({
            x: npc.x,
            y: npc.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color: i % 2 === 0 ? npc.secondaryColor : '#FF2A85',
            size: 3 + Math.random() * 4,
            alpha: 1,
            life: 0.4,
            maxLife: 0.4,
          });
        }

        const bank = NPC_DIALOGUE_BANKS[npc.id];
        if (!bank) continue;

        const communityReaction = triggerCommunityCrimeReaction(npc, p, w.npcs, w.vehicles);
        setCommunityBannerText(communityReaction.announcement);

        if (npc.role === 'CHANDABAJ' || npc.role === 'STREET_CRIMINAL') {
          completeMission('catch_chandabaj');
          if (communityReaction.policeReward > 0) {
            p.money = (p.money || 0) + communityReaction.policeReward;
            w.floatingDamages.push({
              id: Date.now() + Math.random(),
              x: p.x,
              y: p.y - 62,
              text: `🚓 +৳${communityReaction.policeReward} পুলিশ পুরস্কার!`,
              color: '#34d399',
              life: 1.5,
            });
          }
        }

        if (!communityReaction.isHeroicAction && communityReaction.mobCount > 0) {
          w.mobAlertTimer = 18;
          sound.playPoliceSiren?.(60);
        }

        const actualDistToPlayer = Math.hypot(npc.x - p.x, npc.y - p.y);
        if (npc.hp <= 0) {
          npc.speech =
            npc.role === 'CHANDABAJ'
              ? 'আহ! আর জীবনেও বাপের সিটিতে চাঁদাবাজি করব না ভাই!'
              : npc.speaksEnglishOnly
                ? 'Oh no! Somebody help me please...'
                : 'আহ! আমাকে মেরে ফেলল গো...';
          npc.speechTimer = 4.5;
          npc.respawnTimer = 15;
          p.score += 120;
          sound.speakCharacterLine?.({
            npcId: npc.id,
            text: npc.speech,
            pitch: npc.voicePitch,
            rate: npc.voiceRate,
            distanceToPlayer: actualDistToPlayer,
            forceImmediate: true,
          });
        } else if (npc.role === 'CHANDABAJ') {
          npc.mood = npc.hp <= 30 ? 'Scared' : 'Angry';
          npc.behavior = npc.hp <= 30 ? 'PANIC_FLEE' : 'AGGRO';
          npc.behaviorTimer = 14;
          npc.speech = npc.hp <= 30 ? pickRandomLine(bank.flee) : pickRandomLine(bank.aggro);
          npc.speechTimer = 5;
          sound.speakCharacterLine?.({
            npcId: npc.id,
            text: npc.speech,
            pitch: npc.voicePitch,
            rate: npc.voiceRate,
            distanceToPlayer: actualDistToPlayer,
            forceImmediate: true,
          });
        } else {
          npc.mood = 'Angry';
          npc.behavior = npc.role === 'COP' ? 'PURSUIT' : 'MOB_CHASE';
          npc.behaviorTimer = 18;
          npc.speech = pickRandomLine(bank.aggro);
          npc.speechTimer = 5;
          sound.speakCharacterLine?.({
            npcId: npc.id,
            text: npc.speech,
            pitch: npc.voicePitch,
            rate: npc.voiceRate,
            distanceToPlayer: actualDistToPlayer,
            forceImmediate: true,
          });
        }

        updateLocalNPCAnalysis(npc, p, w.npcs, actualDistToPlayer);
      }
    }

    if (hitSomeone) {
      syncHudFromWorld();
    }
  }, [gameState, syncHudFromWorld, completeMission]);

  // Political Rally Slogan / Michil Chant Action
  const handleChantMichilSlogan = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const w = worldRef.current;
    const p = w.player;

    completeMission('join_michil');

    const slogan = pickRandomLine(MICHIL_SLOGANS);
    w.activeMichilSlogan = slogan;
    p.popularity = Math.min(100, (p.popularity || 50) + 5);

    w.floatingDamages.push({
      id: Date.now() + Math.random(),
      x: p.x,
      y: p.y - 44,
      text: `✊ ${slogan}`,
      color: '#10b981',
      life: 1.4,
    });

    let responder: CommunityNPCState | null = null;
    let minDist = MAX_VOICE_HEARING_DIST;

    for (const npc of w.npcs) {
      if (npc.hp <= 0) continue;
      const d = Math.hypot(npc.x - p.x, npc.y - p.y);
      if (d <= MAX_VOICE_HEARING_DIST) {
        if (npc.role === 'CHANDABAJ') {
          npc.speech = 'ওই! আমার সামনে চাঁদাবাজ বিরোধী স্লোগান দিবি না!';
          npc.speechTimer = 4.5;
        } else {
          npc.analysis.trustScore = Math.min(100, npc.analysis.trustScore + 10);
          if (d < minDist) {
            minDist = d;
            responder = npc;
          }
        }
      }
    }

    if (responder) {
      responder.speech = responder.speaksEnglishOnly
        ? 'Right on! We all stand united for a safe and extortion-free Baper City!'
        : `সাবাশ ভাই! ${slogan}`;
      responder.speechTimer = 5;
      responder.mood = 'Friendly';
      sound.speakCharacterLine?.({
        npcId: responder.id,
        text: responder.speech,
        pitch: responder.voicePitch,
        rate: responder.voiceRate,
        distanceToPlayer: minDist,
        forceImmediate: true,
      });
    } else {
      sound.speakCharacterLine?.({
        npcId: 'player-slogan',
        text: slogan,
        pitch: 1.0,
        rate: 1.08,
        distanceToPlayer: 10,
        forceImmediate: true,
      });
    }

    setCommunityBannerText(`মিছিল স্লোগান: "${slogan}" — আপনার জনসমর্থন বেড়ে ${p.popularity}% হয়েছে!`);
    syncHudFromWorld();
  }, [gameState, syncHudFromWorld, completeMission]);

  // Quick Action for Shopping Mall, Kacha Bazar, Hospital, or Beggar Charity
  const handleContextZoneOrNpcAction = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const w = worldRef.current;
    const p = w.player;

    if (targetNpc?.role === 'BEGGAR') {
      completeMission('help_beggar');
      p.popularity = Math.min(100, (p.popularity || 50) + 10);
      p.hp = Math.min(p.maxHp, p.hp + 10);
      targetNpc.mood = 'Friendly';
      targetNpc.speech = 'আল্লাহ আপনার মঙ্গল করুক বাবা! আপনার হায়াত ও সম্মান বাড়িয়ে দিক!';
      targetNpc.speechTimer = 5.5;
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 34,
        text: '🤲 ভিক্ষা দেওয়া সম্পন্ন (+10 জনসমর্থন)',
        color: '#fbbf24',
        life: 1.4,
      });
      sound.speakCharacterLine?.({
        npcId: targetNpc.id,
        text: targetNpc.speech,
        pitch: targetNpc.voicePitch,
        rate: targetNpc.voiceRate,
        distanceToPlayer: 20,
        forceImmediate: true,
      });
      setCommunityBannerText(
        `আপনি ${targetNpc.bengaliName.split('·')[0]}-কে সাহায্য করেছেন! মিশন সম্পন্ন ও জনসমর্থন +10%!`
      );
      syncHudFromWorld();
      return;
    }

    if (currentInteriorZone === 'PLAYER_HOME') {
      p.hp = p.maxHp;
      p.money = (p.money || 0) + 500;
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 36,
        text: '🏠 নিজের ঘরে বিশ্রাম (100% HP ও +৳৫০০)',
        color: '#22d3ee',
        life: 1.5,
      });
      setCommunityBannerText(
        '🏠 আপনার নিজস্ব ঘর (বাপের ভিলা)-তে বিশ্রাম নিয়ে ১০০% হেলথ ফিরে পেয়েছেন এবং ব্যক্তিগত সিন্দুক থেকে +৳৫০০ নিয়েছেন!'
      );
      syncHudFromWorld();
      return;
    }

    if (
      currentInteriorZone === 'GARMENTS' ||
      targetNpc?.role === 'GARMENT_WORKER'
    ) {
      p.money = (p.money || 0) + 400;
      p.popularity = Math.min(100, (p.popularity || 50) + 5);
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 36,
        text: '🧵 গার্মেন্টস তদারকি (+৳৪০০)',
        color: '#10b981',
        life: 1.4,
      });
      setCommunityBannerText(
        '🧵 গার্মেন্টসের সেলাই ও এক্সপোর্ট লাইনের কাজ তদারকি করে আপনি +৳৪০০ ও শ্রমিকদের ভালোবাসা পেয়েছেন!'
      );
      syncHudFromWorld();
      return;
    }

    if (
      currentInteriorZone === 'OFFICE_COURT' ||
      targetNpc?.role === 'LAWYER' ||
      targetNpc?.role === 'JUDGE' ||
      targetNpc?.role === 'OFFICE_EXECUTIVE'
    ) {
      p.money = (p.money || 0) + 450;
      p.popularity = Math.min(100, (p.popularity || 50) + 6);
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 36,
        text: '⚖️ অফিস ও আদালত কাজ (+৳৪৫০)',
        color: '#818cf8',
        life: 1.4,
      });
      setCommunityBannerText(
        '⚖️ অফিস-আদালতে বিচারক, ব্যারিস্টার ও কর্মকর্তাদের সাথে দাপ্তরিক কাজ সম্পন্ন করে +৳৪৫০ সম্মানী পেয়েছেন!'
      );
      syncHudFromWorld();
      return;
    }

    if (currentInteriorZone === 'SHOPPING_MALL' || targetNpc?.id === 'tania_mall') {
      completeMission('shop_bazar_mall');
      p.hp = Math.min(p.maxHp, p.hp + 25);
      p.popularity = Math.min(100, (p.popularity || 50) + 6);
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 34,
        text: '🛍️ শপিং সম্পন্ন (+25 HP)',
        color: '#f472b6',
        life: 1.4,
      });
      setCommunityBannerText(
        'বাপের সিটি শপিং মল থেকে নতুন পোশাক ও জুতা কেনাকাটা সম্পন্ন! (+25 HP ও মিশন সম্পন্ন)'
      );
      syncHudFromWorld();
      return;
    }

    if (currentInteriorZone === 'KACHA_BAZAR' || targetNpc?.id === 'sobhan_bazar') {
      completeMission('shop_bazar_mall');
      p.hp = Math.min(p.maxHp, p.hp + 30);
      p.popularity = Math.min(100, (p.popularity || 50) + 6);
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 34,
        text: '🛒 কাঁচাবাজার সম্পন্ন (+30 HP)',
        color: '#10b981',
        life: 1.4,
      });
      setCommunityBannerText(
        'কারওয়ান কাঁচাবাজার থেকে তাজা মাছ ও সবজি বাজার করা সম্পন্ন! (+30 HP ও মিশন সম্পন্ন)'
      );
      syncHudFromWorld();
      return;
    }

    if (
      currentInteriorZone === 'NIGHTCLUB' ||
      targetNpc?.role === 'CLUB_DANCER'
    ) {
      completeMission('nightclub_football');
      p.hp = Math.min(p.maxHp, p.hp + 25);
      p.popularity = Math.min(100, (p.popularity || 50) + 8);
      p.walkCycle += 3.5;
      p.angle += 0.9;
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 38,
        text: '💃🕺 নাইট ক্লাবে নাচ ও গান! (+25 HP)',
        color: '#f472b6',
        life: 1.5,
      });
      setCommunityBannerText(
        '🎵 আপনি বাপের সিটি ডিজে নাইট ক্লাবে ডিজে রকি ও মিলার সাথে নেচে-গেয়ে মাতিয়ে তুলেছেন! (+25 HP ও +8% জনসমর্থন)'
      );
      syncHudFromWorld();
      return;
    }

    if (
      currentInteriorZone === 'FOOTBALL_STADIUM' ||
      targetNpc?.role === 'FOOTBALLER'
    ) {
      completeMission('nightclub_football');
      if (w.football) {
        const goalTargetX = 4380;
        const goalTargetY = 1400 + (Math.random() - 0.5) * 60;
        const ang = Math.atan2(goalTargetY - w.football.y, goalTargetX - w.football.x);
        w.football.vx = Math.cos(ang) * 580;
        w.football.vy = Math.sin(ang) * 580;
        w.football.lastTouchedBy = 'আপনি (Player)';
        sound.playHitImpact?.(false, 0);
      }
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 38,
        text: '⚽ গোলপোস্টে দুর্দান্ত শট!',
        color: '#fde047',
        life: 1.3,
      });
      setCommunityBannerText(
        '⚽ আপনি ফুটবল স্টেডিয়ামের মাঠে ফুটবল শট মেরেছেন! গোল হলেই +৳৮০০ টাকা পুরস্কার পাবেন!'
      );
      syncHudFromWorld();
      return;
    }

    if (currentInteriorZone === 'HOTEL' || targetNpc?.role === 'HOTEL_CHEF') {
      completeMission('visit_hospital');
      p.hp = Math.min(p.maxHp, p.hp + 35);
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 36,
        text: '🍛 শাহী কাচ্চি বিরিয়ানি (+35 HP)',
        color: '#f59e0b',
        life: 1.4,
      });
      setCommunityBannerText(
        'সুলতান’স কাচ্চি হোটেলে গরম খাসির কাচ্চি বিরিয়ানি ও বোরহানি খেয়ে আপনার হেলথ +35 HP বেড়েছে!'
      );
      syncHudFromWorld();
      return;
    }

    if (currentInteriorZone === 'MUDI_DOKAN' || targetNpc?.role === 'MUDI_SHOPKEEPER') {
      completeMission('shop_bazar_mall');
      p.hp = Math.min(p.maxHp, p.hp + 25);
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 36,
        text: '🏪 মুদি দোকান সদাই (+25 HP)',
        color: '#34d399',
        life: 1.4,
      });
      setCommunityBannerText(
        'বিসমিল্লাহ মুদি ভান্ডার থেকে পোলাওয়ের চাল, তেল ও দুধ-বিস্কুট কেনাকাটা সম্পন্ন! (+25 HP)'
      );
      syncHudFromWorld();
      return;
    }

    if (
      currentInteriorZone === 'HOSPITAL' ||
      targetNpc?.role === 'MEDIC' ||
      targetNpc?.role === 'NURSE'
    ) {
      completeMission('visit_hospital');
      p.hp = p.maxHp;
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 34,
        text: '🏥 ফুল মেডিকেল চেকআপ (100% HP)',
        color: '#38bdf8',
        life: 1.4,
      });
      setCommunityBannerText(
        'ঢাকা মেডিকেল হাসপাতালের ভেতরে ডাক্তার ও নার্সের চিকিৎসায় আপনার হেলথ ১০০% পূর্ণ হয়েছে!'
      );
      syncHudFromWorld();
    }
  }, [gameState, targetNpc, currentInteriorZone, completeMission, syncHudFromWorld]);

  // Enter / Exit ANY Vehicle as Driver (F)
  const handleToggleVehicle = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const w = worldRef.current;
    const p = w.player;

    if (p.inTrain) return;

    clearDrivingKeys();
    resetJoystickState();

    if (p.inVehicleId) {
      const currentCar = w.vehicles.find((v) => v.id === p.inVehicleId);
      if (currentCar && p.inVehicleSeat === 'driver' && currentCar.passengerNpcId) {
        const pax = w.npcs.find((n) => n.id === currentCar.passengerNpcId);
        if (pax) {
          pax.ridingVehicleId = null;
          const paxExit = resolveCircleBuildingCollision(
            currentCar.x + Math.cos(currentCar.angle + Math.PI / 2) * 52,
            currentCar.y + Math.sin(currentCar.angle + Math.PI / 2) * 52,
            18
          );
          pax.x = paxExit.x;
          pax.y = paxExit.y;
        }
        currentCar.passengerNpcId = null;
      }

      p.inVehicleId = null;
      p.inVehicleSeat = null;
      if (currentCar) {
        const exitX = currentCar.x + Math.cos(currentCar.angle - Math.PI / 2) * 58;
        const exitY = currentCar.y + Math.sin(currentCar.angle - Math.PI / 2) * 58;
        const safePos = resolveCircleBuildingCollision(exitX, exitY, 18);
        p.x = safePos.x;
        p.y = safePos.y;
        p.vx = 0;
        p.vy = 0;
      }
      sound.playCarDoor?.(false);
      syncHudFromWorld();
    } else if (w.nearestVehicleId) {
      const targetCar = w.vehicles.find((v) => v.id === w.nearestVehicleId);
      if (!targetCar) return;

      const dist = Math.hypot(p.x - targetCar.x, p.y - targetCar.y);
      if (dist <= 135) {
        if (targetCar.driverNpcId) {
          const driverNpc = w.npcs.find((n) => n.id === targetCar.driverNpcId);
          targetCar.driverNpcId = null;
          if (driverNpc) {
            driverNpc.drivingVehicleId = null;
            const ejectPos = resolveCircleBuildingCollision(
              targetCar.x + Math.cos(targetCar.angle + Math.PI / 2) * 58,
              targetCar.y + Math.sin(targetCar.angle + Math.PI / 2) * 58,
              16
            );
            driverNpc.x = ejectPos.x;
            driverNpc.y = ejectPos.y;
            driverNpc.speech =
              driverNpc.role === 'COP'
                ? 'এই! ডিএমপি পুলিশের গাড়ি হাইজ্যাক করছো?! সবাই ওকে ধরো!'
                : 'মামা! আমার গাড়ি নিয়ে যাচ্ছেন কেন?! আস্তে চালান!';
            driverNpc.speechTimer = 5;
            driverNpc.mood = driverNpc.role === 'COP' ? 'Angry' : 'Calm';
            driverNpc.behavior = driverNpc.role === 'COP' ? 'PURSUIT' : 'PATROL';
            driverNpc.behaviorTimer = 12;
            sound.speakCharacterLine?.({
              npcId: driverNpc.id,
              text: driverNpc.speech,
              pitch: driverNpc.voicePitch,
              rate: driverNpc.voiceRate,
              distanceToPlayer: dist,
              forceImmediate: true,
            });
          }
        }

        p.inVehicleId = targetCar.id;
        p.inVehicleSeat = 'driver';
        p.x = targetCar.x;
        p.y = targetCar.y;
        sound.playCarDoor?.(true);
        setCommunityBannerText(
          `আপনি ${targetCar.name}-এর চালকের আসনে বসেছেন! নিচের বাটনগুলো দিয়ে সামনে, পিছনে ও ডানে-বামে চালান।`
        );
        syncHudFromWorld();
      }
    }
  }, [gameState, clearDrivingKeys, resetJoystickState, syncHudFromWorld]);

  // 2-Person Vehicle Co-Riding: Hop in as Passenger OR Invite/Call Nearby NPC as Passenger (G)
  const handleCoRideOrInvitePassenger = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const w = worldRef.current;
    const p = w.player;

    if (p.inVehicleId && p.inVehicleSeat === 'passenger') {
      const currentCar = w.vehicles.find((v) => v.id === p.inVehicleId);
      p.inVehicleId = null;
      p.inVehicleSeat = null;
      if (currentCar) {
        const exitPos = resolveCircleBuildingCollision(
          currentCar.x + Math.cos(currentCar.angle + Math.PI / 2) * 56,
          currentCar.y + Math.sin(currentCar.angle + Math.PI / 2) * 56,
          18
        );
        p.x = exitPos.x;
        p.y = exitPos.y;
      }
      sound.playCarDoor?.(false);
      setCommunityBannerText('আপনি গাড়ি থেকে নিরাপদে নেমেছেন।');
      syncHudFromWorld();
      return;
    }

    if (p.inVehicleId && p.inVehicleSeat === 'driver') {
      const currentCar = w.vehicles.find((v) => v.id === p.inVehicleId);
      if (!currentCar) return;

      if (currentCar.passengerNpcId) {
        const pax = w.npcs.find((n) => n.id === currentCar.passengerNpcId);
        currentCar.passengerNpcId = null;
        if (pax) {
          pax.ridingVehicleId = null;
          const exitPos = resolveCircleBuildingCollision(
            currentCar.x + Math.cos(currentCar.angle + Math.PI / 2) * 56,
            currentCar.y + Math.sin(currentCar.angle + Math.PI / 2) * 56,
            18
          );
          pax.x = exitPos.x;
          pax.y = exitPos.y;
          pax.speech = pax.speaksEnglishOnly
            ? 'Thank you so much for the lovely ride! See you around!'
            : 'অনেক ধন্যবাদ ভাই, দারুণ রাইড ছিল!';
          sound.speakCharacterLine?.({
            npcId: pax.id,
            text: pax.speech,
            pitch: pax.voicePitch,
            rate: pax.voiceRate,
            distanceToPlayer: 30,
            forceImmediate: true,
          });
          setCommunityBannerText(`${pax.bengaliName} আপনার গাড়ি থেকে নেমে গেছেন।`);
        }
        syncHudFromWorld();
        return;
      }

      const candidate = w.npcs
        .filter(
          (n) =>
            n.hp > 0 &&
            !n.drivingVehicleId &&
            !n.ridingVehicleId &&
            !n.inTrain &&
            n.behavior !== 'MOB_CHASE' &&
            n.behavior !== 'PURSUIT' &&
            n.role !== 'CHANDABAJ'
        )
        .map((n) => ({ npc: n, d: Math.hypot(n.x - currentCar.x, n.y - currentCar.y) }))
        .sort((a, b) => a.d - b.d)[0];

      if (candidate && candidate.d <= 195) {
        const invited = candidate.npc;
        currentCar.passengerNpcId = invited.id;
        invited.ridingVehicleId = currentCar.id;
        invited.mood = 'Friendly';
        invited.speech = invited.speaksEnglishOnly
          ? `Awesome! Thanks for the ride—let's cruise around Baper City together!`
          : `ধন্যবাদ ভাই! আপনার ${currentCar.name.split(' ')[0]}-এ দুইজন একসাথে বাপের সিটি ঘুরে আসি চলুন!`;
        sound.playCarDoor?.(true);
        sound.speakCharacterLine?.({
          npcId: invited.id,
          text: invited.speech,
          pitch: invited.voicePitch,
          rate: invited.voiceRate,
          distanceToPlayer: 20,
          forceImmediate: true,
        });
        setCommunityBannerText(
          `${invited.bengaliName} আপনার ডাকে সাড়া দিয়ে গাড়ির ২য় সিটে যাত্রী হয়ে উঠেছেন!`
        );
        syncHudFromWorld();
      } else {
        sound.playCarHorn?.(1, 0);
        setCommunityBannerText(
          'গাড়িতে ২য় যাত্রী তুলতে কোনো মানুষের কাছে গিয়ে হর্ন দিন বা [G] চাপুন!'
        );
      }
      return;
    }

    if (!p.inVehicleId && w.nearestVehicleId) {
      const targetCar = w.vehicles.find((v) => v.id === w.nearestVehicleId);
      if (targetCar && targetCar.driverNpcId && targetCar.allowsPlayerPassenger) {
        const driver = w.npcs.find((n) => n.id === targetCar.driverNpcId);
        p.inVehicleId = targetCar.id;
        p.inVehicleSeat = 'passenger';
        p.x = targetCar.x;
        p.y = targetCar.y;

        if (targetCar.type === 'RICKSHAW') {
          sound.playRickshawBell?.(15);
        } else {
          sound.playCarDoor?.(true);
        }

        if (driver) {
          driver.speech =
            targetCar.type === 'DHAKA_BUS'
              ? 'উঠে পড়েন ভাই, সিটে বসেন! এই গুলশান, ফার্মগেট, শাহবাগ, যাত্রাবাড়ী ছেড়ে গেলো!'
              : targetCar.type === 'RICKSHAW'
                ? 'উঠেন মামা! রিকশায় বাতাস খেতে খেতে বাপের সিটি ঘুরিয়ে আনছি!'
                : 'উঠে বসেন ভাই, মিটারে সিএনজি চলছে!';
          sound.speakCharacterLine?.({
            npcId: driver.id,
            text: driver.speech,
            pitch: driver.voicePitch,
            rate: driver.voiceRate,
            distanceToPlayer: 20,
            forceImmediate: true,
          });
        }
        setCommunityBannerText(
          `আপনি ${targetCar.name}-এ যাত্রী হিসেবে উঠেছেন! চালক আপনাকে বাপের সিটি ঘুরিয়ে নিয়ে যাচ্ছে।`
        );
        syncHudFromWorld();
      }
    }
  }, [gameState, syncHudFromWorld]);

  // Board / Exit the Train (T)
  const handleToggleTrain = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const w = worldRef.current;
    const p = w.player;

    if (p.inVehicleId) return;

    if (p.inTrain) {
      p.inTrain = false;
      const safeExit = resolveCircleBuildingCollision(w.train.x, w.train.y - 54, 18);
      p.x = safeExit.x;
      p.y = safeExit.y;
      p.vx = 0;
      p.vy = 0;
      sound.playTrainHorn?.(0);
      setCommunityBannerText(
        `আপনি বাপের সিটি মেট্রো ট্রেন থেকে ${w.train.currentStationName || 'স্টেশন'}-এ নেমেছেন।`
      );
      syncHudFromWorld();
    } else if (w.canBoardTrain) {
      p.inTrain = true;
      p.x = w.train.x;
      p.y = w.train.y;
      sound.playTrainHorn?.(0);
      setCommunityBannerText(
        'আপনি বাপের সিটি মেট্রো ট্রেনে উঠেছেন! ট্রেনটি ম্যাপের চারপাশ দিয়ে ঘুরে সব স্টেশনে যাত্রী নামাবে।'
      );
      syncHudFromWorld();
    }
  }, [gameState, syncHudFromWorld]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      const key = e.key.toLowerCase();
      worldRef.current.keys[key] = true;
      worldRef.current.keys[e.code] = true;

      if (key === 'f' || key === 'e') {
        e.preventDefault();
        handleToggleVehicle();
      } else if (key === 'g') {
        e.preventDefault();
        handleCoRideOrInvitePassenger();
      } else if (key === 't') {
        e.preventDefault();
        handleToggleTrain();
      } else if (key === ' ') {
        e.preventDefault();
        handlePlayerAttack();
      } else if (key === 'm') {
        e.preventDefault();
        handleChantMichilSlogan();
      } else if (key === 'h') {
        e.preventDefault();
        if (worldRef.current.player.inVehicleId) {
          sound.playCarHorn?.(1, 0);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      worldRef.current.keys[key] = false;
      worldRef.current.keys[e.code] = false;
    };

    const handleWindowBlur = () => {
      worldRef.current.keys = {};
      clearDrivingKeys();
      resetJoystickState();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [
    handleToggleVehicle,
    handleCoRideOrInvitePassenger,
    handleToggleTrain,
    handlePlayerAttack,
    handleChantMichilSlogan,
    clearDrivingKeys,
    resetJoystickState,
  ]);

  // Global window pointer listeners for smooth landscape joystick dragging
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (
        activeJoystickPointerId.current === null ||
        e.pointerId !== activeJoystickPointerId.current
      ) {
        return;
      }
      updateJoystickFromPointer(e.clientX, e.clientY);
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (
        activeJoystickPointerId.current !== null &&
        e.pointerId === activeJoystickPointerId.current
      ) {
        resetJoystickState();
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [updateJoystickFromPointer, resetJoystickState]);

  // Send Proximity Chat Message ONLY to Nearby Character
  const handleSendChat = (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const trimmed = (overrideText ?? chatInput).trim();
    if (!trimmed || gameState !== 'PLAYING') return;

    const w = worldRef.current;
    const p = w.player;

    const target =
      w.nearestNpcId && w.nearestNpcDist <= MAX_VOICE_HEARING_DIST + 40
        ? w.npcs.find((n) => n.id === w.nearestNpcId && n.hp > 0)
        : null;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      senderId: 'player',
      senderName: 'আপনি (PLAYER)',
      isPlayer: true,
      text: trimmed,
      timestamp: nowTime,
    };

    setChatHistory((prev) => [...prev.slice(-14), userMsg]);
    if (!overrideText) setChatInput('');

    if (!target) {
      const noOneNearMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'বাপের সিটি',
        isPlayer: false,
        text: 'আপনার আশপাশে কথা শোনার মতো কেউ নেই! কারো সাথে কথা বলতে বা ডাকতে তার কাছে যান।',
        timestamp: nowTime,
      };
      setChatHistory((prev) => [...prev.slice(-14), noOneNearMsg]);
      return;
    }

    const response = generateLocalConversationReply(target, p, trimmed);

    target.mood = response.mood;
    target.behavior = response.behavior;
    target.speech = response.speech;
    target.speechTimer = 6.5;

    if (response.popularityDelta !== 0) {
      p.popularity = Math.max(0, Math.min(100, (p.popularity || 50) + response.popularityDelta));
    }

    if (response.triggerMob) {
      const mobRes = triggerCommunityCrimeReaction(target, p, w.npcs, w.vehicles);
      w.mobAlertTimer = 16;
      setCommunityBannerText(mobRes.announcement);
    }

    if (response.grantRidePermission) {
      if (!p.inVehicleId && target.drivingVehicleId) {
        const npcVehicle = w.vehicles.find((v) => v.id === target.drivingVehicleId);
        if (npcVehicle) {
          p.inVehicleId = npcVehicle.id;
          p.inVehicleSeat = 'passenger';
          p.x = npcVehicle.x;
          p.y = npcVehicle.y;
          sound.playCarDoor?.(true);
        }
      } else if (p.inVehicleId && p.inVehicleSeat === 'driver' && !target.drivingVehicleId) {
        const playerVehicle = w.vehicles.find((v) => v.id === p.inVehicleId);
        if (playerVehicle && !playerVehicle.passengerNpcId) {
          playerVehicle.passengerNpcId = target.id;
          target.ridingVehicleId = playerVehicle.id;
          sound.playCarDoor?.(true);
        }
      }
    }

    const distToTarget = Math.hypot(target.x - p.x, target.y - p.y);
    updateLocalNPCAnalysis(target, p, w.npcs, distToTarget);

    if (target.role === 'BEGGAR' && response.popularityDelta > 0) {
      completeMission('help_beggar');
    }
    if (
      (target.id === 'tania_mall' || target.id === 'sobhan_bazar' || target.role === 'VAN_VENDOR') &&
      response.healedHp > 0
    ) {
      completeMission('shop_bazar_mall');
    }
    if ((target.role === 'MEDIC' || target.role === 'NURSE') && response.healedHp > 0) {
      completeMission('visit_hospital');
    }

    if (response.healedHp > 0) {
      p.hp = Math.min(p.maxHp, p.hp + response.healedHp);
      w.floatingDamages.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y - 30,
        text: `+${response.healedHp} HP`,
        color: '#10b981',
        life: 1.1,
      });
    }

    sound.speakCharacterLine?.({
      npcId: target.id,
      text: response.speech,
      pitch: target.voicePitch,
      rate: target.voiceRate,
      distanceToPlayer: distToTarget,
      forceImmediate: true,
    });

    const npcMsg: ChatMessage = {
      id: `npc-${Date.now()}`,
      senderId: target.id,
      senderName: target.bengaliName,
      isPlayer: false,
      text: response.speech,
      mood: response.mood,
      analysisSummary: response.analysisNote,
      timestamp: nowTime,
    };

    setChatHistory((prev) => [...prev.slice(-14), npcMsg]);
    syncHudFromWorld();
  };

  const handleStartOrResetGame = () => {
    worldRef.current = createInitialWorld();
    worldRef.current.player.isRunning = isRunningMode;
    worldRef.current.camera.angleLevel = cameraAngleLevel;
    clearDrivingKeys();
    resetJoystickState();
    setPlayerHp(100);
    setPopularity(65);
    setMobAlertSeconds(0);
    setMobChasersCount(0);
    setInVehicle(null);
    setInVehicleSeat(null);
    setInTrain(false);
    setNearestVehicle(null);
    setEndReason('');
    setMissions((prev) => prev.map((m) => ({ ...m, done: false })));
    setGameState('PLAYING');
    sound.playStartSynth?.();
    syncHudFromWorld();
  };

  const toggleSound = () => {
    const nextMuted = !soundMuted;
    setSoundMuted(nextMuted);
    sound.muted = nextMuted;
    sound.setMuted?.(nextMuted);
  };

  const getMoodBadgeStyle = (mood: string) => {
    switch (mood) {
      case 'Calm':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50';
      case 'Friendly':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50';
      case 'Suspicious':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/50';
      case 'Angry':
        return 'bg-rose-500/25 text-rose-300 border-rose-500/60 animate-pulse';
      case 'Scared':
        return 'bg-purple-500/25 text-purple-300 border-purple-400/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const isPlayerDriving = Boolean(inVehicle && inVehicleSeat === 'driver');
  const completedMissionsCount = missions.filter((m) => m.done).length;

  const landscapeContainerStyle: React.CSSProperties = isRotatedLandscape
    ? {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${containerSize.h}px`,
        height: `${containerSize.w}px`,
        transform: 'translate(-50%, -50%) rotate(90deg)',
        transformOrigin: 'center center',
      }
    : {
        position: 'relative',
        width: '100%',
        height: '100%',
      };

  return (
    <div
      ref={viewportRef}
      className="fixed inset-0 overflow-hidden bg-[#070310] select-none font-sans text-white"
    >
      <div style={landscapeContainerStyle} className="overflow-hidden bg-[#090414]">
        {/* 2D Top-Down Open World Baper City Canvas */}
        <Canvas2DWorld
          worldRef={worldRef}
          gameState={gameState}
          isRotatedLandscape={isRotatedLandscape}
          onSyncHud={syncHudFromWorld}
          onGameEnd={(state) => {
            setEndReason(
              state === 'VICTORY'
                ? 'অভিনন্দন! আপনি প্রধান চাঁদাবাজ কালা জাহাঙ্গীরকে পরাস্ত করে বাপের সিটিকে চাঁদাবাজমুক্ত করেছেন!'
                : 'পুলিশের গাড়ির ধাওয়া ও এলাকাবাসীর গণধোলাইয়ে আপনার হেলথ শেষ হয়ে গেছে! আবার চেষ্টা করুন।'
            );
            setGameState(state);
          }}
        />

        {/* Flashing Public Mob & Police Siren Chase Warning Banner */}
        {(mobAlertSeconds > 0 || mobChasersCount > 0) && gameState === 'PLAYING' && (
          <div className="absolute top-11 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/95 border border-yellow-300 shadow-[0_0_24px_rgba(244,63,94,0.85)] animate-bounce max-w-[90%]">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-200 shrink-0" />
            <span className="font-display font-extrabold text-[10px] sm:text-xs tracking-wide text-white truncate">
              🚨 ডিএমপি পুলিশের গাড়ি ও {mobChasersCount} জন জনতা আপনাকে ধাওয়া করছে!
            </span>
          </div>
        )}

        {/* Mobile-Friendly Compact Top HUD Bar */}
        <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none px-2 py-1.5 sm:px-3 sm:py-2 flex items-start justify-between gap-1.5">
          {/* Top-Left: Compact Player Status Pill + Mission Toggle */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div className="bg-[#0B0616]/90 backdrop-blur-md border border-emerald-500/45 rounded-xl px-2.5 py-1.5 shadow-[0_0_16px_rgba(16,185,129,0.2)] flex flex-col gap-0.5 min-w-[148px] sm:min-w-[185px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[10px] sm:text-[11px] font-black tracking-wide text-amber-300 truncate">
                  🏙️ বাপের সিটি
                </span>
                <span className="flex items-center gap-1 font-mono text-[9.5px] sm:text-[10.5px] font-bold text-emerald-400 shrink-0">
                  <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
                  {playerHp}% · <span className="text-yellow-300">৳{playerMoney.toLocaleString()}</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-200"
                  style={{ width: `${Math.max(0, Math.min(100, playerHp))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-300">
                <span className="flex items-center gap-1 text-cyan-300 font-semibold truncate max-w-[105px] sm:max-w-[130px]">
                  {inTrain ? (
                    <>
                      <TrainFront className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      মেট্রো ট্রেন
                    </>
                  ) : inVehicle ? (
                    <>
                      <CarFront className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                      {inVehicle.name.split(' ')[0]}
                    </>
                  ) : (
                    <>
                      <Navigation className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      জনসমর্থন {popularity}%
                    </>
                  )}
                </span>
                <span className="font-mono text-[9px] text-slate-400 flex items-center gap-0.5 shrink-0">
                  <Users className="w-2.5 h-2.5 text-amber-400" /> {aliveNpcCount}
                </span>
              </div>
            </div>

            {/* Compact Mission Button (Toggles Mission Dropdown so it never crowds mobile screen) */}
            <button
              type="button"
              onClick={() => {
                setMissionDrawerOpen((prev) => !prev);
                setChatDrawerOpen(false);
              }}
              className={`px-2 py-1.5 rounded-xl backdrop-blur-md border text-[10px] font-display font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                missionDrawerOpen
                  ? 'bg-amber-500 text-slate-950 border-white shadow-[0_0_16px_rgba(245,158,11,0.7)]'
                  : 'bg-[#0B0616]/90 text-amber-300 border-amber-500/45 hover:border-amber-400'
              }`}
              title="আপনার মিশন লিস্ট দেখুন"
            >
              <span>🎯 মিশন</span>
              <span className="font-mono text-[9.5px] px-1 rounded bg-black/30">
                {completedMissionsCount}/{missions.length}
              </span>
            </button>
          </div>

          {/* Top-Center: Compact 1-Line Live Speech / Nearby Character Pill (Tap to open Chat!) */}
          {gameState === 'PLAYING' && !chatDrawerOpen && (
            <button
              type="button"
              onClick={() => {
                setChatDrawerOpen(true);
                setMissionDrawerOpen(false);
              }}
              className="pointer-events-auto max-w-[38%] sm:max-w-[44%] bg-[#0B0616]/90 backdrop-blur-md border border-cyan-500/40 hover:border-cyan-400 rounded-xl px-2.5 py-1 flex items-center gap-1.5 shadow-[0_0_14px_rgba(0,240,255,0.12)] cursor-pointer truncate"
            >
              <MessageSquare className="w-3 h-3 text-cyan-400 shrink-0" />
              <div className="truncate text-left">
                {targetNpc ? (
                  <div className="text-[9.5px] sm:text-[10.5px] text-slate-100 truncate">
                    <span className="font-bold text-emerald-300">
                      {targetNpc.analysis.emotionEmoji} {targetNpc.bengaliName.split(' ')[0]} (৳
                      {(targetNpc.money ?? 5000).toLocaleString()}):{' '}
                    </span>
                    <span className="text-slate-200">{targetNpc.speech}</span>
                  </div>
                ) : chatHistory.length > 0 ? (
                  <div className="text-[9.5px] sm:text-[10.5px] text-slate-200 truncate">
                    <span className="font-bold text-cyan-300">
                      {chatHistory[chatHistory.length - 1].senderName.split(' ')[0]}:{' '}
                    </span>
                    <span>{chatHistory[chatHistory.length - 1].text}</span>
                  </div>
                ) : (
                  <span className="text-[9.5px] text-slate-300">কথা বলুন...</span>
                )}
              </div>
              <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30 shrink-0 hidden sm:inline">
                কথা বলুন
              </span>
            </button>
          )}

          {/* Top-Right: 5-Level Camera View Mode + Compact Control Icons */}
          <div className="flex items-center gap-1 pointer-events-auto flex-wrap justify-end">
            {/* 5-Level Camera Angle Selector (১ থেকে ৫ পর্যন্ত ক্যামেরা ভিউ মোড) */}
            <div className="flex items-center bg-[#0B0616]/92 backdrop-blur-md border border-emerald-500/50 rounded-xl p-0.5 shadow-[0_0_14px_rgba(16,185,129,0.2)]">
              <button
                type="button"
                onClick={handleCycleCameraAngle}
                className="px-1.5 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-display font-black text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer"
                title="ক্যামেরা অ্যাঙ্গেল পরিবর্তন করুন (১ থেকে ৫)"
              >
                <span>🎥 ভিউ</span>
              </button>
              {([1, 2, 3, 4, 5] as const).map((lvl) => {
                const bnDigits = ['১', '২', '৩', '৪', '৫'];
                const active = cameraAngleLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleSetCameraAngle(lvl)}
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-lg font-mono text-[9.5px] sm:text-[10px] font-extrabold transition-all cursor-pointer flex items-center justify-center ${
                      active
                        ? 'bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.8)] scale-105'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                    title={`ক্যামেরা অ্যাঙ্গেল ${bnDigits[lvl - 1]}`}
                  >
                    {bnDigits[lvl - 1]}
                  </button>
                );
              })}
            </div>

            {/* Chat Bar Show/Hide Toggle */}
            <button
              type="button"
              onClick={() => {
                setChatDrawerOpen((prev) => !prev);
                setMissionDrawerOpen(false);
              }}
              className={`px-2 py-1.5 rounded-xl backdrop-blur-md border transition-colors cursor-pointer flex items-center gap-1 ${
                chatDrawerOpen
                  ? 'bg-pink-500 text-white border-white shadow-[0_0_16px_rgba(236,72,153,0.7)]'
                  : 'bg-[#0B0616]/90 border-pink-500/45 text-pink-300 hover:text-white'
              }`}
              title="চ্যাট বক্স খুলুন/বন্ধ করুন"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[10px] font-display font-bold hidden sm:inline">চ্যাট</span>
            </button>

            {/* Landscape Orientation Toggle Button */}
            {isPortraitScreen && (
              <button
                type="button"
                onClick={() => setForceLandscapeOnPortrait((prev) => !prev)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#0B0616]/90 backdrop-blur-md border border-amber-500/50 text-amber-300 hover:text-white text-[10px] font-mono cursor-pointer"
                title="আড়াআড়ি / লম্বালম্বি ভিউ পরিবর্তন করুন"
              >
                <Smartphone className="w-3.5 h-3.5 rotate-90 text-amber-400" />
                <span className="hidden sm:inline">
                  {forceLandscapeOnPortrait ? 'আড়াআড়ি' : 'লম্বা'}
                </span>
              </button>
            )}

            {/* Voice Mute/Unmute & Status */}
            <button
              type="button"
              onClick={toggleSound}
              className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-[#0B0616]/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              title={soundMuted ? 'Unmute Voices' : 'Mute Voices'}
            >
              {soundMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>

            {/* Sound Unlock Button (Helpful for Mobile APKs) */}
            <button
              type="button"
              onClick={() => {
                sound.speakCharacterLine?.('বাপের সিটি সাউন্ড চেক সম্পন্ন!');
                setCommunityBannerText('🔊 সাউন্ড সিস্টেম সচল হয়েছে!');
              }}
              className="p-1.5 rounded-xl bg-[#0B0616]/90 backdrop-blur-md border border-emerald-500/40 text-emerald-400 hover:text-white transition-colors cursor-pointer"
              title="সাউন্ড চেক করুন"
            >
              <Radio className="w-3.5 h-3.5" />
            </button>

            {/* Restart World */}
            <button
              type="button"
              onClick={handleStartOrResetGame}
              className="p-1.5 rounded-xl bg-[#0B0616]/90 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="গেম রিস্টার্ট করুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Floating Mission Checklist Popover (Opens cleanly under Top-Left when 🎯 মিশন is tapped) */}
        {gameState === 'PLAYING' && missionDrawerOpen && (
          <div className="absolute top-13 left-2.5 z-30 w-60 bg-[#0B0616]/95 backdrop-blur-md border border-amber-500/60 rounded-xl p-2.5 shadow-[0_0_25px_rgba(245,158,11,0.25)] pointer-events-auto">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800">
              <span className="font-display text-[11px] font-black text-amber-300">
                🎯 মেইন ক্যারেক্টারের মিশন ({completedMissionsCount}/{missions.length})
              </span>
              <button
                type="button"
                onClick={() => setMissionDrawerOpen(false)}
                className="text-[10px] font-mono text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-900 cursor-pointer"
              >
                বন্ধ ✕
              </button>
            </div>
            <div className="space-y-1">
              {missions.map((m) => (
                <div
                  key={m.id}
                  className={`text-[10px] flex items-center gap-1.5 ${
                    m.done ? 'text-emerald-400 line-through opacity-80' : 'text-slate-100'
                  }`}
                >
                  <span>{m.done ? '✅' : '⬜'}</span>
                  <span>{m.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top-Center Floating Chat & Quick-Talk Drawer (Never overlaps bottom thumb controls!) */}
        {gameState === 'PLAYING' && chatDrawerOpen && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 w-[86%] max-w-[420px] bg-[#0B0616]/95 backdrop-blur-md border border-cyan-500/55 rounded-xl p-2 shadow-[0_0_28px_rgba(0,240,255,0.25)] pointer-events-auto flex flex-col gap-1.5 select-none">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-[10px] font-display font-bold text-cyan-300 truncate block">
                  {targetNpc
                    ? `${targetNpc.analysis.emotionEmoji} ${targetNpc.bengaliName}`
                    : '💬 আশপাশের মানুষের সাথে কথা বলুন'}
                </span>
                {targetNpc?.ownThought && (
                  <span className="text-[9.5px] font-mono text-amber-300 truncate block">
                    {targetNpc.ownThought} · সিদ্ধান্ত: {targetNpc.currentDecision}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setChatDrawerOpen(false)}
                className="text-[10px] font-mono text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700 cursor-pointer shrink-0"
              >
                বন্ধ ✕
              </button>
            </div>

            {targetNpc && (
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar select-none">
                {[
                  targetNpc.role === 'BEGGAR'
                    ? 'এই নিন ৫০ টাকা ভিক্ষা ও সাহায্য!'
                    : targetNpc.role === 'QUARRELER'
                      ? 'ভাই ঝগড়া থামান, মিলমিশ করে নিন!'
                      : targetNpc.id === 'tania_mall'
                        ? 'শপিং মল থেকে নতুন জামা কিনবো!'
                        : targetNpc.id === 'sobhan_bazar'
                          ? 'এক কেজি মাছ ও তাজা সবজি বাজার দিন!'
                          : targetNpc.role === 'MEDIC' || targetNpc.role === 'NURSE'
                            ? 'ডাক্তার আপা, আমার চিকিৎসা ও ওষুধ দিন!'
                            : targetNpc.id === 'kader_bus'
                              ? 'কাদের ভাই, বাসে উঠবো!'
                              : targetNpc.id === 'jalil_rickshaw'
                                ? 'জলিল মামা, রিকশায় যাবেন?'
                                : targetNpc.role === 'CHANDABAJ'
                                  ? 'চাঁদাবাজি বন্ধ কর!'
                                  : 'গাড়িতে উঠবেন? চলুন দুইজন একসাথে যাই!',
                  'সালাম, কেমন আছেন?',
                  'সরি, ভুল হয়ে গেছে!',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendChat(undefined, preset)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-900 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 transition-colors shrink-0 cursor-pointer select-none"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}

            {chatHistory.length > 0 && (
              <div className="text-[10.5px] leading-snug bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800 flex items-baseline gap-1.5 truncate">
                <span
                  className="font-mono font-bold text-[10px] shrink-0"
                  style={{
                    color: chatHistory[chatHistory.length - 1].isPlayer ? '#00F0FF' : '#10B981',
                  }}
                >
                  {chatHistory[chatHistory.length - 1].senderName.split(' ')[0]}:
                </span>
                <span className="text-slate-100 truncate">
                  {chatHistory[chatHistory.length - 1].text}
                </span>
              </div>
            )}

            <form
              onSubmit={(e) => handleSendChat(e)}
              className="flex items-center gap-1.5 bg-slate-950 border border-cyan-500/45 rounded-lg px-2 py-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  targetNpc
                    ? `${targetNpc.bengaliName.split(' ')[0]}-কে লিখে পাঠান...`
                    : 'কারো কাছে গিয়ে কথা বলুন...'
                }
                className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-2.5 py-1 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 font-display font-bold text-[10px] uppercase tracking-wider disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>পাঠান</span>
              </button>
            </form>
          </div>
        )}

        {/* Bottom Thumb Controls: Left (Joystick OR Steering) & Right (Actions + Pedals + Attack/Horn) */}
        {gameState === 'PLAYING' && (
          <>
            {isPlayerDriving ? (
              <div
                onContextMenu={(e) => e.preventDefault()}
                className="absolute bottom-2.5 left-2.5 sm:bottom-5 sm:left-6 z-20 flex items-center gap-2 pointer-events-auto select-none"
              >
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                    setDrivingDirection('left', true);
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDrivingDirection('left', false);
                  }}
                  onPointerCancel={() => setDrivingDirection('left', false)}
                  onLostPointerCapture={() => setDrivingDirection('left', false)}
                  className={`w-11 h-11 sm:w-18 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center touch-none select-none cursor-pointer transition-transform ${
                    driveBtnState.left
                      ? 'bg-cyan-400 text-slate-950 border-white scale-95 shadow-[0_0_22px_rgba(0,240,255,0.9)]'
                      : 'bg-[#0B0616]/90 text-cyan-300 border-cyan-400/75 shadow-[0_0_14px_rgba(0,240,255,0.22)]'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 sm:w-6 sm:h-6 stroke-[2.5]" />
                  <span className="font-display text-[8.5px] sm:text-[11px] font-extrabold">বামে</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                    setDrivingDirection('right', true);
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDrivingDirection('right', false);
                  }}
                  onPointerCancel={() => setDrivingDirection('right', false)}
                  onLostPointerCapture={() => setDrivingDirection('right', false)}
                  className={`w-11 h-11 sm:w-18 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center touch-none select-none cursor-pointer transition-transform ${
                    driveBtnState.right
                      ? 'bg-cyan-400 text-slate-950 border-white scale-95 shadow-[0_0_22px_rgba(0,240,255,0.9)]'
                      : 'bg-[#0B0616]/90 text-cyan-300 border-cyan-400/75 shadow-[0_0_14px_rgba(0,240,255,0.22)]'
                  }`}
                >
                  <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6 stroke-[2.5]" />
                  <span className="font-display text-[8.5px] sm:text-[11px] font-extrabold">ডানে</span>
                </button>
              </div>
            ) : (
              <div className="absolute bottom-2.5 left-2.5 sm:bottom-5 sm:left-6 z-20 flex items-end gap-1.5 pointer-events-auto select-none">
                <div
                  ref={joystickZoneRef}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    activeJoystickPointerId.current = e.pointerId;
                    updateJoystickFromPointer(e.clientX, e.clientY);
                  }}
                  className={`w-18 h-18 sm:w-28 sm:h-28 rounded-full bg-[#0B0616]/80 backdrop-blur-md border-2 flex items-center justify-center touch-none select-none cursor-pointer transition-colors ${
                    isRunningMode
                      ? 'border-amber-400/85 shadow-[0_0_24px_rgba(245,158,11,0.35)]'
                      : 'border-cyan-500/50 shadow-[0_0_22px_rgba(0,240,255,0.2)]'
                  }`}
                >
                  <div className="w-9 h-9 sm:w-16 sm:h-16 rounded-full border border-cyan-400/25" />
                  <div
                    ref={joystickKnobRef}
                    className={`absolute w-7 h-7 sm:w-11 sm:h-11 rounded-full border-2 border-white/90 will-change-transform ${
                      isRunningMode
                        ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-[0_0_16px_rgba(245,158,11,0.9)]'
                        : 'bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 shadow-[0_0_14px_rgba(0,240,255,0.85)]'
                    }`}
                  />
                </div>

                {!inTrain && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleRunMode();
                    }}
                    className={`px-2 py-1.5 sm:px-3.5 sm:py-2.5 rounded-xl border-2 font-display font-extrabold text-[9px] sm:text-xs flex flex-col items-center justify-center gap-0.5 touch-none select-none cursor-pointer transition-all active:scale-95 ${
                      isRunningMode
                        ? 'bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 border-white shadow-[0_0_22px_rgba(245,158,11,0.85)]'
                        : 'bg-[#0B0616]/90 text-cyan-300 border-cyan-400/65 shadow-[0_0_14px_rgba(0,240,255,0.2)]'
                    }`}
                    title="হাঁটা / দৌড়ানো মোড পরিবর্তন করুন"
                  >
                    <span className="text-xs sm:text-base leading-none">{isRunningMode ? '🏃' : '🚶'}</span>
                    <span className="uppercase tracking-tighter">{isRunningMode ? 'রান চালু' : 'রান'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Bottom-Right Action & Driving Pedal Buttons */}
            <div
              onContextMenu={(e) => e.preventDefault()}
              className="absolute bottom-2.5 right-2.5 sm:bottom-5 sm:right-6 z-20 flex items-end gap-1 sm:gap-2.5 pointer-events-auto select-none"
            >
              <div className="flex flex-col items-end gap-0.5 sm:gap-1">
                {!inVehicle &&
                  (currentInteriorZone === 'PLAYER_HOME' ||
                    currentInteriorZone === 'GARMENTS' ||
                    currentInteriorZone === 'OFFICE_COURT' ||
                    targetNpc?.role === 'GARMENT_WORKER' ||
                    targetNpc?.role === 'LAWYER' ||
                    targetNpc?.role === 'JUDGE' ||
                    targetNpc?.role === 'OFFICE_EXECUTIVE' ||
                    targetNpc?.role === 'BEGGAR' ||
                    targetNpc?.role === 'CLUB_DANCER' ||
                    targetNpc?.role === 'FOOTBALLER' ||
                    targetNpc?.role === 'HOTEL_CHEF' ||
                    targetNpc?.role === 'MUDI_SHOPKEEPER' ||
                    currentInteriorZone === 'NIGHTCLUB' ||
                    currentInteriorZone === 'FOOTBALL_STADIUM' ||
                    currentInteriorZone === 'HOTEL' ||
                    currentInteriorZone === 'MUDI_DOKAN' ||
                    currentInteriorZone === 'SHOPPING_MALL' ||
                    currentInteriorZone === 'KACHA_BAZAR' ||
                    currentInteriorZone === 'HOSPITAL' ||
                    targetNpc?.id === 'tania_mall' ||
                    targetNpc?.id === 'sobhan_bazar' ||
                    targetNpc?.role === 'MEDIC' ||
                    targetNpc?.role === 'NURSE') && (
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleContextZoneOrNpcAction();
                      }}
                      className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-xl font-display font-bold text-[9px] sm:text-xs bg-gradient-to-r from-amber-400 via-pink-500 to-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.6)] border border-white/90 active:scale-95 transition-transform cursor-pointer touch-none select-none"
                    >
                      <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span>
                        {currentInteriorZone === 'PLAYER_HOME'
                          ? '🏠 নিজের ঘর'
                          : currentInteriorZone === 'GARMENTS' || targetNpc?.role === 'GARMENT_WORKER'
                            ? '🧵 গার্মেন্টস'
                            : currentInteriorZone === 'OFFICE_COURT' ||
                                targetNpc?.role === 'LAWYER' ||
                                targetNpc?.role === 'JUDGE' ||
                                targetNpc?.role === 'OFFICE_EXECUTIVE'
                              ? '⚖️ অফিস'
                              : targetNpc?.role === 'BEGGAR'
                                ? '🤲 ভিক্ষা'
                                : currentInteriorZone === 'NIGHTCLUB' || targetNpc?.role === 'CLUB_DANCER'
                                  ? '💃 নাচ'
                                  : currentInteriorZone === 'FOOTBALL_STADIUM' || targetNpc?.role === 'FOOTBALLER'
                                    ? '⚽ ফুটবল'
                                    : currentInteriorZone === 'HOTEL' || targetNpc?.role === 'HOTEL_CHEF'
                                      ? '🍛 কাচ্চি'
                                      : currentInteriorZone === 'MUDI_DOKAN' || targetNpc?.role === 'MUDI_SHOPKEEPER'
                                        ? '🏪 মুদি'
                                        : currentInteriorZone === 'SHOPPING_MALL' || targetNpc?.id === 'tania_mall'
                                          ? '🛍️ শপিং'
                                          : currentInteriorZone === 'KACHA_BAZAR' || targetNpc?.id === 'sobhan_bazar'
                                            ? '🛒 বাজার'
                                            : '🏥 চিকিৎসা'}
                      </span>
                    </button>
                  )}

                {(canBoardTrain || inTrain) && !inVehicle && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleTrain();
                    }}
                    className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-xl font-display font-bold text-[9px] sm:text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.6)] border border-white/90 active:scale-95 transition-transform cursor-pointer touch-none select-none"
                  >
                    <TrainFront className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>{inTrain ? 'নামুন' : 'ট্রেন'}</span>
                  </button>
                )}

                {((!inVehicle && nearestVehicle?.driverNpcId && nearestVehicle?.allowsPlayerPassenger) || inVehicle) && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCoRideOrInvitePassenger();
                    }}
                    className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-xl font-display font-bold text-[9px] sm:text-[11px] bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-[0_0_16px_rgba(236,72,153,0.55)] border border-white/85 active:scale-95 transition-transform cursor-pointer touch-none select-none"
                  >
                    <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>
                      {inVehicle && inVehicleSeat === 'passenger'
                        ? 'নামুন'
                        : inVehicle && inVehicle.passengerNpcId
                          ? 'নামান'
                          : inVehicle
                            ? 'যাত্রী (G)'
                            : 'যাত্রী'}
                    </span>
                  </button>
                )}

                {(nearestVehicle || inVehicle) && !inTrain && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleVehicle();
                    }}
                    className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-xl font-display font-bold text-[9px] sm:text-xs bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_16px_rgba(0,240,255,0.55)] border border-white/85 active:scale-95 transition-transform cursor-pointer touch-none select-none"
                  >
                    <CarFront className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>{inVehicle ? 'নামুন' : `${nearestVehicle?.name.split(' ')[0] || 'গাড়ি'}`}</span>
                  </button>
                )}

                {!isPlayerDriving && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleChantMichilSlogan();
                    }}
                    className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-xl font-display font-bold text-[9px] sm:text-[11px] bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.45)] border border-white/80 active:scale-95 transition-transform cursor-pointer touch-none select-none"
                  >
                    <Megaphone className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>স্লোগান</span>
                  </button>
                )}
              </div>

              {isPlayerDriving && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                      setDrivingDirection('forward', true);
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDrivingDirection('forward', false);
                    }}
                    onPointerCancel={() => setDrivingDirection('forward', false)}
                    onLostPointerCapture={() => setDrivingDirection('forward', false)}
                    className={`w-10 h-9 sm:w-20 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center touch-none select-none cursor-pointer transition-transform ${
                      driveBtnState.forward
                        ? 'bg-emerald-400 text-slate-950 border-white scale-95 shadow-[0_0_24px_rgba(16,185,129,0.95)]'
                        : 'bg-gradient-to-b from-emerald-500 to-teal-600 text-slate-950 border-white/90 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5 sm:w-6 sm:h-6 stroke-[2.8]" />
                    <span className="font-display text-[7.5px] sm:text-[11px] font-black">সামনে</span>
                  </button>

                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                      setDrivingDirection('backward', true);
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDrivingDirection('backward', false);
                    }}
                    onPointerCancel={() => setDrivingDirection('backward', false)}
                    onLostPointerCapture={() => setDrivingDirection('backward', false)}
                    className={`w-10 h-8 sm:w-20 sm:h-14 rounded-xl border-2 flex flex-col items-center justify-center touch-none select-none cursor-pointer transition-transform ${
                      driveBtnState.backward
                        ? 'bg-rose-500 text-white border-white scale-95 shadow-[0_0_22px_rgba(244,63,94,0.9)]'
                        : 'bg-[#0B0616]/90 text-rose-300 border-rose-500/75 shadow-[0_0_14px_rgba(244,63,94,0.3)]'
                    }`}
                  >
                    <ArrowDown className="w-2.5 h-2.5 sm:w-5 sm:h-5 stroke-[2.5]" />
                    <span className="font-display text-[7.5px] sm:text-[10.5px] font-extrabold">পিছনে</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePlayerAttack();
                }}
                className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-rose-600 via-pink-600 to-amber-500 text-white shadow-[0_0_24px_rgba(244,63,94,0.7)] border-2 border-white/90 flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer touch-none select-none shrink-0"
              >
                <Swords className="w-3 h-3 sm:w-5 sm:h-5" />
                <span className="font-display text-[7px] sm:text-[9.5px] font-extrabold tracking-wider uppercase mt-0.5">
                  {inVehicle?.type === 'RICKSHAW'
                    ? 'বেল'
                    : inVehicle?.type === 'POLICE_CRUISER'
                      ? 'সাইরেন'
                      : inVehicle
                        ? 'হর্ন'
                        : 'মারুন'}
                </span>
              </button>
            </div>
          </>
        )}



        {/* Title Screen / Game Over / Victory Modal (Mobile Scrollable & Compact) */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 z-40 bg-[#070310]/85 backdrop-blur-md flex items-center justify-center p-2.5 overflow-y-auto">
            <div className="max-w-lg w-full bg-[#0E0720] border-2 border-emerald-500/60 rounded-2xl p-3.5 sm:p-5 shadow-[0_0_45px_rgba(16,185,129,0.3)] text-center relative overflow-hidden my-auto">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[9.5px] uppercase mb-1.5">
                <Store className="w-3 h-3" /> Baper City Real-Life Open World
              </div>

              <h1 className="font-display font-black text-2xl sm:text-4xl tracking-tight uppercase bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-500 bg-clip-text text-transparent mb-1">
                {gameState === 'TITLE_MENU' && 'বাপের সিটি (BAPER CITY)'}
                {gameState === 'GAME_OVER' && 'বাপের সিটিতে পরাস্ত! (WASTED)'}
                {gameState === 'VICTORY' && 'চাঁদাবাজমুক্ত বাপের সিটি!'}
              </h1>

              <p className="text-slate-300 text-[11px] leading-snug mb-2.5">
                {gameState === 'TITLE_MENU' ? communityBannerText : endReason}
              </p>

              <div className="grid grid-cols-2 gap-1.5 text-left mb-3 bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-[10px]">
                <div className="flex items-start gap-1.5">
                  <CarFront className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">মোবাইল বাটন ড্রাইভিং</div>
                    <div className="text-slate-400 text-[9px]">
                      বামে-ডানে ও সামনে-পিছনে যাওয়ার আলাদা বাটন
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Store className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">শপিং মল, বাজার ও হাসপাতাল</div>
                    <div className="text-slate-400 text-[9px]">
                      খোলা ছাদের দালানের ভেতরে ঢুকে কেনাকাটা ও চিকিৎসা
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartOrResetGame}
                className="w-full py-2.5 rounded-xl font-display font-extrabold text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>
                  {gameState === 'TITLE_MENU' ? 'বাপের সিটিতে প্রবেশ করুন (PLAY)' : 'আবার খেলুন'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
