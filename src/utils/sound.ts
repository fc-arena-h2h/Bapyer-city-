export const MAX_VOICE_HEARING_DIST = 250;
export const MAX_SFX_HEARING_DIST = 280;

interface QueuedSpeechItem {
  npcId: string;
  text: string;
  pitch: number;
  rate: number;
  distanceToPlayer: number;
  enqueuedAt: number;
}

interface CapacitorTTSPlugin {
  speak: (options: {
    text: string;
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    category?: string;
  }) => Promise<void>;
  stop: () => Promise<void>;
}

interface WindowWithCapacitor extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      TextToSpeech?: CapacitorTTSPlugin;
    };
  };
  webkitAudioContext?: typeof AudioContext;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  public voiceEnabled: boolean = true;
  private lastSpokenByNpc: Record<string, { text: string; time: number }> = {};
  private voicesLoaded: boolean = false;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private activeAudioElement: HTMLAudioElement | null = null;
  private audioUnlocked: boolean = false;

  // Sequential Turn-Taking Speech Queue State (একজনের কথা শেষ হলে আরেকজন বলবে)
  private currentSpeakingNpcId: string | null = null;
  private isCurrentlySpeaking: boolean = false;
  private speechUnlockTimer: ReturnType<typeof setTimeout> | null = null;
  private speechQueue: QueuedSpeechItem[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        const loadVoices = () => {
          try {
            this.cachedVoices = window.speechSynthesis.getVoices() || [];
            if (this.cachedVoices.length > 0) {
              this.voicesLoaded = true;
            }
          } catch {
            // ignore
          }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      // Automatically unlock WebAudio & Mobile WebView Audio on first touch/click
      const unlockAudioOnGesture = () => {
        this.ensureContext();
        if (!this.audioUnlocked && this.ctx && this.ctx.state === 'running') {
          this.audioUnlocked = true;
        }
      };

      window.addEventListener('pointerdown', unlockAudioOnGesture, { passive: true });
      window.addEventListener('touchstart', unlockAudioOnGesture, { passive: true });
      window.addEventListener('click', unlockAudioOnGesture, { passive: true });
      window.addEventListener('keydown', unlockAudioOnGesture, { passive: true });
    }
  }

  private getCapacitorTTS(): CapacitorTTSPlugin | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as WindowWithCapacitor;
    return w.Capacitor?.Plugins?.TextToSpeech || null;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const w = window as unknown as WindowWithCapacitor;
        const AudioCtx = window.AudioContext || w.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx || volume <= 0.002) return;
    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      gain.gain.setValueAtTime(Math.max(0.001, volume), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // ignore
        }
      };
      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Explicitly resumes the AudioContext from a user gesture to satisfy mobile browser policies.
   */
  public async forceUnlockAudio(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    this.audioUnlocked = ctx.state === 'running';
    return this.audioUnlocked;
  }


  /**
   * Plays an expressive humanoid formant syllable-by-syllable vocal cadence using WebAudio
   * so that on ANY Android phone / APK WebView (even offline without a Bengali TTS voice pack),
   * AI characters produce clearly audible, distinct male/female voices!
   */
  private playCharacterVocalFormants(
    text: string,
    pitch: number,
    rate: number,
    proximityVol: number,
    isPrimaryFallback: boolean
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const cleanWords = text
      .replace(/[.,!?।"'()—\-]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const syllableCount = isPrimaryFallback
      ? Math.min(18, Math.max(5, cleanWords.length * 2))
      : Math.min(5, Math.max(3, Math.ceil(text.length / 15)));

    const basePitchHz = (pitch >= 1.18 ? 235 : 138) * Math.max(0.75, Math.min(1.45, pitch));
    const speedFactor = Math.max(0.85, Math.min(1.35, rate));
    const sylDur = (isPrimaryFallback ? 0.095 : 0.065) / speedFactor;
    const sylGap = (isPrimaryFallback ? 0.125 : 0.08) / speedFactor;
    const volScale = (isPrimaryFallback ? 0.22 : 0.085) * proximityVol;

    // Vowel formant frequency pairs (F1, F2) for natural human-like speech resonance
    const vowelFormants: Array<[number, number]> = [
      [720, 1240], // 'আ' (aa)
      [420, 1980], // 'এ' (e)
      [310, 2250], // 'ই' (i)
      [460, 920],  // 'ও' (o)
      [340, 780],  // 'উ' (u)
    ];

    for (let i = 0; i < syllableCount; i++) {
      const charCode = text.charCodeAt((i * 3) % Math.max(1, text.length)) || 65;
      const [f1, f2] = vowelFormants[(charCode + i) % vowelFormants.length];
      const inflection =
        i === syllableCount - 1
          ? 0.92
          : 0.94 + ((charCode * 7 + i * 19) % 24) * 0.008;
      const startF = basePitchHz * inflection;
      const endF = startF * (i % 2 === 0 ? 1.09 : 0.93);
      const delaySec = i * sylGap + (i > 0 && i % 4 === 0 ? 0.04 : 0);

      try {
        const now = ctx.currentTime + delaySec;
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const filter1 = ctx.createBiquadFilter();
        const filter2 = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        subOsc.type = 'triangle';

        osc.frequency.setValueAtTime(startF, now);
        osc.frequency.linearRampToValueAtTime(endF, now + sylDur);

        subOsc.frequency.setValueAtTime(startF * 0.5, now);
        subOsc.frequency.linearRampToValueAtTime(endF * 0.5, now + sylDur);

        filter1.type = 'bandpass';
        filter1.frequency.setValueAtTime(f1 * (pitch >= 1.18 ? 1.12 : 1.0), now);
        filter1.Q.setValueAtTime(4.5, now);

        filter2.type = 'peaking';
        filter2.frequency.setValueAtTime(f2 * (pitch >= 1.18 ? 1.12 : 1.0), now);
        filter2.gain.setValueAtTime(8, now);
        filter2.Q.setValueAtTime(3.0, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(Math.max(0.002, volScale), now + sylDur * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sylDur);

        osc.connect(filter1);
        subOsc.connect(filter1);
        filter1.connect(filter2);
        filter2.connect(gain);
        gain.connect(ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
            subOsc.disconnect();
            filter1.disconnect();
            filter2.disconnect();
            gain.disconnect();
          } catch {
            // ignore
          }
        };

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + sylDur + 0.01);
        subOsc.stop(now + sylDur + 0.01);
      } catch {
        // Ignore audio errors
      }
    }
  }

  private stopAllActiveSpeechEngines() {
    const capTts = this.getCapacitorTTS();
    if (capTts) {
      capTts.stop().catch(() => {});
    }
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement.src = '';
      } catch {
        // ignore
      }
      this.activeAudioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  private getProximityVolume(distanceToPlayer: number, maxDist: number, maxVol: number): number {
    if (distanceToPlayer > maxDist) return 0;
    const normalized = Math.max(0, 1 - distanceToPlayer / maxDist);
    return normalized * normalized * maxVol;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.speechQueue = [];
      this.isCurrentlySpeaking = false;
      this.currentSpeakingNpcId = null;
      if (this.speechUnlockTimer) {
        clearTimeout(this.speechUnlockTimer);
        this.speechUnlockTimer = null;
      }
      this.stopAllActiveSpeechEngines();
    }
  }

  public getActiveSpeakerId(): string | null {
    return this.currentSpeakingNpcId;
  }

  /**
   * Cancels ongoing speech or queued speech if that NPC has moved too far from the player
   */
  public silenceIfTooFar(npcId: string, distanceToPlayer: number) {
    if (distanceToPlayer > MAX_VOICE_HEARING_DIST + 20) {
      this.speechQueue = this.speechQueue.filter((item) => item.npcId !== npcId);
      if (this.currentSpeakingNpcId === npcId) {
        this.stopAllActiveSpeechEngines();
        this.finishCurrentSpeechAndPlayNext();
      }
    } else {
      // Update distance for queued item if still nearby
      const q = this.speechQueue.find((item) => item.npcId === npcId);
      if (q) q.distanceToPlayer = distanceToPlayer;
    }
  }

  private finishCurrentSpeechAndPlayNext() {
    if (this.speechUnlockTimer) {
      clearTimeout(this.speechUnlockTimer);
      this.speechUnlockTimer = null;
    }
    this.isCurrentlySpeaking = false;
    this.currentSpeakingNpcId = null;

    // Wait 450ms after one person finishes speaking before the next person starts speaking!
    if (this.speechQueue.length > 0 && !this.muted) {
      this.speechUnlockTimer = setTimeout(() => {
        this.processNextInQueue();
      }, 450);
    }
  }

  private processNextInQueue() {
    if (this.muted || !this.voiceEnabled || this.isCurrentlySpeaking) return;

    const nowMs = Date.now();
    // Drop stale items older than 6 seconds or too far away
    while (this.speechQueue.length > 0) {
      const next = this.speechQueue.shift()!;
      if (
        nowMs - next.enqueuedAt <= 6500 &&
        next.distanceToPlayer <= MAX_VOICE_HEARING_DIST
      ) {
        this.executeSpeechNow(next);
        return;
      }
    }
  }

  /**
   * Cloud TTS Audio Stream Fallback for Android WebView APK when speechSynthesis is silent
   */
  private tryPlayCloudTTSStream(
    text: string,
    hasBengali: boolean,
    rate: number,
    pitch: number,
    proximityVol: number
  ): boolean {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return false;
    try {
      const cleanText = text.slice(0, 180).trim();
      if (!cleanText) return false;
      const tl = hasBengali ? 'bn' : 'en';
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(
        cleanText
      )}`;
      const audio = new Audio(url);
      audio.volume = Math.max(0.25, Math.min(1.0, proximityVol));
      audio.playbackRate = Math.max(0.85, Math.min(1.35, rate * (pitch > 1.15 ? 1.08 : 1.0)));
      this.activeAudioElement = audio;

      audio.onended = () => {
        if (this.activeAudioElement === audio) {
          this.activeAudioElement = null;
        }
        this.finishCurrentSpeechAndPlayNext();
      };

      audio.onerror = () => {
        if (this.activeAudioElement === audio) {
          this.activeAudioElement = null;
        }
        // Play expressive formant vocal synth if offline or stream blocked
        this.playCharacterVocalFormants(text, pitch, rate, proximityVol, true);
      };

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          this.playCharacterVocalFormants(text, pitch, rate, proximityVol, true);
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  private executeSpeechNow(item: QueuedSpeechItem) {
    if (this.muted || !this.voiceEnabled) return;

    this.isCurrentlySpeaking = true;
    this.currentSpeakingNpcId = item.npcId;
    this.lastSpokenByNpc[item.npcId] = { text: item.text, time: Date.now() };

    const ratio = Math.max(0, 1 - item.distanceToPlayer / MAX_VOICE_HEARING_DIST);
    const proximityVol = Math.max(0.22, Math.min(1.0, ratio * ratio));
    const pitch = item.pitch ?? 1.0;
    const rate = item.rate ?? 1.04;
    const hasBengali = /[\u0980-\u09FF]/.test(item.text);

    // Estimate speaking duration as safety fallback (in case native/browser onend doesn't fire)
    const estimatedDurationMs = Math.min(
      6200,
      Math.max(1900, item.text.length * 75)
    );
    if (this.speechUnlockTimer) clearTimeout(this.speechUnlockTimer);
    this.speechUnlockTimer = setTimeout(() => {
      this.finishCurrentSpeechAndPlayNext();
    }, estimatedDurationMs);

    // LAYER 1: Capacitor Native Android TextToSpeech Plugin (Best for installed Android APK!)
    const capTts = this.getCapacitorTTS();
    if (capTts) {
      // Accompany with subtle vocal formant warmth
      this.playCharacterVocalFormants(item.text, pitch, rate, proximityVol, false);
      capTts
        .speak({
          text: item.text,
          lang: hasBengali ? 'bn-BD' : 'en-US',
          rate: Math.max(0.85, Math.min(1.3, rate)),
          pitch: Math.max(0.65, Math.min(1.45, pitch)),
          volume: proximityVol,
          category: 'ambient',
        })
        .then(() => {
          this.finishCurrentSpeechAndPlayNext();
        })
        .catch(() => {
          // If 'bn-BD' locale is not installed on phone, try 'bn-IN' or fallback to Cloud TTS + Formants
          capTts
            .speak({
              text: item.text,
              lang: hasBengali ? 'bn-IN' : 'en-US',
              rate: Math.max(0.85, Math.min(1.3, rate)),
              pitch: Math.max(0.65, Math.min(1.45, pitch)),
              volume: proximityVol,
              category: 'ambient',
            })
            .then(() => {
              this.finishCurrentSpeechAndPlayNext();
            })
            .catch(() => {
              if (!this.tryPlayCloudTTSStream(item.text, hasBengali, rate, pitch, proximityVol)) {
                this.playCharacterVocalFormants(item.text, pitch, rate, proximityVol, true);
              }
            });
        });
      return;
    }

    // LAYER 2: Browser Web Speech API (Only if speechSynthesis exists AND has voices loaded)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (!this.voicesLoaded) {
          this.cachedVoices = window.speechSynthesis.getVoices() || [];
          if (this.cachedVoices.length > 0) this.voicesLoaded = true;
        }
      } catch {
        // ignore
      }

      if (this.cachedVoices.length > 0) {
        try {
          this.playCharacterVocalFormants(item.text, pitch, rate, proximityVol, false);
          const utter = new SpeechSynthesisUtterance(item.text);
          utter.lang = hasBengali ? 'bn-BD' : 'en-US';
          utter.pitch = Math.max(0.65, Math.min(1.45, pitch));
          utter.rate = Math.max(0.88, Math.min(1.28, rate));
          utter.volume = proximityVol;

          if (hasBengali) {
            const bnVoice = this.cachedVoices.find(
              (v) =>
                v.lang.toLowerCase().includes('bn') ||
                v.name.toLowerCase().includes('bengali') ||
                v.name.toLowerCase().includes('bangla')
            );
            if (bnVoice) utter.voice = bnVoice;
          } else {
            const femaleEnVoice = this.cachedVoices.find(
              (v) =>
                v.lang.toLowerCase().startsWith('en') &&
                /female|samantha|victoria|zira|karen|moira|tessa|aria|jenny|google uk english female|google us english/i.test(
                  v.name
                )
            );
            const fallbackEnVoice = this.cachedVoices.find((v) =>
              v.lang.toLowerCase().startsWith('en')
            );
            if (femaleEnVoice) {
              utter.voice = femaleEnVoice;
            } else if (fallbackEnVoice) {
              utter.voice = fallbackEnVoice;
            }
          }

          let startedSpeaking = false;
          utter.onstart = () => {
            startedSpeaking = true;
          };
          utter.onend = () => {
            this.finishCurrentSpeechAndPlayNext();
          };
          utter.onerror = () => {
            if (!startedSpeaking) {
              if (!this.tryPlayCloudTTSStream(item.text, hasBengali, rate, pitch, proximityVol)) {
                this.playCharacterVocalFormants(item.text, pitch, rate, proximityVol, true);
              }
            } else {
              this.finishCurrentSpeechAndPlayNext();
            }
          };

          window.speechSynthesis.speak(utter);

          // Android WebView watchdog: if speechSynthesis didn't actually start within 350ms, trigger Cloud TTS / Formants!
          setTimeout(() => {
            if (
              !startedSpeaking &&
              this.currentSpeakingNpcId === item.npcId &&
              !window.speechSynthesis.speaking
            ) {
              if (!this.tryPlayCloudTTSStream(item.text, hasBengali, rate, pitch, proximityVol)) {
                this.playCharacterVocalFormants(item.text, pitch, rate, proximityVol, true);
              }
            }
          }, 350);
          return;
        } catch {
          // Fall through to Layer 3 & 4
        }
      }
    }

    // LAYER 3 & 4: Android WebView Fallback — Cloud TTS Stream + Expressive Multi-Syllable Formant Voice Synth
    this.playCharacterVocalFormants(item.text, pitch, rate, proximityVol, false);
    if (!this.tryPlayCloudTTSStream(item.text, hasBengali, rate, pitch, proximityVol)) {
      this.playCharacterVocalFormants(item.text, pitch, rate, proximityVol, true);
    }
  }

  /**
   * Queues or speaks a character's dialogue line ONLY if within 250px of the player,
   * ensuring characters speak ONE BY ONE (একজনের কথা শেষ হওয়ার পর আরেকজন বলবে).
   */
  public speakCharacterLine(
    optsOrText:
      | {
          npcId: string;
          text: string;
          pitch?: number;
          rate?: number;
          distanceToPlayer?: number;
          forceImmediate?: boolean;
        }
      | string,
    pitchArg = 1.0,
    rateArg = 1.0,
    volumeArg = 1.0,
    forceImmediateArg = false
  ) {
    const opts =
      typeof optsOrText === 'string'
        ? {
            npcId: 'direct',
            text: optsOrText,
            pitch: pitchArg,
            rate: rateArg,
            distanceToPlayer: Math.max(0, (1 - volumeArg) * MAX_VOICE_HEARING_DIST),
            forceImmediate: forceImmediateArg,
          }
        : optsOrText;

    if (this.muted || !this.voiceEnabled || !opts.text) return;

    const dist = opts.distanceToPlayer ?? 999;
    // STRICT PROXIMITY CHECK: Never play or queue voices further than MAX_VOICE_HEARING_DIST (250px)
    if (dist > MAX_VOICE_HEARING_DIST) return;

    const nowMs = Date.now();
    const prev = this.lastSpokenByNpc[opts.npcId];
    if (
      !opts.forceImmediate &&
      prev &&
      prev.text === opts.text &&
      nowMs - prev.time < 9500
    ) {
      return;
    }

    const queueItem: QueuedSpeechItem = {
      npcId: opts.npcId,
      text: opts.text,
      pitch: opts.pitch ?? 1.0,
      rate: opts.rate ?? 1.04,
      distanceToPlayer: dist,
      enqueuedAt: nowMs,
    };

    // If direct player interaction (chat reply or combat hit), interrupt and speak immediately
    if (opts.forceImmediate) {
      this.speechQueue = [];
      if (this.speechUnlockTimer) {
        clearTimeout(this.speechUnlockTimer);
        this.speechUnlockTimer = null;
      }
      this.stopAllActiveSpeechEngines();
      this.isCurrentlySpeaking = false;
      this.executeSpeechNow(queueItem);
      return;
    }

    // If someone is already speaking right now, DO NOT interrupt them!
    // Queue this character so they speak AFTER the current speaker finishes!
    const synthBusy =
      this.isCurrentlySpeaking ||
      (typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        window.speechSynthesis.speaking);

    if (synthBusy) {
      // Don't queue if this same NPC is already speaking or already in queue
      if (
        this.currentSpeakingNpcId === opts.npcId ||
        this.speechQueue.some((q) => q.npcId === opts.npcId)
      ) {
        return;
      }
      // Keep max 2 waiting speakers so queue stays fresh and relevant
      if (this.speechQueue.length < 2) {
        this.speechQueue.push(queueItem);
      }
      return;
    }

    this.executeSpeechNow(queueItem);
  }

  public playPunch(hit = false) {
    if (hit) {
      this.playHitImpact(false);
    } else {
      this.playPunchSwing();
    }
  }

  public playPunchSwing(distanceToPlayer = 0) {
    const vol = this.getProximityVolume(distanceToPlayer, MAX_SFX_HEARING_DIST, 0.16);
    if (vol <= 0) return;
    this.playTone('triangle', 220, 75, 0.11, vol);
  }

  public playHitImpact(heavy = false, distanceToPlayer = 0) {
    const vol = this.getProximityVolume(
      distanceToPlayer,
      MAX_SFX_HEARING_DIST,
      heavy ? 0.28 : 0.2
    );
    if (vol <= 0) return;
    this.playTone(
      heavy ? 'sawtooth' : 'square',
      heavy ? 130 : 165,
      32,
      heavy ? 0.22 : 0.14,
      vol
    );
  }

  public playCarDoor(entering = true) {
    this.playTone('sine', entering ? 320 : 520, entering ? 580 : 280, 0.16, 0.15);
  }

  public playCarHorn(pitch = 1, distanceToPlayer = 0) {
    const vol = this.getProximityVolume(distanceToPlayer, MAX_SFX_HEARING_DIST, 0.13);
    if (vol <= 0) return;
    this.playTone('sawtooth', 390 * pitch, 385 * pitch, 0.22, vol, 0);
    this.playTone('sawtooth', 490 * pitch, 485 * pitch, 0.26, vol, 0.02);
  }

  public playTrainHorn(distanceToPlayer = 0) {
    const vol = this.getProximityVolume(distanceToPlayer, MAX_SFX_HEARING_DIST + 40, 0.14);
    if (vol <= 0) return;
    this.playTone('sawtooth', 185, 180, 0.55, vol, 0);
    this.playTone('triangle', 233, 228, 0.6, vol, 0.03);
  }

  public playTrainChug(distanceToPlayer = 120) {
    const vol = this.getProximityVolume(distanceToPlayer, MAX_SFX_HEARING_DIST, 0.11);
    if (vol <= 0) return;
    this.playTone('triangle', 92, 48, 0.065, vol, 0);
    this.playTone('triangle', 108, 52, 0.065, vol * 0.9, 0.11);
  }

  public playPoliceSiren(distanceToPlayer = 150) {
    const vol = this.getProximityVolume(distanceToPlayer, MAX_SFX_HEARING_DIST + 40, 0.14);
    if (vol <= 0) return;
    this.playTone('sine', 640, 920, 0.34, vol, 0);
    this.playTone('sine', 920, 640, 0.34, vol, 0.35);
  }

  public playRickshawBell(distanceToPlayer = 120) {
    const vol = this.getProximityVolume(distanceToPlayer, MAX_VOICE_HEARING_DIST, 0.13);
    if (vol <= 0) return;
    this.playTone('sine', 2150, 2200, 0.07, vol, 0);
    this.playTone('sine', 2350, 2400, 0.09, vol, 0.09);
  }

  public playWhistle(distanceToPlayer = 0) {
    const vol = this.getProximityVolume(distanceToPlayer, MAX_SFX_HEARING_DIST, 0.13);
    if (vol <= 0) return;
    this.playTone('sine', 1800, 2400, 0.12, vol, 0);
    this.playTone('sine', 2400, 1900, 0.14, vol, 0.13);
  }

  public playStartSynth() {
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      this.playTone('sawtooth', freq, freq, 0.24, 0.09, i * 0.07);
    });
  }
}

export const sound = new SoundManager();
