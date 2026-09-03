import { useState, useEffect, useCallback } from 'react';
import { ttsEngine, TTSSettings } from '../lib/tts';

export interface UseTTSReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  activeText: string | null;
  settings: TTSSettings;
  koreanVoices: SpeechSynthesisVoice[];
  allVoices: SpeechSynthesisVoice[];
  speak: (text: string, rate?: number) => void;
  stop: () => void;
  toggle: (text: string, rate?: number) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setVoiceUri: (uri: string | null) => void;
  setMuted: (muted: boolean) => void;
  setAutoRead: (autoRead: boolean) => void;
}

export function useTTS(): UseTTSReturn {
  const [isSupported] = useState<boolean>(() => ttsEngine.checkAvailability());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(() => ttsEngine.isSpeaking());
  const [activeText, setActiveText] = useState<string | null>(() => ttsEngine.getActiveText());
  const [settings, setSettings] = useState<TTSSettings>(() => ttsEngine.getSettings());
  const [koreanVoices, setKoreanVoices] = useState<SpeechSynthesisVoice[]>(() => ttsEngine.getKoreanVoices());
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>(() => ttsEngine.getVoices());

  useEffect(() => {
    const handleStateChange = () => {
      setIsSpeaking(ttsEngine.isSpeaking());
      setActiveText(ttsEngine.getActiveText());
      setSettings(ttsEngine.getSettings());
      setKoreanVoices(ttsEngine.getKoreanVoices());
      setAllVoices(ttsEngine.getVoices());
    };

    window.addEventListener('smartlab_tts_state_changed', handleStateChange);
    // Initial fetch in case voices loaded right after mount
    handleStateChange();

    return () => {
      window.removeEventListener('smartlab_tts_state_changed', handleStateChange);
    };
  }, []);

  const speak = useCallback((text: string, rate?: number) => {
    ttsEngine.speak(text, rate !== undefined ? { rate } : undefined);
  }, []);

  const stop = useCallback(() => {
    ttsEngine.stop();
  }, []);

  const toggle = useCallback((text: string, rate?: number) => {
    ttsEngine.toggle(text, rate !== undefined ? { rate } : undefined);
  }, []);

  const setRate = useCallback((rate: number) => {
    ttsEngine.updateSettings({ rate });
  }, []);

  const setPitch = useCallback((pitch: number) => {
    ttsEngine.updateSettings({ pitch });
  }, []);

  const setVolume = useCallback((volume: number) => {
    ttsEngine.updateSettings({ volume });
  }, []);

  const setVoiceUri = useCallback((voiceUri: string | null) => {
    ttsEngine.updateSettings({ voiceUri });
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    ttsEngine.updateSettings({ muted });
  }, []);

  const setAutoRead = useCallback((autoReadIncomingQuestions: boolean) => {
    ttsEngine.updateSettings({ autoReadIncomingQuestions });
  }, []);

  return {
    isSupported,
    isSpeaking,
    activeText,
    settings,
    koreanVoices,
    allVoices,
    speak,
    stop,
    toggle,
    setRate,
    setPitch,
    setVolume,
    setVoiceUri,
    setMuted,
    setAutoRead
  };
}
