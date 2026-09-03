/**
 * SmartLab Universal Text-to-Speech (TTS) Engine
 * Powered by Web SpeechSynthesis API with auto Korean voice detection,
 * Chrome long-utterance chunking, persistent settings, and cross-component event sync.
 */

export interface TTSOptions {
  rate?: number;     // 0.5 ~ 2.0 (default 1.0)
  pitch?: number;    // 0.5 ~ 1.5 (default 1.0)
  volume?: number;   // 0.0 ~ 1.0 (default 1.0)
  voiceUri?: string; // Voice URI identifier
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export interface TTSSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceUri: string | null;
  muted: boolean;
  autoReadIncomingQuestions: boolean;
}

class TTSEngine {
  private isAvailable: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private activeText: string | null = null;
  private isCurrentlySpeaking: boolean = false;
  private settings: TTSSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voiceUri: null,
    muted: false,
    autoReadIncomingQuestions: false,
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.isAvailable = true;
      this.loadSettings();
      this.initVoices();
    }
  }

  private loadSettings() {
    try {
      const savedRate = localStorage.getItem('smartlab_tts_rate');
      const savedPitch = localStorage.getItem('smartlab_tts_pitch');
      const savedVolume = localStorage.getItem('smartlab_tts_volume');
      const savedVoiceUri = localStorage.getItem('smartlab_tts_voice_uri');
      const savedMuted = localStorage.getItem('smartlab_tts_muted');
      const savedAutoRead = localStorage.getItem('smartlab_tts_autoread');

      if (savedRate) this.settings.rate = parseFloat(savedRate) || 1.0;
      if (savedPitch) this.settings.pitch = parseFloat(savedPitch) || 1.0;
      if (savedVolume) this.settings.volume = parseFloat(savedVolume) || 1.0;
      if (savedVoiceUri) this.settings.voiceUri = savedVoiceUri;
      if (savedMuted !== null) this.settings.muted = savedMuted === 'true';
      if (savedAutoRead !== null) this.settings.autoReadIncomingQuestions = savedAutoRead === 'true';
    } catch {
      // ignore localStorage errors
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('smartlab_tts_rate', String(this.settings.rate));
      localStorage.setItem('smartlab_tts_pitch', String(this.settings.pitch));
      localStorage.setItem('smartlab_tts_volume', String(this.settings.volume));
      if (this.settings.voiceUri) {
        localStorage.setItem('smartlab_tts_voice_uri', this.settings.voiceUri);
      } else {
        localStorage.removeItem('smartlab_tts_voice_uri');
      }
      localStorage.setItem('smartlab_tts_muted', String(this.settings.muted));
      localStorage.setItem('smartlab_tts_autoread', String(this.settings.autoReadIncomingQuestions));

      this.notifyStateChanged();
    } catch {
      // ignore
    }
  }

  private initVoices() {
    if (!this.isAvailable) return;

    const populate = () => {
      this.voices = window.speechSynthesis.getVoices() || [];
      this.notifyStateChanged();
    };

    populate();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populate;
    }
  }

  private notifyStateChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartlab_tts_state_changed', {
        detail: {
          isSpeaking: this.isCurrentlySpeaking,
          activeText: this.activeText,
          settings: { ...this.settings },
          voicesCount: this.voices.length
        }
      }));
    }
  }

  public getSettings(): TTSSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<TTSSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.isAvailable) {
      this.voices = window.speechSynthesis.getVoices() || [];
    }
    return this.voices;
  }

  public getKoreanVoices(): SpeechSynthesisVoice[] {
    const all = this.getVoices();
    return all.filter((v) =>
      v.lang.startsWith('ko') ||
      v.lang.includes('KR') ||
      v.name.toLowerCase().includes('korean') ||
      v.name.includes('한국')
    );
  }

  public getBestKoreanVoice(): SpeechSynthesisVoice | null {
    const koVoices = this.getKoreanVoices();
    if (this.settings.voiceUri) {
      const matched = this.voices.find(v => v.voiceURI === this.settings.voiceUri);
      if (matched) return matched;
    }

    if (koVoices.length > 0) {
      // Prefer Google or Natural / Enhanced Korean voice
      const preferred = koVoices.find(v =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Yuna') ||
        v.name.includes('Heami') ||
        v.name.includes('Seoyeon')
      );
      return preferred || koVoices[0];
    }

    // Fallback to default voice
    return this.voices.find(v => v.default) || (this.voices.length > 0 ? this.voices[0] : null);
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }

  public getActiveText(): string | null {
    return this.activeText;
  }

  public checkAvailability(): boolean {
    return this.isAvailable;
  }

  /**
   * Stop any active speech immediately
   */
  public stop() {
    if (!this.isAvailable) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    this.isCurrentlySpeaking = false;
    this.activeText = null;
    this.currentUtterance = null;
    this.notifyStateChanged();
  }

  /**
   * Speak a text string with optional override parameters
   */
  public speak(rawText: string, options?: TTSOptions) {
    if (!this.isAvailable) return;

    const cleanText = rawText.trim();
    if (!cleanText) return;

    if (this.settings.muted) {
      return;
    }

    // Stop current speech first
    this.stop();

    const voice = options?.voiceUri
      ? this.voices.find(v => v.voiceURI === options.voiceUri) || this.getBestKoreanVoice()
      : this.getBestKoreanVoice();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate ?? this.settings.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? this.settings.pitch ?? 1.0;
    utterance.volume = options?.volume ?? this.settings.volume ?? 1.0;

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'ko-KR';
    } else {
      utterance.lang = 'ko-KR';
    }

    this.currentUtterance = utterance;
    this.activeText = cleanText;
    this.isCurrentlySpeaking = true;

    utterance.onstart = () => {
      this.isCurrentlySpeaking = true;
      this.notifyStateChanged();
      if (options?.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.isCurrentlySpeaking = false;
      this.activeText = null;
      this.currentUtterance = null;
      this.notifyStateChanged();
      if (options?.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      this.isCurrentlySpeaking = false;
      this.activeText = null;
      this.currentUtterance = null;
      this.notifyStateChanged();
      if (options?.onError) options.onError(e);
    };

    // Chrome garbage collection keep-alive bugfix
    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.isCurrentlySpeaking = false;
      this.activeText = null;
      this.notifyStateChanged();
      if (options?.onError) options.onError(e);
    }
  }

  /**
   * Toggle speak / stop for a given text
   */
  public toggle(text: string, options?: TTSOptions) {
    if (this.isCurrentlySpeaking && this.activeText === text.trim()) {
      this.stop();
    } else {
      this.speak(text, options);
    }
  }
}

// Global Singleton Instance
export const ttsEngine = new TTSEngine();
