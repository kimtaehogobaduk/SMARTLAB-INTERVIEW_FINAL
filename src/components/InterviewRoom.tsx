import React, { useState } from 'react';
import {
  Candidate,
  Evaluation,
  InterviewerUser,
  PanelVisibility,
  LayoutPreset,
  STTMessage,
  DocumentItem,
  TailQuestion,
  PlatformSettings
} from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { STTConsole } from './STTConsole';
import { DocumentViewer } from './DocumentViewer';
import { EvaluationForm } from './EvaluationForm';
import { ObserverDashboard } from './ObserverDashboard';
import {
  ArrowLeft,
  LayoutGrid,
  Maximize2,
  FileText,
  Mic,
  CheckSquare,
  Play,
  Square,
  RotateCcw,
  UserX,
  Clock,
  CheckCircle2,
  Trophy,
  Brain,
  Shield,
  SlidersHorizontal,
  ChevronDown,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

interface InterviewRoomProps {
  candidate: Candidate;
  allCandidates: Candidate[];
  currentUser: InterviewerUser;
  myEvaluation: Evaluation | null;
  peerEvaluations: Evaluation[];
  isBlind: boolean;
  timerSeconds: number;
  settings?: PlatformSettings;
  initialObserverMode?: boolean;
  onBackToList: () => void;
  onSelectCandidate: (id: string) => void;
  onStatusChange: (
    action: 'start' | 'no_show' | 'vote_no_show' | 'cancel_vote_no_show' | 'cancel_no_show' | 'finish' | 'cancel_finish',
    reason?: string
  ) => void;
  onSaveEvaluation: (evalData: Evaluation, isSubmitting?: boolean) => void;
  onSendMessage: (msg: STTMessage, triggerAI: boolean) => void;
  onAddDocument: (newDoc: DocumentItem) => void;
  onUseTailQuestion: (q: TailQuestion) => void;
  onOpenLeaderboard: () => void;
  onOpenAIQualitative: () => void;
  onOpenAdmin: () => void;
  isAiLoading: boolean;
}

export const InterviewRoom: React.FC<InterviewRoomProps> = ({
  candidate,
  allCandidates,
  currentUser,
  myEvaluation,
  peerEvaluations,
  isBlind,
  timerSeconds,
  settings,
  initialObserverMode = false,
  onBackToList,
  onSelectCandidate,
  onStatusChange,
  onSaveEvaluation,
  onSendMessage,
  onAddDocument,
  onUseTailQuestion,
  onOpenLeaderboard,
  onOpenAIQualitative,
  onOpenAdmin,
  isAiLoading
}) => {
  // Observer Mode State
  const [isObserverMode, setIsObserverMode] = useState<boolean>(initialObserverMode);

  // Panel Visibility State (User customizable)
  const [panels, setPanels] = useState<PanelVisibility>({
    showSTT: true,
    showDocs: true,
    showEval: true
  });

  const [noShowConfirmOpen, setNoShowConfirmOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  const applyLayoutPreset = (preset: LayoutPreset) => {
    switch (preset) {
      case 'ALL_THREE':
        setPanels({ showSTT: true, showDocs: true, showEval: true });
        break;
      case 'DOCS_AND_EVAL':
        setPanels({ showSTT: false, showDocs: true, showEval: true });
        break;
      case 'STT_AND_EVAL':
        setPanels({ showSTT: true, showDocs: false, showEval: true });
        break;
      case 'EVAL_ONLY':
        setPanels({ showSTT: false, showDocs: false, showEval: true });
        break;
    }
    setIsLayoutMenuOpen(false);
  };

  const togglePanel = (key: keyof PanelVisibility) => {
    // Prevent hiding all panels
    const nextState = { ...panels, [key]: !panels[key] };
    if (!nextState.showSTT && !nextState.showDocs && !nextState.showEval) {
      alert('최소 하나 이상의 패널은 켜져 있어야 합니다.');
      return;
    }
    setPanels(nextState);
  };

  // Format Stopwatch (MM:SS)
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate dynamic CSS grid layout
  const visibleCount = (panels.showSTT ? 1 : 0) + (panels.showDocs ? 1 : 0) + (panels.showEval ? 1 : 0);
  let gridClass = 'grid-cols-[340px_1fr_360px]';

  if (visibleCount === 1) {
    gridClass = 'grid-cols-1';
  } else if (visibleCount === 2) {
    if (!panels.showSTT) gridClass = 'grid-cols-[1fr_420px]';
    else if (!panels.showDocs) gridClass = 'grid-cols-[1fr_1fr]';
    else if (!panels.showEval) gridClass = 'grid-cols-[360px_1fr]';
  }

  const isFormLocked = candidate.status === 'PENDING';
  const isCurrentlySubmitted = myEvaluation?.status === 'SUBMITTED';

  // No-Show 2/3 agreement calculation
  const totalInterviewersCount = candidate.interviewers?.length || (peerEvaluations.length > 0 ? peerEvaluations.length : 3);
  const requiredNoShowVotes = Math.ceil((totalInterviewersCount * 2) / 3);
  const currentVotes: string[] = Array.isArray(candidate.noShowVotes) ? candidate.noShowVotes : [];
  const hasMyVote = currentVotes.includes(currentUser.id) || currentVotes.includes(currentUser.name);
  const isCandidateNoShow = candidate.status === 'NO_SHOW';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden select-none">
      {/* ==================================================================== */}
      {/* 1. TOP HEADER & CUSTOM LAYOUT CONTROLS */}
      {/* ==================================================================== */}
      <header className="h-16 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Back button & Candidate Profile */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToList}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>목록으로</span>
          </button>

          {/* Quick Candidate Switcher Dropdown */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <select
              value={candidate.id}
              onChange={(e) => onSelectCandidate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {allCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.timeslot.start}] {c.name} ({c.track})
                </option>
              ))}
            </select>

            <div className="text-left hidden sm:block">
              <span className="text-[10px] text-slate-400 font-mono block">
                {candidate.studentId} • {candidate.timeslot.room}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Customizable Screen Panel Toggle Controls & Observer Toggle */}
        <div className="flex items-center gap-2">
          {/* Observer Mode Quick Toggle Button */}
          <button
            onClick={() => setIsObserverMode(!isObserverMode)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
              isObserverMode
                ? 'bg-gradient-to-r from-indigo-900 to-slate-900 text-indigo-200 border-indigo-500 ring-2 ring-indigo-500/30 animate-pulse'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title={isObserverMode ? '평가 모드로 전환' : '관전 모드로 전환 (평가 없이 모니터링만)'}
          >
            {isObserverMode ? (
              <>
                <Eye className="w-4 h-4 text-indigo-400" />
                <span className="font-black">관전 모드 ON</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-slate-500" />
                <span>관전만 (Observer)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              화면 구성:
            </span>

            {/* Individual Panel Toggles */}
            <button
              onClick={() => togglePanel('showSTT')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                panels.showSTT
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-200/70'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>STT 콘솔</span>
            </button>

            <button
              onClick={() => togglePanel('showDocs')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                panels.showDocs
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-200/70'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>지원 서류</span>
            </button>

            <button
              onClick={() => togglePanel('showEval')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                panels.showEval
                  ? isObserverMode ? 'bg-indigo-700 text-white shadow-2xs' : 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-200/70'
              }`}
            >
              {isObserverMode ? <Eye className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              <span>{isObserverMode ? '관전 현황' : '평가표'}</span>
            </button>

            {/* Preset Layouts Dropdown */}
            <div className="relative border-l border-slate-200 pl-1">
              <button
                onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200 transition-colors"
                title="빠른 화면 프리셋 선택"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {isLayoutMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs font-semibold animate-fade-in">
                  <button
                    onClick={() => applyLayoutPreset('ALL_THREE')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 block"
                  >
                    표준 3분할 (전체)
                  </button>
                  <button
                    onClick={() => applyLayoutPreset('DOCS_AND_EVAL')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 block"
                  >
                    서류 + {isObserverMode ? '관전현황' : '평가표'} 모드
                  </button>
                  <button
                    onClick={() => applyLayoutPreset('STT_AND_EVAL')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 block"
                  >
                    대화/STT + {isObserverMode ? '관전현황' : '평가표'} 모드
                  </button>
                  <button
                    onClick={() => applyLayoutPreset('EVAL_ONLY')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 block"
                  >
                    {isObserverMode ? '관전 대시보드 와이드' : '평가 집중 와이드 모드'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Stopwatch Timer & Current Interviewer */}
        <div className="flex items-center gap-3">
          {/* Stopwatch Digital Monospace Display */}
          <div className="bg-slate-950 px-3.5 py-1 rounded-lg border border-slate-800 shadow-inner flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <div className="font-mono text-xl font-black text-red-500 tracking-wider">
              {formatTimer(timerSeconds)}
            </div>
          </div>

          <div className="text-right border-l border-slate-200 pl-3">
            <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
            <div className="text-[10px] font-semibold text-blue-600">심사위원</div>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. DYNAMIC WORKSPACE (Configurable Layout) */}
      {/* ==================================================================== */}
      <main className={`flex-1 grid ${gridClass} gap-px bg-slate-300 min-h-0 overflow-hidden`}>
        {/* Panel 1: STT Console (Togglable) */}
        {panels.showSTT && (
          <section className="h-full overflow-hidden bg-white">
            <STTConsole
              transcript={candidate.sttTranscript || []}
              realtimeSummaries={candidate.aiInsights?.realtimeSummaries || []}
              tailQuestions={candidate.aiInsights?.tailQuestions || []}
              contradictions={candidate.aiInsights?.contradictions || []}
              candidateName={candidate.name}
              candidateTrack={candidate.track}
              settings={settings}
              onSendMessage={onSendMessage}
              onUseTailQuestion={onUseTailQuestion}
              isLoadingAI={isAiLoading}
            />
          </section>
        )}

        {/* Panel 2: Document Viewer (Togglable) */}
        {panels.showDocs && (
          <section className="h-full overflow-hidden bg-slate-900">
            <DocumentViewer
              documents={candidate.documents || []}
              candidateName={candidate.name}
              onAddDocument={onAddDocument}
            />
          </section>
        )}

        {/* Panel 3: Blind Evaluation Form or Observer Dashboard (Togglable) */}
        {panels.showEval && (
          <section className="h-full overflow-hidden bg-white">
            {isObserverMode ? (
              <ObserverDashboard
                candidate={candidate}
                peerEvaluations={peerEvaluations}
                settings={settings || {
                  isCriteriaConfirmed: false,
                  criteria: [],
                  scoringFormula: 'AVERAGE',
                  passThresholdScore: 70
                }}
                onSwitchToEvaluationMode={() => setIsObserverMode(false)}
              />
            ) : myEvaluation ? (
              <EvaluationForm
                evaluation={myEvaluation}
                peerEvaluations={peerEvaluations}
                candidateStatus={candidate.status}
                isBlind={isBlind}
                isLocked={isFormLocked}
                settings={settings}
                onSaveEvaluation={onSaveEvaluation}
                currentInterviewerName={currentUser.name}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                평가표 로딩 중...
              </div>
            )}
          </section>
        )}
      </main>

      {/* ==================================================================== */}
      {/* 3. FOOTER ACTIONS & STATE MACHINE */}
      {/* ==================================================================== */}
      <footer className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left Side: Secondary Tools */}
        <div className="flex items-center gap-2">
          {candidate.status === 'NO_SHOW' ? (
            <button
              onClick={() => onStatusChange('cancel_no_show')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>결시 취소 (원복)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {!isObserverMode && (
                <button
                  onClick={() => setNoShowConfirmOpen(true)}
                  className={`px-3 py-2 rounded-md font-bold text-xs border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    hasMyVote
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5 text-red-600" />
                  <span>
                    {hasMyVote
                      ? `결시 동의 철회 (${currentVotes.length}/${requiredNoShowVotes}명)`
                      : currentVotes.length > 0
                      ? `결시 동의 (${currentVotes.length}/${requiredNoShowVotes}명 필요)`
                      : '결시(No-Show) 동의 투표'}
                  </span>
                </button>
              )}

              {currentVotes.length > 0 && !isCandidateNoShow && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-1 rounded-md border border-amber-200">
                  2/3 이상 동의 시 결시 처리 ({currentVotes.length}/{requiredNoShowVotes}명)
                </span>
              )}
            </div>
          )}

          <button
            onClick={onOpenAIQualitative}
            className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition-colors"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            AI 마인드맵 & 요약
          </button>

          <button
            onClick={onOpenAdmin}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-xs border border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            감사 로그
          </button>
        </div>

        {/* Right Side: Start / Finish Action (or Observer Mode Banner) */}
        <div className="flex items-center gap-3">
          {isObserverMode ? (
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>실시간 관전 모드 진행 중 (평가 점수 미반영)</span>
              </span>
              <button
                onClick={() => setIsObserverMode(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-transform active:scale-95 cursor-pointer"
              >
                평가 모드로 전환
              </button>
            </div>
          ) : (
            <>
              {candidate.status === 'PENDING' && (
                <button
                  onClick={() => onStatusChange('start')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-102 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  면접 시작 (Start)
                </button>
              )}

              {candidate.status === 'IN_PROGRESS' && (
                <>
                  {isCurrentlySubmitted ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        내 평가 제출 완료 (동료 면접관 대기 중)
                      </span>
                      <button
                        onClick={() => onStatusChange('cancel_finish')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        제출 취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onStatusChange('finish')}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      면접 평가 완료 제출
                    </button>
                  )}
                </>
              )}

              {candidate.status === 'CLOSING_PENDING' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-md flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                    다른 면접관 최종 제출 대기 중...
                  </span>
                  <button
                    onClick={() => onStatusChange('cancel_finish')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  >
                    제출 취소
                  </button>
                </div>
              )}
            </>
          )}

          {candidate.status === 'COMPLETED' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3.5 py-1.5 rounded-md flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                면접관 전원 평가 완료 (COMPLETED)
              </span>
              <button
                onClick={onOpenLeaderboard}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                순위표 확인
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* No-Show Confirmation Dialog */}
      {noShowConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              {candidate.name} 지원자 결시(No-Show) {hasMyVote ? '동의 철회' : '동의 투표'}
            </h3>
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 text-left space-y-1.5">
              <div className="flex justify-between items-center font-semibold text-slate-800">
                <span>결시 처리 요건:</span>
                <span className="text-red-600 font-bold">면접관 2/3 이상 동의</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>현재 동의 현황:</span>
                <span className="font-mono font-bold text-slate-900">
                  {currentVotes.length} / {totalInterviewersCount}명 (최소 {requiredNoShowVotes}명 필요)
                </span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                {hasMyVote
                  ? '현재 결시 처리에 동의하신 상태입니다. 동의를 취소하시겠습니까?'
                  : `${requiredNoShowVotes}명 이상 동의 시 즉시 결시(No-Show) 확정 및 순위 집계에서 자동 제외됩니다.`}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setNoShowConfirmOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setNoShowConfirmOpen(false);
                  if (hasMyVote) {
                    onStatusChange('cancel_vote_no_show', `${currentUser.name} 결시 동의 철회`);
                  } else {
                    onStatusChange('vote_no_show', `${currentUser.name} 지원자 미참석 결시 동의 투표`);
                  }
                }}
                className={`px-4 py-2 text-white rounded-md text-xs font-bold cursor-pointer ${
                  hasMyVote
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {hasMyVote ? '동의 철회하기' : '결시 처리에 동의'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
