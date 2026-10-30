import {
  Building,
  PalmTree,
  RoadSegment,
  StreetLamp,
  StreetStall,
  TerrainZone,
} from '../types/game';

export const WORLD_WIDTH = 5400;
export const WORLD_HEIGHT = 4200;

export const TRAIN_TRACK_Y = 660;
export const TRAIN_STATION_RECT = {
  x: 1640,
  y: 550,
  w: 620,
  h: 74,
};

// ম্যাপের চারপাশ ঘিরে মেট্রো ট্রেনের লুপ ট্র্যাক (Perimeter Rail Loop around all 4 sides of the map)
export const TRAIN_LOOP_RECT = {
  leftX: 110,
  topY: 660,
  rightX: 4655,
  bottomY: 3920,
};

export const TRAIN_STATIONS = [
  {
    id: 'st-north',
    name: 'কমলাপুর সেন্ট্রাল রেল স্টেশন (উত্তর)',
    legIndex: 0,
    stopX: 1950,
    stopY: 660,
    platformX: 1640,
    platformY: 550,
    platformW: 620,
    platformH: 74,
    waitX: 1890,
    waitY: 605,
  },
  {
    id: 'st-east',
    name: 'সদরঘাট ও স্টেডিয়াম রেল স্টেশন (পূর্ব)',
    legIndex: 1,
    stopX: 4655,
    stopY: 1820,
    platformX: 4565,
    platformY: 1620,
    platformW: 62,
    platformH: 360,
    waitX: 4595,
    waitY: 1790,
  },
  {
    id: 'st-south',
    name: 'যাত্রাবাড়ী ও চকবাজার রেল স্টেশন (দক্ষিণ)',
    legIndex: 2,
    stopX: 2250,
    stopY: 3920,
    platformX: 1960,
    platformY: 3815,
    platformW: 560,
    platformH: 70,
    waitX: 2220,
    waitY: 3855,
  },
  {
    id: 'st-west',
    name: 'ধানমন্ডি ও মেডিকেল রেল স্টেশন (পশ্চিম)',
    legIndex: 3,
    stopX: 110,
    stopY: 1820,
    platformX: 142,
    platformY: 1620,
    platformW: 62,
    platformH: 360,
    waitX: 170,
    waitY: 1790,
  },
];

// মেইন ক্যারেক্টারের নির্দিষ্ট নিজস্ব বাড়ি (Main Character's Dedicated Own House / Villa)
export const PLAYER_HOME_RECT = {
  x: 1860,
  y: 710,
  w: 650,
  h: 190,
};

export const CENTRAL_PARK_RECT = {
  x: 1380,
  y: 1120,
  w: 1140,
  h: 880,
};

export const PARK_POND_CIRCLE = {
  x: 1950,
  y: 1560,
  r: 165,
};

// বাপের সিটি জাতীয় ফুটবল স্টেডিয়াম (Baper City Football Stadium)
export const FOOTBALL_STADIUM_RECT = {
  x: 3500,
  y: 1140,
  w: 940,
  h: 520,
};

// Shahbagh Political Rally & Public Meeting Stage (জনসভা ও মিছিল চত্বর)
export const SHAHBAGH_RALLY_STAGE = {
  x: 1850,
  y: 1135,
  w: 220,
  h: 72,
};

// Dhaka Bus Stop Shelters (গুলশান, ফার্মগেট, শাহবাগ, যাত্রাবাড়ী ও স্টেডিয়াম বাস স্টপেজ)
export const DHAKA_BUS_STOPS = [
  {
    id: 'bus-stop-shahbagh',
    name: 'SHAHBAGH BUS STOP · শাহবাগ বাস স্টপেজ',
    routeHint: 'গুলশান · ফার্মগেট · মতিঝিল · যাত্রাবাড়ী',
    x: 1740,
    y: 912,
    w: 130,
    h: 26,
  },
  {
    id: 'bus-stop-jatrabari',
    name: 'JATRABARI & MOTIJHEEL STOP · যাত্রাবাড়ী মোড়',
    routeHint: 'যাত্রাবাড়ী · সায়েদাবাদ · সদরঘাট · গুলশান',
    x: 2440,
    y: 2012,
    w: 140,
    h: 26,
  },
  {
    id: 'bus-stop-gulshan',
    name: 'GULSHAN-FARMGATE STOP · গুলশান-ফার্মগেট কাউন্টার',
    routeHint: 'গুলশান ১-২ · বনানী · ফার্মগেট · শাহবাগ',
    x: 1360,
    y: 352,
    w: 140,
    h: 26,
  },
  {
    id: 'bus-stop-stadium',
    name: 'STADIUM & GARMENTS STOP · স্টেডিয়াম ও গার্মেন্টস মোড়',
    routeHint: 'স্টেডিয়াম · গার্মেন্টস · মতিঝিল · চকবাজার',
    x: 3680,
    y: 912,
    w: 150,
    h: 26,
  },
];

export const TERRAIN_ZONES: TerrainZone[] = [
  {
    id: 'industrial-yard',
    name: 'TEJGAON & KAMALAPUR RAIL YARD (তেজগাঁও ও কমলাপুর রেল ইয়ার্ড)',
    type: 'INDUSTRIAL_CONCRETE',
    x: 120,
    y: 100,
    w: 1060,
    h: 490,
  },
  {
    id: 'market-plaza',
    name: 'SHAHBAGH & NEW MARKET FOOTPATH (শাহবাগ ও নিউ মার্কেট চত্বর)',
    type: 'PLAZA_TILES',
    x: 1380,
    y: 710,
    w: 460,
    h: 190,
  },
  {
    id: 'central-park',
    name: 'RAMNA GREEN PARK & DHANMONDI LAKE (রমনা পার্ক ও লেক)',
    type: 'TROPICAL_PARK',
    x: CENTRAL_PARK_RECT.x,
    y: CENTRAL_PARK_RECT.y,
    w: CENTRAL_PARK_RECT.w,
    h: CENTRAL_PARK_RECT.h,
  },
  {
    id: 'ocean-beach-sand',
    name: 'SADARGHAT & BURIGANGA RIVER BANK (সদরঘাট ও বুড়িগঙ্গা তীর)',
    type: 'SAND_BEACH',
    x: 4680,
    y: 100,
    w: 420,
    h: 3960,
  },
  {
    id: 'ocean-beach-surf',
    name: 'BURIGANGA RIVER WATERFRONT (বুড়িগঙ্গা নদী)',
    type: 'OCEAN_SURF',
    x: 5100,
    y: 100,
    w: 240,
    h: 3960,
  },
];

export const ROADS: RoadSegment[] = [
  // Horizontal Boulevards across the 5400px expanded Dhaka city
  { x: 180, y: 380, w: 4460, h: 140, orientation: 'horizontal' },
  { x: 180, y: 940, w: 4460, h: 150, orientation: 'horizontal' },
  { x: 180, y: 2040, w: 4460, h: 150, orientation: 'horizontal' },
  { x: 180, y: 2740, w: 4460, h: 140, orientation: 'horizontal' },
  { x: 180, y: 3480, w: 4460, h: 140, orientation: 'horizontal' },
  // Mid Horizontal Connectors (West & East of Ramna Park)
  { x: 180, y: 1490, w: 1200, h: 135, orientation: 'horizontal' },
  { x: 2520, y: 1490, w: 920, h: 135, orientation: 'horizontal' },
  // Vertical Avenues across the 4200px expanded Dhaka city
  { x: 180, y: 120, w: 135, h: 3900, orientation: 'vertical' },
  { x: 1180, y: 120, w: 150, h: 3900, orientation: 'vertical' },
  { x: 2560, y: 120, w: 150, h: 3900, orientation: 'vertical' },
  { x: 3300, y: 120, w: 145, h: 3900, orientation: 'vertical' },
  { x: 4500, y: 120, w: 145, h: 3900, orientation: 'vertical' },
];

export const STREET_STALLS: StreetStall[] = [
  {
    id: 'stall-rahim-van',
    name: "MAMA'S DHAKA FUCHKA & CHOTPOTI VAN",
    bengaliName: 'রহিম মামার ভ্যান গাড়ি (ফুচকা ও চটপটি)',
    kind: 'CART_VAN',
    x: 1345,
    y: 1240,
    w: 58,
    h: 36,
    angle: Math.PI / 2,
    canopyColor1: '#f59e0b',
    canopyColor2: '#ef4444',
    ownerId: 'rahim',
  },
  {
    id: 'stall-chacha-tea',
    name: "HALIM CHACHA'S TONG-ER CHA STALL",
    bengaliName: 'হালিম চাচার ফুটপাতের টংয়ের চায়ের দোকান',
    kind: 'TEA_STALL',
    x: 1520,
    y: 895,
    w: 68,
    h: 38,
    angle: 0,
    canopyColor1: '#10b981',
    canopyColor2: '#fde047',
    ownerId: 'chacha',
  },
  {
    id: 'stall-mama-kebab',
    name: 'OLD DHAKA HAJI BIRYANI & KEBAB VAN',
    bengaliName: 'পুরান ঢাকার কাচ্চি ও কাবাব ভ্যান',
    kind: 'FOOD_TRUCK',
    x: 1135,
    y: 860,
    w: 74,
    h: 40,
    angle: 0,
    canopyColor1: '#ff2a85',
    canopyColor2: '#00f0ff',
    ownerId: 'marco',
  },
  {
    id: 'stall-gadget-bazaar',
    name: 'GAUSIA & NEW MARKET FOOTPATH STALL',
    bengaliName: 'নিউ মার্কেট ফুটপাতের কাপড় ও ঘড়ির দোকান',
    kind: 'SIDEWALK_SHOP',
    x: 1750,
    y: 895,
    w: 72,
    h: 38,
    angle: 0,
    canopyColor1: '#8b5cf6',
    canopyColor2: '#00f0ff',
    ownerId: 'zara',
  },
  {
    id: 'stall-beach-coconut',
    name: 'SADARGHAT GREEN COCONUT VAN',
    bengaliName: 'সদরঘাটের ডাব ও শরবত ভ্যান',
    kind: 'CART_VAN',
    x: 4655,
    y: 1380,
    w: 58,
    h: 36,
    angle: Math.PI / 2,
    canopyColor1: '#06b6d4',
    canopyColor2: '#fde047',
    ownerId: 'karim_vendor',
  },
  {
    id: 'stall-park-icecream',
    name: 'RAMNA PARK JHALMURI & ICE CREAM VAN',
    bengaliName: 'রমনা পার্কের ঝালমুড়ি ও আইসক্রিম ভ্যান',
    kind: 'CART_VAN',
    x: 2535,
    y: 1780,
    w: 58,
    h: 36,
    angle: -Math.PI / 2,
    canopyColor1: '#ec4899',
    canopyColor2: '#a855f7',
    ownerId: 'salma_commuter',
  },
];

export const BUILDINGS: Building[] = [
  // Row 1 (North Skyline above Rail Line: Wholesale Depot, Nightclub, Office/Court, Hotel, Garments Factory)
  {
    id: 'cargo-depot',
    name: 'কারওয়ান বাজার পাইকারি আড়ত (KARWAN BAZAR)',
    x: 360,
    y: 120,
    w: 760,
    h: 220,
    height3D: 85,
    baseColor: '#9a3412',
    roofColor: '#cbd5e1',
    neonColor: '#78350f',
    accentColor: '#d97706',
  },
  {
    id: 'malibu-club',
    name: 'বাপের সিটি ডিজে নাইট ক্লাব (BAPER CITY NIGHTCLUB)',
    x: 1380,
    y: 120,
    w: 520,
    h: 220,
    height3D: 110,
    baseColor: '#701a75',
    roofColor: '#1e1b4b',
    neonColor: '#f43f5e',
    accentColor: '#e879f9',
    enterable: true,
    interiorType: 'NIGHTCLUB',
    doorSide: 'bottom',
  },
  {
    id: 'syndicate-tower',
    name: 'মতিঝিল ব্যাংক ও জজ কোর্ট আদালত (OFFICE & COURT)',
    x: 1960,
    y: 120,
    w: 560,
    h: 220,
    height3D: 155,
    baseColor: '#b45309',
    roofColor: '#f1f5f9',
    neonColor: '#92400e',
    accentColor: '#f59e0b',
    enterable: true,
    interiorType: 'OFFICE_COURT',
    doorSide: 'bottom',
  },
  {
    id: 'ocean-view-hotel',
    name: 'হোটেল সুলতান ডাইন ও আবাসিক (HOTEL & KACCHI)',
    x: 2760,
    y: 120,
    w: 490,
    h: 220,
    height3D: 135,
    baseColor: '#0f766e',
    roofColor: '#f8fafc',
    neonColor: '#115e59',
    accentColor: '#14b8a6',
    enterable: true,
    interiorType: 'HOTEL',
    doorSide: 'bottom',
  },
  {
    id: 'garments-factory',
    name: 'পদ্মা সোয়েটার ও গার্মেন্টস ফ্যাক্টরি (GARMENTS FACTORY)',
    x: 3500,
    y: 120,
    w: 940,
    h: 220,
    height3D: 105,
    baseColor: '#0369a1',
    roofColor: '#e2e8f0',
    neonColor: '#0284c7',
    accentColor: '#38bdf8',
    enterable: true,
    interiorType: 'GARMENTS',
    doorSide: 'bottom',
  },

  // Row 2 (Shopping Mall, Player's Own House Villa, Mudi Dokan, Corporate Office)
  {
    id: 'cortez-plaza',
    name: 'বাপের সিটি শপিং মল ও নিউ মার্কেট (SHOPPING MALL)',
    x: 360,
    y: 710,
    w: 760,
    h: 190,
    height3D: 105,
    baseColor: '#b91c1c',
    roofColor: '#e7e5e4',
    neonColor: '#7f1d1d',
    accentColor: '#f59e0b',
    enterable: true,
    interiorType: 'SHOPPING_MALL',
    doorSide: 'bottom',
  },
  {
    id: 'player-home-villa',
    name: '🏠 বাপের ভিলা · আপনার নিজস্ব ঘর (YOUR HOME)',
    x: 1860,
    y: 710,
    w: 650,
    h: 190,
    height3D: 110,
    baseColor: '#0d9488',
    roofColor: '#f0fdfa',
    neonColor: '#00f0ff',
    accentColor: '#fde047',
    enterable: true,
    interiorType: 'PLAYER_HOME',
    doorSide: 'bottom',
  },
  {
    id: 'neon-arcade',
    name: 'বিসমিল্লাহ জেনারেল ও মুদি দোকান (MUDI DOKAN)',
    x: 2760,
    y: 710,
    w: 490,
    h: 190,
    height3D: 95,
    baseColor: '#9f1239',
    roofColor: '#f5f5f4',
    neonColor: '#881337',
    accentColor: '#d97706',
    enterable: true,
    interiorType: 'MUDI_DOKAN',
    doorSide: 'bottom',
  },
  {
    id: 'eastern-plaza-office',
    name: 'গুলশান কর্পোরেট অফিস ও চেম্বার (CORPORATE OFFICE)',
    x: 3500,
    y: 710,
    w: 940,
    h: 190,
    height3D: 115,
    baseColor: '#1e3a8a',
    roofColor: '#f1f5f9',
    neonColor: '#3b82f6',
    accentColor: '#60a5fa',
    enterable: true,
    interiorType: 'OFFICE_COURT',
    doorSide: 'bottom',
  },

  // Row 3 (Garage, Hospital, Kacha Bazar, Police Station, and National Football Stadium!)
  {
    id: 'sunshine-autos',
    name: 'ফার্মগেট রিকশা ও বাইক গ্যারেজ (FARMGATE GARAGE)',
    x: 360,
    y: 1140,
    w: 760,
    h: 310,
    height3D: 80,
    baseColor: '#a16207',
    roofColor: '#d6d3d1',
    neonColor: '#713f12',
    accentColor: '#eab308',
  },
  {
    id: 'vice-hospital',
    name: 'ঢাকা মেডিকেল কলেজ হাসপাতাল (DHAKA MEDICAL)',
    x: 360,
    y: 1670,
    w: 760,
    h: 320,
    height3D: 115,
    baseColor: '#0d9488',
    roofColor: '#f8fafc',
    neonColor: '#0f766e',
    accentColor: '#10b981',
    enterable: true,
    interiorType: 'HOSPITAL',
    doorSide: 'right',
  },
  {
    id: 'viper-lounge',
    name: 'কারওয়ান কাঁচাবাজার ও সবজি আড়ত (KACHA BAZAR)',
    x: 2760,
    y: 1140,
    w: 490,
    h: 310,
    height3D: 125,
    baseColor: '#15803d',
    roofColor: '#e2e8f0',
    neonColor: '#166534',
    accentColor: '#22c55e',
    enterable: true,
    interiorType: 'KACHA_BAZAR',
    doorSide: 'left',
  },
  {
    id: 'vcpd-hq',
    name: 'ডিএমপি রমনা মডেল থানা ও হাজত (DMP POLICE THANA)',
    x: 2760,
    y: 1670,
    w: 490,
    h: 320,
    height3D: 110,
    baseColor: '#1d4ed8',
    roofColor: '#f1f5f9',
    neonColor: '#1e3a8a',
    accentColor: '#3b82f6',
    enterable: true,
    interiorType: 'POLICE_STATION',
    doorSide: 'left',
  },
  {
    id: 'baper-city-stadium',
    name: 'বাপের সিটি জাতীয় ফুটবল স্টেডিয়াম (FOOTBALL STADIUM)',
    x: FOOTBALL_STADIUM_RECT.x,
    y: FOOTBALL_STADIUM_RECT.y,
    w: FOOTBALL_STADIUM_RECT.w,
    h: FOOTBALL_STADIUM_RECT.h,
    height3D: 65,
    baseColor: '#15803d',
    roofColor: '#166534',
    neonColor: '#22c55e',
    accentColor: '#fde047',
    enterable: true,
    interiorType: 'FOOTBALL_STADIUM',
    doorSide: 'left',
  },
  {
    id: 'high-court-annex',
    name: 'সুপ্রিম কোর্ট ও সচিবালয় ভবন (SUPREME COURT)',
    x: 3500,
    y: 1720,
    w: 940,
    h: 270,
    height3D: 110,
    baseColor: '#991b1b',
    roofColor: '#f8fafc',
    neonColor: '#dc2626',
    accentColor: '#fca5a5',
    enterable: true,
    interiorType: 'OFFICE_COURT',
    doorSide: 'bottom',
  },

  // Row 4 (Residential, Cinema, Bus Terminal, Launch Terminal, Export Garments Zone)
  {
    id: 'marina-yacht-club',
    name: 'ধানমন্ডি আবাসিক অ্যাপার্টমেন্ট ভবন (DHANMONDI ROOMS)',
    x: 360,
    y: 2240,
    w: 760,
    h: 440,
    height3D: 90,
    baseColor: '#c2410c',
    roofColor: '#f5f5f4',
    neonColor: '#9a3412',
    accentColor: '#16a34a',
    enterable: true,
    interiorType: 'RESIDENTIAL',
    doorSide: 'right',
  },
  {
    id: 'palm-cinema',
    name: 'বলাকা সিনেমা হল ও নীলক্ষেত বই মার্কেট (NILKHET)',
    x: 1380,
    y: 2240,
    w: 520,
    h: 440,
    height3D: 100,
    baseColor: '#4338ca',
    roofColor: '#e2e8f0',
    neonColor: '#312e81',
    accentColor: '#6366f1',
  },
  {
    id: 'starfish-bank',
    name: 'যাত্রাবাড়ী বাস টার্মিনাল ভবন (JATRABARI TERMINAL)',
    x: 1980,
    y: 2240,
    w: 540,
    h: 440,
    height3D: 130,
    baseColor: '#15803d',
    roofColor: '#f1f5f9',
    neonColor: '#14532d',
    accentColor: '#22c55e',
  },
  {
    id: 'ocean-drive-diner',
    name: 'সদরঘাট লঞ্চ টার্মিনাল ভবন (SADARGHAT TERMINAL)',
    x: 2760,
    y: 2240,
    w: 490,
    h: 440,
    height3D: 105,
    baseColor: '#0284c7',
    roofColor: '#f8fafc',
    neonColor: '#0c4a6e',
    accentColor: '#38bdf8',
  },
  {
    id: 'uttara-garments-2',
    name: 'উত্তরা ও গাজীপুর এক্সপোর্ট গার্মেন্টস হাব (GARMENTS HUB)',
    x: 3500,
    y: 2240,
    w: 940,
    h: 440,
    height3D: 100,
    baseColor: '#0e7490',
    roofColor: '#f1f5f9',
    neonColor: '#06b6d4',
    accentColor: '#67e8f9',
    enterable: true,
    interiorType: 'GARMENTS',
    doorSide: 'left',
  },

  // Row 5 (New Southern Expanded District: Grand Hotel, Chawkbazar Mudi Market, Banani Club, Industrial Court)
  {
    id: 'grand-radisson-hotel',
    name: 'হোটেল সোনারগাঁও ও শাহী কাচ্চি হাউস (GRAND HOTEL)',
    x: 360,
    y: 2920,
    w: 760,
    h: 480,
    height3D: 120,
    baseColor: '#0f766e',
    roofColor: '#f8fafc',
    neonColor: '#14b8a6',
    accentColor: '#f59e0b',
    enterable: true,
    interiorType: 'HOTEL',
    doorSide: 'right',
  },
  {
    id: 'chawkbazar-mudi-hub',
    name: 'চকবাজার পাইকারি মুদি ও মসলা মার্কেট (CHAWKBAZAR MUDI)',
    x: 1380,
    y: 2920,
    w: 1140,
    h: 480,
    height3D: 95,
    baseColor: '#b45309',
    roofColor: '#fef3c7',
    neonColor: '#d97706',
    accentColor: '#f59e0b',
    enterable: true,
    interiorType: 'MUDI_DOKAN',
    doorSide: 'right',
  },
  {
    id: 'banani-club-lounge',
    name: 'বনানী ভিআইপি নাইট ক্লাব ও লাউঞ্জ (BANANI NIGHTCLUB)',
    x: 2760,
    y: 2920,
    w: 490,
    h: 480,
    height3D: 110,
    baseColor: '#6b21a8',
    roofColor: '#1e1b4b',
    neonColor: '#ec4899',
    accentColor: '#f472b6',
    enterable: true,
    interiorType: 'NIGHTCLUB',
    doorSide: 'left',
  },
  {
    id: 'motijheel-stock-exchange',
    name: 'ঢাকা স্টক এক্সচেঞ্জ ও কর্পোরেট হেডকোয়ার্টার (STOCK OFFICE)',
    x: 3500,
    y: 2920,
    w: 940,
    h: 480,
    height3D: 140,
    baseColor: '#1e40af',
    roofColor: '#e2e8f0',
    neonColor: '#3b82f6',
    accentColor: '#facc15',
    enterable: true,
    interiorType: 'OFFICE_COURT',
    doorSide: 'left',
  },
];

export const PALM_TREES: PalmTree[] = [
  // Ramna Park Trees
  { x: 1440, y: 1180, scale: 1.15, seed: 1 },
  { x: 1720, y: 1175, scale: 1.05, seed: 2 },
  { x: 2180, y: 1175, scale: 1.1, seed: 3 },
  { x: 2450, y: 1180, scale: 1.2, seed: 4 },
  { x: 1440, y: 1930, scale: 1.1, seed: 5 },
  { x: 1720, y: 1935, scale: 1.05, seed: 6 },
  { x: 2180, y: 1935, scale: 1.15, seed: 7 },
  { x: 2450, y: 1930, scale: 1.05, seed: 8 },
  { x: 1680, y: 1420, scale: 1.1, seed: 9 },
  { x: 2220, y: 1420, scale: 1.1, seed: 10 },
  { x: 1680, y: 1710, scale: 1.15, seed: 11 },
  { x: 2220, y: 1710, scale: 1.15, seed: 12 },
  // Buriganga Riverfront Trees
  { x: 4720, y: 320, scale: 1.25, seed: 13 },
  { x: 4720, y: 880, scale: 1.15, seed: 14 },
  { x: 4720, y: 1480, scale: 1.2, seed: 15 },
  { x: 4720, y: 2080, scale: 1.25, seed: 16 },
  { x: 4720, y: 2680, scale: 1.15, seed: 17 },
  { x: 4720, y: 3280, scale: 1.2, seed: 18 },
  // Boulevard Trees
  { x: 1150, y: 910, scale: 1.0, seed: 20 },
  { x: 1950, y: 910, scale: 1.05, seed: 21 },
  { x: 2730, y: 910, scale: 1.0, seed: 22 },
  { x: 1150, y: 2010, scale: 1.0, seed: 23 },
  { x: 1950, y: 2010, scale: 1.05, seed: 24 },
  { x: 2730, y: 2010, scale: 1.0, seed: 25 },
];

export const STREET_LAMPS: StreetLamp[] = [
  { x: 1350, y: 925, color: '#ff2a85' },
  { x: 1750, y: 925, color: '#00f0ff' },
  { x: 2150, y: 925, color: '#ff2a85' },
  { x: 2540, y: 925, color: '#00f0ff' },
  { x: 1350, y: 1105, color: '#00f0ff' },
  { x: 2540, y: 1105, color: '#ff2a85' },
  { x: 1350, y: 2025, color: '#ff2a85' },
  { x: 1750, y: 2025, color: '#00f0ff' },
  { x: 2150, y: 2025, color: '#ff2a85' },
  { x: 2540, y: 2025, color: '#00f0ff' },
  { x: 4650, y: 800, color: '#ff2a85' },
  { x: 4650, y: 1600, color: '#00f0ff' },
  { x: 4650, y: 2400, color: '#ff2a85' },
];

export function resolveCircleBuildingCollision(
  x: number,
  y: number,
  radius: number
): { x: number; y: number; collided: boolean } {
  const safeX = Number.isFinite(x) ? x : 1450;
  const safeY = Number.isFinite(y) ? y : 1020;
  let nextX = Math.max(radius + 60, Math.min(WORLD_WIDTH - radius - 140, safeX));
  let nextY = Math.max(radius + 60, Math.min(WORLD_HEIGHT - radius - 60, safeY));
  let collided = false;

  const collideRect = (rx: number, ry: number, rw: number, rh: number) => {
    const closestX = Math.max(rx, Math.min(nextX, rx + rw));
    const closestY = Math.max(ry, Math.min(nextY, ry + rh));
    const dx = nextX - closestX;
    const dy = nextY - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius) {
      collided = true;
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;
        nextX += (dx / dist) * overlap;
        nextY += (dy / dist) * overlap;
      } else {
        const toLeft = Math.abs(nextX - rx);
        const toRight = Math.abs(rx + rw - nextX);
        const toTop = Math.abs(nextY - ry);
        const toBottom = Math.abs(ry + rh - nextY);
        const minEdge = Math.min(toLeft, toRight, toTop, toBottom);
        if (minEdge === toLeft) nextX = rx - radius;
        else if (minEdge === toRight) nextX = rx + rw + radius;
        else if (minEdge === toTop) nextY = ry - radius;
        else nextY = ry + rh + radius;
      }
    }
  };

  for (const b of BUILDINGS) {
    // Allow characters on foot (radius <= 20) to enter buildings with open-roof rooms through doorways
    if (b.enterable && radius <= 20) {
      const wt = 12; // Wall thickness
      const doorGap = 135; // Wide doorway opening
      const midX = b.x + b.w / 2;
      const midY = b.y + b.h / 2;

      // Top wall
      collideRect(b.x, b.y, b.w, wt);

      // Bottom wall (Always has a center doorway opening for easy access)
      const botLeftW = Math.max(20, (b.w - doorGap) / 2);
      collideRect(b.x, b.y + b.h - wt, botLeftW, wt);
      collideRect(midX + doorGap / 2, b.y + b.h - wt, botLeftW, wt);

      // Left wall
      if (b.doorSide === 'left') {
        const sideTopH = Math.max(20, (b.h - doorGap) / 2);
        collideRect(b.x, b.y, wt, sideTopH);
        collideRect(b.x, midY + doorGap / 2, wt, sideTopH);
      } else {
        collideRect(b.x, b.y, wt, b.h);
      }

      // Right wall
      if (b.doorSide === 'right') {
        const sideTopH = Math.max(20, (b.h - doorGap) / 2);
        collideRect(b.x + b.w - wt, b.y, wt, sideTopH);
        collideRect(b.x + b.w - wt, midY + doorGap / 2, wt, sideTopH);
      } else {
        collideRect(b.x + b.w - wt, b.y, wt, b.h);
      }
    } else {
      collideRect(b.x, b.y, b.w, b.h);
    }
  }

  for (const st of STREET_STALLS) {
    const halfW = st.w / 2;
    const halfH = st.h / 2;
    const closestX = Math.max(st.x - halfW, Math.min(nextX, st.x + halfW));
    const closestY = Math.max(st.y - halfH, Math.min(nextY, st.y + halfH));
    const dx = nextX - closestX;
    const dy = nextY - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius && distSq > 0.0001) {
      collided = true;
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      nextX += (dx / dist) * overlap;
      nextY += (dy / dist) * overlap;
    }
  }

  const pdx = nextX - PARK_POND_CIRCLE.x;
  const pdy = nextY - PARK_POND_CIRCLE.y;
  const pDist = Math.hypot(pdx, pdy);
  const minPondDist = PARK_POND_CIRCLE.r + radius;
  if (pDist < minPondDist) {
    collided = true;
    if (pDist > 0.001) {
      const push = minPondDist - pDist;
      nextX += (pdx / pDist) * push;
      nextY += (pdy / pDist) * push;
    } else {
      nextX = PARK_POND_CIRCLE.x + minPondDist;
    }
  }

  return { x: nextX, y: nextY, collided };
}
