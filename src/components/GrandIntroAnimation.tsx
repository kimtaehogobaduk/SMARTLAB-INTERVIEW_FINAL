import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { SmartLabLogo } from './SmartLabLogo';

interface GrandIntroAnimationProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const GrandIntroAnimation: React.FC<GrandIntroAnimationProps> = ({
  onComplete,
  forceShow = false
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isScreensaverMode, setIsScreensaverMode] = useState<boolean>(false);
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

    // Play video smoothly
    const playTimer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[SmartLab] Autoplay requires user interaction or muted:', err);
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          });
        }
      }
    }, 80);
    activeTimersRef.current.push(playTimer);
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

          {/* Top Authentic SmartLab Branding in Opening Screen */}
          <div className="absolute top-5 left-6 z-50 pointer-events-none hidden sm:flex items-center gap-3">
            <SmartLabLogo size="sm" showText={true} />
            <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
              상산고 No.1 코딩 동아리
            </span>
          </div>

          {/* Stage Container: Dedicated 16:9 Cinema Player */}
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] border border-amber-950/40 bg-black flex items-center justify-center pointer-events-none">
              
              {/* Full Uncropped Official Video */}
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
                AUTHENTIC SMARTLAB LOGO WATERMARK:
                Displays the authentic SmartLab official logo provided by the user.
              */}
              <div
                className="absolute bottom-3.5 right-3.5 sm:bottom-4.5 sm:right-6 z-40 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 shadow-2xl select-none pointer-events-none text-white"
                style={{
                  boxShadow: '0 4px 20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}
              >
                <SmartLabLogo size="xs" showText={true} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
