import React, { useState } from 'react';
import { Candidate, QualitativeSummary, MindMapNode } from '../types';
import { InteractiveMindMap } from './InteractiveMindMap';
import { Sparkles, Brain, CheckCircle2, AlertCircle, Award, Target, X, RefreshCw } from 'lucide-react';

interface AIQualitativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onRefreshSynthesis: () => Promise<void>;
  isLoading?: boolean;
}

export const AIQualitativeModal: React.FC<AIQualitativeModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onRefreshSynthesis,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'mindmap' | 'summary'>('mindmap');

  if (!isOpen) return null;

  const summary = candidate.qualitativeAiSummary;
  const mindMapData = candidate.mindMapData;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  {candidate.name} 지원자 AI 종합 정성 분석 & 마인드맵
                </h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded font-mono">
                  실시간 AI 분석
                </span>
              </div>
              <p className="text-xs text-slate-400">
                면접관들의 정성 코멘트 + 실시간 STT 전문 + 서류 종합 지식 트리
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('mindmap')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'mindmap'
                  ? 'border-purple-600 text-purple-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              인터랙티브 D3 마인드맵
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'summary'
                  ? 'border-purple-600 text-purple-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              면접관 정성 멘트 AI 종합 요약
            </button>
          </div>

          <button
            onClick={onRefreshSynthesis}
            disabled={isLoading}
            className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-600 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'AI 분석 중...' : 'AI 종합 재분석'}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'mindmap' ? (
            <div className="space-y-4">
              <InteractiveMindMap
                data={mindMapData}
                candidateName={candidate.name}
                onRefreshAI={onRefreshSynthesis}
                isLoading={isLoading}
              />
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                💡 <strong>마인드맵 조작 안내:</strong> 마우스 드래그로 캔버스 이동, 휠로 확대/축소, 각 노드를 클릭하면 면접 중 포착된 세부 분석 내용이 팝업으로 노출됩니다.
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {summary ? (
                <div className="space-y-4 animate-fade-in text-xs">
                  {/* Verdict Banner */}
                  <div className="p-4 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-xl shadow-md">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block mb-1">
                      AI 종합 총평 (One-Line Verdict)
                    </span>
                    <p className="text-sm font-bold leading-relaxed">
                      "{summary.oneLineVerdict}"
                    </p>
                    <div className="mt-3 pt-3 border-t border-purple-700/50 flex items-center justify-between text-xs text-purple-200">
                      <span className="flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-amber-400" />
                        추천 배정 역할: <strong className="text-white">{summary.recommendedRole}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-400" />
                        성장 잠재력 스코어: <strong className="text-emerald-300 font-mono text-sm">{summary.potentialScore}점</strong>
                      </span>
                    </div>
                  </div>

                  {/* Strengths & Improvements Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                      <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        주요 핵심 강점 (Key Strengths)
                      </h4>
                      <ul className="space-y-1.5 text-slate-800">
                        {summary.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-white/80 p-2 rounded-md border border-emerald-100">
                            <span className="font-bold text-emerald-600 shrink-0">0{idx + 1}.</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Areas for Improvement */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        보완 필요점 & 코칭 제안 (Improvements)
                      </h4>
                      <ul className="space-y-1.5 text-slate-800">
                        {summary.improvements.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-white/80 p-2 rounded-md border border-amber-100">
                            <span className="font-bold text-amber-600 shrink-0">0{idx + 1}.</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Brain className="w-10 h-10 text-purple-500 mx-auto mb-2 animate-bounce" />
                  <h4 className="font-bold text-slate-800 text-sm">정성 요약 데이터가 아직 생성되지 않았습니다</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    면접관들의 평가 코멘트를 바탕으로 AI가 핵심 강점과 한 줄 평을 종합 요약합니다.
                  </p>
                  <button
                    onClick={onRefreshSynthesis}
                    disabled={isLoading}
                    className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    {isLoading ? 'AI 생성 중...' : '지금 AI 요약 생성하기'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-md hover:bg-slate-800 transition-colors text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
