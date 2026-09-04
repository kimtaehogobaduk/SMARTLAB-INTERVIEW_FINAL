import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { getStoredVideo } from '../utils/introVideoStorage';

// ============================================================================
// AUTHENTIC SMARTLAB 3D ROBOT SVG RIG (Faithful Replica of the Reference Video)
// ============================================================================

interface RobotRigProps {
  step: number; // 0: enter, 1: run1, 2: touch letter, 3: jump high, 4: land squash, 5: sit & smile, 6: cyan climax
  isSpotlightOn: boolean;
}

const SmartLabCuteRobot: React.FC<RobotRigProps> = ({ step, isSpotlightOn }) => {
  const isJumping = step === 3;
  const isLanded = step >= 4;
  const isSitting = step >= 5;

  return (
    <div className="relative flex flex-col items-center justify-end select-none pointer-events-none">
      {/* Ground Shadow underneath Robot */}
      <motion.div
        animate={{
          scaleX: isJumping ? 0.25 : isLanded ? 1.4 : 1,
          scaleY: isJumping ? 0.2 : isLanded ? 1.3 : 1,
          opacity: isJumping ? 0.15 : isLanded ? 0.85 : 0.6
        }}
        transition={{ duration: 0.2 }}
        className="absolute -bottom-2 w-28 h-6 bg-black/80 rounded-full blur-[4px]"
      />

      {/* 3D Cute White Robot Body */}
      <svg
        viewBox="0 0 160 200"
        className="w-28 sm:w-36 md:w-44 h-36 sm:h-44 md:h-56 drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] overflow-visible"
      >
        <defs>
          {/* Smooth White Glossy Ceramic/Plastic Gradient */}
          <radialGradient id="robotWhiteGlow" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#f8fafc" />
            <stop offset="85%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>

          {/* Dark Glass Visor Screen */}
          <linearGradient id="robotVisor" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#090d16" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Glowing Cyan Blue Digital Eye */}
          <radialGradient id="cyanEyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#38bdf8" />
            <stop offset="75%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </radialGradient>

          {/* Metallic Joint Accent */}
          <linearGradient id="metalJoint" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>

        {/* 1. Cute Stubby Legs */}
        {isLanded ? (
          // Sitting Legs (Splayed flat forward like in the video sitting on the wooden pedestal)
          <g id="sitting-legs">
            <ellipse cx="54" cy="180" rx="16" ry="7.5" fill="url(#robotWhiteGlow)" stroke="#94a3b8" strokeWidth="1" />
            <ellipse cx="106" cy="180" rx="16" ry="7.5" fill="url(#robotWhiteGlow)" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="48" cy="180" r="4" fill="#475569" />
            <circle cx="112" cy="180" r="4" fill="#475569" />
          </g>
        ) : (
          // Running / Jumping Legs
          <g id="standing-legs">
            <ellipse
              cx="64"
              cy={isJumping ? 172 : 182}
              rx="8.5"
              ry="12"
              fill="url(#robotWhiteGlow)"
              stroke="#94a3b8"
              strokeWidth="1"
              transform={isJumping ? 'rotate(-25 64 172)' : 'rotate(12 64 182)'}
            />
            <ellipse
              cx="96"
              cy={isJumping ? 172 : 182}
              rx="8.5"
              ry="12"
              fill="url(#robotWhiteGlow)"
              stroke="#94a3b8"
              strokeWidth="1"
              transform={isJumping ? 'rotate(25 96 172)' : 'rotate(-12 96 182)'}
            />
          </g>
        )}

        {/* 2. Round White Pear-Shaped Body */}
        <g id="robot-body">
          <ellipse
            cx="80"
            cy={isLanded ? 152 : 144}
            rx={isLanded ? 29 : 25}
            ry={isLanded ? 22 : 25}
            fill="url(#robotWhiteGlow)"
            stroke="#94a3b8"
            strokeWidth="1.2"
          />
          {/* Belly SmartLab Blue Core Accent */}
          <circle
            cx="80"
            cy={isLanded ? 152 : 144}
            r="5"
            fill={isSpotlightOn ? '#38bdf8' : '#64748b'}
            stroke="#0284c7"
            strokeWidth="1"
            className={isSpotlightOn ? 'animate-pulse' : ''}
          />
        </g>

        {/* 3. Articulated Arms */}
        {isJumping ? (
          // Jumping Arms (Hooray! Raised High in the Air)
          <g id="arms-hooray">
            <path d="M 58 135 Q 36 98 30 72" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="9" strokeLinecap="round" />
            <circle cx="28" cy="70" r="6" fill="url(#robotWhiteGlow)" />
            <path d="M 102 135 Q 124 98 130 72" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="9" strokeLinecap="round" />
            <circle cx="132" cy="70" r="6" fill="url(#robotWhiteGlow)" />
          </g>
        ) : isSitting ? (
          // Relaxed / Cheerful Waving Arms
          <g id="arms-wave">
            {/* Left Arm resting beside thigh */}
            <path d="M 54 144 Q 38 148 30 160" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="8" strokeLinecap="round" />
            <circle cx="29" cy="161" r="5" fill="url(#robotWhiteGlow)" />
            {/* Right Arm slightly raised in friendly pose */}
            <path d="M 106 144 Q 124 140 132 128" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="8" strokeLinecap="round" />
            <circle cx="133" cy="126" r="5" fill="url(#robotWhiteGlow)" />
          </g>
        ) : step === 2 ? (
          // Touching letter pose (reaches out left arm to the letter)
          <g id="arms-touch">
            <path d="M 56 140 Q 32 135 22 130" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="8" strokeLinecap="round" />
            <circle cx="20" cy="130" r="5" fill="url(#robotWhiteGlow)" />
            <path d="M 104 140 Q 116 148 118 155" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="8" strokeLinecap="round" />
            <circle cx="119" cy="156" r="5" fill="url(#robotWhiteGlow)" />
          </g>
        ) : (
          // Running Arms
          <g id="arms-running">
            <path d="M 56 140 Q 42 145 38 155" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="8" strokeLinecap="round" />
            <circle cx="37" cy="156" r="5" fill="url(#robotWhiteGlow)" />
            <path d="M 104 140 Q 118 145 124 135" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="8" strokeLinecap="round" />
            <circle cx="125" cy="133" r="5" fill="url(#robotWhiteGlow)" />
          </g>
        )}

        {/* 4. Round Cute Head (Big Helmet Shape) */}
        <g
          id="robot-head"
          transform={
            isLanded
              ? step === 6
                ? 'translate(0, 8) rotate(-4 80 78)' // subtle cute head tilt at climax
                : 'translate(0, 10)'
              : 'translate(0, 0)'
          }
        >
          {/* Head Dome */}
          <ellipse cx="80" cy="78" rx="44" ry="38" fill="url(#robotWhiteGlow)" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Cute Ear Disc Accents */}
          <ellipse cx="36" cy="78" rx="4" ry="10" fill="url(#metalJoint)" stroke="#1e293b" strokeWidth="0.8" />
          <ellipse cx="124" cy="78" rx="4" ry="10" fill="url(#metalJoint)" stroke="#1e293b" strokeWidth="0.8" />

          {/* Black Glass Screen Visor Face */}
          <ellipse cx="80" cy="80" rx="34" ry="24" fill="url(#robotVisor)" stroke="#334155" strokeWidth="1.2" />

          {/* Visor Glass Highlight Reflection */}
          <path d="M 54 68 Q 80 62 106 68" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />

          {/* Cute Digital Eyes on Visor */}
          {step === 5 ? (
            // Curved Half-Moon Smiling Eyes (^ _ ^)
            <g id="smiling-eyes" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M 60 84 Q 68 74 76 84" filter="drop-shadow(0 0 6px #38bdf8)" />
              <path d="M 84 84 Q 92 74 100 84" filter="drop-shadow(0 0 6px #38bdf8)" />
            </g>
          ) : (
            // Round Curious Wide Eyes (Looking straight at audience, glowing bright cyan)
            <g id="curious-eyes">
              <circle cx="67" cy="80" r="7" fill="url(#cyanEyeGlow)" filter="drop-shadow(0 0 6px #38bdf8)" />
              <circle cx="65" cy="78" r="2.5" fill="#ffffff" />
              <circle cx="93" cy="80" r="7" fill="url(#cyanEyeGlow)" filter="drop-shadow(0 0 6px #38bdf8)" />
              <circle cx="91" cy="78" r="2.5" fill="#ffffff" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

interface GrandIntroAnimationProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const GrandIntroAnimation: React.FC<GrandIntroAnimationProps> = ({
  onComplete,
  forceShow = false
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [robotStep, setRobotStep] = useState<number>(0);
  const [isSpotlightOn, setIsSpotlightOn] = useState<boolean>(false);
  const [isScreensaverMode, setIsScreensaverMode] = useState<boolean>(false);

  // Video State & Source (Primary: /intro.mp4 with /assets/intro.mp4 fallback)
  const [videoSrc, setVideoSrc] = useState<string>('/intro.mp4');
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  const lastActivityRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(false);
  isVisibleRef.current = isVisible;

  // Clear running animation timeouts safely
  const clearAnimationTimers = () => {
    activeTimersRef.current.forEach((t) => clearTimeout(t));
    activeTimersRef.current = [];
  };

  const runIntro = (isScreensaver: boolean = false) => {
    setIsScreensaverMode(isScreensaver);
    setIsVisible(true);
    setIsVideoPlaying(true);

    // Play video immediately
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[SmartLab] Autoplay requires muted or user gesture:', err);
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          });
        }
      }
    }, 50);
  };

  // Dismiss intro/screensaver instantly on touch, click or keypress
  const handleDismiss = (e?: React.SyntheticEvent | Event) => {
    if (e && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    clearAnimationTimers();
    setIsVisible(false);
    setIsScreensaverMode(false);
    lastActivityRef.current = Date.now();
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (onComplete) onComplete();
  };

  // 1. Daily intro & Replay event listener
  useEffect(() => {
    // Check if seen in current session
    try {
      const seenSession = sessionStorage.getItem('smartlab_intro_seen');
      if (!forceShow && seenSession === 'true') {
        setIsVisible(false);
        if (onComplete) onComplete();
      } else {
        sessionStorage.setItem('smartlab_intro_seen', 'true');
        runIntro(false);
      }
    } catch {
      runIntro(false);
    }

    const handleReplay = () => {
      runIntro(false);
    };

    window.addEventListener('replay_smartlab_intro', handleReplay as EventListener);

    return () => {
      clearAnimationTimers();
      window.removeEventListener('replay_smartlab_intro', handleReplay as EventListener);
    };
  }, [forceShow, onComplete]);

  // 2. Idle Screensaver Engine (Default: 3 minutes)
  useEffect(() => {
    const getIdleMinutes = (): number => {
      try {
        const saved = localStorage.getItem('smartlab_screensaver_idle_minutes');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          return isNaN(parsed) ? 3 : parsed;
        }
      } catch {
        // fallback
      }
      return 3;
    };

    let idleMinutes = getIdleMinutes();

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointerdown'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetActivity, { passive: true });
    });

    const intervalId = setInterval(() => {
      if (isVisibleRef.current) return;
      if (idleMinutes <= 0) return;

      const idleDurationMs = Date.now() - lastActivityRef.current;
      const thresholdMs = idleMinutes * 60 * 1000;

      if (idleDurationMs >= thresholdMs) {
        runIntro(true);
      }
    }, 2000);

    const handleConfigChange = () => {
      idleMinutes = getIdleMinutes();
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('smartlab_screensaver_config_changed', handleConfigChange);

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, resetActivity);
      });
      window.removeEventListener('smartlab_screensaver_config_changed', handleConfigChange);
    };
  }, []);

  // Global Dismiss Handler: ignores interactive controls marked with data-no-dismiss
  useEffect(() => {
    if (!isVisible) return;

    const onGlobalDismiss = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('[data-no-dismiss="true"]') ||
          target.tagName === 'INPUT' ||
          target.tagName === 'LABEL' ||
          target.tagName === 'BUTTON')
      ) {
        return;
      }
      handleDismiss(e);
    };

    const dismissEvents = ['click', 'keydown'];
    dismissEvents.forEach((evt) => {
      window.addEventListener(evt, onGlobalDismiss);
    });

    return () => {
      dismissEvents.forEach((evt) => {
        window.removeEventListener(evt, onGlobalDismiss);
      });
    };
  }, [isVisible]);

  // Video End Handler
  const handleVideoEnded = () => {
    if (isScreensaverMode) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      handleDismiss();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="smartlab-grand-intro-kling"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070503] text-white overflow-hidden select-none cursor-pointer"
          title="화면을 클릭하면 메인 화면으로 이동합니다"
        >
          {/* Minimal Top-Right Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-5 right-5 z-[10000] p-2 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white cursor-pointer transition-all shadow-xl hover:scale-105"
            title="오프닝 닫기"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Subtle Bottom Ambient Dismiss Hint */}
          <div className="absolute bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none">
            <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-slate-300 flex items-center gap-2 shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>화면을 터치하거나 클릭하면 원래 화면으로 이동합니다</span>
            </div>
          </div>

          {/* Stage Container: Dedicated 16:9 Cinema Player */}
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] border border-amber-950/40 bg-black flex items-center justify-center pointer-events-none">
              {/* Full Uncropped 1280x720 Official MP4 Video */}
              <video
                ref={videoRef}
                autoPlay
                loop={isScreensaverMode}
                playsInline
                muted
                onEnded={handleVideoEnded}
                className="w-full h-full object-contain pointer-events-none"
              >
                <source src="/intro.mp4" type="video/mp4" />
                <source src="/assets/intro.mp4" type="video/mp4" />
              </video>

              {/*
                PRECISE KLING LOGO MASKING:
                Exactly covers only the KlingAI 3.0 logo in the bottom-right corner.
                Leaves 100% of the surrounding video intact.
                Displays SMARTLAB logo on the left, and "SMARTLAB" text on the right.
              */}
              <div
                className="absolute bottom-3.5 right-3.5 sm:bottom-4.5 sm:right-6 z-40 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e0906]/95 backdrop-blur-md border border-white/10 shadow-2xl select-none pointer-events-none"
                style={{
                  boxShadow: '0 4px 18px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}
              >
                {/* SmartLab Icon (Left) */}
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center shadow-xs">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white fill-current">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                {/* SMARTLAB Text (Right) */}
                <span className="text-[11px] sm:text-[12px] font-black tracking-widest text-slate-100 font-sans leading-none drop-shadow-xs">
                  SMARTLAB
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
