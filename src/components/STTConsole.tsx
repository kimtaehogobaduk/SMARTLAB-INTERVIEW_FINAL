import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  STTMessage,
  RealtimeSummary,
  TailQuestion,
  ContradictionPoint,
  PlatformSettings,
  QuestionPersonaStyle,
  EvaluationCriterion
} from '../types';
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  Bot,
  AlertTriangle,
  HelpCircle,
  Check,
  Play,
  RefreshCw,
  Zap,
  Bookmark,
  Share2,
  Copy,
  Search,
  Eye,
  Target,
  Sliders,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  PenTool,
  CheckCircle2,
  Users,
  MessageSquareQuote,
  Lightbulb,
  ArrowRight,
  Filter,
  Globe,
  AlertCircle
} from 'lucide-react';
import { QuestionPersonaSelector } from './QuestionPersonaSelector';
import { QuestionDetailModal } from './QuestionDetailModal';
import { TTSPlayButton } from './TTSPlayButton';
import { TTSQuickControl } from './TTSQuickControl';
import { STTAudioMeter } from './STTAudioMeter';
import { useSTT } from '../hooks/useSTT';
import { COLOR_MAP } from '../lib/scoring';

interface STTConsoleProps {
  transcript: STTMessage[];
  realtimeSummaries: RealtimeSummary[];
  tailQuestions: TailQuestion[];
  customQuestions?: TailQuestion[];
  contradictions: ContradictionPoint[];
  candidateId?: string;
  candidateName: string;
  candidateTrack: string;
  roomId?: string;
  currentUserName?: string;
  currentUserId?: string;
  settings?: PlatformSettings;
  roomCriteria?: EvaluationCriterion[];
  onSendMessage: (message: STTMessage, triggerAI: boolean) => void;
  onUseTailQuestion?: (q: TailQuestion) => void;
  onShareQuestionToChat?: (q: TailQuestion) => void;
  onRefreshQuestions?: (personaStyle: QuestionPersonaStyle, customPrompt: string) => Promise<void>;
  isLoadingAI?: boolean;
}

export const STTConsole: React.FC<STTConsoleProps> = ({
  transcript,
  realtimeSummaries,
  tailQuestions: initialTailQuestions,
  customQuestions: initialCustomQuestions,
  contradictions,
  candidateId,
  candidateName,
  candidateTrack,
  roomId,
  currentUserName,
  currentUserId,
  settings,
  roomCriteria,
  onSendMessage,
  onUseTailQuestion,
  onShareQuestionToChat,
  onRefreshQuestions,
  isLoadingAI = false
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [speaker, setSpeaker] = useState<'candidate' | 'interviewer'>('candidate');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [transcriptFilter, setTranscriptFilter] = useState<'ALL' | 'candidate' | 'interviewer'>('ALL');
  const [transcriptSearch, setTranscriptSearch] = useState<string>('');

  // Local standard tail questions vs on-demand custom questions (separate states)
  const [localTailQuestions, setLocalTailQuestions] = useState<TailQuestion[]>(initialTailQuestions || []);
  const [localCustomQuestions, setLocalCustomQuestions] = useState<TailQuestion[]>(initialCustomQuestions || []);

  useEffect(() => {
    setLocalTailQuestions(initialTailQuestions || []);
  }, [initialTailQuestions]);

  useEffect(() => {
    setLocalCustomQuestions(initialCustomQuestions || []);
  }, [initialCustomQuestions]);

  // Active Main Tab: 'CUSTOM' (맞춤 질문) or 'TAIL' (실시간 꼬리질문) or 'ALL'
  const [activeQuestionTab, setActiveQuestionTab] = useState<'CUSTOM' | 'TAIL' | 'ALL'>('CUSTOM');

  // Question Engine & Persona States
  const [selectedPersona, setSelectedPersona] = useState<QuestionPersonaStyle>('BALANCED');
  const [customFocusKeyword, setCustomFocusKeyword] = useState<string>('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState<boolean>(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedQuestionForDetail, setSelectedQuestionForDetail] = useState<TailQuestion | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showPersonaPanel, setShowPersonaPanel] = useState<boolean>(false);
  const [showCustomCreator, setShowCustomCreator] = useState<boolean>(false);

  // Custom Typed Question & Intent Form State
  const [customTypedIntent, setCustomTypedIntent] = useState<string>('');
  const [customQuestionText, setCustomQuestionText] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('기술 심층 검증');
  const [customDifficulty, setCustomDifficulty] = useState<'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'HARD'>('ADVANCED');
  const [customSelectedCriteria, setCustomSelectedCriteria] = useState<string[]>([]);
  const [customShouldShare, setCustomShouldShare] = useState<boolean>(true);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState<boolean>(false);

  // Toggle for STT Subtitle Stream (Collapsed by default to maximize AI Question Space, toggled via button)
  const [showLiveSTTStream, setShowLiveSTTStream] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const effectiveCriteria: EvaluationCriterion[] = roomCriteria && roomCriteria.length > 0
    ? roomCriteria
    : (settings?.criteria && settings.criteria.length > 0 ? settings.criteria : [
        { id: 'technical', name: '전문 기술 역량', description: '직무 지식 및 실무 능력', weight: 40, maxScore: 100, color: 'blue' },
        { id: 'problemSolving', name: '논리적 문제 해결력', description: '트러블슈팅 및 분석력', weight: 30, maxScore: 100, color: 'purple' },
        { id: 'communication', name: '소통 및 컬처핏', description: '협업 태도 및 전달력', weight: 30, maxScore: 100, color: 'emerald' }
      ]);

  // Set default selected criteria when criteria load
  useEffect(() => {
    if (customSelectedCriteria.length === 0 && effectiveCriteria.length > 0) {
      setCustomSelectedCriteria([effectiveCriteria[0].id]);
    }
  }, [effectiveCriteria]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Robust Universal STT Engine Hook
  const {
    isSupported: isSTTSupported,
    isListening,
    status: sttStatus,
    interimText,
    audioLevel: sttAudioLevel,
    errorMessage: sttErrorMessage,
    lang: sttLang,
    setLang: setSTTLang,
    toggle: toggleMic,
    clearError: clearSTTError
  } = useSTT({
    lang: 'ko-KR',
    continuous: true,
    onFinalResult: (speechText, confidence) => {
      if (!speechText.trim()) return;
      const newMsg: STTMessage = {
        id: `stt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        speaker,
        text: speechText.trim(),
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
        confidence: confidence || 0.95
      };
      onSendMessage(newMsg, speaker === 'candidate');
    }
  });

  // Auto-scroll STT terminal to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  const handleSendManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: STTMessage = {
      id: `stt-manual-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      speaker,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      confidence: 1.0
    };

    onSendMessage(newMsg, speaker === 'candidate');
    setInputText('');
  };

  const handleCopyAllTranscripts = () => {
    if (transcript.length === 0) return;
    const text = transcript
      .map(
        m => `[${m.timestamp}] ${m.speaker === 'candidate' ? `지원자 (${candidateName})` : '면접관'}: ${m.text}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    showToast('📋 전체 음성 자막 대화록이 클립보드에 복사되었습니다.');
  };

  const handleCopyTailQuestion = (q: TailQuestion) => {
    navigator.clipboard.writeText(q.question);
    setCopiedId(q.id);
    onUseTailQuestion?.(q);
    showToast('📋 질문이 클립보드에 복사되었습니다.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Real-time Share to All Interviewers
  const handleShareQuestion = async (q: TailQuestion) => {
    setSharedId(q.id);
    try {
      if (candidateId) {
        const res = await fetch(`/api/candidates/${candidateId}/tail-questions/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: q.id,
            question: q,
            sharedByName: currentUserName || '면접관',
            sharedById: currentUserId || 'user-unknown',
            roomId: roomId || '',
            candidateName
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.tailQuestions) {
            setLocalTailQuestions(data.tailQuestions);
          }
          setLocalCustomQuestions(prev => prev.map(item => item.id === q.id ? { ...item, isShared: true, sharedBy: currentUserName || '면접관' } : item));
          setLocalTailQuestions(prev => prev.map(item => item.id === q.id ? { ...item, isShared: true, sharedBy: currentUserName || '면접관' } : item));
        }
      }

      if (onShareQuestionToChat) {
        onShareQuestionToChat(q);
      }
      showToast('💡 모든 면접관의 채팅방과 실시간 알림 피드에 질문이 공유되었습니다!');
    } catch (e) {
      console.error('Error sharing question:', e);
      showToast('질문 공유 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => setSharedId(null), 2500);
    }
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // On-Demand Custom Question Generation (Fast & Separated output)
  const handleGenerateOnDemandQuestions = async () => {
    setIsGeneratingCustom(true);
    try {
      if (candidateId) {
        const res = await fetch(`/api/candidates/${candidateId}/generate-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personaStyle: selectedPersona,
            customFocusPrompt: customFocusKeyword
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.customQuestions) {
            setLocalCustomQuestions(data.customQuestions);
          } else if (data.generatedQuestions) {
            setLocalCustomQuestions(prev => [...data.generatedQuestions, ...prev]);
          }
          setActiveQuestionTab('CUSTOM');
          showToast(`✨ [${selectedPersona}] 맞춤 질문이 독립 출력 영역에 즉시 생성되었습니다!`);
        }
      } else if (onRefreshQuestions) {
        await onRefreshQuestions(selectedPersona, customFocusKeyword);
        showToast('✨ 맞춤 면접 질문이 생성되었습니다!');
      }
    } catch (e) {
      console.error('Failed generating custom questions:', e);
      showToast('질문 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  // Submit User Custom-Typed Question & Evaluation Intent
  const handleCustomQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestionText.trim() && !customTypedIntent.trim()) {
      alert('평가하고 싶은 의도나 직접 출제할 질문 문장을 입력해주세요.');
      return;
    }

    setIsSubmittingCustom(true);
    try {
      const qText = customQuestionText.trim() || `[${customCategory}] ${customTypedIntent.trim()}에 대한 실제 경험과 접근 방식에 대해 설명해주세요.`;

      if (candidateId) {
        const res = await fetch(`/api/candidates/${candidateId}/custom-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionText: qText,
            userTypedIntent: customTypedIntent.trim(),
            category: customCategory,
            difficulty: customDifficulty,
            evaluatedCriteria: customSelectedCriteria,
            shouldShareWithEveryone: customShouldShare,
            operatorName: currentUserName || '면접관',
            operatorId: currentUserId || 'user-unknown',
            roomId: roomId || '',
            candidateName
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.customQuestions) {
            setLocalCustomQuestions(data.customQuestions);
          } else if (data.question) {
            setLocalCustomQuestions(prev => [data.question, ...prev]);
          }
          if (data.tailQuestions) {
            setLocalTailQuestions(data.tailQuestions);
          }

          setCustomQuestionText('');
          setCustomTypedIntent('');
          setShowCustomCreator(false);
          setActiveQuestionTab('CUSTOM');
          showToast(customShouldShare ? '✨ 맞춤 질문이 등록되고 모든 면접관에게 공유되었습니다!' : '✅ 맞춤 질문이 목록에 등록되었습니다!');
        } else {
          const err = await res.json();
          alert(err.error || '질문 등록에 실패했습니다.');
        }
      } else {
        const fallbackQ: TailQuestion = {
          id: `tq-custom-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
          question: qText,
          category: customCategory,
          categoryLabel: customCategory,
          difficulty: customDifficulty,
          evaluatedCriteria: customSelectedCriteria,
          intent: customTypedIntent || '면접관 직접 출제 질문',
          verificationPoint: customTypedIntent || '직무 역량 검증',
          reason: customTypedIntent || '면접관 맞춤형 직접 질문',
          matchScore: 99,
          isUserCreated: true,
          isCustomGenerated: true,
          userTypedIntent: customTypedIntent
        };
        setLocalCustomQuestions(prev => [fallbackQ, ...prev]);
        setCustomQuestionText('');
        setCustomTypedIntent('');
        setShowCustomCreator(false);
        setActiveQuestionTab('CUSTOM');
        showToast('✅ 맞춤 질문이 등록되었습니다!');
      }
    } catch (err: any) {
      console.error('Error creating custom question:', err);
      alert('질문 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  // Determine current active question pool based on activeQuestionTab
  const currentPool = useMemo(() => {
    if (activeQuestionTab === 'CUSTOM') return localCustomQuestions;
    if (activeQuestionTab === 'TAIL') return localTailQuestions;
    // ALL: Custom questions first, then tail questions
    return [...localCustomQuestions, ...localTailQuestions.filter(t => !localCustomQuestions.some(c => c.id === t.id))];
  }, [activeQuestionTab, localCustomQuestions, localTailQuestions]);

  // Filter questions based on Category, Search query, and Bookmark
  const filteredQuestions = useMemo(() => {
    return currentPool.filter((q) => {
      const isBookmarked = bookmarkedIds.has(q.id) || q.isBookmarked;

      if (activeCategoryFilter === 'BOOKMARKED' && !isBookmarked) return false;
      if (activeCategoryFilter === 'SHARED' && !q.isShared) return false;
      if (activeCategoryFilter === 'TECH' && !q.category.includes('기술') && !q.category.includes('직무') && q.category !== 'DEEP_DIVE') return false;
      if (activeCategoryFilter === 'TROUBLE' && !q.category.includes('장애') && !q.category.includes('트러블') && q.category !== 'PROBLEM_SOLVING') return false;
      if (activeCategoryFilter === 'ARCH' && !q.category.includes('설계') && !q.category.includes('아키텍처') && !q.category.includes('트레이드오프') && q.category !== 'TECH_TRADEOFF') return false;
      if (activeCategoryFilter === 'CULTURE' && !q.category.includes('협업') && !q.category.includes('컬처') && !q.category.includes('인성') && q.category !== 'COLLABORATION') return false;
      if (activeCategoryFilter === 'LOGIC' && !q.category.includes('모순') && !q.category.includes('논리') && !q.category.includes('팩트') && q.category !== 'LOGIC_VERIFICATION') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchText = (q.question + ' ' + (q.claim || '') + ' ' + (q.reason || '') + ' ' + (q.category || '') + ' ' + (q.intent || '')).toLowerCase();
        if (!matchText.includes(query)) return false;
      }

      return true;
    });
  }, [currentPool, activeCategoryFilter, bookmarkedIds, searchQuery]);

  const sharedCount = currentPool.filter(q => q.isShared).length;

  return (
    <div id="stt-console-panel" className="h-full flex flex-col bg-slate-900 border-r border-slate-800 overflow-hidden select-none font-sans text-slate-100 relative">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-2xl shadow-xl border border-blue-400/40 flex items-center gap-2 animate-fade-in pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Top Intelligent Question Center (Expands to full height when STT stream is collapsed) */}
      <div className={`bg-slate-950/95 border-b border-slate-800 p-3 sm:p-4 space-y-3 shrink-0 flex flex-col transition-all duration-200 ${
        showLiveSTTStream ? 'max-h-[50vh] overflow-y-auto scrollbar-thin' : 'flex-1 min-h-0 overflow-hidden'
      }`}>
        
        {/* Header bar: Title, AI Generation CTA, Action Toggles */}
        <div className="flex flex-col gap-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-md shadow-purple-500/20 text-white shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 whitespace-nowrap">
                    면접 질문 AI 맞춤 생성 센터
                  </span>
                  <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <Sparkles className="w-2.5 h-2.5" />
                    채점 지표 연동
                  </span>
                  <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    총 {currentPool.length}개 질문
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  지원자 서류 및 실시간 발언을 분석하여 고품질 심층 질문을 생성하고 동료 면접관과 공유합니다
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto flex-wrap sm:flex-nowrap">
              {/* Primary Glowing AI Question Generate Button */}
              <button
                type="button"
                onClick={handleGenerateOnDemandQuestions}
                disabled={isGeneratingCustom || isLoadingAI}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                  isGeneratingCustom || isLoadingAI
                    ? 'bg-purple-900/60 text-purple-300 border border-purple-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-600/30 ring-1 ring-purple-400 active:scale-95'
                }`}
                title="선택한 스타일과 키워드로 AI 심층 면접 질문 즉시 생성"
              >
                {isGeneratingCustom || isLoadingAI ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-200" />
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>AI 질문 즉시 생성</span>
                  </>
                )}
              </button>

              {/* TTS Global Quick Controller */}
              <TTSQuickControl />

              {/* Direct Question / Intent Creator Button */}
              <button
                type="button"
                onClick={() => {
                  setShowCustomCreator(!showCustomCreator);
                  if (showPersonaPanel && !showCustomCreator) setShowPersonaPanel(false);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
                  showCustomCreator
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-purple-500/30 hover:border-purple-400/60'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-purple-400" />
                <span>{showCustomCreator ? '작성 닫기' : '직접 작성'}</span>
              </button>

              {/* Persona Settings Toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowPersonaPanel(!showPersonaPanel);
                  if (showCustomCreator && !showPersonaPanel) setShowCustomCreator(false);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border whitespace-nowrap ${
                  showPersonaPanel
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>{showPersonaPanel ? '스타일 닫기' : 'AI 스타일'}</span>
                {showPersonaPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {/* Toggle Live STT Stream Screen */}
              <button
                type="button"
                onClick={() => setShowLiveSTTStream(!showLiveSTTStream)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
                  showLiveSTTStream
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30'
                    : isListening
                    ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-500/50 animate-pulse'
                    : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-500/30 hover:border-sky-400/60'
                }`}
                title={showLiveSTTStream ? '실시간 STT 자막창 숨기기' : '실시간 STT 음성 자막창 열기'}
              >
                <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-rose-400' : 'text-sky-400'}`} />
                <span>{showLiveSTTStream ? 'STT 닫기' : '실시간 STT'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  showLiveSTTStream ? 'bg-white/20 text-white' : 'bg-sky-950 text-sky-300'
                }`}>
                  {transcript.length}
                </span>
                {isListening && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Persona Chips & Focus Keyword Bar */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Target className="w-3 h-3 text-purple-400" />
              <span>스타일:</span>
            </span>
            {[
              { id: 'BALANCED' as QuestionPersonaStyle, label: '⚖️ 균형형' },
              { id: 'LOGIC_PRESSURE' as QuestionPersonaStyle, label: '🎯 압박/모순' },
              { id: 'TROUBLESHOOTING' as QuestionPersonaStyle, label: '🛠️ 장애 대응' },
              { id: 'ARCHITECTURE' as QuestionPersonaStyle, label: '🏗️ 아키텍처' },
              { id: 'STAR_COLLABORATION' as QuestionPersonaStyle, label: '🤝 STAR협업' },
              { id: 'GROWTH_FUNDAMENTALS' as QuestionPersonaStyle, label: '🌱 CS기본기' }
            ].map(p => {
              const isSelected = selectedPersona === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPersona(p.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                      : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            {/* Quick keyword focus input */}
            <div className="flex items-center gap-1 ml-auto flex-1 min-w-[160px] max-w-xs">
              <input
                type="text"
                value={customFocusKeyword}
                onChange={e => setCustomFocusKeyword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isGeneratingCustom && !isLoadingAI) {
                    e.preventDefault();
                    handleGenerateOnDemandQuestions();
                  }
                }}
                placeholder="검증 키워드 입력 (Enter)..."
                className="w-full px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={handleGenerateOnDemandQuestions}
                disabled={isGeneratingCustom || isLoadingAI}
                className="px-2 py-0.5 bg-slate-800 hover:bg-purple-900/60 text-purple-300 hover:text-white border border-purple-500/30 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0"
              >
                생성
              </button>
            </div>
          </div>
        </div>

        {/* Custom Question & Intent Creator Panel */}
        {showCustomCreator && (
          <form
            onSubmit={handleCustomQuestionSubmit}
            className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 shadow-lg space-y-3.5 font-sans"
          >
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
              <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-purple-400" />
                <span>면접관 직접 평가 항목 & 맞춤 질문 작성기</span>
              </span>
              <span className="text-[10px] text-slate-400">
                원하는 평가 목적을 적고 모든 면접관에게 즉시 공유할 수 있습니다
              </span>
            </div>

            {/* 1. Evaluation Intent / Goal */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Target className="w-3 h-3 text-purple-400" />
                <span>1. 평가하고 싶은 검증 포인트 / 의도 (직접 입력)</span>
              </label>
              <input
                type="text"
                value={customTypedIntent}
                onChange={(e) => setCustomTypedIntent(e.target.value)}
                placeholder="예: 대용량 트래픽 동시성 제어 시 낙관적 락 vs 비관적 락 트레이드오프 검증"
                className="w-full px-3 py-2 bg-slate-950/90 border border-purple-500/30 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 2. Direct Question Text (Optional) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <MessageSquareQuote className="w-3 h-3 text-blue-400" />
                <span>2. 실전 면접 질문 문장 (비워두면 AI가 의도에 맞춰 생성)</span>
              </label>
              <textarea
                value={customQuestionText}
                onChange={(e) => setCustomQuestionText(e.target.value)}
                rows={2}
                placeholder="예: 지원자님, 본인이 설계하셨던 DB 구조에서 동시 주문 요청이 몰렸을 때 락 경합을 어떻게 방지하셨습니까?"
                className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 3. Criteria & Difficulty Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Evaluated Criteria Checkboxes */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 block">
                  3. 연계할 면접방 평가 기준 (다중 선택):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {effectiveCriteria.map((crit) => {
                    const isSelected = customSelectedCriteria.includes(crit.id);
                    return (
                      <button
                        key={crit.id}
                        type="button"
                        onClick={() => {
                          setCustomSelectedCriteria(prev =>
                            isSelected ? prev.filter(id => id !== crit.id) : [...prev, crit.id]
                          );
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{crit.name} ({crit.weight}%)
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty & Category */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 block">
                  4. 난이도 및 카테고리:
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={customDifficulty}
                    onChange={(e: any) => setCustomDifficulty(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="BASIC">초급 / 기본기</option>
                    <option value="INTERMEDIATE">중급 / 실무 적용</option>
                    <option value="ADVANCED">고급 / 심층 설계</option>
                    <option value="HARD">하드 / 극단적 압박</option>
                  </select>

                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="기술 심층 검증">기술 심층 검증</option>
                    <option value="실무 장애 트러블슈팅">실무 장애 트러블슈팅</option>
                    <option value="아키텍처 트레이드오프">아키텍처 트레이드오프</option>
                    <option value="협업 및 갈등 해결">협업 및 갈등 해결</option>
                    <option value="논리적 모순 검증">논리적 모순 검증</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Share Option & Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
              <label className="flex items-center gap-1.5 text-xs text-purple-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={customShouldShare}
                  onChange={(e) => setCustomShouldShare(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                />
                <span className={customShouldShare ? 'font-bold text-amber-300' : 'text-slate-400'}>
                  👥 등록 즉시 모든 면접관 채팅방 및 알림에 공유
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomCreator(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  취소
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingCustom}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-purple-600/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingCustom ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>등록 중...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>맞춤 질문 등록</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Persona Selector & Custom Focus Input */}
        {showPersonaPanel && (
          <QuestionPersonaSelector
            selectedPersona={selectedPersona}
            onSelectPersona={setSelectedPersona}
            customFocusKeyword={customFocusKeyword}
            onChangeCustomFocus={setCustomFocusKeyword}
            onGenerateQuestions={handleGenerateOnDemandQuestions}
            isLoading={isGeneratingCustom || isLoadingAI}
          />
        )}

        {/* Real-time Summary Box */}
        {realtimeSummaries.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/30 border border-blue-500/20 rounded-2xl text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                <span>지원자 최신 발언 요약</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {realtimeSummaries[0]?.timestamp}
              </span>
            </div>
            <p className="text-slate-200 text-xs leading-relaxed font-medium">
              {realtimeSummaries[0]?.text}
            </p>
          </div>
        )}

        {/* Contradiction Alert if detected */}
        {contradictions.length > 0 && (
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>서류 vs 발언 모순 및 팩트체크 의심 지점</span>
            </div>
            <p className="text-amber-200/90 text-xs leading-relaxed font-medium">
              {contradictions[0]?.point}
            </p>
          </div>
        )}

        {/* Primary View Switcher: Custom Generated Questions vs Realtime Tail Questions */}
        <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setActiveQuestionTab('CUSTOM')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeQuestionTab === 'CUSTOM'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                  : 'text-purple-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>맞춤 생성 질문</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeQuestionTab === 'CUSTOM' ? 'bg-white/20 text-white' : 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
              }`}>
                {localCustomQuestions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveQuestionTab('TAIL')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeQuestionTab === 'TAIL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>실시간 꼬리질문</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeQuestionTab === 'TAIL' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {localTailQuestions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveQuestionTab('ALL')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeQuestionTab === 'ALL'
                  ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-500'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/80'
              }`}
              title="맞춤 질문과 실시간 꼬리질문 전체 보기"
            >
              <span>전체</span>
              <span className="text-[10px] opacity-80">
                ({localCustomQuestions.length + localTailQuestions.length})
              </span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="space-y-2 pt-0.5 flex-1 flex flex-col min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
              {[
                { id: 'ALL', label: `필터 전체 (${currentPool.length})` },
                { id: 'SHARED', label: `👥 공유 (${sharedCount})` },
                { id: 'TECH', label: '기술 심층' },
                { id: 'TROUBLE', label: '장애 대응' },
                { id: 'ARCH', label: '아키텍처' },
                { id: 'CULTURE', label: '협업/인성' },
                { id: 'LOGIC', label: '논리/검증' },
                { id: 'BOOKMARKED', label: `★ 북마크 (${bookmarkedIds.size})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategoryFilter === tab.id
                      ? tab.id === 'SHARED'
                        ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                        : 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="질문 검색..."
                className="w-full pl-7 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
            </div>
          </div>

          {/* Question List Cards - Expands to fill available vertical space */}
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 scrollbar-thin min-h-[160px]">
            {filteredQuestions.length === 0 ? (
              <div className="p-6 text-center bg-slate-950/40 border border-dashed border-slate-800/80 rounded-2xl text-slate-500 text-xs space-y-2">
                <HelpCircle className="w-6 h-6 mx-auto opacity-30 text-blue-400" />
                <p>해당 조건에 맞는 면접 질문이 없습니다.</p>
                <p className="text-[11px] text-slate-600">
                  상단의 [직접 평가·질문 작성] 또는 [AI 질문 스타일]을 통해 질문을 생성해보세요.
                </p>
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const isBookmarked = bookmarkedIds.has(q.id) || q.isBookmarked;
                const criteriaDetails = q.evaluatedCriteriaDetails || [];
                const evaluatedIds = q.evaluatedCriteria || [];

                return (
                  <div
                    key={q.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      q.isShared
                        ? 'bg-gradient-to-r from-indigo-950/40 via-slate-950/90 to-slate-950/90 border-indigo-500/40 shadow-md ring-1 ring-indigo-500/20'
                        : q.used
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
                    }`}
                  >
                    {/* Card Top: Badges & Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          q.isCustomGenerated || q.isUserCreated
                            ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                            : 'bg-blue-950/80 text-blue-400 border-blue-500/30'
                        }`}>
                          {q.isCustomGenerated ? '맞춤 질문' : q.categoryLabel || q.category}
                        </span>

                        {q.isCustomGenerated && !q.isUserCreated && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-indigo-300" />
                            <span>AI 맞춤</span>
                          </span>
                        )}

                        {q.isShared && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-400/40 flex items-center gap-1 shadow-xs">
                            <Users className="w-2.5 h-2.5 text-indigo-400" />
                            <span>{q.sharedBy ? `${q.sharedBy} 면접관 공유` : '공유된 질문'}</span>
                          </span>
                        )}

                        {q.isUserCreated && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                            직접 작성
                          </span>
                        )}

                        {q.difficulty && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                            {q.difficulty === 'ADVANCED' ? '심층' : q.difficulty === 'HARD' ? '압박' : '기본'}
                          </span>
                        )}

                        {q.matchScore && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30">
                            적합도 {q.matchScore}%
                          </span>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-1">
                        {/* TTS Question Reader */}
                        <TTSPlayButton text={q.question} size="sm" />

                        <button
                          type="button"
                          onClick={() => toggleBookmark(q.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isBookmarked
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                          title="질문 북마크"
                        >
                          <Bookmark className={`w-3 h-3 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                        </button>

                        {/* One-Click Share with All Interviewers */}
                        <button
                          type="button"
                          onClick={() => handleShareQuestion(q)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            sharedId === q.id || q.isShared
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                              : 'bg-slate-900 hover:bg-indigo-950 hover:text-indigo-300 text-slate-300 border-slate-800'
                          }`}
                          title="모든 면접관의 채팅방과 실시간 알림 피드에 질문 공유"
                        >
                          <Share2 className="w-3 h-3 text-indigo-400" />
                          <span>{sharedId === q.id ? '공유 완료!' : q.isShared ? '공유됨' : '동료 공유'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedQuestionForDetail(q)}
                          className="px-2 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="질문 상세 보기 및 평가 가이드"
                        >
                          <Eye className="w-3 h-3" />
                          <span>상세보기</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyTailQuestion(q)}
                          className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                          title="질문 클립보드 복사"
                        >
                          {copiedId === q.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-300" />
                              <span>복사됨</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>복사</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <p className="text-slate-100 text-xs sm:text-sm font-bold leading-snug select-text">
                      "{q.question}"
                    </p>

                    {/* Intent or Anchor Claim Quote */}
                    {(q.intent || q.userTypedIntent || q.claim) && (
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5">
                        <Target className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="truncate">
                          <strong className="text-purple-300 mr-1">검증 의도:</strong>
                          {q.userTypedIntent || q.intent || q.claim}
                        </span>
                      </div>
                    )}

                    {/* Evaluated Criteria Badges (Target Items) */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                        <Sliders className="w-2.5 h-2.5 text-purple-400" />
                        평가 항목:
                      </span>
                      {criteriaDetails.length > 0 ? (
                        criteriaDetails.map((crit, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[10px] font-black rounded-md bg-purple-950/60 border border-purple-500/30 text-purple-300"
                          >
                            {crit.criterionName}
                          </span>
                        ))
                      ) : evaluatedIds.length > 0 ? (
                        evaluatedIds.map((cid, idx) => {
                          const matched = effectiveCriteria.find(c => c.id === cid);
                          return (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] font-black rounded-md bg-purple-950/60 border border-purple-500/30 text-purple-300"
                            >
                              {matched ? `${matched.name} (${matched.weight}%)` : cid}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-slate-500">종합 직무 역량</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 2. Live STT Stream Terminal (Shown when showLiveSTTStream is true, collapsed to prioritize AI Question Center) */}
      {showLiveSTTStream && (
        <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 min-h-[260px] overflow-hidden border-t border-slate-800 animate-fade-in">
          
          {/* Terminal Header */}
          <div className="flex flex-wrap items-center justify-between px-3.5 py-2 bg-slate-950 border-b border-slate-800 text-xs shrink-0 gap-2">
            <div className="flex items-center gap-2.5">
              <STTAudioMeter
                status={sttStatus}
                audioLevel={sttAudioLevel}
                isListening={isListening}
                lang={sttLang}
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-0.5 text-[11px] text-slate-300">
                <Globe className="w-3 h-3 text-slate-400" />
                <select
                  value={sttLang}
                  onChange={(e) => setSTTLang(e.target.value)}
                  className="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ko-KR" className="bg-slate-900 text-slate-200">한국어 (ko-KR)</option>
                  <option value="en-US" className="bg-slate-900 text-slate-200">English (en-US)</option>
                  <option value="ja-JP" className="bg-slate-900 text-slate-200">日本語 (ja-JP)</option>
                  <option value="zh-CN" className="bg-slate-900 text-slate-200">中文 (zh-CN)</option>
                </select>
              </div>

              {/* Copy Full Transcript */}
              {transcript.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyAllTranscripts}
                  title="전체 자막 대화록 복사"
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-medium flex items-center gap-1 transition-colors border border-slate-800 cursor-pointer"
                >
                  <Copy className="w-3 h-3 text-sky-400" />
                  <span>대화록 복사</span>
                </button>
              )}

              {/* Main Microphone Action */}
              <button
                type="button"
                onClick={toggleMic}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-500/30 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span>{isListening ? '마이크 끄기' : '실시간 마이크 켜기'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLiveSTTStream(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors ml-1 cursor-pointer"
                title="STT 자막창 접기"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* STT Error Notification Banner (if any) */}
          {sttErrorMessage && (
            <div className="px-3.5 py-2 bg-rose-950/80 border-b border-rose-800/60 flex items-center justify-between text-xs text-rose-200 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-medium text-[11px] leading-tight">{sttErrorMessage}</span>
              </div>
              <button
                type="button"
                onClick={clearSTTError}
                className="text-[10px] text-rose-300 hover:text-white underline ml-2 shrink-0 cursor-pointer"
              >
                닫기
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="px-3.5 py-1.5 bg-slate-950/60 border-b border-slate-800/70 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>화자 필터:</span>
              </span>
              <button
                type="button"
                onClick={() => setTranscriptFilter('ALL')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  transcriptFilter === 'ALL'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                전체 ({transcript.length})
              </button>
              <button
                type="button"
                onClick={() => setTranscriptFilter('candidate')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  transcriptFilter === 'candidate'
                    ? 'bg-sky-950/80 text-sky-300 font-bold border border-sky-600/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                지원자 ({transcript.filter(m => m.speaker === 'candidate').length})
              </button>
              <button
                type="button"
                onClick={() => setTranscriptFilter('interviewer')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  transcriptFilter === 'interviewer'
                    ? 'bg-slate-800 text-slate-200 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                면접관 ({transcript.filter(m => m.speaker !== 'candidate').length})
              </button>
            </div>

            <div className="text-[10px] text-slate-500 font-mono">
              실시간 상태: {isListening ? '수신 중 (Continuous)' : '대기 (Idle)'}
            </div>
          </div>

          {/* Scrollable Subtitle Stream */}
          <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-2 font-sans text-xs leading-relaxed scrollbar-thin max-h-[280px]">
            {transcript.length === 0 && !interimText && (
              <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-slate-500 text-center p-6 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                  <Mic className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-400">면접관 및 지원자의 발언이 실시간 음성인식(STT) 자막으로 기록됩니다.</p>
                <p className="text-[11px] text-slate-600">상단의 [실시간 마이크 켜기] 버튼을 누르거나 하단 텍스트 창에 직접 입력하세요.</p>
              </div>
            )}

            {transcript
              .filter(m => {
                if (transcriptFilter !== 'ALL' && m.speaker !== transcriptFilter) return false;
                if (transcriptSearch.trim() && !m.text.toLowerCase().includes(transcriptSearch.toLowerCase())) return false;
                return true;
              })
              .map((msg) => {
                const isCandidate = msg.speaker === 'candidate';
                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl transition-all ${
                      isCandidate
                        ? 'bg-slate-800/90 border-l-4 border-sky-400 text-slate-200 shadow-xs'
                        : 'bg-slate-800/40 border-l-4 border-slate-600 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                      <span className={`font-bold ${isCandidate ? 'text-sky-300' : 'text-slate-400'}`}>
                        {isCandidate ? `지원자 (${candidateName})` : '면접관'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <TTSPlayButton text={msg.text} size="sm" />
                        <span className="text-slate-500 text-[9px]">{msg.timestamp}</span>
                      </div>
                    </div>
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                );
              })}

            {/* Current Interim Speech (Live speech preview) */}
            {interimText && (
              <div className="p-2.5 rounded-xl bg-sky-950/70 border-l-4 border-sky-400 text-sky-200 animate-pulse shadow-sm">
                <div className="flex items-center justify-between text-[10px] font-mono text-sky-400 mb-1">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span>실시간 음성 인식 중 ({speaker === 'candidate' ? candidateName : '면접관'})...</span>
                  </span>
                  <span className="text-sky-500 text-[9px]">음성 파형 수신 중</span>
                </div>
                <p className="text-xs leading-relaxed">{interimText}</p>
              </div>
            )}
          </div>

          {/* Input Bar for Manual Text/Speech Injection */}
          <form onSubmit={handleSendManual} className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSpeaker(prev => prev === 'candidate' ? 'interviewer' : 'candidate')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                speaker === 'candidate'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
              title="화자 전환 (지원자 / 면접관)"
            >
              {speaker === 'candidate' ? '지원자 답변' : '면접관 질문'}
            </button>
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`${speaker === 'candidate' ? '지원자 답변' : '면접관 질문'} 텍스트 입력...`}
              className="flex-1 bg-slate-900 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Minimal Collapsed Bottom Bar when STT stream is hidden */}
      {!showLiveSTTStream && (
        <div className="h-9 px-3 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between text-xs shrink-0 select-none">
          <button
            type="button"
            onClick={() => setShowLiveSTTStream(true)}
            className="flex items-center gap-2 text-slate-400 hover:text-sky-300 font-bold transition-colors cursor-pointer text-xs group"
          >
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-400 animate-ping' : 'bg-slate-600'}`}></div>
            <Mic className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>실시간 STT 음성 자막창 열기 ({transcript.length}건 기록)</span>
            <ChevronUp className="w-3 h-3 text-slate-500 group-hover:text-sky-300" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMic}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {isListening ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5 text-sky-400" />}
              <span>{isListening ? '녹음 중 (마이크 종료)' : '마이크 켜기'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedQuestionForDetail && (
        <QuestionDetailModal
          question={selectedQuestionForDetail}
          onClose={() => setSelectedQuestionForDetail(null)}
          onShareToChat={handleShareQuestion}
          onToggleBookmark={toggleBookmark}
          onMarkUsed={onUseTailQuestion ? (qid) => {
            const q = localCustomQuestions.find(t => t.id === qid) || localTailQuestions.find(t => t.id === qid);
            if (q) onUseTailQuestion(q);
          } : undefined}
          criteria={effectiveCriteria}
        />
      )}
    </div>
  );
};
