import { useState, useEffect, useRef, useCallback } from 'react';
import { STTEngine, STTStatus } from '../lib/stt';

export interface UseSTTOptions {
  lang?: string;
  continuous?: boolean;
  autoStart?: boolean;
  onFinalResult?: (text: string, confidence: number) => void;
}

export interface UseSTTReturn {
  isSupported: boolean;
  isListening: boolean;
  status: STTStatus;
  interimText: string;
  audioLevel: number;
  errorMessage: string | null;
  lang: string;
  start: () => Promise<boolean>;
  stop: () => void;
  toggle: () => Promise<boolean>;
  setLang: (lang: string) => void;
  clearError: () => void;
}

export function useSTT(options?: UseSTTOptions): UseSTTReturn {
  const [lang, setLangState] = useState<string>(options?.lang || 'ko-KR');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [status, setStatus] = useState<STTStatus>('idle');
  const [interimText, setInterimText] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const engineRef = useRef<STTEngine | null>(null);
  const onFinalResultRef = useRef(options?.onFinalResult);

  useEffect(() => {
    onFinalResultRef.current = options?.onFinalResult;
  }, [options?.onFinalResult]);

  useEffect(() => {
    const engine = new STTEngine({
      lang,
      continuous: options?.continuous ?? true,
      onFinalResult: (text, confidence) => {
        onFinalResultRef.current?.(text, confidence);
      },
      onInterimResult: (interim) => {
        setInterimText(interim);
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'listening') {
          setErrorMessage(null);
        }
      },
      onError: (errType, msg) => {
        setErrorMessage(msg);
      },
      onAudioLevelChange: (level) => {
        setAudioLevel(level);
      }
    });

    setIsSupported(engine.checkSupport());
    setStatus(engine.getStatus());
    engineRef.current = engine;

    if (options?.autoStart) {
      engine.start().catch((err) => {
        console.warn('STT autoStart warning:', err);
      });
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [lang, options?.continuous]);

  const start = useCallback(async () => {
    if (!engineRef.current) return false;
    setErrorMessage(null);
    return await engineRef.current.start();
  }, []);

  const stop = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.stop();
  }, []);

  const toggle = useCallback(async () => {
    if (!engineRef.current) return false;
    setErrorMessage(null);
    return await engineRef.current.toggle();
  }, []);

  const setLang = useCallback((newLang: string) => {
    setLangState(newLang);
    engineRef.current?.updateOptions({ lang: newLang });
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const isListening = status === 'listening' || status === 'starting';

  return {
    isSupported,
    isListening,
    status,
    interimText,
    audioLevel,
    errorMessage,
    lang,
    start,
    stop,
    toggle,
    setLang,
    clearError
  };
}
