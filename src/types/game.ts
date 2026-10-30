export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export type CharacterMood =
  | 'Calm'
  | 'Friendly'
  | 'Happy'
  | 'Excited'
  | 'Sad'
  | 'Anxious'
  | 'Tired'
  | 'Suspicious'
  | 'Angry'
  | 'Scared'
  | 'Busy';

export type NPCRole =
  | 'POLITICAL_LEADER'
  | 'ACTIVIST'
  | 'CHANDABAJ'
  | 'BUS_CONDUCTOR'
  | 'RICKSHAW_PULLER'
  | 'BIKER'
  | 'SYNDICATE_BOSS'
  | 'VAN_VENDOR'
  | 'SHOPKEEPER'
  | 'COP'
  | 'TAXI_DRIVER'
  | 'COMMUTER'
  | 'MEDIC'
  | 'NURSE'
  | 'PATIENT'
  | 'BEGGAR'
  | 'QUARRELER'
  | 'CLUB_DANCER'
  | 'FOOTBALLER'
  | 'LOCKUP_PRISONER'
  | 'STREET_CRIMINAL'
  | 'GARMENT_WORKER'
  | 'LAWYER'
  | 'JUDGE'
  | 'OFFICE_EXECUTIVE'
  | 'HOTEL_CHEF'
  | 'MUDI_SHOPKEEPER'
  | 'JOGGER'
  | 'INFORMANT';

export type NPCBehavior =
  | 'PATROL'
  | 'VENDOR_DUTY'
  | 'DRIVING'
  | 'PASSENGER_RIDE'
  | 'TRAIN_PASSENGER'
  | 'DAILY_LIFE'
  | 'MICHIL_RALLY'
  | 'MEETING_SPEECH'
  | 'EXTORTION'
  | 'BEGGING'
  | 'QUARREL'
  | 'DANCE'
  | 'PLAY_FOOTBALL'
  | 'LOCKED_UP'
  | 'CRIME_SPREE'
  | 'POLICE_CHASE_CRIMINAL'
  | 'WORK_GARMENTS'
  | 'WORK_OFFICE_COURT'
  | 'WAIT_BUS'
  | 'WAIT_TRAIN'
  | 'MOB_CHASE'
  | 'AGGRO'
  | 'PURSUIT'
  | 'PANIC_FLEE'
  | 'STALK'
  | 'CHEER';

export type VehicleType =
  | 'DHAKA_BUS'
  | 'RICKSHAW'
  | 'MOTORCYCLE'
  | 'VAN_GARI'
  | 'TAXI_CAB'
  | 'POLICE_CRUISER'
  | 'MUSCLE_V8'
  | 'COUNTACH_GT';

export interface Vector2D {
  x: number;
  y: number;
}

export interface TerrainZone {
  id: string;
  name: string;
  type: 'SAND_BEACH' | 'OCEAN_SURF' | 'TROPICAL_PARK' | 'INDUSTRIAL_CONCRETE' | 'PLAZA_TILES';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StreetStall {
  id: string;
  name: string;
  bengaliName: string;
  kind: 'CART_VAN' | 'SIDEWALK_SHOP' | 'TEA_STALL' | 'FOOD_TRUCK';
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  canopyColor1: string;
  canopyColor2: string;
  ownerId: string;
}

export interface TrainState {
  x: number;
  y: number;
  trackY: number;
  angle?: number;
  legIndex?: number;
  speed: number;
  direction: 1 | -1;
  numCoaches: number;
  hornCooldown: number;
  chugCooldown: number;
  stationStopTimer: number;
  currentStationName?: string;
  passengerNpcIds?: string[];
}

export interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  height3D: number;
  baseColor: string;
  roofColor: string;
  neonColor: string;
  accentColor: string;
  enterable?: boolean;
  interiorType?:
    | 'HOSPITAL'
    | 'SHOPPING_MALL'
    | 'KACHA_BAZAR'
    | 'POLICE_STATION'
    | 'RESIDENTIAL'
    | 'NIGHTCLUB'
    | 'FOOTBALL_STADIUM'
    | 'HOTEL'
    | 'MUDI_DOKAN'
    | 'OFFICE_COURT'
    | 'GARMENTS'
    | 'PLAYER_HOME';
  doorSide?: 'bottom' | 'right' | 'left' | 'top';
}

export interface RoadSegment {
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: 'horizontal' | 'vertical';
}

export interface PalmTree {
  x: number;
  y: number;
  scale: number;
  seed: number;
}

export interface StreetLamp {
  x: number;
  y: number;
  color: string;
}

export interface VehicleState {
  id: string;
  name: string;
  type: VehicleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  maxSpeed: number;
  angle: number;
  steerAngle: number;
  width: number;
  length: number;
  primaryColor: string;
  secondaryColor: string;
  neonColor: string;
  headlightsOn: boolean;
  sirenOn?: boolean;
  sirenAudioCooldown?: number;
  driverNpcId: string | null;
  passengerNpcId: string | null;
  multiPassengerNpcIds?: string[];
  busStopTimer?: number;
  lastBusStopId?: string;
  allowsPlayerPassenger: boolean;
  routeBanner?: string;
  routeWaypoints: Vector2D[];
  routeIndex: number;
  hitCooldown: number;
}

export interface NPCAnalysisState {
  threatLevel: number; // 0 - 100
  trustScore: number; // 0 - 100
  emotionEmoji: string;
  emotionLabel: string;
  dailyActivity: string;
  playerAssessment: string;
  currentGoal: string;
  socialTargetName: string | null;
}

export interface CommunityNPCState {
  id: string;
  name: string;
  bengaliName: string;
  title: string;
  bio: string;
  personality: string;
  role: NPCRole;
  isFemale?: boolean;
  speaksEnglishOnly?: boolean;
  placardText?: string;
  money?: number;
  wealthLabel?: string;
  ownThought?: string;
  currentDecision?: string;
  hunger?: number;
  energy?: number;
  workProgress?: number;
  rideTimer?: number;
  decisionTimer?: number;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  mood: CharacterMood;
  behavior: NPCBehavior;
  behaviorTimer: number;
  speech: string;
  speechTimer: number;
  speechCooldown: number;
  voicePitch: number;
  voiceRate: number;
  waypoints: Vector2D[];
  waypointIndex: number;
  walkSpeed: number;
  runSpeed: number;
  attackDamage: number;
  attackCooldown: number;
  punchTimer: number;
  punchHand: 'left' | 'right';
  hitFlashTimer: number;
  carHitCooldown: number;
  walkCycle: number;
  respawnTimer: number;
  drivingVehicleId: string | null;
  ridingVehicleId: string | null;
  inTrain: boolean;
  timesAttackedByPlayer: number;
  timesChattedWithPlayer: number;
  analysis: NPCAnalysisState;
  primaryColor: string;
  secondaryColor: string;
  hairColor: string;
  glassesColor: string;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  money: number; // পকেটের টাকা (৳)
  isRunning?: boolean; // নরমাল হাঁটা (false) বনাম রান মোড (true)
  inVehicleId: string | null;
  inVehicleSeat: 'driver' | 'passenger' | null;
  inTrain: boolean;
  punchTimer: number;
  punchHand: 'left' | 'right';
  punchCooldown: number;
  hitFlashTimer: number;
  walkCycle: number;
  score: number;
  popularity: number; // জনসমর্থন (0 - 100)
}

export interface FootballState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX?: number;
  homeY?: number;
  homeScore?: number;
  awayScore?: number;
  lastTouchedBy?: string;
  teamAScore?: number;
  teamBScore?: number;
  goalCelebrationTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

export interface FloatingDamage {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  isPlayer: boolean;
  text: string;
  mood?: CharacterMood;
  analysisSummary?: string;
  timestamp: string;
}

export interface WorldSimulationRef {
  player: PlayerState;
  vehicles: VehicleState[];
  npcs: CommunityNPCState[];
  train: TrainState;
  football: FootballState;
  activeCrimeNpcId: string | null;
  crimeTimer: number;
  particles: Particle[];
  skidMarks: SkidMark[];
  floatingDamages: FloatingDamage[];
  camera: {
    x: number;
    y: number;
    shake: number;
    angleLevel?: 1 | 2 | 3 | 4 | 5;
    zoom?: number;
  };
  hitstopTimer: number;
  mobAlertTimer: number;
  activeMichilSlogan: string;
  keys: Record<string, boolean>;
  joystick: {
    active: boolean;
    dx: number;
    dy: number;
  };
  nearestVehicleId: string | null;
  nearestVehicleDist: number;
  nearestNpcId: string | null;
  nearestNpcDist: number;
  nearbyNpcIds: string[];
  canBoardTrain: boolean;
}
