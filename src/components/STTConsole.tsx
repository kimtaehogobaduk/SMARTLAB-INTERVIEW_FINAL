import React, { useState, useEffect, useRef } from 'react';
import { STTMessage, RealtimeSummary, TailQuestion, ContradictionPoint, PlatformSettings } from '../types';
import { Mic, MicOff, Sparkles, Send, Bot, AlertTriangle, HelpCircle, Check, Play, RefreshCw, Zap, Youtube, BookOpen } from 'lucide-react';

interface STTConsoleProps {
  transcript: STTMessage[];
  realtimeSummaries: RealtimeSummary[];
  tailQuestions: TailQuestion[];
  contradictions: ContradictionPoint[];
  candidateName: string;
  candidateTrack: string;
  settings?: PlatformSettings;
  onSendMessage: (message: STTMessage, triggerAI: boolean) => void;
  onUseTailQuestion?: (q: TailQuestion) => void;
  isLoadingAI?: boolean;
}

export const STTConsole: React.FC<STTConsoleProps> = ({
  transcript,
  realtimeSummaries,
  tailQuestions,
  contradictions,
  candidateName,
  candidateTrack,
  settings,
  onSendMessage,
  onUseTailQuestion,
  isLoadingAI = false
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [speaker, setSpeaker] = useState<'candidate' | 'interviewer'>('candidate');
  const [interimText, setInterimText] = useState<string>('');
  const [simIndex, setSimIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll STT terminal to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  // Web Speech API initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ko-KR';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            const finalSpeech = res[0].transcript.trim();
            if (finalSpeech) {
              const newMsg: STTMessage = {
                id: `stt-${Date.now()}`,
                speaker,
                text: finalSpeech,
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
                confidence: res[0].confidence || 0.95
              };
              onSendMessage(newMsg, speaker === 'candidate');
            }
            setInterimText('');
          } else {
            interim += res[0].transcript;
          }
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            setIsListening(false);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [speaker, isListening, onSendMessage]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('현재 브라우저 환경에서 Web Speech API를 지원하지 않습니다. 시뮬레이션 버튼 또는 텍스트 입력을 사용해주세요.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Recognition start error:', e);
      }
    }
  };

  const handleSendManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: STTMessage = {
      id: `stt-manual-${Date.now()}`,
      speaker,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      confidence: 1.0
    };

    onSendMessage(newMsg, speaker === 'candidate');
    setInputText('');
  };

  // Preset realistic speech simulation scripts for instant demonstration
  const SIMULATION_SCRIPTS = [
    {
      speaker: 'interviewer' as const,
      text: `${candidateName} 지원자님, 본인이 구축했던 프로젝트에서 가장 심각했던 장애 상황과 그 해결 과정을 설명해주시겠습니까?`
    },
    {
      speaker: 'candidate' as const,
      text: '네, 대용량 트래픽 테스트 중 데이터베이스 커넥션 풀 고갈로 인한 504 게이트웨이 타임아웃 장애가 발생했습니다. 저는 HikariCP 커넥션 파라미터를 튜닝하고, Redis 캐시 계층을 도입하여 DB 부하를 70% 이상 경감시켰습니다.'
    },
    {
      speaker: 'candidate' as const,
      text: '또한 Kafka 메시지 큐의 Dead Letter Queue(DLQ)를 구축하여 비동기 트랜잭션 유실을 방지하고 재시도 메커니즘을 완성했습니다.'
    }
  ];

  const handleSimulateNextSpeech = () => {
    const item = SIMULATION_SCRIPTS[simIndex % SIMULATION_SCRIPTS.length];
    const newMsg: STTMessage = {
      id: `stt-sim-${Date.now()}`,
      speaker: item.speaker,
      text: item.text,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      confidence: 0.98
    };
    onSendMessage(newMsg, item.speaker === 'candidate');
    setSimIndex(prev => prev + 1);
  };

  const handleCopyTailQuestion = (q: TailQuestion) => {
    navigator.clipboard.writeText(q.question);
    setCopiedId(q.id);
    onUseTailQuestion?.(q);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="stt-console-panel" className="h-full flex flex-col bg-white border-r border-slate-200 overflow-hidden select-none">
      {/* 1. AI Realtime Insights Header & Cards */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-purple-600 fill-purple-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              AI 실시간 피드백 & 요약
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
              초고속 분석
            </span>
            <span className="text-[10px] font-mono text-purple-600 font-semibold">
              실시간 동기화
            </span>
          </div>
        </div>

        {/* AI Answer Summary Box */}
        {realtimeSummaries.length > 0 ? (
          <div className="p-2.5 bg-sky-50/80 border border-sky-200 rounded-lg text-xs animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wide flex items-center gap-1">
                <Bot className="w-3 h-3 text-sky-600" />
                STT 실시간 답변 요약
              </span>
              <span className="text-[10px] text-sky-600 font-mono">
                {realtimeSummaries[0]?.timestamp}
              </span>
            </div>
            <p className="text-slate-800 text-[11px] leading-snug font-medium">
              {realtimeSummaries[0]?.text}
            </p>
          </div>
        ) : (
          <div className="p-2 bg-slate-100/70 border border-dashed border-slate-300 rounded-lg text-center text-[11px] text-slate-500">
            지원자의 답변이 인식되면 AI가 실시간으로 핵심을 요약합니다.
          </div>
        )}

        {/* Contradiction Alert if detected */}
        {contradictions.length > 0 && (
          <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg text-xs animate-bounce-short">
            <div className="flex items-center gap-1 text-amber-800 font-bold text-[10px] uppercase">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              서류 vs 답변 모순 감지
            </div>
            <p className="text-slate-800 text-[11px] mt-0.5 leading-snug font-medium">
              {contradictions[0]?.point}
            </p>
          </div>
        )}

        {/* Suggested Tail Questions (Follow-up) */}
        {tailQuestions.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                추천 심층 꼬리 질문 (Follow-up)
              </span>
              <div className="flex items-center gap-1">
                {settings?.knowledgeBase && settings.knowledgeBase.some(k => k.isActive && k.sourceType === 'youtube') && (
                  <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                    <Youtube className="w-2.5 h-2.5 text-rose-600" />
                    YouTube RAG
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">
                  {tailQuestions.length}건
                </span>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5">
              {tailQuestions.slice(0, 3).map((q) => (
                <div
                  key={q.id}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    q.used
                      ? 'bg-slate-100 border-slate-200 opacity-60'
                      : 'bg-purple-50/70 border-purple-200 hover:border-purple-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-200 text-purple-800 uppercase">
                      {q.category}
                    </span>
                    <button
                      onClick={() => handleCopyTailQuestion(q)}
                      className="text-[10px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-0.5 hover:underline"
                    >
                      {copiedId === q.id ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                          <span>복사됨</span>
                        </>
                      ) : (
                        <span>질문 사용</span>
                      )}
                    </button>
                  </div>
                  <p className="text-slate-900 text-[11px] font-semibold leading-snug">
                    "{q.question}"
                  </p>
                  {q.claim && (
                    <p className="text-[10px] text-slate-600 mt-1 leading-tight flex items-start gap-1">
                      <span className="font-bold text-slate-700 shrink-0">발언:</span>
                      <span className="truncate">{q.claim}</span>
                    </p>
                  )}
                  {q.verificationPoint && (
                    <p className="text-[10px] text-purple-700 mt-0.5 leading-tight flex items-start gap-1">
                      <span className="font-bold text-purple-900 shrink-0">검증:</span>
                      <span>{q.verificationPoint}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                    💡 <span className="font-bold text-slate-700">목적:</span> {q.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Live STT Stream Terminal (Professional Slate-900 High-Contrast) */}
      <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 min-h-0 overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
            <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wide">
              Live STT Stream
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSimulateNextSpeech}
              title="다음 모의 면접 발언 자동 생성"
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium flex items-center gap-1 transition-colors border border-slate-700"
            >
              <Play className="w-2.5 h-2.5 text-blue-400" />
              모의 발언
            </button>
            <button
              onClick={toggleMic}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isListening ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
              {isListening ? '마이크 끄기' : '실시간 STT'}
            </button>
          </div>
        </div>

        {/* Scrollable Subtitle Stream */}
        <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-2 font-sans text-xs leading-relaxed">
          {transcript.length === 0 && !interimText && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
              <Mic className="w-6 h-6 mb-2 opacity-40" />
              <p className="text-[11px]">면접관 및 지원자의 발언이 실시간 자막으로 스트리밍됩니다.</p>
              <p className="text-[10px] text-slate-600 mt-1">상단의 [모의 발언] 또는 [실시간 STT]를 눌러보세요.</p>
            </div>
          )}

          {transcript.map((msg) => {
            const isCandidate = msg.speaker === 'candidate';
            return (
              <div
                key={msg.id}
                className={`p-2 rounded-md transition-all ${
                  isCandidate
                    ? 'bg-slate-800/80 border-l-3 border-sky-400 text-slate-200'
                    : 'bg-slate-800/40 border-l-3 border-slate-600 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                  <span className={`font-bold ${isCandidate ? 'text-sky-300' : 'text-slate-400'}`}>
                    {isCandidate ? `지원자 (${candidateName})` : '면접관'}
                  </span>
                  <span className="text-slate-500 text-[9px]">{msg.timestamp}</span>
                </div>
                <p className="text-[12px] whitespace-pre-wrap">{msg.text}</p>
              </div>
            );
          })}

          {/* Current Interim Speech (Live typing preview) */}
          {interimText && (
            <div className="p-2 rounded-md bg-sky-950/60 border-l-3 border-sky-400 text-sky-200 animate-pulse">
              <span className="text-[9px] font-mono text-sky-400 block mb-0.5">
                실시간 음성 인식 중...
              </span>
              <p className="text-[12px]">{interimText}</p>
            </div>
          )}
        </div>

        {/* Input Bar for Manual Text/Speech Injection */}
        <form onSubmit={handleSendManual} className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSpeaker(prev => prev === 'candidate' ? 'interviewer' : 'candidate')}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors shrink-0 ${
              speaker === 'candidate'
                ? 'bg-sky-700 text-white'
                : 'bg-slate-700 text-slate-300'
            }`}
            title="화자 전환 (지원자 / 면접관)"
          >
            {speaker === 'candidate' ? '지원자' : '면접관'}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`${speaker === 'candidate' ? '지원자 답변' : '면접관 질문'} 텍스트 입력...`}
            className="flex-1 bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded border border-slate-800 focus:outline-hidden focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
