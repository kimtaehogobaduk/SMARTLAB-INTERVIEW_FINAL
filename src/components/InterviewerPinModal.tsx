import React, { useState, useEffect, useRef } from 'react';
import { InterviewerUser } from '../types';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Delete,
  X,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface InterviewerPinModalProps {
  interviewer: InterviewerUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (interviewer: InterviewerUser) => void;
}

export function InterviewerPinModal({
  interviewer,
  isOpen,
  onClose,
  onSuccess
}: InterviewerPinModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [isPinSet, setIsPinSet] = useState<boolean>(false);
  const [mode, setMode] = useState<'SETUP' | 'VERIFY'>('VERIFY');

  // Input states
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [activeStep, setActiveStep] = useState<'PIN' | 'CONFIRM'>('PIN');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showMasked, setShowMasked] = useState<boolean>(true);
  const [shake, setShake] = useState<boolean>(false);
  const [successAnim, setSuccessAnim] = useState<boolean>(false);

  // Focus ref for invisible numeric input
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Check pin status on open
  useEffect(() => {
    if (!isOpen || !interviewer) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg('');
    setPin('');
    setConfirmPin('');
    setActiveStep('PIN');
    setSuccessAnim(false);

    const checkPinStatus = async () => {
      try {
        const query = new URLSearchParams({
          name: interviewer.name || '',
          id: interviewer.id || ''
        });
        const res = await fetch(`/api/interviewers/pin-status?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsPinSet(Boolean(data.isPinSet));
            setMode(data.isPinSet ? 'VERIFY' : 'SETUP');
          }
        } else {
          // Fallback to local check
          const localStored = localStorage.getItem(`smartlab_pin_${interviewer.id || interviewer.name}`);
          if (isMounted) {
            setIsPinSet(Boolean(localStored));
            setMode(localStored ? 'VERIFY' : 'SETUP');
          }
        }
      } catch (e) {
        if (isMounted) {
          const localStored = localStorage.getItem(`smartlab_pin_${interviewer.id || interviewer.name}`);
          setIsPinSet(Boolean(localStored));
          setMode(localStored ? 'VERIFY' : 'SETUP');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setTimeout(() => {
            hiddenInputRef.current?.focus();
          }, 100);
        }
      }
    };

    checkPinStatus();

    return () => {
      isMounted = false;
    };
  }, [isOpen, interviewer]);

  if (!isOpen || !interviewer) return null;

  const handleDigitPress = (digit: string) => {
    if (isSubmitting || successAnim) return;
    setErrorMsg('');

    if (mode === 'VERIFY') {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === 4) {
          handleVerifyPin(newPin);
        }
      }
    } else {
      // SETUP mode
      if (activeStep === 'PIN') {
        if (pin.length < 4) {
          const newPin = pin + digit;
          setPin(newPin);
          if (newPin.length === 4) {
            setActiveStep('CONFIRM');
          }
        }
      } else {
        if (confirmPin.length < 4) {
          const newConfirm = confirmPin + digit;
          setConfirmPin(newConfirm);
          if (newConfirm.length === 4) {
            handleSaveNewPin(pin, newConfirm);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (isSubmitting || successAnim) return;
    setErrorMsg('');

    if (mode === 'VERIFY') {
      setPin(prev => prev.slice(0, -1));
    } else {
      if (activeStep === 'CONFIRM') {
        if (confirmPin.length > 0) {
          setConfirmPin(prev => prev.slice(0, -1));
        } else {
          setActiveStep('PIN');
          setPin(prev => prev.slice(0, -1));
        }
      } else {
        setPin(prev => prev.slice(0, -1));
      }
    }
  };

  const handleClear = () => {
    if (isSubmitting || successAnim) return;
    setErrorMsg('');
    setPin('');
    setConfirmPin('');
    setActiveStep('PIN');
    hiddenInputRef.current?.focus();
  };

  const triggerErrorShake = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Verify PIN against backend
  const handleVerifyPin = async (pinToTest: string) => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/interviewers/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewerName: interviewer.name,
          interviewerId: interviewer.id,
          pin: pinToTest
        })
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setSuccessAnim(true);
        // Save local session backup
        localStorage.setItem(`smartlab_pin_${interviewer.id || interviewer.name}`, pinToTest);
        setTimeout(() => {
          onSuccess({ ...interviewer, pinCode: pinToTest, isPinSet: true });
        }, 500);
      } else {
        // Check local fallback
        const localPin = localStorage.getItem(`smartlab_pin_${interviewer.id || interviewer.name}`);
        if (localPin && localPin === pinToTest) {
          setSuccessAnim(true);
          setTimeout(() => {
            onSuccess({ ...interviewer, pinCode: pinToTest, isPinSet: true });
          }, 500);
        } else {
          triggerErrorShake(data.error || '비밀번호가 일치하지 않습니다. (4자리 숫자)');
          setPin('');
        }
      }
    } catch (e: any) {
      // Local fallback in case of network issue
      const localPin = localStorage.getItem(`smartlab_pin_${interviewer.id || interviewer.name}`);
      if (localPin && localPin === pinToTest) {
        setSuccessAnim(true);
        setTimeout(() => {
          onSuccess({ ...interviewer, pinCode: pinToTest, isPinSet: true });
        }, 500);
      } else {
        triggerErrorShake('비밀번호 검증 중 오류가 발생했습니다. 다시 시도해주세요.');
        setPin('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save new PIN to backend
  const handleSaveNewPin = async (firstPin: string, secondPin: string) => {
    if (firstPin !== secondPin) {
      triggerErrorShake('비밀번호 확인이 일치하지 않습니다. 다시 입력해주세요.');
      setConfirmPin('');
      setActiveStep('CONFIRM');
      return;
    }

    if (!/^\d{4}$/.test(firstPin)) {
      triggerErrorShake('비밀번호는 반드시 4자리 숫자여야 합니다.');
      setPin('');
      setConfirmPin('');
      setActiveStep('PIN');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/interviewers/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewerName: interviewer.name,
          interviewerId: interviewer.id,
          pin: firstPin
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessAnim(true);
        localStorage.setItem(`smartlab_pin_${interviewer.id || interviewer.name}`, firstPin);
        setTimeout(() => {
          onSuccess({ ...interviewer, pinCode: firstPin, isPinSet: true });
        }, 600);
      } else {
        // Fallback local save
        localStorage.setItem(`smartlab_pin_${interviewer.id || interviewer.name}`, firstPin);
        setSuccessAnim(true);
        setTimeout(() => {
          onSuccess({ ...interviewer, pinCode: firstPin, isPinSet: true });
        }, 600);
      }
    } catch (e) {
      // Local fallback
      localStorage.setItem(`smartlab_pin_${interviewer.id || interviewer.name}`, firstPin);
      setSuccessAnim(true);
      setTimeout(() => {
        onSuccess({ ...interviewer, pinCode: firstPin, isPinSet: true });
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard support for physical numbers & backspace
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handleDigitPress(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const currentDisplayPin = mode === 'VERIFY' ? pin : activeStep === 'PIN' ? pin : confirmPin;

  return (
    <div
      id="interviewer-pin-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="interviewer-pin-modal-card"
        className={`relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-transform duration-200 ${
          shake ? 'animate-shake' : ''
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Invisible input to capture physical keyboard / mobile virtual keyboard events */}
        <input
          ref={hiddenInputRef}
          type="tel"
          pattern="[0-9]*"
          inputMode="numeric"
          className="absolute -top-40 opacity-0 pointer-events-none"
          value={currentDisplayPin}
          onChange={() => {}}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-blue-50/70 to-transparent dark:from-blue-950/20 dark:to-transparent border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              {mode === 'SETUP' ? (
                <KeyRound className="w-6 h-6 animate-pulse" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {mode === 'SETUP' ? '최초 1회 설정' : '면접관 본인 확인'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">4자리 PIN</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {mode === 'SETUP' ? '4자리 숫자 비밀번호 설정' : '4자리 비밀번호 입력'}
              </h2>
            </div>
          </div>

          <button
            id="close-pin-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
              <span className="text-sm font-medium">면접관 보안 상태를 확인하는 중...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Interviewer Profile Badge */}
              <div className="w-full mb-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {interviewer.name ? interviewer.name.replace(/[^가-힣a-zA-Z]/g, '').slice(0, 2) : '면접'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {interviewer.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {interviewer.trackExpertise || 'SmartLab 면접 심사위원'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {mode === 'SETUP' ? '새 비밀번호 등록' : '등록된 PIN 인증'}
                  </span>
                </div>
              </div>

              {/* Instructional Prompt */}
              <div className="text-center mb-6">
                {mode === 'SETUP' ? (
                  activeStep === 'PIN' ? (
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                        앞으로 로그인할 때 사용할 <span className="text-blue-600 dark:text-blue-400 font-bold">4자리 숫자 비밀번호</span>를 설정해주세요.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        한 번 설정하면 다음 입장부터는 이 비밀번호로 바로 로그인됩니다.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                        확인을 위해 설정하신 <span className="text-blue-600 dark:text-blue-400 font-bold">비밀번호 4자리</span>를 한 번 더 입력해주세요.
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center justify-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> 1단계 입력 완료! 확인 입력 진행 중
                      </p>
                    </div>
                  )
                ) : (
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      등록된 <span className="text-blue-600 dark:text-blue-400 font-bold">4자리 숫자 비밀번호</span>를 입력해주세요.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      키패드 또는 키보드 숫자로 입력하실 수 있습니다.
                    </p>
                  </div>
                )}
              </div>

              {/* 4 Digit Boxes Display */}
              <div
                id="pin-boxes-container"
                className="flex items-center justify-center gap-3.5 mb-6 cursor-pointer"
                onClick={() => hiddenInputRef.current?.focus()}
              >
                {[0, 1, 2, 3].map(idx => {
                  const digit = currentDisplayPin[idx];
                  const isFilled = Boolean(digit);
                  const isCurrent = currentDisplayPin.length === idx;

                  return (
                    <div
                      key={idx}
                      className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-150 shadow-sm ${
                        successAnim
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-500'
                          : errorMsg
                          ? 'border-rose-500 bg-rose-50/50 text-rose-600 dark:bg-rose-950/30'
                          : isFilled
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 dark:border-blue-500'
                          : isCurrent
                          ? 'border-blue-400 bg-white dark:bg-slate-800 ring-4 ring-blue-500/10 scale-105'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400'
                      }`}
                    >
                      {successAnim ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-500 animate-bounce" />
                      ) : isFilled ? (
                        showMasked ? (
                          <div className="w-3.5 h-3.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                        ) : (
                          digit
                        )
                      ) : isCurrent ? (
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full animate-pulse" />
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-lg">•</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mask / Unmask & Helper info */}
              <div className="w-full flex items-center justify-between mb-4 px-1">
                <button
                  type="button"
                  onClick={() => setShowMasked(!showMasked)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                >
                  {showMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showMasked ? '비밀번호 보기' : '비밀번호 가리기'}</span>
                </button>

                {mode === 'SETUP' && activeStep === 'CONFIRM' && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmPin('');
                      setActiveStep('PIN');
                      setPin('');
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    다시 처음부터 입력
                  </button>
                )}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="w-full mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Success Notification */}
              {successAnim && (
                <div className="w-full mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{mode === 'SETUP' ? '비밀번호 설정 완료! 면접실로 입장합니다.' : '인증 성공! 면접실로 입장합니다.'}</span>
                </div>
              )}

              {/* Custom Numeric Keypad (Optimized for Touch and Fast Clicks) */}
              <div className="w-full grid grid-cols-3 gap-2.5 mb-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    id={`pin-key-${num}`}
                    type="button"
                    onClick={() => handleDigitPress(num)}
                    disabled={isSubmitting || successAnim}
                    className="h-13 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-blue-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:active:bg-blue-900/50 border border-slate-200/80 dark:border-slate-700/60 text-xl font-bold text-slate-800 dark:text-slate-100 transition shadow-xs flex items-center justify-center select-none active:scale-95"
                  >
                    {num}
                  </button>
                ))}

                {/* Bottom row: Clear, 0, Backspace */}
                <button
                  id="pin-key-clear"
                  type="button"
                  onClick={handleClear}
                  disabled={isSubmitting || successAnim || currentDisplayPin.length === 0}
                  className="h-13 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold text-slate-600 dark:text-slate-300 transition flex items-center justify-center select-none active:scale-95 disabled:opacity-40"
                >
                  전체 지움
                </button>

                <button
                  id="pin-key-0"
                  type="button"
                  onClick={() => handleDigitPress('0')}
                  disabled={isSubmitting || successAnim}
                  className="h-13 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-blue-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 dark:active:bg-blue-900/50 border border-slate-200/80 dark:border-slate-700/60 text-xl font-bold text-slate-800 dark:text-slate-100 transition shadow-xs flex items-center justify-center select-none active:scale-95"
                >
                  0
                </button>

                <button
                  id="pin-key-backspace"
                  type="button"
                  onClick={handleBackspace}
                  disabled={isSubmitting || successAnim || currentDisplayPin.length === 0}
                  className="h-13 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 transition flex items-center justify-center select-none active:scale-95 disabled:opacity-40"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex items-center gap-3">
                <button
                  id="cancel-pin-auth-btn"
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  다른 면접관 선택
                </button>

                {mode === 'SETUP' && activeStep === 'PIN' && pin.length === 4 ? (
                  <button
                    id="next-step-confirm-btn"
                    type="button"
                    onClick={() => setActiveStep('CONFIRM')}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
                  >
                    <span>확인 입력하기</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              {/* Footer Guide Note */}
              <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-center">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                  <HelpCircle className="w-3 h-3 shrink-0" />
                  <span>비밀번호를 잊으셨을 경우 총괄 관리자(Admin)에게 초기화를 요청하세요.</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
