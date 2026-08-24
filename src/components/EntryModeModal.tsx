import React from 'react';
import { Candidate, InterviewerUser } from '../types';
import { Eye, Award, CheckSquare, Sparkles, X, ChevronRight, Users, Shield } from 'lucide-react';
import { formatInterviewerDisplayName } from './ObserverDashboard';

interface EntryModeModalProps {
  candidate: Candidate;
  currentUser: InterviewerUser;
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (isObserver: boolean) => void;
}

export const EntryModeModal: React.FC<EntryModeModalProps> = ({
  candidate,
  currentUser,
  isOpen,
  onClose,
  onSelectMode
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>면접실 입장 모드 선택</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            '{candidate.name}' 지원자 면접 진행 방식
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            <strong className="text-white">{formatInterviewerDisplayName(currentUser.name)}</strong>님, 이번 면접에 어떤 역할로 참여하시겠습니까?
          </p>
        </div>

        {/* Big Choice Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50">
          {/* Card 1: Evaluation Mode (평가) */}
          <button
            onClick={() => onSelectMode(false)}
            className="group relative p-5 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:shadow-lg transition-all text-left flex flex-col justify-between cursor-pointer active:scale-98"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                  Standard Evaluator
                </div>
                <h4 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                  평가 참여
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  평가표에 직접 항목별 점수와 정성 의견을 채점하고 공식 점수로 반영합니다.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
              <span>평가표 열기</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 2: Observer Mode (관전만) */}
          <button
            onClick={() => onSelectMode(true)}
            className="group relative p-5 bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-600 hover:shadow-lg transition-all text-left flex flex-col justify-between cursor-pointer active:scale-98"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                  Observer Mode
                </div>
                <h4 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  관전만 (모니터링)
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  점수는 매기지 않고, 실시간 대화 및 동료 평가 진행 흐름만 참관합니다.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>관전 모드 입장</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-100/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            면접실 내부에서도 언제든지 상단 버튼으로 모드를 전환할 수 있습니다.
          </span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};
