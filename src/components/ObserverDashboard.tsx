import React from 'react';
import { Candidate, Evaluation, PlatformSettings } from '../types';
import { calculateEvaluatorScore } from '../lib/scoring';
import { Eye, Users, Brain, CheckCircle2, Sparkles, MessageSquare, ShieldCheck, Activity } from 'lucide-react';

// Format interviewer name to display purely as '000'
export const formatInterviewerDisplayName = (name: string): string => {
  if (!name) return '면접관';
  return name.replace(/(\s*(면접관|심사위원|님|대표|위원))+$/g, '').trim();
};

interface ObserverDashboardProps {
  candidate: Candidate;
  peerEvaluations: Evaluation[];
  settings: PlatformSettings;
}

export const ObserverDashboard: React.FC<ObserverDashboardProps> = ({
  candidate,
  peerEvaluations,
  settings
}) => {
  const submittedEvaluations = peerEvaluations.filter(e => e.status === 'SUBMITTED');

  // Compute calculated scores for each evaluation
  const scoredEvals = peerEvaluations.map(e => {
    const calc = calculateEvaluatorScore(e.scores, e.presentationBonuses, settings.criteria || []);
    return {
      ...e,
      computedTotal: calc.totalScore
    };
  }).filter(e => e.computedTotal > 0);

  const averageScore = scoredEvals.length > 0
    ? (scoredEvals.reduce((acc, curr) => acc + curr.computedTotal, 0) / scoredEvals.length).toFixed(1)
    : '-';

  return (
    <div id="observer-dashboard" className="h-full flex flex-col bg-slate-50 overflow-y-auto">
      {/* Top Banner: Observer Status */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0 border-b border-indigo-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-400/30 shadow-xs">
              <Eye className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-400/20">
                  OBSERVER
                </span>
                <span className="text-xs font-semibold text-slate-300">실시간 관전 모니터링</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">평가 미참여 관전실</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-200/90 bg-amber-900/30 border border-amber-500/30 px-2.5 py-1 rounded-md">
            <Activity className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span className="text-[11px] font-medium">실시간 스트림 동기화</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
          채점표를 작성하지 않고 질의응답(STT), AI 브리핑 및 동료 면접관들의 실시간 채점 상황을 참관하는 모드입니다.
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
              현재 참여 중인 다른 면접관 평가 데이터가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {peerEvaluations.map((evalItem) => {
                const isSubmitted = evalItem.status === 'SUBMITTED';
                const calc = calculateEvaluatorScore(evalItem.scores, evalItem.presentationBonuses, settings.criteria || []);
                const hasScore = calc.totalScore > 0;
                const displayName = formatInterviewerDisplayName(evalItem.interviewerName);

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
                        {displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{displayName}</span>
                          {isSubmitted ? (
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> 제출 완료
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                              채점 중
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {evalItem.submittedAt ? `제출: ${evalItem.submittedAt}` : '실시간 입력 중'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {hasScore ? (
                        <div className="text-sm font-black font-mono text-blue-700">
                          {calc.totalScore.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">채점 진행 중</span>
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
                <span>지원자 실시간 핵심 요약</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                {candidate.aiInsights?.realtimeSummaries && candidate.aiInsights.realtimeSummaries.length > 0
                  ? candidate.aiInsights.realtimeSummaries[candidate.aiInsights.realtimeSummaries.length - 1].text
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

        {/* Section 3: Observer Guidelines */}
        <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
            <span>관전 모드 안내</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            관전 모드에서는 채점표가 집계되지 않으며 순수 모니터링만 수행합니다. STT 자막, 질문 흐름, 서류 뷰어를 자유롭게 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

