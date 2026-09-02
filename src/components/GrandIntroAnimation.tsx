import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Shuffle } from 'lucide-react';
import { SmartLabLogo } from './SmartLabLogo';

export type IntroTheme = 'pixar_lamp' | 'classic_slot';

export const INTRO_THEMES: { id: IntroTheme; name: string; desc: string }[] = [
  { id: 'pixar_lamp', name: 'Pixar 스타일 램프 점핑', desc: '스마트랩 램프가 통통 뛰어와 글자를 쿵 밟고 카메라를 응시하는 연출' },
  { id: 'classic_slot', name: '클래식 슬롯머신 (777 잭팟)', desc: '실제 카지노 3릴 슬롯머신이 고속 회전 후 7-7-7 잭팟이 터지는 연출' },
];

const SANGSAN_CHARS = ['S', 'a', 'n', 'g', 's', 'a', 'n'];
const SMARTLAB_CHARS = ['s', 'm', 'a', 'r', 't', 'l', 'a', 'b'];

// ============================================================================
// AUTHENTIC CASINO SLOT SYMBOL COMPONENTS (Exact Match with Reference Video)
// ============================================================================

// 1. Golden Lucky 7 with Marquee Dot Lights
const LuckySevenSymbol: React.FC<{ isJackpot?: boolean }> = ({ isJackpot = false }) => (
  <div className="relative w-16 sm:w-20 h-16 sm:h-20 flex items-center justify-center">
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
      <defs>
        <linearGradient id="gold7Grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#eab308" />
          <stop offset="70%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <linearGradient id="goldBevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#713f12" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* 3D Drop Shadow Extrusion */}
      <path
        d="M 18 26 L 82 26 L 52 88 L 36 88 L 60 38 L 18 38 Z"
        fill="#581c87"
        opacity="0.3"
        transform="translate(4, 4)"
      />

      {/* 7 Main 3D Body */}
      <path
        d="M 18 20 L 82 20 L 52 86 L 36 86 L 60 34 L 18 34 Z"
        fill="url(#gold7Grad)"
        stroke="#ca8a04"
        strokeWidth="1.5"
      />

      {/* Inner Bevel Contour */}
      <path
        d="M 22 23 L 78 23 L 50 82 L 40 82 L 62 31 L 22 31 Z"
        fill="none"
        stroke="url(#goldBevel)"
        strokeWidth="1.5"
      />

      {/* Retro Marquee Cyan/Blue Light Bulb Dots */}
      <circle cx="28" cy="27" r="3.2" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" className={isJackpot ? 'animate-pulse' : ''} />
      <circle cx="42" cy="27" r="3.2" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" className={isJackpot ? 'animate-pulse' : ''} />
      <circle cx="56" cy="27" r="3.2" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" className={isJackpot ? 'animate-pulse' : ''} />
      <circle cx="70" cy="27" r="3.2" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" className={isJackpot ? 'animate-pulse' : ''} />

      <circle cx="58" cy="42" r="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
      <circle cx="51" cy="54" r="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
      <circle cx="45" cy="66" r="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
      <circle cx="40" cy="78" r="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
    </svg>
  </div>
);

// 2. Juicy Glossy Cherries
const CherriesSymbol: React.FC = () => (
  <div className="relative w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center">
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
      {/* Green Stem */}
      <path
        d="M 52 18 C 50 36 34 46 32 64 M 52 18 C 58 36 70 46 68 62"
        fill="none"
        stroke="#15803d"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Stem Leaf */}
      <path
        d="M 52 18 C 65 14 74 20 70 28 C 62 26 56 22 52 18 Z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1.2"
      />
      {/* Cherry 1 (Left) */}
      <circle cx="32" cy="68" r="16" fill="url(#cherryGrad1)" />
      <ellipse cx="28" cy="63" rx="4" ry="2.5" fill="#ffffff" opacity="0.6" transform="rotate(-30 28 63)" />
      {/* Cherry 2 (Right) */}
      <circle cx="68" cy="66" r="16" fill="url(#cherryGrad2)" />
      <ellipse cx="64" cy="61" rx="4" ry="2.5" fill="#ffffff" opacity="0.6" transform="rotate(-30 64 61)" />

      <defs>
        <radialGradient id="cherryGrad1" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="40%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id="cherryGrad2" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="40%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
      </defs>
    </svg>
  </div>
);

// 3. Striped Watermelon Slice
const WatermelonSymbol: React.FC = () => (
  <div className="relative w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center">
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
      {/* Outer Rind */}
      <path d="M 15 50 A 35 35 0 0 0 85 50 Z" fill="#15803d" stroke="#166534" strokeWidth="2" />
      {/* White Pith */}
      <path d="M 19 50 A 31 31 0 0 0 81 50 Z" fill="#bbf7d0" />
      {/* Red Flesh */}
      <path d="M 23 50 A 27 27 0 0 0 77 50 Z" fill="#ef4444" />
      {/* Rind Stripes */}
      <path d="M 24 64 Q 28 58 32 68" stroke="#14532d" strokeWidth="2.5" fill="none" />
      <path d="M 45 74 Q 50 66 55 74" stroke="#14532d" strokeWidth="2.5" fill="none" />
      <path d="M 68 64 Q 72 58 76 68" stroke="#14532d" strokeWidth="2.5" fill="none" />
      {/* Black Seeds */}
      <circle cx="36" cy="56" r="1.8" fill="#18181b" />
      <circle cx="50" cy="60" r="1.8" fill="#18181b" />
      <circle cx="64" cy="56" r="1.8" fill="#18181b" />
      <circle cx="43" cy="54" r="1.5" fill="#18181b" />
      <circle cx="57" cy="54" r="1.5" fill="#18181b" />
    </svg>
  </div>
);

// 4. Sparkling Diamond Gem
const DiamondSymbol: React.FC = () => (
  <div className="relative w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center">
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
      <defs>
        <linearGradient id="diamGradTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="diamGradBot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      {/* Top Facets */}
      <polygon points="30,30 70,30 84,48 16,48" fill="url(#diamGradTop)" stroke="#bae6fd" strokeWidth="1.2" />
      <polygon points="30,30 50,48 70,30" fill="#bae6fd" opacity="0.7" />
      <polygon points="16,48 30,30 50,48" fill="#7dd3fc" opacity="0.6" />
      <polygon points="84,48 70,30 50,48" fill="#38bdf8" opacity="0.8" />
      {/* Bottom Facets */}
      <polygon points="16,48 84,48 50,82" fill="url(#diamGradBot)" stroke="#0284c7" strokeWidth="1.2" />
      <polygon points="16,48 50,48 50,82" fill="#0ea5e9" opacity="0.85" />
      <polygon points="84,48 50,48 50,82" fill="#0284c7" opacity="0.95" />
      {/* Glint */}
      <circle cx="34" cy="36" r="2.5" fill="#ffffff" />
    </svg>
  </div>
);

// 5. Fresh Citrus Lemon
const LemonSymbol: React.FC = () => (
  <div className="relative w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center">
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
      {/* Leaf */}
      <path d="M 62 32 C 76 22 84 28 80 38 C 72 38 66 35 62 32 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
      {/* Lemon Body */}
      <ellipse cx="48" cy="54" rx="28" ry="22" fill="url(#lemonGrad)" stroke="#eab308" strokeWidth="1.5" transform="rotate(-15 48 54)" />
      {/* Tips */}
      <circle cx="22" cy="62" r="3" fill="#facc15" />
      <circle cx="74" cy="46" r="3" fill="#facc15" />
      {/* Highlight */}
      <ellipse cx="45" cy="48" rx="14" ry="7" fill="#ffffff" opacity="0.4" transform="rotate(-15 45 48)" />

      <defs>
        <radialGradient id="lemonGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="60%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>
      </defs>
    </svg>
  </div>
);

// 6. Orange 10 Symbol
const TenSymbol: React.FC = () => (
  <div className="relative w-14 sm:w-16 h-14 sm:h-16 flex items-center justify-center">
    <span className="font-black text-3xl sm:text-4xl font-mono text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-orange-500 to-red-600 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] tracking-tight">
      10
    </span>
  </div>
);

// 7. Triple BAR Symbol
const BarSymbol: React.FC = () => (
  <div className="relative w-14 sm:w-16 h-14 sm:h-16 flex flex-col items-center justify-center gap-1">
    <div className="w-12 h-3.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 rounded border border-amber-600 flex items-center justify-center shadow-xs">
      <span className="text-[8px] font-black text-amber-950 font-mono tracking-widest">BAR</span>
    </div>
    <div className="w-12 h-3.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 rounded border border-amber-600 flex items-center justify-center shadow-xs">
      <span className="text-[8px] font-black text-amber-950 font-mono tracking-widest">BAR</span>
    </div>
  </div>
);

// Full Reel Strip Array used during rotation
const REEL_STRIP = [
  { id: 'lemon', component: <LemonSymbol /> },
  { id: 'seven', component: <LuckySevenSymbol isJackpot /> },
  { id: 'cherry', component: <CherriesSymbol /> },
  { id: 'ten', component: <TenSymbol /> },
  { id: 'watermelon', component: <WatermelonSymbol /> },
  { id: 'diamond', component: <DiamondSymbol /> },
  { id: 'bar', component: <BarSymbol /> },
  { id: 'seven2', component: <LuckySevenSymbol isJackpot /> },
];

interface GrandIntroAnimationProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const GrandIntroAnimation: React.FC<GrandIntroAnimationProps> = ({
  onComplete,
  forceShow = false
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<IntroTheme>('classic_slot');
  const [animStage, setAnimStage] = useState<'intro' | 'action' | 'climax' | 'exit'>('intro');
  const [lampHopStep, setLampHopStep] = useState<number>(0);
  const [reelStopState, setReelStopState] = useState<[boolean, boolean, boolean]>([false, false, false]);

  const pickRandomTheme = (): IntroTheme => {
    return Math.random() > 0.5 ? 'pixar_lamp' : 'classic_slot';
  };

  const runIntro = (themeToRun?: IntroTheme) => {
    const selected = themeToRun || pickRandomTheme();
    setCurrentTheme(selected);
    setIsVisible(true);
    setAnimStage('intro');
    setLampHopStep(0);
    setReelStopState([false, false, false]);

    const timers: NodeJS.Timeout[] = [];

    if (selected === 'pixar_lamp') {
      timers.push(setTimeout(() => setAnimStage('action'), 500));
      timers.push(setTimeout(() => setLampHopStep(1), 800));
      timers.push(setTimeout(() => setLampHopStep(2), 1200));
      timers.push(setTimeout(() => setLampHopStep(3), 1600));
      timers.push(setTimeout(() => setLampHopStep(4), 2000));
      timers.push(setTimeout(() => {
        setAnimStage('climax');
        setLampHopStep(5);
      }, 2500));
      timers.push(setTimeout(() => setAnimStage('exit'), 4300));
      timers.push(setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, 4900));
    } else {
      // Classic Casino Slot Reel sequence:
      // 0.3s: Cabinet and reels start rolling with blur
      // 1.3s: Reel 1 stops on 7!
      // 1.9s: Reel 2 stops on 7! (Reach tension)
      // 2.7s: Reel 3 stops on 7! -> 7-7-7 Triple Jackpot!
      // 2.9s: Climax burst + Coin shower + typography reveal
      // 4.6s: Smooth exit
      timers.push(setTimeout(() => setAnimStage('action'), 300));
      timers.push(setTimeout(() => setReelStopState([true, false, false]), 1300));
      timers.push(setTimeout(() => setReelStopState([true, true, false]), 1900));
      timers.push(setTimeout(() => {
        setReelStopState([true, true, true]);
        setAnimStage('climax');
      }, 2700));
      timers.push(setTimeout(() => setAnimStage('exit'), 4600));
      timers.push(setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, 5200));
    }

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastSeen = localStorage.getItem('smartlab_intro_last_date');

      if (!forceShow && lastSeen === today) {
        setIsVisible(false);
        if (onComplete) onComplete();
      } else {
        localStorage.setItem('smartlab_intro_last_date', today);
        cleanup = runIntro();
      }
    } catch {
      cleanup = runIntro();
    }

    const handleReplay = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme?: IntroTheme }>;
      if (cleanup) cleanup();
      cleanup = runIntro(customEvent.detail?.theme);
    };

    window.addEventListener('replay_smartlab_intro', handleReplay as EventListener);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('replay_smartlab_intro', handleReplay as EventListener);
    };
  }, [forceShow, onComplete]);

  const handleSkip = () => {
    setAnimStage('exit');
    setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 250);
  };

  const handleToggleTheme = () => {
    const nextTheme = currentTheme === 'pixar_lamp' ? 'classic_slot' : 'pixar_lamp';
    runIntro(nextTheme);
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="smartlab-grand-intro-refined"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617] text-white overflow-hidden select-none pointer-events-auto"
        >
          {/* Top Controls: Mode Switcher & Skip */}
          <div className="absolute top-6 left-6 right-6 z-40 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleTheme}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-amber-300 backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-lg"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-400" />
              <span>연출 전환: {currentTheme === 'pixar_lamp' ? '픽사 램프' : '클래식 슬롯'}</span>
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-all backdrop-blur-md cursor-pointer active:scale-95 shadow-lg"
            >
              <span>건너뛰기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* =========================================================================
              THEME 1: PIXAR STYLE LAMP (스마트랩 램프의 점핑 & 스탬프 & 카메라 응시)
             ========================================================================= */}
          {currentTheme === 'pixar_lamp' && (
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: animStage === 'climax' ? 0.45 : 0.15,
                  scale: animStage === 'climax' ? [1, 1.2, 1.1] : 1
                }}
                transition={{ duration: 0.6 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full bg-gradient-to-b from-amber-300/30 via-indigo-600/20 to-transparent blur-[110px] pointer-events-none"
              />

              {/* Dynamic Pixar Hopper Lamp */}
              <div className="relative h-32 w-full flex items-center justify-center mb-2">
                <motion.div
                  initial={{ x: -280, y: -40, opacity: 0, rotate: -25, scale: 0.8 }}
                  animate={{
                    x:
                      lampHopStep === 0 ? -280 :
                      lampHopStep === 1 ? -150 :
                      lampHopStep === 2 ? -50 :
                      lampHopStep === 3 ? 40 :
                      0,
                    y:
                      lampHopStep === 0 ? -40 :
                      lampHopStep === 1 ? -95 :
                      lampHopStep === 2 ? -90 :
                      lampHopStep === 3 ? -75 :
                      lampHopStep === 4 ? 12 :
                      0,
                    scaleY:
                      lampHopStep === 4 ? 0.65 :
                      lampHopStep === 5 ? 1.08 : 1,
                    scaleX:
                      lampHopStep === 4 ? 1.35 : 1,
                    rotate:
                      lampHopStep === 5 ? 0 :
                      lampHopStep === 4 ? 6 :
                      lampHopStep === 1 ? 16 :
                      lampHopStep === 2 ? -14 :
                      lampHopStep === 3 ? 12 : -20,
                    opacity: 1
                  }}
                  transition={{
                    duration: 0.38,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="relative z-20 flex flex-col items-center cursor-pointer"
                >
                  {animStage === 'climax' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 0.8, scale: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl pointer-events-none"
                    />
                  )}

                  <div className="p-3 rounded-3xl bg-[#09090b] border-2 border-amber-400/90 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex items-center justify-center">
                    <SmartLabLogo size={78} showText={false} />
                  </div>

                  <motion.div
                    animate={{
                      scaleX: lampHopStep === 4 ? 1.5 : 1,
                      opacity: lampHopStep === 4 ? 0.9 : 0.4
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="w-16 h-2 rounded-full bg-black/80 blur-[2px] mt-1"
                  />
                </motion.div>
              </div>

              {/* Sangsan smartlab Typography */}
              <div className="space-y-4 my-2">
                <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-6 gap-y-2 py-2">
                  <div className="flex items-center tracking-wider">
                    {SANGSAN_CHARS.map((char, index) => (
                      <motion.span
                        key={`pixar-sangsan-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: lampHopStep === 4 ? 4 : 0,
                          color: animStage === 'climax' ? '#ffffff' : '#cbd5e1'
                        }}
                        transition={{
                          delay: 0.1 + index * 0.04,
                          duration: 0.3,
                          ease: 'easeOut'
                        }}
                        className="text-4xl sm:text-6xl md:text-7xl font-black font-mono inline-block origin-bottom drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
                        style={{
                          textShadow: animStage === 'climax' ? '0 0 25px rgba(255,255,255,0.6)' : undefined
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>

                  <div className="flex items-center tracking-wider">
                    {SMARTLAB_CHARS.map((char, index) => {
                      const isStompedChar = char === 'a' || char === 'l';
                      return (
                        <motion.span
                          key={`pixar-smartlab-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{
                            opacity: 1,
                            y:
                              lampHopStep === 4 && isStompedChar ? 14 :
                              lampHopStep === 4 ? 4 : 0,
                            scaleY: lampHopStep === 4 && isStompedChar ? 0.5 : 1,
                            scaleX: lampHopStep === 4 && isStompedChar ? 1.4 : 1,
                            color:
                              animStage === 'climax' ? '#38bdf8' :
                              lampHopStep >= 4 ? '#7dd3fc' : '#94a3b8'
                          }}
                          transition={{
                            delay: 0.2 + index * 0.04,
                            duration: 0.32,
                            ease: 'easeOut'
                          }}
                          className="text-4xl sm:text-6xl md:text-7xl font-black font-mono inline-block origin-bottom drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
                          style={{
                            textShadow: animStage === 'climax' ? '0 0 30px rgba(56,189,248,0.7)' : undefined
                          }}
                        >
                          {char}
                        </motion.span>
                      );
                    })}
                  </div>
                </div>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{
                    opacity: animStage === 'exit' ? 0 : 1,
                    y: animStage === 'exit' ? -10 : 0
                  }}
                  transition={{ delay: 1.0, duration: 0.7 }}
                  className="text-xl sm:text-2xl font-bold tracking-widest text-amber-400 font-sans"
                >
                  상산고등학교 스마트랩
                </motion.p>
              </div>
            </div>
          )}

          {/* =========================================================================
              THEME 2: REAL CASINO 3-REEL SLOT MACHINE (7 - 7 - 7 JACKPOT)
             ========================================================================= */}
          {currentTheme === 'classic_slot' && (
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
              {/* Climax Jackpot Radiant Glow */}
              {animStage === 'climax' && (
                <motion.div
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: [1, 1.5, 1.3], opacity: [1, 0.7, 0.85] }}
                  transition={{ duration: 0.5 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,#eab308_0%,#f59e0b_30%,#b45309_60%,transparent_75%)] blur-[95px] pointer-events-none opacity-40"
                />
              )}

              {/* Slot Machine Authentic Cabinet Window (Matching Video Reference) */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative p-3 sm:p-4 rounded-3xl bg-[#1e293b] border-[6px] border-[#334155] shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(234,179,8,0.2)] mb-6"
              >
                {/* Inner Gold Bezel */}
                <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-[#ca8a04] via-[#eab308] to-[#854d0e] shadow-inner">
                  {/* 3 Physical Cylindrical Reels */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-[#090d16] p-1.5 sm:p-2 rounded-xl border border-black shadow-[inset_0_4px_16px_rgba(0,0,0,0.9)] overflow-hidden">
                    {/* REEL 1 */}
                    <div className="relative w-24 sm:w-32 md:w-36 h-36 sm:h-44 bg-gradient-to-b from-[#fef08a]/90 via-[#fde68a] to-[#d97706]/90 rounded-lg overflow-hidden border border-amber-900/30 flex items-center justify-center">
                      {/* Cylindrical 3D Lighting Gradients */}
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/60 via-transparent to-black/60 z-20" />
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 sm:h-24 bg-white/20 pointer-events-none z-10 border-y border-amber-500/30" />

                      {reelStopState[0] ? (
                        <motion.div
                          initial={{ y: -60, scale: 1.3 }}
                          animate={{ y: [ -60, 10, -4, 0 ], scale: 1 }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          className="relative z-10 flex flex-col items-center justify-center"
                        >
                          <LuckySevenSymbol isJackpot />
                        </motion.div>
                      ) : (
                        <motion.div
                          animate={{ y: [-240, 240] }}
                          transition={{ duration: 0.1, repeat: Infinity, ease: 'linear' }}
                          className="flex flex-col items-center gap-6 blur-[1.5px] opacity-80"
                        >
                          {REEL_STRIP.map((sym, idx) => (
                            <div key={`reel1-strip-${idx}`}>{sym.component}</div>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {/* REEL 2 */}
                    <div className="relative w-24 sm:w-32 md:w-36 h-36 sm:h-44 bg-gradient-to-b from-[#fef08a]/90 via-[#fde68a] to-[#d97706]/90 rounded-lg overflow-hidden border border-amber-900/30 flex items-center justify-center">
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/60 via-transparent to-black/60 z-20" />
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 sm:h-24 bg-white/20 pointer-events-none z-10 border-y border-amber-500/30" />

                      {reelStopState[1] ? (
                        <motion.div
                          initial={{ y: -60, scale: 1.3 }}
                          animate={{ y: [ -60, 10, -4, 0 ], scale: 1 }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          className="relative z-10 flex flex-col items-center justify-center"
                        >
                          <LuckySevenSymbol isJackpot />
                        </motion.div>
                      ) : (
                        <motion.div
                          animate={{ y: [-240, 240] }}
                          transition={{ duration: 0.09, repeat: Infinity, ease: 'linear' }}
                          className="flex flex-col items-center gap-6 blur-[1.5px] opacity-80"
                        >
                          {REEL_STRIP.map((sym, idx) => (
                            <div key={`reel2-strip-${idx}`}>{sym.component}</div>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {/* REEL 3 */}
                    <div className="relative w-24 sm:w-32 md:w-36 h-36 sm:h-44 bg-gradient-to-b from-[#fef08a]/90 via-[#fde68a] to-[#d97706]/90 rounded-lg overflow-hidden border border-amber-900/30 flex items-center justify-center">
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/60 via-transparent to-black/60 z-20" />
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 sm:h-24 bg-white/20 pointer-events-none z-10 border-y border-amber-500/30" />

                      {reelStopState[2] ? (
                        <motion.div
                          initial={{ y: -70, scale: 1.4 }}
                          animate={{ y: [ -70, 12, -4, 0 ], scale: 1 }}
                          transition={{ duration: 0.38, ease: 'easeOut' }}
                          className="relative z-10 flex flex-col items-center justify-center"
                        >
                          <LuckySevenSymbol isJackpot />
                        </motion.div>
                      ) : (
                        <motion.div
                          animate={{ y: [-240, 240] }}
                          transition={{ duration: 0.08, repeat: Infinity, ease: 'linear' }}
                          className="flex flex-col items-center gap-6 blur-[1.5px] opacity-80"
                        >
                          {REEL_STRIP.map((sym, idx) => (
                            <div key={`reel3-strip-${idx}`}>{sym.component}</div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Climax Jackpot Golden Coins Splash */}
                {animStage === 'climax' && (
                  <div className="absolute -inset-8 pointer-events-none overflow-hidden">
                    {Array.from({ length: 26 }).map((_, i) => (
                      <motion.div
                        key={`real-coin-${i}`}
                        initial={{ y: 80, x: 0, opacity: 1, scale: 0.6 }}
                        animate={{
                          y: [80, -40, 240],
                          x: (i % 2 === 0 ? 1 : -1) * (30 + (i * 14)),
                          opacity: [1, 1, 0],
                          rotate: 720
                        }}
                        transition={{ duration: 1.5, delay: (i % 8) * 0.08, ease: 'easeOut' }}
                        className="absolute top-1/2 left-1/2 w-6 h-6 rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 border border-amber-200 shadow-[0_0_15px_#f59e0b] flex items-center justify-center font-black text-[11px] text-amber-950 font-mono"
                      >
                        7
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Sangsan smartlab Typography & Logo Reveal */}
              <div className="space-y-4 my-1 flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{
                    opacity: animStage === 'climax' ? 1 : 0.8,
                    scale: animStage === 'climax' ? [0.9, 1.08, 1] : 1
                  }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-4"
                >
                  <div className="p-2.5 rounded-2xl bg-[#09090b] border border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                    <SmartLabLogo size={48} showText={false} />
                  </div>
                  <div className="text-4xl sm:text-6xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                    Sangsan smartlab
                  </div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{
                    opacity: animStage === 'exit' ? 0 : 1,
                    y: animStage === 'exit' ? -10 : 0
                  }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="text-xl sm:text-2xl font-bold tracking-widest text-amber-400 font-sans"
                >
                  상산고등학교 스마트랩
                </motion.p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
