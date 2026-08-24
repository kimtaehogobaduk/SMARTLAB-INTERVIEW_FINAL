import React from 'react';
import { Candidate, Evaluation, PlatformSettings } from '../types';
import { Eye, Users, Award, Brain, CheckCircle2, Clock, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';

interface ObserverDashboardProps {
  candidate: Candidate;
  peerEvaluations: Evaluation[];
  settings: PlatformSettings;
  onSwitchToEvaluationMode: () => void;
}

export const ObserverDashboard: React.FC<ObserverDashboardProps> = ({
  candidate,
  peerEvaluations,
  settings,
  onSwitchToEvaluationMode
}) => {
  const submittedEvaluations = peerEvaluations.filter(e => e.status === 'SUBMITTED');
  const inProgressEvaluations = peerEvaluations.filter(e => e.status === 'DRAFT');

  // Calculate average score among peer evaluations with scores
  const scoredEvals = peerEvaluations.filter(e => typeof e.totalScore === 'number' && e.totalScore > 0);
  const averageScore = scoredEvals.length > 0
    ? (scoredEvals.reduce((acc, curr) => acc + curr.totalScore, 0) / scoredEvals.length).toFixed(1)
    : '-';

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
      {/* Top Banner: Observer Status */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0 border-b border-indigo-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-400/30">
              <Eye className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-blue-300">
                Observer Mode
              </span>
              <h3 className="text-sm font-bold text-white">실시간 면접 관전 모드</h3>
            </div>
          </div>

          <button
            onClick={onSwitchToEvaluationMode}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <span>평가 참여하기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
          현재 <strong>평가 비참여(관전)</strong> 상태입니다. 면접 질문 및 답변 흐름, 동료 면접관들의 실시간 평가 진행 상황을 모니터링할 수 있습니다.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="p-4 space-y-4 flex-1">
        {/* Section 1: Peer Interviewer Evaluation Progress */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Users className="w-4 h-4 text-blue-600" />
              <span>동료 면접관 실시간 채점 현황</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              제출 {submittedEvaluations.length} / 전체 {peerEvaluations.length}명
            </span>
          </div>

          {peerEvaluations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              현재 참여 중인 다른 면접관 데이터가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {peerEvaluations.map((evalItem) => {
                const isSubmitted = evalItem.status === 'SUBMITTED';
                const hasScore = typeof evalItem.totalScore === 'number' && evalItem.totalScore > 0;

                return (
                  <div
                    key={evalItem.id || evalItem.interviewerName}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      isSubmitted
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isSubmitted ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {evalItem.interviewerName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{evalItem.interviewerName} 심사위원</span>
                          {isSubmitted && (
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 제출 완료
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {evalItem.submittedAt ? `제출 시각: ${evalItem.submittedAt}` : '실시간 작성 중...'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {hasScore ? (
                        <div className="text-sm font-black font-mono text-blue-700">
                          {evalItem.totalScore.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">채점 중</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Average score indicator */}
          {scoredEvals.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">실시간 동료 평균 점수:</span>
              <span className="font-black text-sm text-indigo-600 font-mono">{averageScore}점</span>
            </div>
          )}
        </div>

        {/* Section 2: Candidate Realtime Status & AI Insights Summary */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Brain className="w-4 h-4 text-purple-600" />
            <span>실시간 면접 흐름 및 AI 브리핑</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100 space-y-1.5">
              <div className="font-bold text-purple-900 flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>지원자 핵심 요약</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                {candidate.aiInsights?.realtimeSummaries && candidate.aiInsights.realtimeSummaries.length > 0
                  ? candidate.aiInsights.realtimeSummaries[candidate.aiInsights.realtimeSummaries.length - 1].content
                  : '면접 대화(STT)가 진행됨에 따라 AI 실시간 분석 요약이 여기에 동기화됩니다.'}
              </p>
            </div>

            {/* Questions generated */}
            {candidate.aiInsights?.tailQuestions && candidate.aiInsights.tailQuestions.length > 0 && (
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-1.5">
                <div className="font-bold text-blue-900 flex items-center gap-1 text-[11px]">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>실시간 심화 꼬리 질문 ({candidate.aiInsights.tailQuestions.length}건)</span>
                </div>
                <div className="space-y-1">
                  {candidate.aiInsights.tailQuestions.slice(0, 3).map((q) => (
                    <div key={q.id} className="text-[11px] text-slate-700 bg-white p-2 rounded border border-blue-100/70">
                      • {q.question}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Quick Switch CTA */}
        <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-center space-y-2">
          <p className="text-xs text-slate-600 font-medium">
            직접 채점표를 작성하고 점수를 부여하고 싶으신가요?
          </p>
          <button
            onClick={onSwitchToEvaluationMode}
            className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>✍️ 평가 모드로 전환하여 채점 시작</span>
          </button>
        </div>
      </div>
    </div>
  );
};
