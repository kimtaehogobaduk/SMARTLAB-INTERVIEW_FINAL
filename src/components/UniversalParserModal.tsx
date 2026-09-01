import React, { useState, useRef, useEffect } from 'react';
import { Candidate, InterviewRoomItem } from '../types';
import {
  Sparkles,
  Calendar,
  Upload,
  FileText,
  CheckCircle,
  ArrowRight,
  X,
  Clock,
  Users,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Plus,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';

interface UniversalParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom?: InterviewRoomItem;
  onCommitCandidates: (candidates: Candidate[]) => Promise<void> | void;
}

const SAMPLE_TEXT_INPUT = `1. 김태호 / AI 엔지니어링 / 202410101 / 010-3829-1928 / LLM 파인튜닝 및 온디바이스 에이전트 개발 프로젝트 리드
2. 이지은 / 풀스택 웹개발 / 202311204 / 010-5821-9921 / React 19, TypeScript, 실시간 웹소켓 기반 대시보드 구축 경험
3. 박준혁 / 시스템 & 백엔드 / 202213309 / 010-7712-4432 / 고성능 분산 캐싱 시스템 및 마이크로서비스 아키텍처 설계
4. 최수민 / 모바일 앱개발 / 202410505 / 010-6623-1190 / Flutter 기반 크로스플랫폼 동아리 커뮤니티 앱 런칭`;

export const UniversalParserModal: React.FC<UniversalParserModalProps> = ({
  isOpen,
  onClose,
  currentRoom,
  onCommitCandidates
}) => {
  const [rawInput, setRawInput] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('14:00');
  const [minutesPerPerson, setMinutesPerPerson] = useState<number>(currentRoom?.minutesPerPerson || 30);
  const [roomName, setRoomName] = useState<string>(currentRoom?.name || currentRoom?.title || 'SmartLab Studio 1');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedCandidates, setParsedCandidates] = useState<any[] | null>(null);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Image Upload State
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImageMime, setSelectedImageMime] = useState<string>('image/png');
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize room name and duration when currentRoom changes
  useEffect(() => {
    if (currentRoom) {
      if (currentRoom.name || currentRoom.title) {
        setRoomName(currentRoom.name || currentRoom.title || 'SmartLab Studio 1');
      }
      if (currentRoom.minutesPerPerson) {
        setMinutesPerPerson(currentRoom.minutesPerPerson);
      }
    }
  }, [currentRoom]);

  if (!isOpen) return null;

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(PNG, JPG, WebP)을 선택해주세요.');
      return;
    }
    setErrorMessage(null);
    setSelectedImageName(file.name);
    setSelectedImageMime(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImageBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = () => {
    setRawInput(SAMPLE_TEXT_INPUT);
    setErrorMessage(null);
  };

  const handleRunParser = async () => {
    if (!rawInput.trim() && !selectedImageBase64) {
      setErrorMessage('파싱할 지원자 텍스트를 입력하거나 일정표/명단 이미지를 첨부해주세요.');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/universal-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawInput: rawInput.trim(),
          imageBase64: selectedImageBase64,
          imageMimeType: selectedImageMime,
          config: {
            panelCount: currentRoom?.panelCount || (currentRoom?.interviewers?.length || 2),
            minutesPerPerson: Number(minutesPerPerson) || 30,
            startTime: startTime || '14:00',
            room: roomName
          }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'AI 파싱 응답 오류');
      }

      const data = await res.json();
      if (data && Array.isArray(data.candidates) && data.candidates.length > 0) {
        setParsedCandidates(data.candidates);
      } else {
        throw new Error('파싱 결과에서 지원자 목록을 찾을 수 없습니다.');
      }
    } catch (e: any) {
      console.error('Parser error:', e);
      setErrorMessage(`AI 분석 중 알림: 로컬 규칙 파서로 전환되었습니다. (${e.message || '네트워크 확인 필요'})`);
      
      // Fallback local heuristic parsing directly in browser if server failed
      const lines = rawInput.split('\n').filter(l => l.trim().length > 0);
      const fallbackList = (lines.length > 0 ? lines : ['지원자 1', '지원자 2']).map((line, idx) => {
        const parts = line.split(/[/,]+/).map(s => s.trim());
        const name = parts[0]?.replace(/^\d+[\.\)]\s*/, '').trim() || `지원자 ${idx + 1}`;
        const track = parts[1] || '일반';
        const startH = 14 + Math.floor(idx * 35 / 60);
        const startM = (idx * 35) % 60;
        const endM = (startM + 30) % 60;
        const endH = startH + Math.floor((startM + 30) / 60);
        const pad = (n: number) => String(n).padStart(2, '0');

        return {
          name,
          track,
          studentId: `2026${String(10000 + idx * 11).padStart(5, '0')}`,
          phone: `010-${String(1000 + idx * 23).padStart(4, '0')}-${String(2000 + idx * 45).padStart(4, '0')}`,
          email: `${name.toLowerCase()}@smartlab.edu`,
          timeslot: {
            start: `${pad(startH)}:${pad(startM)}`,
            end: `${pad(endH)}:${pad(endM)}`,
            room: roomName
          },
          documentsSummary: line,
          fullDocText: line
        };
      });
      setParsedCandidates(fallbackList);
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpdateCandidateRow = (index: number, field: string, value: any) => {
    if (!parsedCandidates) return;
    const updated = [...parsedCandidates];
    if (field.startsWith('timeslot.')) {
      const subField = field.split('.')[1];
      updated[index] = {
        ...updated[index],
        timeslot: { ...updated[index].timeslot, [subField]: value }
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setParsedCandidates(updated);
  };

  const handleDeleteCandidateRow = (index: number) => {
    if (!parsedCandidates) return;
    setParsedCandidates(parsedCandidates.filter((_, i) => i !== index));
  };

  const handleAddCandidateRow = () => {
    const nextIdx = (parsedCandidates?.length || 0) + 1;
    const newRow = {
      name: `지원자 ${nextIdx}`,
      track: '일반',
      studentId: `2026${String(10000 + nextIdx * 15).padStart(5, '0')}`,
      phone: '010-0000-0000',
      email: `applicant${nextIdx}@smartlab.edu`,
      timeslot: {
        start: '16:00',
        end: '16:30',
        room: roomName
      },
      documentsSummary: '수동 추가된 지원자',
      fullDocText: '수동 추가'
    };
    setParsedCandidates([...(parsedCandidates || []), newRow]);
  };

  const handleCommit = async () => {
    if (!parsedCandidates || parsedCandidates.length === 0) return;

    setIsCommitting(true);
    try {
      const interviewerNames = currentRoom?.interviewers && currentRoom.interviewers.length > 0
        ? currentRoom.interviewers.map(i => i.name)
        : ['면접관 1', '면접관 2'];

      const formattedCandidates: Candidate[] = parsedCandidates.map((c: any, idx: number) => ({
        id: `cand-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        roomId: currentRoom?.id,
        name: c.name || `지원자 ${idx + 1}`,
        track: c.track || '일반',
        studentId: c.studentId || `2026${String(idx + 100).padStart(5, '0')}`,
        phone: c.phone || '010-0000-0000',
        email: c.email || `${(c.name || 'user').toLowerCase()}@smartlab.edu`,
        timeslot: c.timeslot || {
          start: startTime,
          end: '14:30',
          room: roomName
        },
        status: 'PENDING',
        interviewers: interviewerNames,
        documents: [
          {
            id: `doc-auto-${Date.now().toString(36)}-${idx}`,
            title: `${c.name || `지원자_${idx + 1}`}_지원서.pdf`,
            type: 'pdf',
            contentSnippet: c.documentsSummary || '파싱된 지원 서류 요약',
            rawText: c.fullDocText || c.documentsSummary || rawInput || '자동 파싱 지원서'
          }
        ],
        sttTranscript: [],
        aiInsights: {
          realtimeSummaries: [],
          tailQuestions: [],
          contradictions: []
        }
      }));

      await onCommitCandidates(formattedCandidates);
      onClose();
    } catch (e: any) {
      alert(`지원자 등록 중 오류 발생: ${e.message || '네트워크 확인 필요'}`);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-linear-to-br from-purple-600 to-indigo-600 rounded-xl shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  만능 데이터 파싱 & 자동 면접 시간표 생성기
                </h2>
                <span className="px-2 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-800/60 rounded text-[10px] font-bold">
                  AI Universal Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                텍스트, 엑셀 표, 지원서 본문, <strong>일정표 캡처 이미지</strong>를 분석해 겹침 없는 순차적 타임슬롯을 자동 배정합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          
          {/* Scheduling Configuration Controls */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>면접 일정 및 타임슬롯 파라미터 설정</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  첫 지원자 시작 시간
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  placeholder="14:00"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  1인당 배정 시간 (분, 정비 5분 포함)
                </label>
                <input
                  type="number"
                  value={minutesPerPerson}
                  onChange={e => setMinutesPerPerson(Number(e.target.value))}
                  min={10}
                  max={120}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  배정 면접실
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  placeholder="SmartLab Studio 1"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Multimodal Image OCR Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>시간표 캡처 또는 지원자 명단 이미지 업로드 (선택)</span>
              </label>
              {selectedImageBase64 && (
                <span className="text-[11px] text-purple-400 font-semibold">Groq Vision AI 활성화됨</span>
              )}
            </div>

            {!selectedImageBase64 ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-purple-500 hover:bg-purple-950/20 rounded-xl p-4 text-center cursor-pointer transition-all space-y-1.5 bg-slate-950/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="font-bold text-slate-200">
                  시간표 캡처 이미지나 명단 사진을 드래그하거나 클릭하여 업로드
                </div>
                <div className="text-[11px] text-slate-400">
                  PNG, JPG, WebP 지원 • 멀티모달 AI가 이미지의 표와 텍스트를 고해상도로 판독합니다
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-purple-950/40 border border-purple-800/60 rounded-xl">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedImageBase64}
                    alt="업로드된 일정표"
                    className="w-16 h-12 object-cover rounded-lg border border-purple-600/50"
                  />
                  <div>
                    <div className="font-bold text-slate-100">{selectedImageName}</div>
                    <div className="text-[11px] text-purple-300">이미지 첨부 완료 (멀티모달 비전 OCR 대기)</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedImageBase64(null);
                    setSelectedImageName('');
                  }}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-colors"
                  title="이미지 제거"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Raw Text Input Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>비정형 지원자 데이터 붙여넣기 (엑셀, 메모, 카카오톡 명단 등)</span>
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/50 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>샘플 데이터 채우기</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder="예시:&#10;1. 홍길동 / AI트랙 / 202410101 / 010-1234-5678 / 컴퓨터비전 프로젝트 리드 경험&#10;2. 김철수 / 웹개발 / 202311202 / 010-9876-5432 / React, Node.js 풀스택 개발"
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden"
            />
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 bg-amber-950/50 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Run Action Button */}
          <div className="flex justify-center pt-1">
            <button
              onClick={handleRunParser}
              disabled={isParsing}
              className="px-8 py-3 bg-linear-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2.5 shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 transition-all cursor-pointer"
            >
              {isParsing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>AI 엔진이 일정표 분석 및 최적 시간표 생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI로 자동 일정표 및 프로필 생성하기</span>
                </>
              )}
            </button>
          </div>

          {/* Parsed Result Preview & Direct Editor */}
          {parsedCandidates && parsedCandidates.length > 0 && (
            <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-100 text-sm">
                    생성된 일정표 미리보기 (총 {parsedCandidates.length}명 배정됨)
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    • 등록 전 이름, 트랙, 시간을 바로 수정할 수 있습니다
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddCandidateRow}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1 border border-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                    <span>지원자 추가</span>
                  </button>

                  <button
                    onClick={handleCommit}
                    disabled={isCommitting}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
                  >
                    {isCommitting ? (
                      <span>저장 중...</span>
                    ) : (
                      <>
                        <span>이 목록으로 확정 및 일괄 등록</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Editable Candidates Table */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {parsedCandidates.map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-purple-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                        {idx + 1}
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">이름</label>
                          <input
                            type="text"
                            value={c.name}
                            onChange={e => handleUpdateCandidateRow(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 font-bold text-xs focus:ring-1 focus:ring-purple-500 outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">분야 / 메모</label>
                          <input
                            type="text"
                            value={c.track}
                            onChange={e => handleUpdateCandidateRow(idx, 'track', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-purple-300 font-semibold text-xs focus:ring-1 focus:ring-purple-500 outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">면접 시간</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={c.timeslot?.start || '14:00'}
                              onChange={e => handleUpdateCandidateRow(idx, 'timeslot.start', e.target.value)}
                              className="w-14 px-1.5 py-1 bg-slate-950 border border-slate-700 rounded text-blue-300 font-mono text-xs text-center focus:ring-1 focus:ring-purple-500 outline-hidden"
                            />
                            <span className="text-slate-500">~</span>
                            <input
                              type="text"
                              value={c.timeslot?.end || '14:30'}
                              onChange={e => handleUpdateCandidateRow(idx, 'timeslot.end', e.target.value)}
                              className="w-14 px-1.5 py-1 bg-slate-950 border border-slate-700 rounded text-blue-300 font-mono text-xs text-center focus:ring-1 focus:ring-purple-500 outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block">연락처</label>
                          <input
                            type="text"
                            value={c.phone || ''}
                            onChange={e => handleUpdateCandidateRow(idx, 'phone', e.target.value)}
                            placeholder="010-0000-0000"
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-300 text-xs font-mono focus:ring-1 focus:ring-purple-500 outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-[11px] text-slate-400 font-mono sm:hidden truncate max-w-[200px]">
                        {c.documentsSummary}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCandidateRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                        title="지원자 행 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
