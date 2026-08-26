import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PanelVisibility,
  LayoutStructure,
  PanelId,
  Candidate,
  Evaluation,
  PlatformSettings,
  InterviewerPresence,
  InterviewerChatMessage
} from '../types';
import { STTConsole } from './STTConsole';
import { DocumentViewer } from './DocumentViewer';
import { EvaluationForm } from './EvaluationForm';
import { ObserverDashboard } from './ObserverDashboard';
import { InterviewerChat } from './InterviewerChat';
import {
  Mic,
  FileText,
  ClipboardCheck,
  MessageSquare,
  Maximize2,
  Minimize2,
  X,
  SlidersHorizontal
} from 'lucide-react';

interface FlexibleWorkspaceProps {
  panels: PanelVisibility;
  onTogglePanel: (key: keyof PanelVisibility) => void;
  layoutStructure: LayoutStructure;
  onChangeLayoutStructure: (structure: LayoutStructure) => void;
  candidate: Candidate;
  myEvaluation?: Evaluation;
  peerEvaluations: Evaluation[];
  isObserverMode: boolean;
  isBlind: boolean;
  isFormLocked: boolean;
  settings?: PlatformSettings;
  currentUser: { id: string; name: string; role: string };
  livePresences: InterviewerPresence[];
  isAiLoading: boolean;
  onSaveEvaluation: (scores: any, comments: any, bonuses?: any) => Promise<void>;
  onSendMessage: (msg: string) => Promise<void>;
  onUseTailQuestion: (q: string) => void;
  onAddDocument: (doc: any) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  onCloseChatPanel: () => void;
  onPopoutChat: () => void;
  onUnreadChatCountChange?: (count: number) => void;
  onNewMessageToast?: (msg: InterviewerChatMessage) => void;
}

export const FlexibleWorkspace: React.FC<FlexibleWorkspaceProps> = ({
  panels,
  onTogglePanel,
  layoutStructure,
  onChangeLayoutStructure,
  candidate,
  myEvaluation,
  peerEvaluations,
  isObserverMode,
  isBlind,
  isFormLocked,
  settings,
  currentUser,
  livePresences,
  isAiLoading,
  onSaveEvaluation,
  onSendMessage,
  onUseTailQuestion,
  onAddDocument,
  onDeleteDocument,
  onCloseChatPanel,
  onPopoutChat,
  onUnreadChatCountChange,
  onNewMessageToast
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen maximized panel ID (null if normal grid)
  const [maximizedPanel, setMaximizedPanel] = useState<PanelId | null>(null);

  // Active panel slots mapping
  const activePanels: PanelId[] = [];
  if (panels.showSTT) activePanels.push('STT');
  if (panels.showDocs) activePanels.push('DOCS');
  if (panels.showEval) activePanels.push('EVAL');
  if (panels.showChat) activePanels.push('CHAT');

  // Multi-column width percentages (sum to 100%)
  const [colPercents, setColPercents] = useState<number[]>([30, 40, 30]);

  // Top/Bottom row split height percentage (e.g. 50% top, 50% bottom)
  const [rowHeightPercent, setRowHeightPercent] = useState<number>(50);

  // Sub-row column splits
  const [topColPercents, setTopColPercents] = useState<number[]>([50, 50]);
  const [bottomColPercents, setBottomColPercents] = useState<number[]>([50, 50]);
  const [leftRightColPercents, setLeftRightColPercents] = useState<number[]>([50, 50]);
  const [rightStackRowPercent, setRightStackRowPercent] = useState<number>(50);

  // Re-adjust default column widths whenever active panel count changes
  useEffect(() => {
    const count = activePanels.length;
    if (count === 0) return;
    if (count === 1) setColPercents([100]);
    else if (count === 2) setColPercents([50, 50]);
    else if (count === 3) setColPercents([28, 42, 30]);
    else if (count === 4) setColPercents([24, 30, 26, 20]);
  }, [activePanels.length]);

  // Reset ratios to equal
  const resetEqualProportions = () => {
    const count = activePanels.length;
    if (count > 0) {
      const equal = 100 / count;
      setColPercents(activePanels.map(() => equal));
    }
    setRowHeightPercent(50);
    setTopColPercents([50, 50]);
    setBottomColPercents([50, 50]);
    setLeftRightColPercents([50, 50]);
    setRightStackRowPercent(50);
  };

  // Dragging state ref
  const dragInfoRef = useRef<{
    type: 'COLUMNS' | 'ROW_SPLIT' | 'TOP_COLS' | 'BOTTOM_COLS' | 'LEFT_RIGHT' | 'RIGHT_STACK';
    index?: number;
    startX: number;
    startY: number;
    initialPercents: number[];
    initialHeightPercent?: number;
  } | null>(null);

  // Start Column Drag
  const handleStartColDrag = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragInfoRef.current = {
      type: 'COLUMNS',
      index,
      startX: e.clientX,
      startY: e.clientY,
      initialPercents: [...colPercents]
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Start Row Drag
  const handleStartRowDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragInfoRef.current = {
      type: 'ROW_SPLIT',
      startX: e.clientX,
      startY: e.clientY,
      initialPercents: [],
      initialHeightPercent: rowHeightPercent
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Start Top Row Col Drag
  const handleStartTopColDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragInfoRef.current = {
      type: 'TOP_COLS',
      startX: e.clientX,
      startY: e.clientY,
      initialPercents: [...topColPercents]
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Start Bottom Row Col Drag
  const handleStartBottomColDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragInfoRef.current = {
      type: 'BOTTOM_COLS',
      startX: e.clientX,
      startY: e.clientY,
      initialPercents: [...bottomColPercents]
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Start Left/Right Split Drag
  const handleStartLeftRightDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragInfoRef.current = {
      type: 'LEFT_RIGHT',
      startX: e.clientX,
      startY: e.clientY,
      initialPercents: [...leftRightColPercents]
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Start Right Stack Row Drag
  const handleStartRightStackRowDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragInfoRef.current = {
      type: 'RIGHT_STACK',
      startX: e.clientX,
      startY: e.clientY,
      initialPercents: [],
      initialHeightPercent: rightStackRowPercent
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Global mousemove handler
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragInfoRef.current || !containerRef.current) return;
    const { type, index, startX, startY, initialPercents, initialHeightPercent } = dragInfoRef.current;
    const rect = containerRef.current.getBoundingClientRect();

    if (type === 'COLUMNS' && typeof index === 'number') {
      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX / rect.width) * 100;

      const leftMin = 15;
      const rightMin = 15;

      const currentLeft = initialPercents[index];
      const currentRight = initialPercents[index + 1];
      const totalPair = currentLeft + currentRight;

      let newLeft = Math.max(leftMin, Math.min(totalPair - rightMin, currentLeft + deltaPercent));
      let newRight = totalPair - newLeft;

      setColPercents((prev) => {
        const next = [...prev];
        next[index] = newLeft;
        next[index + 1] = newRight;
        return next;
      });
    } else if (type === 'ROW_SPLIT' && typeof initialHeightPercent === 'number') {
      const deltaY = e.clientY - startY;
      const deltaPercent = (deltaY / rect.height) * 100;
      const newHeight = Math.max(20, Math.min(80, initialHeightPercent + deltaPercent));
      setRowHeightPercent(newHeight);
    } else if (type === 'TOP_COLS') {
      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX / rect.width) * 100;
      const newLeft = Math.max(20, Math.min(80, initialPercents[0] + deltaPercent));
      setTopColPercents([newLeft, 100 - newLeft]);
    } else if (type === 'BOTTOM_COLS') {
      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX / rect.width) * 100;
      const newLeft = Math.max(20, Math.min(80, initialPercents[0] + deltaPercent));
      setBottomColPercents([newLeft, 100 - newLeft]);
    } else if (type === 'LEFT_RIGHT') {
      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX / rect.width) * 100;
      const newLeft = Math.max(20, Math.min(80, initialPercents[0] + deltaPercent));
      setLeftRightColPercents([newLeft, 100 - newLeft]);
    } else if (type === 'RIGHT_STACK' && typeof initialHeightPercent === 'number') {
      const deltaY = e.clientY - startY;
      const deltaPercent = (deltaY / rect.height) * 100;
      const newHeight = Math.max(20, Math.min(80, initialHeightPercent + deltaPercent));
      setRightStackRowPercent(newHeight);
    }
  }, []);

  const onMouseUp = useCallback(() => {
    dragInfoRef.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // Render individual Panel Content
  const renderPanel = (panelId: PanelId) => {
    switch (panelId) {
      case 'STT':
        return (
          <STTConsole
            transcript={candidate.sttTranscript || []}
            realtimeSummaries={candidate.aiInsights?.realtimeSummaries || []}
            tailQuestions={candidate.aiInsights?.tailQuestions || []}
            customQuestions={candidate.aiInsights?.customQuestions || []}
            contradictions={candidate.aiInsights?.contradictions || []}
            candidateId={candidate.id}
            candidateName={candidate.name}
            candidateTrack={candidate.track}
            roomId={candidate.roomId}
            currentUserName={currentUser.name}
            currentUserId={currentUser.id}
            settings={settings}
            onSendMessage={(msg, triggerAI) => onSendMessage(msg.text)}
            onUseTailQuestion={(q) => onUseTailQuestion(typeof q === 'string' ? q : q.question)}
            isLoadingAI={isAiLoading}
          />
        );
      case 'DOCS':
        return (
          <DocumentViewer
            documents={candidate.documents || []}
            candidateName={candidate.name}
            onAddDocument={onAddDocument}
            onDeleteDocument={onDeleteDocument}
          />
        );
      case 'EVAL':
        return isObserverMode ? (
          <ObserverDashboard
            candidate={candidate}
            peerEvaluations={peerEvaluations}
            settings={
              settings || {
                isCriteriaConfirmed: false,
                criteria: [],
                scoringFormula: 'AVERAGE',
                passThresholdScore: 70
              }
            }
          />
        ) : myEvaluation ? (
          <EvaluationForm
            evaluation={myEvaluation}
            peerEvaluations={peerEvaluations}
            candidateStatus={candidate.status}
            isBlind={isBlind}
            isLocked={isFormLocked}
            settings={settings}
            onSaveEvaluation={onSaveEvaluation}
            currentInterviewerName={currentUser.name}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            평가표 로딩 중...
          </div>
        );
      case 'CHAT':
        return (
          <InterviewerChat
            currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
            roomId={candidate.roomId || 'room-1'}
            roomName={candidate.timeslot?.room || 'SmartLab 면접 평가실'}
            candidateId={candidate.id}
            candidateName={candidate.name}
            presences={livePresences}
            isOpen={true}
            onClose={onCloseChatPanel}
            isFloating={false}
            onToggleFloating={onPopoutChat}
            onUnreadCountChange={onUnreadChatCountChange}
            onNewMessageToast={onNewMessageToast}
          />
        );
    }
  };

  // Get Panel Header Info
  const getPanelInfo = (id: PanelId) => {
    switch (id) {
      case 'STT':
        return { title: '실시간 음성 STT & AI 인사이트', icon: Mic, color: 'text-indigo-600' };
      case 'DOCS':
        return { title: '지원자 제출 서류 열람기', icon: FileText, color: 'text-slate-700' };
      case 'EVAL':
        return {
          title: isObserverMode ? '관전 심사위원 실시간 대시보드' : '역량 평가표 작성',
          icon: ClipboardCheck,
          color: 'text-emerald-600'
        };
      case 'CHAT':
        return { title: '면접관 실시간 대화창', icon: MessageSquare, color: 'text-indigo-600' };
    }
  };

  // Wrap panel with mini control header for slot
  const wrapPanelWithSlotHeader = (panelId: PanelId, canClose = true) => {
    const isMax = maximizedPanel === panelId;
    const info = getPanelInfo(panelId);
    const Icon = info.icon;

    return (
      <div className="h-full w-full flex flex-col overflow-hidden bg-white border-slate-200">
        {/* Subtle Slot Top Bar with resize and maximize controls */}
        <div className="h-7 px-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs select-none shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon className={`w-3.5 h-3.5 ${info.color}`} />
            <span className="font-bold text-[11px] text-slate-700 truncate">{info.title}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Maximize / Restore */}
            <button
              type="button"
              onClick={() => setMaximizedPanel(isMax ? null : panelId)}
              className="p-1 hover:bg-slate-200/80 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title={isMax ? '원래 레이아웃으로 복원' : '전체 화면으로 확대'}
            >
              {isMax ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>

            {/* Close / Hide Panel */}
            {canClose && (
              <button
                type="button"
                onClick={() => {
                  if (panelId === 'STT') onTogglePanel('showSTT');
                  if (panelId === 'DOCS') onTogglePanel('showDocs');
                  if (panelId === 'EVAL') onTogglePanel('showEval');
                  if (panelId === 'CHAT') onCloseChatPanel();
                }}
                className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                title="패널 숨기기"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">{renderPanel(panelId)}</div>
      </div>
    );
  };

  // If a panel is maximized, show only that panel
  if (maximizedPanel) {
    return (
      <main ref={containerRef} className="flex-1 h-full w-full bg-slate-100 overflow-hidden relative">
        {wrapPanelWithSlotHeader(maximizedPanel)}
      </main>
    );
  }

  // 0 Active Panels Placeholder
  if (activePanels.length === 0) {
    return (
      <main ref={containerRef} className="flex-1 h-full w-full flex items-center justify-center bg-slate-900 text-slate-400 p-8 text-center select-none">
        <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700/80 max-w-md shadow-2xl space-y-3 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-400/20">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">모든 화면 패널이 숨겨졌습니다</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            상단 헤더의 <strong>[STT 콘솔]</strong>, <strong>[지원 서류]</strong>, <strong>[{isObserverMode ? '관전 현황' : '평가표'}]</strong>, <strong>[면접관 대화]</strong> 버튼을 눌러 원하는 화면을 자유롭게 배치하세요.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => {
                onTogglePanel('showSTT');
                onTogglePanel('showDocs');
                onTogglePanel('showEval');
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              기본 3분할 화면 복구
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Single panel layout
  if (activePanels.length === 1) {
    return (
      <main ref={containerRef} className="flex-1 h-full w-full bg-slate-100 overflow-hidden">
        {wrapPanelWithSlotHeader(activePanels[0], false)}
      </main>
    );
  }

  // =========================================================================
  // TOPOLOGY 2: TOP ONE / BOTTOM TWO (T-Shape Split)
  // =========================================================================
  if (layoutStructure === 'TOP_ONE_BOTTOM_TWO' && activePanels.length >= 3) {
    const topPanel = activePanels[0];
    const bottomLeftPanel = activePanels[1];
    const bottomRightPanel = activePanels[2];

    return (
      <main ref={containerRef} className="flex-1 h-full w-full flex flex-col bg-slate-200 overflow-hidden select-none">
        {/* Top Row (Single Wide Panel) */}
        <div style={{ height: `${rowHeightPercent}%` }} className="w-full min-h-[120px] overflow-hidden">
          {wrapPanelWithSlotHeader(topPanel)}
        </div>

        {/* Horizontal Row Resizer (Row-Resize) */}
        <div
          onMouseDown={handleStartRowDrag}
          onDoubleClick={resetEqualProportions}
          className="h-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-row-resize flex items-center justify-center transition-colors group relative z-10"
          title="상하 크기 조절 (더블클릭: 균등 초기화)"
        >
          <div className="w-8 h-1 rounded-full bg-slate-400 group-hover:bg-white" />
        </div>

        {/* Bottom Row (Two Columns) */}
        <div style={{ height: `${100 - rowHeightPercent}%` }} className="w-full flex-1 flex overflow-hidden min-h-[120px]">
          <div style={{ width: `${bottomColPercents[0]}%` }} className="h-full min-w-[150px] overflow-hidden">
            {wrapPanelWithSlotHeader(bottomLeftPanel)}
          </div>

          {/* Bottom Col Resizer */}
          <div
            onMouseDown={handleStartBottomColDrag}
            onDoubleClick={resetEqualProportions}
            className="w-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-col-resize flex items-center justify-center transition-colors group relative z-10"
            title="하단 좌우 크기 조절 (더블클릭: 50:50)"
          >
            <div className="h-8 w-1 rounded-full bg-slate-400 group-hover:bg-white" />
          </div>

          <div style={{ width: `${bottomColPercents[1]}%` }} className="h-full min-w-[150px] overflow-hidden">
            {wrapPanelWithSlotHeader(bottomRightPanel)}
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // TOPOLOGY 3: TOP TWO / BOTTOM ONE (Inverse T-Shape Split)
  // =========================================================================
  if (layoutStructure === 'TOP_TWO_BOTTOM_ONE' && activePanels.length >= 3) {
    const topLeftPanel = activePanels[0];
    const topRightPanel = activePanels[1];
    const bottomPanel = activePanels[2];

    return (
      <main ref={containerRef} className="flex-1 h-full w-full flex flex-col bg-slate-200 overflow-hidden select-none">
        {/* Top Row (Two Columns) */}
        <div style={{ height: `${rowHeightPercent}%` }} className="w-full flex overflow-hidden min-h-[120px]">
          <div style={{ width: `${topColPercents[0]}%` }} className="h-full min-w-[150px] overflow-hidden">
            {wrapPanelWithSlotHeader(topLeftPanel)}
          </div>

          {/* Top Col Resizer */}
          <div
            onMouseDown={handleStartTopColDrag}
            onDoubleClick={resetEqualProportions}
            className="w-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-col-resize flex items-center justify-center transition-colors group relative z-10"
            title="상단 좌우 크기 조절 (더블클릭: 50:50)"
          >
            <div className="h-8 w-1 rounded-full bg-slate-400 group-hover:bg-white" />
          </div>

          <div style={{ width: `${topColPercents[1]}%` }} className="h-full min-w-[150px] overflow-hidden">
            {wrapPanelWithSlotHeader(topRightPanel)}
          </div>
        </div>

        {/* Horizontal Row Resizer */}
        <div
          onMouseDown={handleStartRowDrag}
          onDoubleClick={resetEqualProportions}
          className="h-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-row-resize flex items-center justify-center transition-colors group relative z-10"
          title="상하 크기 조절 (더블클릭: 균등 초기화)"
        >
          <div className="w-8 h-1 rounded-full bg-slate-400 group-hover:bg-white" />
        </div>

        {/* Bottom Row (Single Wide Panel) */}
        <div style={{ height: `${100 - rowHeightPercent}%` }} className="w-full min-h-[120px] overflow-hidden">
          {wrapPanelWithSlotHeader(bottomPanel)}
        </div>
      </main>
    );
  }

  // =========================================================================
  // TOPOLOGY 4: LEFT ONE / RIGHT TWO STACKED
  // =========================================================================
  if (layoutStructure === 'LEFT_ONE_RIGHT_TWO' && activePanels.length >= 3) {
    const leftPanel = activePanels[0];
    const rightTopPanel = activePanels[1];
    const rightBottomPanel = activePanels[2];

    return (
      <main ref={containerRef} className="flex-1 h-full w-full flex bg-slate-200 overflow-hidden select-none">
        {/* Left Tall Column */}
        <div style={{ width: `${leftRightColPercents[0]}%` }} className="h-full min-w-[180px] overflow-hidden">
          {wrapPanelWithSlotHeader(leftPanel)}
        </div>

        {/* Vertical Splitter */}
        <div
          onMouseDown={handleStartLeftRightDrag}
          onDoubleClick={resetEqualProportions}
          className="w-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-col-resize flex items-center justify-center transition-colors group relative z-10"
          title="좌우 너비 조절 (더블클릭: 50:50)"
        >
          <div className="h-8 w-1 rounded-full bg-slate-400 group-hover:bg-white" />
        </div>

        {/* Right Stack (Top & Bottom) */}
        <div style={{ width: `${leftRightColPercents[1]}%` }} className="h-full flex-1 flex flex-col overflow-hidden min-w-[180px]">
          <div style={{ height: `${rightStackRowPercent}%` }} className="w-full min-h-[100px] overflow-hidden">
            {wrapPanelWithSlotHeader(rightTopPanel)}
          </div>

          {/* Right Stack Horizontal Splitter */}
          <div
            onMouseDown={handleStartRightStackRowDrag}
            onDoubleClick={resetEqualProportions}
            className="h-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-row-resize flex items-center justify-center transition-colors group relative z-10"
            title="우측 상하 높이 조절 (더블클릭: 50:50)"
          >
            <div className="w-8 h-1 rounded-full bg-slate-400 group-hover:bg-white" />
          </div>

          <div style={{ height: `${100 - rightStackRowPercent}%` }} className="w-full min-h-[100px] overflow-hidden">
            {wrapPanelWithSlotHeader(rightBottomPanel)}
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // TOPOLOGY 5: 2X2 QUAD GRID (4 Panels)
  // =========================================================================
  if (layoutStructure === 'GRID_2X2' && activePanels.length >= 4) {
    const p1 = activePanels[0];
    const p2 = activePanels[1];
    const p3 = activePanels[2];
    const p4 = activePanels[3];

    return (
      <main ref={containerRef} className="flex-1 h-full w-full flex flex-col bg-slate-200 overflow-hidden select-none">
        {/* Top 2 */}
        <div style={{ height: `${rowHeightPercent}%` }} className="w-full flex overflow-hidden min-h-[100px]">
          <div style={{ width: `${topColPercents[0]}%` }} className="h-full min-w-[140px] overflow-hidden">
            {wrapPanelWithSlotHeader(p1)}
          </div>
          <div
            onMouseDown={handleStartTopColDrag}
            className="w-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-col-resize flex items-center justify-center transition-colors group z-10"
          >
            <div className="h-6 w-1 rounded-full bg-slate-400 group-hover:bg-white" />
          </div>
          <div style={{ width: `${topColPercents[1]}%` }} className="h-full min-w-[140px] overflow-hidden">
            {wrapPanelWithSlotHeader(p2)}
          </div>
        </div>

        {/* Center Horizontal Row Splitter */}
        <div
          onMouseDown={handleStartRowDrag}
          onDoubleClick={resetEqualProportions}
          className="h-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-row-resize flex items-center justify-center transition-colors group z-10"
          title="상하 크기 조절"
        >
          <div className="w-8 h-1 rounded-full bg-slate-400 group-hover:bg-white" />
        </div>

        {/* Bottom 2 */}
        <div style={{ height: `${100 - rowHeightPercent}%` }} className="w-full flex overflow-hidden min-h-[100px]">
          <div style={{ width: `${bottomColPercents[0]}%` }} className="h-full min-w-[140px] overflow-hidden">
            {wrapPanelWithSlotHeader(p3)}
          </div>
          <div
            onMouseDown={handleStartBottomColDrag}
            className="w-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-col-resize flex items-center justify-center transition-colors group z-10"
          >
            <div className="h-6 w-1 rounded-full bg-slate-400 group-hover:bg-white" />
          </div>
          <div style={{ width: `${bottomColPercents[1]}%` }} className="h-full min-w-[140px] overflow-hidden">
            {wrapPanelWithSlotHeader(p4)}
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // TOPOLOGY 1: DEFAULT HORIZONTAL COLUMNS (1, 2, 3, 4 with Mouse Resizers)
  // =========================================================================
  return (
    <main ref={containerRef} className="flex-1 h-full w-full flex bg-slate-200 overflow-hidden select-none">
      {activePanels.map((panelId, idx) => {
        const width = colPercents[idx] ?? (100 / activePanels.length);
        const isLast = idx === activePanels.length - 1;

        return (
          <React.Fragment key={panelId}>
            {/* Column Panel Container */}
            <div style={{ width: `${width}%` }} className="h-full min-w-[160px] overflow-hidden">
              {wrapPanelWithSlotHeader(panelId)}
            </div>

            {/* Vertical Splitter Resizer between columns */}
            {!isLast && (
              <div
                onMouseDown={(e) => handleStartColDrag(idx, e)}
                onDoubleClick={resetEqualProportions}
                className="w-1.5 bg-slate-300 hover:bg-indigo-500 active:bg-indigo-600 cursor-col-resize flex items-center justify-center transition-colors group relative z-10 select-none"
                title="마우스로 너비 조절 (더블클릭: 균등 초기화)"
              >
                <div className="h-8 w-1 rounded-full bg-slate-400 group-hover:bg-white transition-colors" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </main>
  );
};
