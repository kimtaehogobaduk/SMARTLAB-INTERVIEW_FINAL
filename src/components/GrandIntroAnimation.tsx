import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';

export type IntroTheme = 'smartlab_robot';

export const INTRO_THEMES: { id: IntroTheme; name: string; desc: string }[] = [
  {
    id: 'smartlab_robot',
    name: '스마트랩 로봇 오프닝',
    desc: '귀여운 화이트 로봇이 달려와 SMARTLAB 글자에 쿵 착지하며 눈웃음 짓는 시네마틱 오프닝'
  },
];

// IndexedDB Helper for persistent offline video storage
const IDB_NAME = 'smartlab_media_db';
const IDB_STORE = 'videos';
const INTRO_VIDEO_KEY = 'kling_intro_video';

async function getStoredVideo(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const getReq = store.get(INTRO_VIDEO_KEY);
        getReq.onsuccess = () => {
          if (getReq.result instanceof Blob) {
            resolve(URL.createObjectURL(getReq.result));
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ============================================================================
// AUTHENTIC SMARTLAB 3D ROBOT SVG RIG (Accurate Replica of the Video Animation)
// ============================================================================

interface RobotRigProps {
  step: number; // 0: enter, 1: run1, 2: run2, 3: jump high, 4: land squat, 5: sit & look, 6: smile & wave
  isSpotlightOn: boolean;
}

const SmartLabCuteRobot: React.FC<RobotRigProps> = ({ step, isSpotlightOn }) => {
  const isJumping = step === 3;
  const isLanded = step >= 4;
  const isSmiling = step >= 5;

  return (
    <div className="relative flex flex-col items-center justify-end select-none pointer-events-none">
      {/* Ground Shadow underneath Robot */}
      <motion.div
        animate={{
          scaleX: isJumping ? 0.3 : isLanded ? 1.4 : 1,
          scaleY: isJumping ? 0.2 : isLanded ? 1.3 : 1,
          opacity: isJumping ? 0.2 : isLanded ? 0.85 : 0.6
        }}
        transition={{ duration: 0.25 }}
        className="absolute -bottom-2 w-28 h-6 bg-black/80 rounded-full blur-[4px]"
      />

      {/* 3D Cute White Robot Body */}
      <svg
        viewBox="0 0 160 200"
        className="w-28 sm:w-36 md:w-40 h-36 sm:h-44 md:h-52 drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] overflow-visible"
      >
        <defs>
          {/* Smooth White Glossy Ceramic/Plastic Gradient */}
          <radialGradient id="robotWhiteGlow" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f1f5f9" />
            <stop offset="85%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>

          {/* Dark Glass Visor Screen */}
          <linearGradient id="robotVisor" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Glowing Cyan Blue Digital Eye */}
          <radialGradient id="cyanEyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="80%" stopColor="#0284c7" />
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
          // Sitting Legs (Splayed flat forward like in the reference video)
          <g id="sitting-legs">
            <ellipse cx="56" cy="180" rx="16" ry="7" fill="url(#robotWhiteGlow)" stroke="#94a3b8" strokeWidth="1" />
            <ellipse cx="104" cy="180" rx="16" ry="7" fill="url(#robotWhiteGlow)" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="50" cy="180" r="4" fill="#64748b" />
            <circle cx="110" cy="180" r="4" fill="#64748b" />
          </g>
        ) : (
          // Running / Jumping Legs
          <g id="standing-legs">
            <ellipse
              cx="64"
              cy={isJumping ? 172 : 182}
              rx="8"
              ry="12"
              fill="url(#robotWhiteGlow)"
              stroke="#94a3b8"
              strokeWidth="1"
              transform={isJumping ? 'rotate(-25 64 172)' : 'rotate(10 64 182)'}
            />
            <ellipse
              cx="96"
              cy={isJumping ? 172 : 182}
              rx="8"
              ry="12"
              fill="url(#robotWhiteGlow)"
              stroke="#94a3b8"
              strokeWidth="1"
              transform={isJumping ? 'rotate(25 96 172)' : 'rotate(-10 96 182)'}
            />
          </g>
        )}

        {/* 2. Round White Pear-Shaped Body */}
        <g id="robot-body">
          <ellipse
            cx="80"
            cy={isLanded ? 152 : 144}
            rx={isLanded ? 28 : 25}
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
            fill={isSmiling ? '#38bdf8' : '#64748b'}
            stroke="#0284c7"
            strokeWidth="1"
            className={isSmiling ? 'animate-pulse' : ''}
          />
        </g>

        {/* 3. Articulated Arms */}
        {isJumping ? (
          // Jumping Arms (Hooray! Raised High in the Air)
          <g id="arms-hooray">
            <path d="M 58 135 Q 38 100 32 75" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="9" strokeLinecap="round" />
            <circle cx="30" cy="73" r="6" fill="url(#robotWhiteGlow)" />
            <path d="M 102 135 Q 122 100 128 75" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="9" strokeLinecap="round" />
            <circle cx="130" cy="73" r="6" fill="url(#robotWhiteGlow)" />
          </g>
        ) : isSmiling ? (
          // Waving Arms (Friendly Wave from Sitting Position)
          <g id="arms-wave">
            {/* Left Arm resting */}
            <path d="M 56 142 Q 36 138 28 126" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="8" strokeLinecap="round" />
            <circle cx="27" cy="124" r="5.5" fill="url(#robotWhiteGlow)" />
            {/* Right Arm up and waving */}
            <path d="M 104 142 Q 128 132 136 110" fill="none" stroke="url(#robotWhiteGlow)" strokeWidth="8" strokeLinecap="round" />
            <circle cx="137" cy="108" r="5.5" fill="url(#robotWhiteGlow)" />
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
        <g id="robot-head" transform={isLanded ? 'translate(0, 10)' : 'translate(0, 0)'}>
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
          {isSmiling ? (
            // Curved Half-Moon Smiling Eyes (^ _ ^) exactly like in video!
            <g id="smiling-eyes" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M 60 84 Q 68 74 76 84" filter="drop-shadow(0 0 6px #38bdf8)" />
              <path d="M 84 84 Q 92 74 100 84" filter="drop-shadow(0 0 6px #38bdf8)" />
            </g>
          ) : (
            // Round Curious Wide Eyes
            <g id="curious-eyes">
              <circle cx="68" cy="80" r="6.5" fill="url(#cyanEyeGlow)" filter="drop-shadow(0 0 5px #38bdf8)" />
              <circle cx="66" cy="78" r="2.2" fill="#ffffff" />
              <circle cx="92" cy="80" r="6.5" fill="url(#cyanEyeGlow)" filter="drop-shadow(0 0 5px #38bdf8)" />
              <circle cx="90" cy="78" r="2.2" fill="#ffffff" />
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
  const [animStage, setAnimStage] = useState<'intro' | 'action' | 'climax' | 'exit'>('intro');
  const [robotStep, setRobotStep] = useState<number>(0);
  const [isSpotlightOn, setIsSpotlightOn] = useState<boolean>(false);
  const [isScreensaverMode, setIsScreensaverMode] = useState<boolean>(false);

  // Video State & Source
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  const lastActivityRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(false);
  isVisibleRef.current = isVisible;

  // Clear all running animation timeouts safely
  const clearAnimationTimers = () => {
    activeTimersRef.current.forEach((t) => clearTimeout(t));
    activeTimersRef.current = [];
  };

  // Check for uploaded video from IndexedDB or Server /assets/intro.mp4
  const checkVideoSource = async (): Promise<string | null> => {
    const localBlobUrl = await getStoredVideo();
    if (localBlobUrl) return localBlobUrl;

    try {
      const res = await fetch('/api/intro-video/status');
      if (res.ok) {
        const data = await res.json();
        if (data.exists && data.url) {
          return data.url;
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const startAnimationCycle = (isScreensaver: boolean) => {
    clearAnimationTimers();
    setAnimStage('intro');
    setRobotStep(0);
    setIsSpotlightOn(false);

    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setAnimStage('action'), 300));
    timers.push(setTimeout(() => setRobotStep(1), 600));
    timers.push(setTimeout(() => setRobotStep(2), 1100));
    timers.push(setTimeout(() => setRobotStep(3), 1600));
    timers.push(setTimeout(() => setRobotStep(4), 2300));
    timers.push(setTimeout(() => {
      setRobotStep(5);
      setIsSpotlightOn(true);
    }, 2800));
    timers.push(setTimeout(() => {
      setRobotStep(6);
      setAnimStage('climax');
    }, 3300));

    // If not in persistent screensaver mode, automatically exit after animation
    if (!isScreensaver) {
      timers.push(setTimeout(() => {
        handleDismiss();
      }, 5800));
    }

    activeTimersRef.current = timers;
  };

  const runIntro = async (isScreensaver: boolean = false) => {
    setIsScreensaverMode(isScreensaver);
    setIsVisible(true);

    const activeVideo = await checkVideoSource();
    if (activeVideo) {
      setVideoSrc(activeVideo);
      setIsVideoPlaying(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
      return;
    }

    setIsVideoPlaying(false);
    startAnimationCycle(isScreensaver);
  };

  // Dismiss intro/screensaver instantly on touch or click
  const handleDismiss = (e?: React.SyntheticEvent | Event) => {
    if (e && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    clearAnimationTimers();
    setAnimStage('exit');
    setTimeout(() => {
      setIsVisible(false);
      setIsScreensaverMode(false);
      lastActivityRef.current = Date.now();
      if (onComplete) onComplete();
    }, 150);
  };

  // 1. Daily intro & Replay event listener
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastSeen = localStorage.getItem('smartlab_intro_last_date');

      if (!forceShow && lastSeen === today) {
        setIsVisible(false);
        if (onComplete) onComplete();
      } else {
        localStorage.setItem('smartlab_intro_last_date', today);
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

  // 2. Idle Screensaver Engine (Default: 3 minutes, fully controllable via settings)
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
      return 3; // Default: 3 minutes
    };

    let idleMinutes = getIdleMinutes();

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // User activity listeners across all input methods
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointerdown'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetActivity, { passive: true });
    });

    // Check idle time every 2 seconds
    const intervalId = setInterval(() => {
      if (isVisibleRef.current) return; // Already showing
      if (idleMinutes <= 0) return; // 0 means disabled / off

      const idleDurationMs = Date.now() - lastActivityRef.current;
      const thresholdMs = idleMinutes * 60 * 1000;

      if (idleDurationMs >= thresholdMs) {
        runIntro(true); // Launch as screensaver
      }
    }, 2000);

    // Dynamic config change listener from ThemeSelectorModal
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

  // Global Dismiss Handler: Any touch, click, pointer, or key press immediately returns to the main app
  useEffect(() => {
    if (!isVisible) return;

    const onGlobalDismiss = (e: Event) => {
      handleDismiss(e);
    };

    const dismissEvents = ['click', 'touchstart', 'pointerdown', 'keydown'];
    dismissEvents.forEach((evt) => {
      window.addEventListener(evt, onGlobalDismiss, { capture: true });
    });

    return () => {
      dismissEvents.forEach((evt) => {
        window.removeEventListener(evt, onGlobalDismiss, { capture: true });
      });
    };
  }, [isVisible]);

  // Video End Handler: If in screensaver mode, loop smoothly; otherwise close
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
          key="smartlab-grand-intro-robot"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleDismiss}
          onTouchStart={handleDismiss}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070503] text-white overflow-hidden select-none cursor-pointer"
          title="화면을 터치하거나 클릭하면 원래 화면으로 돌아갑니다"
        >
          {/* Subtle Bottom Ambient Dismiss Hint (No skip button) */}
          <div className="absolute bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none">
            <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-slate-300 flex items-center gap-2 shadow-2xl animate-pulse">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>화면 아무 곳이나 터치 또는 클릭하면 원래 화면으로 돌아갑니다</span>
            </div>
          </div>

          {/* =========================================================================
              SMARTLAB ROBOT INTRO (Video with Kling AI Logo Removed / 3D Stage Replica)
             ========================================================================= */}
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            {/* Option A: When Video file is present in server or IndexedDB */}
            {isVideoPlaying && videoSrc ? (
              <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.9)] border border-amber-950/40 bg-black flex items-center justify-center pointer-events-none">
                {/*
                  CRITICAL WATERMARK REMOVAL TECHNIQUE:
                  1. scale-[1.09] slightly overscans and moves the bottom-right corner out of frame.
                  2. -translate-x-[1.2%] -translate-y-[1.6%] pushes the watermark cleanly outside the container.
                */}
                <video
                  ref={videoRef}
                  src={videoSrc}
                  autoPlay
                  loop={isScreensaverMode}
                  playsInline
                  muted
                  onEnded={handleVideoEnded}
                  className="w-full h-full object-cover scale-[1.09] -translate-x-[1.2%] -translate-y-[1.6%]"
                />

                {/*
                  SECONDARY WATERMARK SHIELD:
                  Matches the exact dark walnut wood tone & studio floor shadow of the video.
                  Completely eliminates any residual pixel of the logo.
                */}
                <div className="absolute right-0 bottom-0 w-80 h-24 bg-gradient-to-tl from-[#080503] via-[#140d08]/95 to-transparent pointer-events-none blur-[1px]" />
                <div className="absolute right-4 bottom-3 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-xs border border-white/5 opacity-80">
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-300 font-sans tracking-wider">
                    Sangsan SmartLab
                  </span>
                </div>

                {/* Subtle Studio Vignette Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_65%,rgba(0,0,0,0.7)_100%)]" />
              </div>
            ) : (
              /* Option B: Ultra-High-Fidelity 3D Replica of the Uploaded Kling Video */
              <div className="relative w-full max-w-5xl flex flex-col items-center justify-center">
                {/* Top Warm Studio Ceiling Light Spotlight */}
                <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-48 h-12 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-2 h-24 bg-gradient-to-b from-amber-100 to-transparent opacity-30 pointer-events-none" />

                {/* Left Cool Blue Spotlight on Climax (from video 00:04) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isSpotlightOn ? 0.75 : 0,
                    scale: isSpotlightOn ? 1.2 : 0.8
                  }}
                  transition={{ duration: 0.6 }}
                  className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_top_left,#38bdf8_0%,#0284c7_30%,transparent_70%)] blur-[90px] pointer-events-none"
                />

                {/* Wood Floor Perspective Plane */}
                <div
                  className="relative w-full h-[460px] sm:h-[520px] rounded-3xl overflow-hidden border border-amber-950/50 shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col justify-end"
                  style={{
                    background: 'radial-gradient(ellipse at 50% 30%, #1e130c 0%, #0c0805 70%, #040201 100%)'
                  }}
                >
                  {/* Perspective Wood Planks Surface */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-64 sm:h-72 opacity-90 border-t border-amber-900/40"
                    style={{
                      background:
                        'repeating-linear-gradient(90deg, #1c130d 0px, #2a1c13 40px, #1c130d 80px, #261810 120px, #180f0a 160px)',
                      boxShadow: 'inset 0 30px 60px rgba(0,0,0,0.8)'
                    }}
                  >
                    {/* Floor Plank Separators */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(254,240,138,0.15)_0%,transparent_60%)]" />
                  </div>

                  {/* Stage Center Elements: 3D "SMARTLAB" Letters + Cute Robot */}
                  <div className="relative z-20 flex flex-col items-center justify-end pb-12 sm:pb-16 px-4">
                    {/* Hopping / Jumping Cute White Robot */}
                    <motion.div
                      initial={{ x: 340, y: 10, opacity: 0 }}
                      animate={{
                        x:
                          robotStep === 0 ? 340 :
                          robotStep === 1 ? 220 :
                          robotStep === 2 ? 100 :
                          robotStep === 3 ? 12 : // Jump above 'R'
                          robotStep >= 4 ? 8 : 8, // Sit in front of 'R'
                        y:
                          robotStep === 0 ? 10 :
                          robotStep === 1 ? -15 : // hop 1
                          robotStep === 2 ? -25 : // hop 2
                          robotStep === 3 ? -110 : // HIGH JUMP!
                          robotStep === 4 ? 20 :  // LAND THUD!
                          robotStep >= 5 ? 16 : 10,
                        rotate:
                          robotStep === 1 ? 12 :
                          robotStep === 2 ? -8 :
                          robotStep === 3 ? 4 :
                          0,
                        scaleY:
                          robotStep === 4 ? 0.78 :
                          robotStep >= 5 ? 1.05 : 1,
                        scaleX:
                          robotStep === 4 ? 1.25 :
                          robotStep >= 5 ? 1 : 1,
                        opacity: 1
                      }}
                      transition={{
                        duration:
                          robotStep === 3 ? 0.42 :
                          robotStep === 4 ? 0.22 :
                          0.32,
                        ease: [0.16, 1, 0.3, 1]
                      }}
                      className="relative z-30 mb-[-18px]"
                    >
                      <SmartLabCuteRobot step={robotStep} isSpotlightOn={isSpotlightOn} />
                    </motion.div>

                    {/* Giant 3D White "SMARTLAB" Letters (Exact Font & Style of the Video) */}
                    <div className="flex items-center justify-center tracking-tight sm:tracking-normal select-none relative z-10">
                      {['S', 'M', 'A', 'R', 'T', 'L', 'A', 'B'].map((letter, idx) => {
                        const isR = idx === 3;
                        return (
                          <motion.span
                            key={`smartlab-char-3d-${idx}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{
                              opacity: 1,
                              y:
                                robotStep === 4 && isR ? 12 :
                                robotStep >= 5 && isR ? 6 :
                                0,
                              scaleY: robotStep === 4 && isR ? 0.92 : 1
                            }}
                            transition={{ duration: 0.25 }}
                            className="text-5xl sm:text-7xl md:text-8xl font-black font-sans text-white uppercase inline-block drop-shadow-[0_15px_25px_rgba(0,0,0,0.9)]"
                            style={{
                              textShadow:
                                '0 1px 0 #e2e8f0, 0 2px 0 #cbd5e1, 0 3px 0 #94a3b8, 0 4px 0 #64748b, 0 5px 0 #475569, 0 6px 0 #334155, 0 10px 20px rgba(0,0,0,0.8)'
                            }}
                          >
                            {letter}
                          </motion.span>
                        );
                      })}
                    </div>

                    {/* Korean SmartLab Title Reveal */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{
                        opacity: robotStep >= 5 ? 1 : 0,
                        y: robotStep >= 5 ? 0 : 10
                      }}
                      transition={{ duration: 0.5 }}
                      className="mt-4 flex items-center gap-2 text-center"
                    >
                      <span className="text-lg sm:text-xl font-bold tracking-widest text-sky-400 drop-shadow-[0_2px_10px_rgba(56,189,248,0.7)]">
                        상산고등학교 스마트랩
                      </span>
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
