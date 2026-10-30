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

class SoundManager {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  public voiceEnabled: boolean = true;
  private lastSpokenByNpc: Record<string, { text: string; time: number }> = {};
  private voicesLoaded: boolean = false;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  // Sequential Turn-Taking Speech Queue State (একজনের কথা শেষ হলে আরেকজন বলবে)
  private currentSpeakingNpcId: string | null = null;
  private isCurrentlySpeaking: boolean = false;
  private speechUnlockTimer: ReturnType<typeof setTimeout> | null = null;
  private speechQueue: QueuedSpeechItem[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
        if (this.cachedVoices.length > 0) {
          this.voicesLoaded = true;
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    if (volume <= 0.002) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
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
      if (
        this.currentSpeakingNpcId === npcId &&
        typeof window !== 'undefined' &&
        'speechSynthesis' in window
      ) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
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

  private executeSpeechNow(item: QueuedSpeechItem) {
    if (this.muted || !this.voiceEnabled) return;

    this.isCurrentlySpeaking = true;
    this.currentSpeakingNpcId = item.npcId;
    this.lastSpokenByNpc[item.npcId] = { text: item.text, time: Date.now() };

    const ratio = Math.max(0, 1 - item.distanceToPlayer / MAX_VOICE_HEARING_DIST);
    const proximityVol = Math.max(0.16, Math.min(1.0, ratio * ratio));
    const pitch = item.pitch ?? 1.0;
    const rate = item.rate ?? 1.04;

    // 1. Subtle expressive vocal syllabic synth murmur
    const syllableCount = Math.min(4, Math.max(2, Math.ceil(item.text.length / 16)));
    for (let i = 0; i < syllableCount; i++) {
      const f = (240 + ((i * 47 + item.text.charCodeAt(0) * 3) % 120)) * pitch;
      this.playTone(
        'triangle',
        f,
        f * (i % 2 === 0 ? 1.12 : 0.9),
        0.05,
        0.045 * proximityVol,
        i * 0.065
      );
    }

    // Estimate speaking duration as safety fallback (in case browser onend doesn't fire)
    const estimatedDurationMs = Math.min(
      6200,
      Math.max(1800, item.text.length * 75)
    );
    if (this.speechUnlockTimer) clearTimeout(this.speechUnlockTimer);
    this.speechUnlockTimer = setTimeout(() => {
      this.finishCurrentSpeechAndPlayNext();
    }, estimatedDurationMs);

    // 2. Browser Web Speech API Spoken Voice (One speaker at a time!)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (!this.voicesLoaded) {
          this.cachedVoices = window.speechSynthesis.getVoices();
        }

        const utter = new SpeechSynthesisUtterance(item.text);
        const hasBengali = /[\u0980-\u09FF]/.test(item.text);
        utter.lang = hasBengali ? 'bn-BD' : 'en-US';
        utter.pitch = Math.max(0.65, Math.min(1.45, pitch));
        utter.rate = Math.max(0.88, Math.min(1.28, rate));
        utter.volume = proximityVol;

        if (this.cachedVoices.length > 0) {
          if (hasBengali) {
            const bnVoice = this.cachedVoices.find(
              (v) =>
                v.lang.toLowerCase().includes('bn') ||
                v.name.toLowerCase().includes('bengali') ||
                v.name.toLowerCase().includes('bangla')
            );
            if (bnVoice) utter.voice = bnVoice;
          } else {
            // Prioritize natural English Female Voice for English-speaking women
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
        }

        utter.onend = () => {
          this.finishCurrentSpeechAndPlayNext();
        };
        utter.onerror = () => {
          this.finishCurrentSpeechAndPlayNext();
        };

        window.speechSynthesis.speak(utter);
      } catch {
        this.finishCurrentSpeechAndPlayNext();
      }
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
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
