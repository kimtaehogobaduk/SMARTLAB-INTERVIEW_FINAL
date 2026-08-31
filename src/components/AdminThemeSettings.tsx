import React from 'react';
import { useTheme, PALETTE_LIST } from '../contexts/ThemeContext';
import { ThemePalette, ThemeMode } from '../types';
import { Palette, Sun, Moon, Laptop, CheckCircle2, Sparkles, Sliders, Check } from 'lucide-react';

export const AdminThemeSettings: React.FC = () => {
  const { theme, setMode, setPalette, toggleMode } = useTheme();

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Info */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl">
                <Palette className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                사이트 디자인 & 테마 컬러 팔레트 설정
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
              스마트랩 면접 평가 시스템의 시각적 테마를 설정합니다. 다크 모드 및 화이트(라이트) 모드뿐만 아니라 
              주황, 노랑, 에메랄드, 퍼플, 로즈, 사이언 등 다양한 고유 팔레트를 자유롭게 선택하여 전체 시스템에 즉시 적용할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-bold">실시간 로컬 동기화 ON</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Theme Mode Selection (Dark / White / System) */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>1. 모드 선택 (다크 / 화이트 / 시스템)</span>
            </h3>
            <p className="text-xs text-slate-400">
              면접장 환경의 조도에 맞추어 어두운 다크 모드 또는 밝고 선명한 화이트 모드를 선택하세요.
            </p>
          </div>
          <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
            현재: {theme.mode === 'dark' ? '다크 모드' : theme.mode === 'light' ? '화이트(라이트) 모드' : '시스템 자동'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Dark Mode Option */}
          <button
            type="button"
            onClick={() => setMode('dark')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
              theme.mode === 'dark'
                ? 'bg-slate-950 border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-amber-400">
                <Moon className="w-5 h-5" />
              </div>
              {theme.mode === 'dark' && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  <span>적용 중</span>
                </div>
              )}
            </div>
            <div className="font-bold text-white text-sm mb-1">다크 모드 (Dark Mode)</div>
            <div className="text-xs text-slate-400 leading-relaxed mb-4">
              눈의 피로도를 낮추고 심야 및 실내 면접관 집중도에 최적화된 고급스러운 딥 다크 캔버스
            </div>
            
            {/* Visual Mini Preview */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-medium">다크 톤 미리보기</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">#0b0f17</span>
            </div>
          </button>

          {/* Light Mode Option */}
          <button
            type="button"
            onClick={() => setMode('light')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
              theme.mode === 'light'
                ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30 text-amber-400">
                <Sun className="w-5 h-5" />
              </div>
              {theme.mode === 'light' && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  <span>적용 중</span>
                </div>
              )}
            </div>
            <div className="font-bold text-white text-sm mb-1">화이트 모드 (Light Mode)</div>
            <div className="text-xs text-slate-400 leading-relaxed mb-4">
              밝고 깨끗한 백색/오프화이트 배경으로 주간 환경 및 문서 가독성이 극대화된 깔끔한 디자인
            </div>
            
            {/* Visual Mini Preview */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-[11px] text-slate-900">
              <span className="text-slate-800 font-bold">화이트 톤 미리보기</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">#f8fafc</span>
            </div>
          </button>

          {/* System Option */}
          <button
            type="button"
            onClick={() => setMode('system')}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
              theme.mode === 'system'
                ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-blue-400">
                <Laptop className="w-5 h-5" />
              </div>
              {theme.mode === 'system' && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  <span>적용 중</span>
                </div>
              )}
            </div>
            <div className="font-bold text-white text-sm mb-1">시스템 동기화 (Auto)</div>
            <div className="text-xs text-slate-400 leading-relaxed mb-4">
              운영체제(OS) 및 브라우저의 다크/라이트 설정에 맞춰 자동으로 전환되는 유연한 반응형 모드
            </div>
            
            {/* Visual Mini Preview */}
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-medium">OS 감지 자동 변경</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 font-mono">Auto OS</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Color Palette Selection */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>2. 포인트 컬러 팔레트 선택 (주황, 노랑, 에메랄드, 퍼플, 로즈 등)</span>
            </h3>
            <p className="text-xs text-slate-400">
              버튼, 배지, 그래프, 주요 하이라이트 요소에 적용되는 대표 테마 컬러 팔레트를 선택하세요.
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            총 {PALETTE_LIST.length}개 테마 지원
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PALETTE_LIST.map((item) => {
            const isSelected = theme.palette === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPalette(item.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/95 border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Top Badge & Swatch */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-1.5">
                      <span
                        className="w-5 h-5 rounded-full border-2 border-slate-900 shadow-sm"
                        style={{ backgroundColor: item.primaryHex }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border-2 border-slate-900 shadow-sm"
                        style={{ backgroundColor: item.swatches[1] || item.primaryHex }}
                      />
                    </div>
                    <span className="text-sm font-black text-white">{item.name}</span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {item.description}
                </div>

                {/* Color Swatches Grid */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  <span
                    className="h-3 flex-1 rounded-sm"
                    style={{ backgroundColor: item.primaryHex }}
                    title="메인 포인트"
                  />
                  <span
                    className="h-3 flex-1 rounded-sm"
                    style={{ backgroundColor: item.swatches[1] || item.primaryHex }}
                    title="보조 포인트"
                  />
                  <span
                    className="h-3 flex-1 rounded-sm opacity-60"
                    style={{ backgroundColor: item.primaryHex }}
                    title="배지 배경"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live UI Component Interactive Preview */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>3. 실시간 테마 적용 인터랙티브 컴포넌트 미리보기</span>
            </h3>
            <p className="text-xs text-slate-400">
              현재 선택한 모드와 팔레트가 실제 면접 시스템의 버튼, 배지, 카드, 진행 바에 실시간으로 어떻게 표현되는지 확인하세요.
            </p>
          </div>
        </div>

        {/* Live Preview Canvas */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-950 space-y-6">
          {/* Header Preview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-slate-950 text-xs shadow-md"
                style={{ backgroundColor: PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex || '#f59e0b' }}
              >
                SL
              </div>
              <div>
                <div className="text-sm font-bold text-white">SmartLab Interview Architecture</div>
                <div className="text-[11px] text-slate-400">실시간 테마 렌더링 엔진 작동 중</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-3 py-1 rounded-full border"
                style={{
                  backgroundColor: `${PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex}20`,
                  color: PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex,
                  borderColor: `${PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex}50`
                }}
              >
                {PALETTE_LIST.find(p => p.id === theme.palette)?.name} 테마 활성
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                {theme.mode.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Interactive UI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Button sample */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-300 block">버튼 인터랙션</span>
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-950 shadow-md transition-transform hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex || '#f59e0b'
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>주요 액션 실행 버튼</span>
                </button>
                <button
                  type="button"
                  className="w-full py-2 rounded-xl text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
                >
                  보조 액션 취소
                </button>
              </div>
            </div>

            {/* Card 2: Progress & Metric */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-300 block">진행률 및 게이지</span>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">면접 평가 진행률</span>
                  <span
                    className="font-bold font-mono"
                    style={{ color: PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex }}
                  >
                    87.5%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: '87.5%',
                      backgroundColor: PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex
                    }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>완료: 14명</span>
                  <span>대기: 2명</span>
                </div>
              </div>
            </div>

            {/* Card 3: Status Tag & Score */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-300 block">상태 배지 & 스코어</span>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">최종 종합 평가</span>
                  <span
                    className="text-sm font-black font-mono"
                    style={{ color: PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex }}
                  >
                    94.2점 (A+)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: `${PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex}20`,
                      color: PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex,
                      borderColor: `${PALETTE_LIST.find(p => p.id === theme.palette)?.primaryHex}40`
                    }}
                  >
                    합격 권장
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    기술 탁월
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    리더십 우수
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
