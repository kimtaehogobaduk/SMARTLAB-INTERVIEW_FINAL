/**
 * SmartLab Robust Universal Speech-to-Text (STT) Engine
 * Enhanced with:
 * 1. Hardware Echo Cancellation, Noise Suppression, Auto Gain Control
 * 2. Silent Drop Auto-Recovery Watchdog
 * 3. Text Post-Processing & Smart Punctuation Normalization
 * 4. Real-time Voice Activity Detection (VAD) & Audio Level VU-Meter
 * 5. Multi-language and confidence tracking
 */

export type STTStatus =
  | 'unsupported'
  | 'idle'
  | 'starting'
  | 'listening'
  | 'paused'
  | 'permission-denied'
  | 'error';

export interface STTResultMeta {
  wordCount: number;
  charCount: number;
  normalizedText: string;
}

export interface STTOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoPunctuation?: boolean;
  onFinalResult?: (text: string, confidence: number, meta?: STTResultMeta) => void;
  onInterimResult?: (text: string) => void;
  onStatusChange?: (status: STTStatus) => void;
  onError?: (errorType: string, message: string) => void;
  onAudioLevelChange?: (level: number) => void;
  onVoiceActivityChange?: (isSpeaking: boolean) => void;
}

/**
 * Universal text normalization & auto punctuation
 */
export function normalizeSpeechText(raw: string, lang: string = 'ko-KR'): string {
  let text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return '';

  // Korean sentence termination heuristic
  if (lang.startsWith('ko')) {
    if (!/[.?!…]$/.test(text)) {
      if (/(?:습니까|인가요|할까요|있나요|되나요|인지요|건가요)\s*$/.test(text)) {
        text += '?';
      } else if (/(?:습니다|있습니다|했습니다|합니다|이고요|있어요|했어요|생각합니다|보입니다|판단됩니다|원합니다)\s*$/.test(text)) {
        text += '.';
      }
    }
  } else if (lang.startsWith('en')) {
    // Capitalize first character
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.?!]$/.test(text)) {
      text += '.';
    }
  }

  return text;
}

export class STTEngine {
  private recognition: any = null;
  private isSupported: boolean = false;
  private isDesiredListening: boolean = false;
  private currentStatus: STTStatus = 'idle';
  private currentInterimText: string = '';
  private currentAudioLevel: number = 0;
  private isSpeaking: boolean = false;
  private silenceTimer: any = null;
  private restartTimeout: any = null;
  private watchdogInterval: any = null;
  private lastActivityTime: number = Date.now();
  private options: STTOptions = {};

  // AudioContext for real mic volume (VU meter)
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;

  constructor(options?: STTOptions) {
    if (options) {
      this.options = { ...options };
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.isSupported = true;
        this.currentStatus = 'idle';
      } else {
        this.isSupported = false;
        this.currentStatus = 'unsupported';
      }
    }
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }

  public getStatus(): STTStatus {
    return this.currentStatus;
  }

  public getInterimText(): string {
    return this.currentInterimText;
  }

  public getAudioLevel(): number {
    return this.currentAudioLevel;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public updateOptions(newOptions: Partial<STTOptions>) {
    this.options = { ...this.options, ...newOptions };
    if (this.recognition && newOptions.lang) {
      this.recognition.lang = newOptions.lang;
    }
  }

  private setStatus(status: STTStatus) {
    this.currentStatus = status;
    this.options.onStatusChange?.(status);
  }

  /**
   * Start Live Audio Level Meter with Active Noise Suppression Constraints
   */
  private async startAudioMeter(): Promise<void> {
    try {
      if (this.mediaStream) {
        this.stopAudioMeter();
      }

      // Enhanced audio track constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      this.mediaStream = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      this.audioContext = audioCtx;
      this.analyserNode = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!this.analyserNode || !this.isDesiredListening) {
          this.currentAudioLevel = 0;
          this.options.onAudioLevelChange?.(0);
          this.setSpeakingState(false);
          return;
        }

        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize 0 ~ 100
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        this.currentAudioLevel = normalized;
        this.options.onAudioLevelChange?.(normalized);

        // Voice Activity Detection (VAD) thresholding
        if (normalized >= 14) {
          this.setSpeakingState(true);
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else if (this.isSpeaking && !this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            this.setSpeakingState(false);
            this.silenceTimer = null;
          }, 650);
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('STT AudioContext volume meter init notice:', err);
    }
  }

  private setSpeakingState(speaking: boolean) {
    if (this.isSpeaking !== speaking) {
      this.isSpeaking = speaking;
      this.options.onVoiceActivityChange?.(speaking);
    }
  }

  /**
   * Stop Audio Meter
   */
  private stopAudioMeter(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyserNode = null;
    this.currentAudioLevel = 0;
    this.setSpeakingState(false);
    this.options.onAudioLevelChange?.(0);
  }

  /**
   * Initialize or Reset the SpeechRecognition Instance
   */
  private initRecognition(): void {
    if (!this.isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();

    rec.continuous = this.options.continuous !== false;
    rec.interimResults = this.options.interimResults !== false;
    rec.lang = this.options.lang || 'ko-KR';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.setStatus('listening');
      this.currentInterimText = '';
      this.lastActivityTime = Date.now();
      this.options.onInterimResult?.('');
    };

    rec.onresult = (event: any) => {
      this.lastActivityTime = Date.now();
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          const rawTranscript = res[0].transcript.trim();
          const confidence = res[0].confidence || 0.95;
          if (rawTranscript) {
            const normalized = this.options.autoPunctuation !== false
              ? normalizeSpeechText(rawTranscript, this.options.lang || 'ko-KR')
              : rawTranscript;

            const words = normalized.split(/\s+/).filter(Boolean);
            const meta: STTResultMeta = {
              wordCount: words.length,
              charCount: normalized.length,
              normalizedText: normalized
            };

            this.options.onFinalResult?.(normalized, confidence, meta);
          }
          this.currentInterimText = '';
          this.options.onInterimResult?.('');
        } else {
          interim += res[0].transcript;
        }
      }

      if (interim) {
        this.currentInterimText = interim;
        this.options.onInterimResult?.(interim);
      }
    };

    rec.onerror = (event: any) => {
      const error = event.error;
      this.lastActivityTime = Date.now();
      console.warn('STTEngine recognition error:', error);

      if (error === 'not-allowed' || error === 'service-not-allowed') {
        this.isDesiredListening = false;
        this.setStatus('permission-denied');
        this.stopAudioMeter();
        this.options.onError?.(
          error,
          '마이크 사용 권한이 거부되었습니다. 브라우저 주소창 자물쇠 아이콘에서 마이크를 허용해주세요.'
        );
      } else if (error === 'no-speech') {
        // Natural pause during silence; ignore and let onend handle continuous restart
      } else if (error === 'audio-capture') {
        this.isDesiredListening = false;
        this.setStatus('error');
        this.stopAudioMeter();
        this.options.onError?.(
          error,
          '마이크 하드웨어가 감지되지 않거나 다른 프로그램에서 점유 중입니다.'
        );
      } else if (error === 'network') {
        this.options.onError?.(
          error,
          '음성 인식 네트워크 연결 상태를 확인해주세요.'
        );
      }
    };

    rec.onend = () => {
      this.lastActivityTime = Date.now();
      // If continuous listening is still requested, restart after short debounce
      if (this.isDesiredListening) {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.isDesiredListening) {
            try {
              rec.start();
            } catch (e: any) {
              if (e?.name !== 'InvalidStateError') {
                this.initRecognition();
                try {
                  this.recognition?.start();
                } catch {
                  // ignore
                }
              }
            }
          }
        }, 150);
      } else {
        this.setStatus('idle');
        this.currentInterimText = '';
        this.options.onInterimResult?.('');
        this.stopAudioMeter();
      }
    };

    this.recognition = rec;
  }

  /**
   * Health Watchdog: Recovers stalled sessions without throwing unhandled exceptions
   */
  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogInterval = setInterval(() => {
      if (!this.isDesiredListening) return;

      const idleDuration = Date.now() - this.lastActivityTime;
      // If listening requested but status is stalled in starting or silent for > 15 seconds without active speech
      if (this.currentStatus === 'starting' && idleDuration > 5000) {
        console.info('STT Watchdog recovering stalled initialization...');
        this.initRecognition();
        try {
          this.recognition?.start();
        } catch {}
      }
    }, 5000);
  }

  private stopWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

  /**
   * Start Listening
   */
  public async start(): Promise<boolean> {
    if (!this.isSupported) {
      this.setStatus('unsupported');
      return false;
    }

    this.isDesiredListening = true;
    this.lastActivityTime = Date.now();
    this.setStatus('starting');

    // Start VU meter alongside
    this.startAudioMeter().catch(() => {});
    this.startWatchdog();

    try {
      this.initRecognition();
      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('STTEngine start warning:', err);
      if (err?.name === 'InvalidStateError') {
        this.setStatus('listening');
        return true;
      }
      this.isDesiredListening = false;
      this.setStatus('error');
      this.stopAudioMeter();
      this.stopWatchdog();
      return false;
    }
  }

  /**
   * Stop Listening
   */
  public stop(): void {
    this.isDesiredListening = false;
    this.stopWatchdog();
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    this.stopAudioMeter();
    this.setStatus('idle');
    this.currentInterimText = '';
    this.options.onInterimResult?.('');
  }

  /**
   * Toggle Listening
   */
  public toggle(): Promise<boolean> {
    if (this.isDesiredListening) {
      this.stop();
      return Promise.resolve(false);
    } else {
      return this.start();
    }
  }

  /**
   * Complete Destruction
   */
  public destroy(): void {
    this.stop();
    this.recognition = null;
  }
}
