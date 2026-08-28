import React, { useState } from 'react';
import {
  PlatformSettings,
  InterviewerNameDisplayPolicy
} from '../types';
import {
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  Crown,
  FileCheck,
  Radio,
  Sliders,
  Award,
  RefreshCw
} from 'lucide-react';

interface AdminAllInterviewsCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlatformSettings;
  operatorName: string;
  totalCandidatesCount: number;
  completedCandidatesCount: number;
  onCompleteAll: (config: {
    operatorName: string;
    isResultsPublished: boolean;
    showPassFailToCandidates: boolean;
    interviewerNameDisplayPolicy: InterviewerNameDisplayPolicy;
    showStatsToCandidates: boolean;
    showDetailedComments: boolean;
  }) => Promise<void>;
}

export const AdminAllInterviewsCompleteModal: React.FC<AdminAllInterviewsCompleteModalProps> = ({
  isOpen,
  onClose,
  settings,
  operatorName,
  totalCandidatesCount,
  completedCandidatesCount,
  onCompleteAll
}) => {
  const [isResultsPublished, setIsResultsPublished] = useState<boolean>(
    settings.isResultsPublished ?? true
  );
  const [showPassFail, setShowPassFail] = useState<boolean>(
    settings.showPassFailToCandidates ?? true
  );
  const [interviewerPolicy, setInterviewerPolicy] = useState<InterviewerNameDisplayPolicy>(
    settings.interviewerNameDisplayPolicy || 'LEADERS_ONLY'
  );
  const [showStats, setShowStats] = useState<boolean>(
    settings.showStatsToCandidates ?? true
  );
  const [showComments, setShowComments] = useState<boolean>(
    settings.showDetailedComments ?? true
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onCompleteAll({
        operatorName,
        isResultsPublished,
        showPassFailToCandidates: showPassFail,
        interviewerNameDisplayPolicy: interviewerPolicy,
        showStatsToCandidates: showStats,
        showDetailedComments: showComments
      });
      onClose();
    } catch (err: any) {
      console.error('Complete all error:', err);
      setErrorMsg(err.message || '완료 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>모든 면접 공식 완료 및 학생 성적표 발표</span>
              </h3>
              <p className="text-xs text-slate-300">
                전체 {totalCandidatesCount}명 지원자 대상 면접을 공식 종료하고 성적표 및 AI 보고서를 공개합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Notice Box */}
          <div className="p-4 bg-blue-950/40 border border-blue-800/50 rounded-2xl space-y-2 text-slate-200">
            <div className="flex items-center gap-2 text-blue-300 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>자동 AI 심층 진단 & 백엔드 통계 집계 안내</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              버튼을 클릭하면 진행 중인 지원자 전원이 완료 처리되며, <strong>Groq 초고속 AI(Llama 3.3 70B)가 지원자별 맞춤형 강점/보완점/역량 진단서</strong>를 즉시 자동 생성합니다. 학생들은 포털에 로그인하여 아래 설정에 따라 본인의 점수와 성적표를 실시간 열람 및 PDF로 다운로드할 수 있습니다.
            </p>
          </div>

          {/* 1. Results Publication Switch */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white block">학생 성적표 및 결과 공개 (Publish Results)</label>
                <p className="text-[11px] text-slate-400">
                  활성화 시 학생들이 로그인했을 때 성적표, 통계, AI 보고서 탭이 열립니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsResultsPublished(!isResultsPublished)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  isResultsPublished
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {isResultsPublished ? '공개 (ON)' : '비공개 (OFF)'}
              </button>
            </div>
          </div>

          {/* 2. Pass / Fail Display Policy Switch */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white block flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>합격 / 불합격 여부 학생 화면 표시</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  'OFF'로 설정 시 합격/불합격 배지가 숨겨지고 '심사 완료'로 표시되며 점수와 피드백만 노출됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPassFail(!showPassFail)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  showPassFail
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {showPassFail ? '표시함 (ON)' : '숨김 (OFF)'}
              </button>
            </div>
          </div>

          {/* 3. Interviewer Name Display Policy */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold text-white block flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>면접관 이름 공개 범위 설정 (Interviewer Name Anonymity)</span>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              
              <button
                type="button"
                onClick={() => setInterviewerPolicy('LEADERS_ONLY')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  interviewerPolicy === 'LEADERS_ONLY'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1 text-white">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>기장/부기장만 실명</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  리더십은 실명 표시, 일반 면접관은 '면접관 A (익명)' 처리
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInterviewerPolicy('ALL_PUBLIC')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  interviewerPolicy === 'ALL_PUBLIC'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1 text-white">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>전체 면접관 실명</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  모든 면접관의 실명과 직책을 투명하게 공개
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInterviewerPolicy('ALL_ANONYMOUS')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  interviewerPolicy === 'ALL_ANONYMOUS'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1 text-white">
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>전체 익명 (Blind)</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  모든 면접관을 '면접관 1 (익명)' 등으로 완전 블라인드 처리
                </div>
              </button>

            </div>
          </div>

          {/* 4. Statistics & Feedback Comments Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">전체 통계 (평균·표준편차·석차)</span>
                <span className="text-[10px] text-slate-400">집단 통계 데이터 공개</span>
              </div>
              <button
                type="button"
                onClick={() => setShowStats(!showStats)}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  showStats ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {showStats ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">정성 피드백 코멘트</span>
                <span className="text-[10px] text-slate-400">면접관 주관식 메모 공개</span>
              </div>
              <button
                type="button"
                onClick={() => setShowComments(!showComments)}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  showComments ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {showComments ? 'ON' : 'OFF'}
              </button>
            </div>

          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>완료 및 AI 리포트 생성 중...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>모든 면접 완료 및 결과 발표</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
