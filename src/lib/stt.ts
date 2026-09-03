/**
 * SmartLab Robust Universal Speech-to-Text (STT) Engine
 * Powered by Web Speech Recognition API (webkitSpeechRecognition / SpeechRecognition)
 * with continuous background listening, silent timeout auto-reconnect,
 * real-time AudioContext VU-meter/volume detection, and multi-language support.
 */

export type STTStatus =
  | 'unsupported'
  | 'idle'
  | 'starting'
  | 'listening'
  | 'paused'
  | 'permission-denied'
  | 'error';

export interface STTOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onFinalResult?: (text: string, confidence: number) => void;
  onInterimResult?: (text: string) => void;
  onStatusChange?: (status: STTStatus) => void;
  onError?: (errorType: string, message: string) => void;
  onAudioLevelChange?: (level: number) => void;
}

export class STTEngine {
  private recognition: any = null;
  private isSupported: boolean = false;
  private isDesiredListening: boolean = false;
  private currentStatus: STTStatus = 'idle';
  private currentInterimText: string = '';
  private currentAudioLevel: number = 0;
  private restartTimeout: any = null;
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
   * Start Live Audio Level Meter via Web Audio API
   */
  private async startAudioMeter(): Promise<void> {
    try {
      if (this.mediaStream) {
        this.stopAudioMeter();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('STT AudioContext volume meter init notice (audio may still work):', err);
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

    rec.continuous = this.options.continuous !== false; // default true
    rec.interimResults = this.options.interimResults !== false; // default true
    rec.lang = this.options.lang || 'ko-KR';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.setStatus('listening');
      this.currentInterimText = '';
      this.options.onInterimResult?.('');
    };

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          const finalTranscript = res[0].transcript.trim();
          const confidence = res[0].confidence || 0.95;
          if (finalTranscript) {
            this.options.onFinalResult?.(finalTranscript, confidence);
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
      console.warn('STTEngine recognition error:', error);

      if (error === 'not-allowed' || error === 'service-not-allowed') {
        this.isDesiredListening = false;
        this.setStatus('permission-denied');
        this.stopAudioMeter();
        this.options.onError?.(
          error,
          '마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.'
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
      // If continuous listening is still requested, restart after short debounce
      if (this.isDesiredListening) {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.isDesiredListening) {
            try {
              rec.start();
            } catch (e: any) {
              // If already active or invalid state, re-init
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
   * Start Listening
   */
  public async start(): Promise<boolean> {
    if (!this.isSupported) {
      this.setStatus('unsupported');
      return false;
    }

    this.isDesiredListening = true;
    this.setStatus('starting');

    // Start VU meter alongside
    this.startAudioMeter().catch(() => {});

    try {
      this.initRecognition();
      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('STTEngine start warning:', err);
      // If already started, mark as listening
      if (err?.name === 'InvalidStateError') {
        this.setStatus('listening');
        return true;
      }
      this.isDesiredListening = false;
      this.setStatus('error');
      this.stopAudioMeter();
      return false;
    }
  }

  /**
   * Stop Listening
   */
  public stop(): void {
    this.isDesiredListening = false;
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
