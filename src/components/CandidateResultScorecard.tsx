import React, { useState, useRef } from 'react';
import {
  CandidateFullResultData,
  InterviewerNameDisplayPolicy,
  CandidateEvaluatorScoreDetail,
  EvaluationCriterion
} from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import {
  Award,
  CheckCircle2,
  XCircle,
  BarChart3,
  TrendingUp,
  Sparkles,
  Download,
  Shield,
  UserCheck,
  Crown,
  BookOpen,
  Target,
  ArrowUpRight,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Printer,
  FileCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import html2canvasPro from 'html2canvas-pro';

interface CandidateResultScorecardProps {
  candidate: {
    id: string;
    name: string;
    studentId: string;
    track?: string;
    phone?: string;
    email?: string;
    interviewDate?: string;
    completedAt?: string;
  };
  resultData: CandidateFullResultData;
  onRefresh?: () => void;
}

export const CandidateResultScorecard: React.FC<CandidateResultScorecardProps> = ({
  candidate,
  resultData,
  onRefresh
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [expandedInterviewerIndex, setExpandedInterviewerIndex] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'INTERVIEWERS' | 'AI_REPORT' | 'STATS'>('OVERVIEW');
  const printableRef = useRef<HTMLDivElement | null>(null);

  const {
    showPassFail,
    isPassed,
    passThresholdScore,
    myTotalScore,
    myEvaluations = [],
    stats,
    aiReport,
    criteria = [],
    publishedAt
  } = resultData;

  // Generate clean, high-resolution PDF with oklch / Tailwind v4 support
  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsExportingPdf(true);

    try {
      // Temporarily expand all collapsible sections for complete rendering
      const originalExpanded = expandedInterviewerIndex;
      setExpandedInterviewerIndex(-1); // special flag to show all in print mode

      // Wait for DOM layout to settle
      await new Promise(resolve => setTimeout(resolve, 350));

      const element = printableRef.current;
      let imgData: string = '';

      try {
        imgData = await toPng(element, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#090d16',
          cacheBust: true
        });
      } catch (toPngErr) {
        console.warn('html-to-image fallback to html2canvasPro:', toPngErr);
        const canvas = await html2canvasPro(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#090d16'
        });
        imgData = canvas.toDataURL('image/png');
      }

      if (!imgData) {
        throw new Error('PDF 이미지 렌더링 결과가 비어 있습니다.');
      }

      const img = new window.Image();
      img.src = imgData;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = (e) => reject(e);
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const imgAspectHeight = (img.naturalHeight * pdfWidth) / img.naturalWidth;
      let heightLeft = imgAspectHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgAspectHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgAspectHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgAspectHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const cleanName = (candidate.name || '지원자').replace(/\s+/g, '_');
      pdf.save(`SmartLab_면접성적표_${cleanName}_${candidate.studentId || ''}.pdf`);
      setExpandedInterviewerIndex(originalExpanded);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF 생성 중 오류가 발생했습니다. 브라우저 인쇄(Ctrl+P) 기능을 이용하시거나 다시 시도해주세요.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>면접 최종 성적표 & AI 심층 피드백</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                공식 발표 완료
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              발표 일시: {publishedAt || '실시간 확인'} · 면접관 채점 세부 내역 및 전체 통계 분석
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="데이터 새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">새로고침</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
          >
            {isExportingPdf ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>PDF 생성 중...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>PDF 성적표 다운로드</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'OVERVIEW'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>종합 성적 & 합격 여부</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('AI_REPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'AI_REPORT'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
          <span>AI 심층 역량 진단 보고서</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('INTERVIEWERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'INTERVIEWERS'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>면접관별 세부 채점표 ({myEvaluations.length}명)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('STATS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'STATS'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>전체 통계 (평균·표준편차·석차)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* Printable Scorecard Container */}
      {/* ========================================================================= */}
      <div
        ref={printableRef}
        id="candidate-scorecard-printable"
        className="space-y-6 bg-slate-950 p-4 sm:p-7 rounded-3xl border border-slate-800/80 text-white"
      >
        
        {/* Certificate / Official Header Banner */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <SmartLabLogo size={34} />
                <div>
                  <span className="text-[11px] font-black tracking-widest text-indigo-400 uppercase">
                    SmartLab Official Evaluation Portal
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {candidate.name} 지원자 면접 결과 성적표
                  </h1>
                </div>
              </div>

              {/* Candidate Metadata Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
                <span className="px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700">
                  학번: <strong className="text-white">{candidate.studentId || '-'}</strong>
                </span>
                <span className="px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700">
                  지원 트랙: <strong className="text-blue-300">{candidate.track || '전체 전형'}</strong>
                </span>
                <span className="px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>면접일: {candidate.interviewDate || '완료'}</span>
                </span>
              </div>
            </div>

            {/* Pass / Fail & Final Score Display */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 shrink-0 min-w-[240px]">
              
              {/* Pass / Fail Badge (if enabled by admin) */}
              {showPassFail ? (
                <div className="flex items-center gap-2">
                  {isPassed ? (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-black shadow-lg shadow-emerald-900/20">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>최종 합격 (PASS)</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-sm font-black shadow-lg shadow-rose-900/20">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>최종 불합격 (FAIL)</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>면접 심사 완료</span>
                </div>
              )}

              {/* Total Score */}
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400">내 최종 환산 종합 점수</div>
                <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-white">
                  {myTotalScore}
                  <span className="text-base font-normal text-slate-400 ml-1">/ 100점</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: KEY STATS SUMMARY METRICS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Award className="w-3 h-3 text-blue-400" />
              <span>내 점수</span>
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
              {myTotalScore}점
            </div>
            <div className="text-[10px] text-slate-400">가중치 및 보너스 합산</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-indigo-400" />
              <span>전체 평균 (μ)</span>
            </span>
            <div className="text-xl sm:text-2xl font-black text-indigo-300 font-mono">
              {stats.meanScore > 0 ? `${stats.meanScore}점` : '집계 중'}
            </div>
            <div className="text-[10px] text-slate-400">
              {myTotalScore >= stats.meanScore ? (
                <span className="text-emerald-400 font-bold">평균 대비 +{Math.round((myTotalScore - stats.meanScore) * 10) / 10}점</span>
              ) : (
                <span className="text-amber-400 font-bold">평균 대비 {Math.round((myTotalScore - stats.meanScore) * 10) / 10}점</span>
              )}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-purple-400" />
              <span>표준편차 (σ)</span>
            </span>
            <div className="text-xl sm:text-2xl font-black text-purple-300 font-mono">
              {stats.stdDev > 0 ? `±${stats.stdDev}` : '집계 중'}
            </div>
            <div className="text-[10px] text-slate-400">점수 산포도 및 편차</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Target className="w-3 h-3 text-amber-400" />
              <span>석차 (Rank)</span>
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
              {stats.myRank > 0 ? `${stats.myRank}위` : '-'}
            </div>
            <div className="text-[10px] text-slate-400">전체 {stats.totalCandidates}명 중</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>백분위</span>
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
              {stats.myPercentile > 0 ? `상위 ${stats.myPercentile}%` : '-'}
            </div>
            <div className="text-[10px] text-slate-400">전체 지원자 대비 위치</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>최고 / 최저점</span>
            </span>
            <div className="text-sm font-black text-cyan-300 font-mono pt-1">
              최고: {stats.maxScore}점
            </div>
            <div className="text-xs text-slate-400 font-mono">
              최저: {stats.minScore}점 (중위: {stats.medianScore})
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: AI COMPREHENSIVE PERFORMANCE & GROWTH DIAGNOSTIC REPORT */}
        {/* ========================================================================= */}
        {aiReport && (
          <div className="space-y-4">
            
            {/* AI Report Title Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>AI 심층 역량 진단 및 성장 피드백 보고서</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-semibold">
                      Groq Llama 3.3 70B 분석
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    면접 발언(STT), 실시간 질의응답, 면접관들의 정성 피드백을 종합하여 도출된 지원자 맞춤 성장 가이드입니다.
                  </p>
                </div>
              </div>
            </div>

            {/* One-Line Verdict Banner */}
            {aiReport.oneLineVerdict && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-blue-950/60 border border-indigo-500/40 shadow-lg flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-black text-indigo-300 uppercase tracking-wider">
                    총평 요약 (One-Line Verdict)
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white leading-relaxed">
                    "{aiReport.oneLineVerdict}"
                  </div>
                </div>
              </div>
            )}

            {/* 2-Column: Key Strengths (잘한 점) & Areas for Improvement (보완할 점) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 1. Key Strengths (잘한 점) */}
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 space-y-3 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm pb-2 border-b border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>돋보였던 강점 (Key Strengths)</span>
                </div>
                <ul className="space-y-2.5">
                  {(aiReport.strengths || []).map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/40">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. Areas for Improvement (보완할 점) */}
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 space-y-3 shadow-lg">
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm pb-2 border-b border-slate-800">
                  <Target className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>아쉬웠던 점 & 보완 포인트 (Areas for Improvement)</span>
                </div>
                <ul className="space-y-2.5">
                  {(aiReport.improvements || []).map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/40">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Competency Diagnosis Breakdown Cards */}
            {Array.isArray(aiReport.competencyAnalysis) && aiReport.competencyAnalysis.length > 0 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>4대 핵심 역량별 정밀 진단 및 원포인트 성장 팁</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {aiReport.competencyAnalysis.map((comp, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{comp.category}</span>
                        {comp.score !== undefined && (
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono">
                            {comp.score}점
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {comp.evaluation}
                      </p>

                      {comp.actionTip && (
                        <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/40 p-2 rounded-lg flex items-start gap-1.5">
                          <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong className="text-amber-200">원포인트 액션 팁:</strong> {comp.actionTip}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Plan Roadmap & Overall Narrative Review */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Action Plan Roadmap */}
              {Array.isArray(aiReport.actionPlan) && aiReport.actionPlan.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    <span>향후 3~6개월 추천 역량 강화 로드맵</span>
                  </h4>
                  <div className="space-y-2">
                    {aiReport.actionPlan.map((plan, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px] shrink-0 font-mono">
                          STEP {idx + 1}
                        </span>
                        <span>{plan}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Narrative Review */}
              {aiReport.overallReview && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>AI 종합 면접 성장 피드백 서술문</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                    {aiReport.overallReview}
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: EVALUATION CRITERIA & COHORT DISTRIBUTION COMPARISON */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>평가 항목별 상세 점수 및 전체 지원자 비교</span>
            </h3>
            <span className="text-xs text-slate-400">
              내 점수 vs 전체 평균(μ) vs 표준편차(σ)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {criteria.map((crit) => {
              const cStat = stats.criteriaStats?.[crit.id];
              const myCritScore = cStat?.myAvgScore || 0;
              const mean = cStat?.mean || 0;
              const std = cStat?.stdDev || 0;

              return (
                <div
                  key={crit.id}
                  className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{crit.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                      가중치 {crit.weight}%
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-slate-400">내 평균 점수:</span>
                    <span className="text-lg font-black text-blue-400 font-mono">
                      {myCritScore}점
                    </span>
                  </div>

                  {/* Progress Bar & Benchmark Indicator */}
                  <div className="space-y-1">
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, myCritScore)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>전체 평균: {mean}점</span>
                      <span>편차: ±{std}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: DETAILED INDIVIDUAL INTERVIEWER SCORECARDS */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                면접관별 세부 채점표 및 정성 피드백
              </h3>
              <span className="text-xs text-slate-400">
                (총 {myEvaluations.length}명의 심사위원이 참여함)
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {myEvaluations.map((evalItem, idx) => {
              const isExpanded = expandedInterviewerIndex === idx || expandedInterviewerIndex === -1;
              const isLeader = evalItem.isLeader;

              return (
                <div
                  key={idx}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden transition-all"
                >
                  {/* Interviewer Score Summary Bar */}
                  <div
                    onClick={() => setExpandedInterviewerIndex(isExpanded ? null : idx)}
                    className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isLeader
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isLeader ? <Crown className="w-4 h-4 text-amber-400" /> : (idx + 1)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white">
                            {evalItem.interviewerDisplayName}
                          </span>
                          {isLeader && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              {evalItem.roleLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {evalItem.submittedAt ? `평가 제출: ${evalItem.submittedAt}` : '평가 완료'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">심사위원 환산 점수</div>
                        <div className="text-base font-black text-amber-300 font-mono">
                          {evalItem.calculatedTotal}점
                          {evalItem.presentationBonus > 0 && (
                            <span className="text-xs text-emerald-400 ml-1">
                              (+보너스 {evalItem.presentationBonus}점)
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="text-slate-400 hover:text-white p-1 rounded-lg"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-900/70 border-t border-slate-700/60 space-y-3.5">
                      
                      {/* Per-Criterion Scores Table */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {criteria.map(crit => {
                          const score = evalItem.scores?.[crit.id] ?? 0;
                          return (
                            <div key={crit.id} className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
                              <span className="text-[10px] text-slate-400 block">{crit.name}</span>
                              <span className="text-sm font-black text-white font-mono">{score}점</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Qualitative Comments */}
                      <div className="space-y-2 pt-1">
                        {evalItem.comments?.technicalNote && (
                          <div className="p-2.5 bg-blue-950/30 border border-blue-800/40 rounded-lg text-xs text-slate-200">
                            <strong className="text-blue-300 block mb-0.5">기술/직무 역량 피드백:</strong>
                            {evalItem.comments.technicalNote}
                          </div>
                        )}

                        {evalItem.comments?.attitudeNote && (
                          <div className="p-2.5 bg-purple-950/30 border border-purple-800/40 rounded-lg text-xs text-slate-200">
                            <strong className="text-purple-300 block mb-0.5">소통 및 면접 태도 피드백:</strong>
                            {evalItem.comments.attitudeNote}
                          </div>
                        )}

                        {evalItem.comments?.overallComment && (
                          <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200">
                            <strong className="text-amber-300 block mb-0.5">종합 심사 메모:</strong>
                            {evalItem.comments.overallComment}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Verification Seal */}
        <div className="pt-4 border-t border-slate-800 text-center space-y-1 text-[11px] text-slate-400">
          <p className="font-bold text-slate-300">
            SmartLab Tech & Software Student Club · 면접 평가 위원회 공식 인증
          </p>
          <p className="text-[10px]">
            본 문서는 SmartLab AI 통합 면접 시스템을 통해 정량 및 정성 다면 평가 기준에 따라 공정하게 산출되었습니다.
          </p>
        </div>

      </div>

    </div>
  );
};
