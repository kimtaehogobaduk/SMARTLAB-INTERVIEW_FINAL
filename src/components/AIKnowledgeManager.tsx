import React, { useState, useEffect } from 'react';
import {
  AIKnowledgeItem,
  KnowledgeSourceType,
  PlatformSettings
} from '../types';
import {
  Youtube,
  FileText,
  Globe,
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Play,
  Search,
  Tag,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  Send,
  Bot,
  Video,
  Copy,
  Check,
  Eye,
  Info
} from 'lucide-react';

interface AIKnowledgeManagerProps {
  settings: PlatformSettings;
  onRefreshSettings?: () => Promise<void>;
}

export const AIKnowledgeManager: React.FC<AIKnowledgeManagerProps> = ({
  settings,
  onRefreshSettings
}) => {
  const [knowledgeList, setKnowledgeList] = useState<AIKnowledgeItem[]>(
    settings.knowledgeBase || []
  );
  const [activeSourceType, setActiveSourceType] = useState<KnowledgeSourceType>('youtube');
  const [selectedFilter, setSelectedFilter] = useState<'all' | KnowledgeSourceType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Expand card state
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  // Simulation Playground State
  const [simQuery, setSimQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ answer: string; referencedSources: any[] } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (settings.knowledgeBase) {
      setKnowledgeList(settings.knowledgeBase);
    }
  }, [settings.knowledgeBase]);

  // Extract YouTube ID on url change for quick preview
  const getYouTubeId = (inputUrl: string) => {
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = inputUrl.match(regExp);
    return match ? match[1] : null;
  };

  const detectedVideoId = activeSourceType === 'youtube' ? getYouTubeId(url) : null;

  // Handle Learn / Ingest
  const handleLearnMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (activeSourceType === 'youtube' && !url.trim()) {
      setErrorMsg('YouTube 영상 URL을 입력해주세요.');
      return;
    }

    if (activeSourceType !== 'youtube' && !title.trim() && !rawText.trim()) {
      setErrorMsg('학습할 자료의 제목 또는 원본 내용을 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/knowledge/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: activeSourceType,
          url: url.trim(),
          title: title.trim(),
          rawText: rawText.trim(),
          description: description.trim(),
          adminPassword: 'admin',
          addedBy: '동아리 관리자 (Admin)'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '자료 학습 중 오류가 발생했습니다.');
      }

      setSuccessMsg(`성공적으로 AI가 [${data.item.title}] 자료를 학습하고 지식 베이스에 등록했습니다!`);
      setUrl('');
      setTitle('');
      setDescription('');
      setRawText('');
      setKnowledgeList(data.knowledgeBase || []);
      setExpandedCardId(data.item.id);

      if (onRefreshSettings) {
        await onRefreshSettings();
      }
    } catch (err: any) {
      setErrorMsg(err.message || '자료 학습 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle active
  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/knowledge/${id}/toggle`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (res.ok && data.knowledgeBase) {
        setKnowledgeList(data.knowledgeBase);
        if (onRefreshSettings) await onRefreshSettings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete
  const handleDeleteItem = async (id: string, itemTitle: string) => {
    if (!window.confirm(`'${itemTitle}' 자료를 AI 지식 베이스에서 영구 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/ai/knowledge/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: 'admin' })
      });
      const data = await res.json();
      if (res.ok && data.knowledgeBase) {
        setKnowledgeList(data.knowledgeBase);
        setSuccessMsg(`'${itemTitle}' 자료가 성공적으로 영구 삭제되었습니다.`);
        if (onRefreshSettings) await onRefreshSettings();
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete All Knowledge Items
  const handleDeleteAll = async () => {
    if (knowledgeList.length === 0) return;
    if (!window.confirm(`정말로 등록된 모든 AI 학습 자료 (${knowledgeList.length}건)를 전체 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const res = await fetch('/api/ai/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: 'admin' })
      });
      const data = await res.json();
      if (res.ok) {
        setKnowledgeList([]);
        setSuccessMsg('모든 AI 학습 자료가 성공적으로 전체 삭제되었습니다.');
        if (onRefreshSettings) await onRefreshSettings();
      } else {
        alert(data.error || '전체 삭제 실패');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Simulation
  const handleRunSimulation = async (presetQuery?: string) => {
    const q = presetQuery || simQuery;
    if (!q.trim()) return;

    setIsSimulating(true);
    setSimResult(null);

    try {
      const res = await fetch('/api/ai/knowledge/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (res.ok) {
        setSimResult(data);
      } else {
        alert(data.error || '시뮬레이션 실패');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyQuestion = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered list
  const filteredList = knowledgeList.filter(item => {
    const matchesFilter = selectedFilter === 'all' || item.sourceType === selectedFilter;
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.extractedInsights.keyConcepts.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const activeCount = knowledgeList.filter(k => k.isActive).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              SmartLab AI Multi-Source Knowledge Engine
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              AI 면접 지식 및 YouTube 학습 센터
            </h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              관리자가 입력한 <strong className="text-indigo-200">YouTube 기술 세미나 영상, 노션 문서, 합격자 루브릭, 질의응답 가이드</strong>를 AI가 심층 학습하여 실제 면접 중 날카로운 기술 꼬리 질문과 평가 기준에 실시간 반영합니다.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 self-start md:self-auto">
            <div className="p-3 bg-indigo-600 rounded-lg text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-indigo-200 font-medium">학습된 지식 자산</div>
              <div className="text-xl font-bold text-white">
                총 {knowledgeList.length}건 <span className="text-xs font-normal text-emerald-300">({activeCount}건 실시간 활성)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Ingestion Form, Right Knowledge Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Learning Ingestion Console (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-lg">
                <Plus className="w-5 h-5 text-indigo-600" />
                신규 자료 AI 학습 및 주입
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                Groq Llama 3.3 70B RAG
              </span>
            </div>

            {/* Source Type Selector Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setActiveSourceType('youtube')}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg text-xs font-medium transition-all ${
                  activeSourceType === 'youtube'
                    ? 'bg-white text-rose-600 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Youtube className="w-4 h-4 mb-1" />
                유튜브 영상
              </button>
              <button
                type="button"
                onClick={() => setActiveSourceType('document')}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg text-xs font-medium transition-all ${
                  activeSourceType === 'document'
                    ? 'bg-white text-blue-600 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 mb-1" />
                문서/자료
              </button>
              <button
                type="button"
                onClick={() => setActiveSourceType('web')}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg text-xs font-medium transition-all ${
                  activeSourceType === 'web'
                    ? 'bg-white text-emerald-600 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-4 h-4 mb-1" />
                웹/노션 링크
              </button>
              <button
                type="button"
                onClick={() => setActiveSourceType('rule')}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg text-xs font-medium transition-all ${
                  activeSourceType === 'rule'
                    ? 'bg-white text-purple-600 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-4 h-4 mb-1" />
                평가 루브릭
              </button>
            </div>

            {/* Ingestion Form */}
            <form onSubmit={handleLearnMaterial} className="space-y-4">
              {/* YouTube Specific Input */}
              {activeSourceType === 'youtube' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>YouTube 영상 URL <span className="text-rose-500">*</span></span>
                      <span className="text-[11px] font-normal text-slate-400">영상 링크 입력 시 자동 분석</span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                        required
                      />
                      <Youtube className="w-4 h-4 text-rose-500 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  {/* Instant Video Preview Box if valid ID */}
                  {detectedVideoId && (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center gap-3">
                      <div className="relative w-20 h-12 bg-black rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={`https://img.youtube.com/vi/${detectedVideoId}/hqdefault.jpg`}
                          alt="YouTube thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>
                      <div className="text-xs text-slate-700">
                        <div className="font-semibold text-rose-900">감지된 YouTube 비디오 ID: {detectedVideoId}</div>
                        <div className="text-slate-500 text-[11px]">AI가 영상의 기술 스택, 핵심 질의응답 및 루브릭을 자동 추출합니다.</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Web Link Specific Input */}
              {activeSourceType === 'web' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    웹 페이지 / 노션 / 깃허브 URL <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://notion.site/... 또는 https://github.com/..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <Globe className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  자료 제목 {activeSourceType === 'youtube' && '(선택 - 미입력 시 YouTube 공식 제목 자동 파싱)'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    activeSourceType === 'youtube'
                      ? '예: 2026 AI 온디바이스 최적화 및 멀티에이전트 세미나'
                      : activeSourceType === 'rule'
                      ? '예: SmartLab 2026 합격자 기술 검증 및 컬처핏 루브릭'
                      : '자료 제목을 입력하세요'
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Content / Transcript / Guidelines Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>
                    {activeSourceType === 'youtube'
                      ? '영상 추가 메모 / 스크립트 발췌 (선택)'
                      : activeSourceType === 'rule'
                      ? '합격 기준 및 필수 질문 가이드라인 (선택/권장)'
                      : '문서 원문 / 내용 요약'}
                  </span>
                  <span className="text-[11px] text-slate-400">텍스트 입력 시 AI 정확도 대폭 향상</span>
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={activeSourceType === 'youtube' ? 3 : 5}
                  placeholder={
                    activeSourceType === 'youtube'
                      ? '영상의 핵심 주제나 발표 대본 발췌본이 있다면 입력해주세요. AI가 더욱 정밀하게 검증 포인트를 도출합니다.'
                      : activeSourceType === 'rule'
                      ? '예:\n- 합격 필수 역량: 독자적인 문제 해결력, 코드 리뷰 수용성\n- 탈락 기준: 포트폴리오 기여도 과장, 단순 복사 붙여넣기'
                      : '학습할 문서 전문이나 핵심 내용을 붙여넣으세요.'
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none leading-relaxed"
                />
              </div>

              {/* Description / Admin Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  관리자 코멘트 및 태그 메모 (선택)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 2026 하반기 신입 면접 기술 질문 및 레드플래그 검증용"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Status Messages */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI가 자료 분석 및 RAG 인덱싱 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    AI 학습 및 지식 베이스 등록
                  </>
                )}
              </button>
            </form>
          </div>

          {/* AI Knowledge Simulator Quick Box */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-indigo-300">
              <Bot className="w-4 h-4" />
              학습 지식 실전 시뮬레이터 (AI 면접 코치)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              등록된 YouTube 영상 및 루브릭을 기반으로 AI 면접관이 어떻게 질문하고 평가하는지 즉시 테스트해보세요.
            </p>

            <div className="space-y-2 pt-1">
              <div className="relative">
                <input
                  type="text"
                  value={simQuery}
                  onChange={(e) => setSimQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunSimulation()}
                  placeholder="예: 4비트 양자화 모델 배포 경험자에게 던질 꼬리질문은?"
                  className="w-full pl-3 pr-10 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => handleRunSimulation()}
                  disabled={isSimulating || !simQuery.trim()}
                  className="absolute right-1.5 top-1.5 p-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sample Prompt Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'YouTube 기반 최신 꼬리질문 3개',
                  '지원자의 과장 발언 레드플래그 검증법',
                  '스마트랩 컬처핏 부합 기준'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSimQuery(chip);
                      handleRunSimulation(chip);
                    }}
                    className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-300 transition-colors"
                  >
                    #{chip}
                  </button>
                ))}
              </div>

              {/* Simulation Response Area */}
              {isSimulating && (
                <div className="p-3 bg-slate-800/80 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  학습된 지식 베이스 검색 및 최적 답변 추론 중...
                </div>
              )}

              {simResult && !isSimulating && (
                <div className="p-3.5 bg-slate-800/90 border border-indigo-500/30 rounded-xl space-y-2 text-xs text-slate-200">
                  <div className="flex items-center justify-between text-[11px] text-indigo-300 font-semibold border-b border-slate-700/60 pb-1.5">
                    <span>💡 AI 면접 코치 분석 결과</span>
                    <span>참조 자료 {simResult.referencedSources?.length || 0}건</span>
                  </div>
                  <div className="whitespace-pre-line leading-relaxed font-sans text-slate-100">
                    {simResult.answer}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Knowledge Base Library (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Filter Bar & Search */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 ({knowledgeList.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('youtube')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedFilter === 'youtube'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                YouTube ({knowledgeList.filter(k => k.sourceType === 'youtube').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('document')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedFilter === 'document'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                문서 ({knowledgeList.filter(k => k.sourceType === 'document').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('rule')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedFilter === 'rule'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                루브릭 ({knowledgeList.filter(k => k.sourceType === 'rule').length})
              </button>
            </div>

            {/* Search Input & Delete All */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="키워드/태그/개념 검색..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {knowledgeList.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                  title="모든 학습 데이터 일괄 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">전체 삭제</span>
                </button>
              )}
            </div>
          </div>

          {/* Cards List */}
          {filteredList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">등록된 AI 학습 자료가 없습니다</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                좌측 패널에서 YouTube 기술 영상 URL이나 문서 내용을 입력하여 AI 지식 베이스를 구축해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredList.map((item) => {
                const isExpanded = expandedCardId === item.id;
                const isYouTube = item.sourceType === 'youtube';

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all shadow-sm hover:shadow-md ${
                      item.isActive
                        ? 'border-slate-200'
                        : 'border-slate-200 bg-slate-50/70 opacity-75'
                    }`}
                  >
                    {/* Card Header Top */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {/* Type Icon Badge */}
                          <div
                            className={`p-2.5 rounded-xl flex-shrink-0 ${
                              isYouTube
                                ? 'bg-rose-100 text-rose-600'
                                : item.sourceType === 'document'
                                ? 'bg-blue-100 text-blue-600'
                                : item.sourceType === 'web'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-purple-100 text-purple-600'
                            }`}
                          >
                            {isYouTube ? (
                              <Youtube className="w-5 h-5" />
                            ) : item.sourceType === 'document' ? (
                              <FileText className="w-5 h-5" />
                            ) : item.sourceType === 'web' ? (
                              <Globe className="w-5 h-5" />
                            ) : (
                              <Sliders className="w-5 h-5" />
                            )}
                          </div>

                          {/* Title and Meta */}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-base leading-snug">
                                {item.title}
                              </h3>
                              {item.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  실시간 AI 반영 중
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  비활성화
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2">
                              {item.description || item.extractedInsights?.summary}
                            </p>

                            {/* Tags & Date */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {item.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium"
                                >
                                  #{t}
                                </span>
                              ))}
                              <span className="text-[11px] text-slate-400 ml-1">
                                등록: {item.createdAt} ({item.addedBy || '관리자'})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Controls */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Active / Inactive Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item.id)}
                            title={item.isActive ? 'AI 반영 일시 중지' : 'AI 반영 활성화'}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                              item.isActive
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {item.isActive ? 'ON' : 'OFF'}
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.title)}
                            title="자료 영구 삭제"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Expand/Collapse Button */}
                          <button
                            type="button"
                            onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* YouTube Quick Actions Bar if link exists */}
                      {isYouTube && item.url && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-rose-700 font-medium">
                            <Play className="w-3.5 h-3.5 fill-rose-600" />
                            <span>YouTube 연동 자료</span>
                            <span className="text-slate-400 font-mono text-[11px] truncate max-w-[280px]">
                              {item.url}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.youtubeVideoId && (
                              <button
                                type="button"
                                onClick={() => setPreviewVideoId(previewVideoId === item.youtubeVideoId ? null : item.youtubeVideoId!)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                {previewVideoId === item.youtubeVideoId ? '영상 닫기' : '영상 미리보기'}
                              </button>
                            )}
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-[11px] flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              새 탭에서 보기
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Embedded Video Player Accordion */}
                      {previewVideoId === item.youtubeVideoId && item.youtubeVideoId && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="aspect-video w-full rounded-xl overflow-hidden shadow-inner bg-black">
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${item.youtubeVideoId}?autoplay=1`}
                              title={item.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full border-0"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detailed AI Extracted Knowledge Insights (Expanded Section) */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/50 rounded-b-2xl">
                        {/* 1. Summary Banner */}
                        {item.extractedInsights?.summary && (
                          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                            <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-indigo-600" />
                              AI 지식 요약 및 핵심 브리핑
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {item.extractedInsights.summary}
                            </p>
                          </div>
                        )}

                        {/* 2. Key Concepts & Terms */}
                        {item.extractedInsights?.keyConcepts && item.extractedInsights.keyConcepts.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-blue-600" />
                              AI가 학습한 핵심 기술/역량 개념
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.extractedInsights.keyConcepts.map((concept, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg"
                                >
                                  {concept}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. Tail Questions Extracted for Interviewers */}
                        {item.extractedInsights?.suggestedQuestions && item.extractedInsights.suggestedQuestions.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                              실전 면접 꼬리 질문 (면접관 가이드)
                            </div>
                            <div className="space-y-1.5">
                              {item.extractedInsights.suggestedQuestions.map((q, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-white border border-amber-200/80 rounded-xl flex items-start justify-between gap-2 text-xs group"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="font-bold text-amber-600 mt-0.5">Q{idx + 1}.</span>
                                    <span className="text-slate-800 font-medium leading-relaxed">{q}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyQuestion(q, `${item.id}-q-${idx}`)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                                    title="질문 복사"
                                  >
                                    {copiedId === `${item.id}-q-${idx}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Evaluation Criteria & Red Flags Side-by-Side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Evaluation Rubric */}
                          {item.extractedInsights?.evaluationCriteria && item.extractedInsights.evaluationCriteria.length > 0 && (
                            <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5">
                              <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                합격자 검증 포인트
                              </div>
                              <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                                {item.extractedInsights.evaluationCriteria.map((c, idx) => (
                                  <li key={idx} className="leading-relaxed">
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Red Flags / Warning Signs */}
                          {item.extractedInsights?.redFlags && item.extractedInsights.redFlags.length > 0 && (
                            <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1.5">
                              <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                허위/과장 경계 징후 (Red Flags)
                              </div>
                              <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                                {item.extractedInsights.redFlags.map((rf, idx) => (
                                  <li key={idx} className="leading-relaxed">
                                    {rf}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* 5. Raw Text Snippet if available */}
                        {item.content && (
                          <div className="space-y-1 pt-1">
                            <div className="text-[11px] font-bold text-slate-500">학습 원문/지식 본문</div>
                            <div className="p-3 bg-slate-100 rounded-xl text-[11px] font-mono text-slate-700 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                              {item.content}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
