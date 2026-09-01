import React, { useState } from 'react';
import { Database, Code, Cpu, Server, X, Copy, Check } from 'lucide-react';

interface DBSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DBSchemaModal: React.FC<DBSchemaModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'sql' | 'prompts' | 'architecture'>('sql');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const SQL_SCHEMA = `-- ====================================================================
-- SmartLab AI Interview Platform Database Schema (PostgreSQL / Supabase)
-- ====================================================================

-- 1. Enum types
CREATE TYPE candidate_status AS ENUM (
  'PENDING', 'IN_PROGRESS', 'CLOSING_PENDING', 'COMPLETED', 'NO_SHOW'
);

CREATE TYPE evaluation_status AS ENUM (
  'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED'
);

CREATE TYPE candidate_track AS ENUM (
  'AI/ML', 'Frontend', 'Backend', 'Embedded/Robotics', 'Product/Design'
);

-- 2. Candidates (지원자)
CREATE TABLE candidates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  track candidate_track NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(150) NOT NULL,
  timeslot_start TIMESTAMP WITH TIME ZONE NOT NULL,
  timeslot_end TIMESTAMP WITH TIME ZONE NOT NULL,
  room VARCHAR(50) DEFAULT 'SmartLab Studio 1',
  status candidate_status NOT NULL DEFAULT 'PENDING',
  interviewers_assigned JSONB NOT NULL DEFAULT '[]'::jsonb,
  stt_transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_insights JSONB NOT NULL DEFAULT '{"realtimeSummaries":[],"tailQuestions":[],"contradictions":[]}'::jsonb,
  qualitative_ai_summary JSONB,
  mindmap_data JSONB,
  is_modified_under_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_modified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Candidate Documents (서류 목록)
CREATE TABLE candidate_documents (
  id VARCHAR(50) PRIMARY KEY,
  candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  doc_type VARCHAR(50) NOT NULL,
  file_url TEXT,
  content_snippet TEXT,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Interview Evaluations (면접관별 정량/정성 평가 - 블라인드)
CREATE TABLE evaluations (
  id VARCHAR(50) PRIMARY KEY,
  candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE CASCADE,
  interviewer_id VARCHAR(50) NOT NULL,
  interviewer_name VARCHAR(100) NOT NULL,
  status evaluation_status NOT NULL DEFAULT 'NOT_STARTED',
  submitted_at TIMESTAMP WITH TIME ZONE,
  score_technical NUMERIC(5,2) DEFAULT 0,
  score_problem_solving NUMERIC(5,2) DEFAULT 0,
  score_communication NUMERIC(5,2) DEFAULT 0,
  score_culture_fit NUMERIC(5,2) DEFAULT 0,
  technical_note TEXT,
  attitude_note TEXT,
  overall_comment TEXT,
  pass_decision VARCHAR(30) DEFAULT 'PASS',
  CONSTRAINT unique_candidate_interviewer UNIQUE(candidate_id, interviewer_id)
);

-- 5. Audit Logs (무결성 감사 로그)
CREATE TABLE audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE CASCADE,
  modified_by VARCHAR(100) NOT NULL,
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  field_name VARCHAR(100) NOT NULL,
  before_value JSONB,
  after_value JSONB,
  reason TEXT
);`;

  const AI_SYSTEM_PROMPTS = `// 1. Real-time Answer Summary & Follow-up Question Prompt
const REALTIME_PROMPT = \`너는 동아리 'SmartLab'의 최고 기술 면접관 보조 AI이다.
면접자의 제출 서류 내용과 실시간 음성 STT 텍스트를 종합 분석하여:
1) 실시간 발언 핵심 요약 (1~2문장)
2) 이력서/포트폴리오와의 모순점 지적
3) 지원자의 기술적 깊이와 진위를 검증하는 날카로운 꼬리 질문(Follow-up Questions) 2~3개를 생성하라.
출력 포맷: JSON { "summary": "...", "tailQuestions": [...], "contradictions": [...] }\`;

// 2. Universal Schedule & Candidate Parser Prompt
const UNIVERSAL_PARSER_PROMPT = \`너는 동아리 'SmartLab'의 만능 지원 데이터 파서 및 시간표 생성 AI이다.
비정형 데이터(CSV, 표, 텍스트, 일정 캡처 OCR)를 파싱하여 표준화된 지원자 프로필과 중복 없는 타임슬롯(Time-slot) 시간표 JSON을 생성하라.\`;

// 3. Post-Interview Qualitative Synthesis & D3 MindMap Generator Prompt
const MINDMAP_PROMPT = \`너는 지식 구조화 AI이다.
지원자의 프로필, 서류, 실시간 STT 발언, 면접관 다면 평가를 종합하여 D3.js 인터랙티브 트리 렌더링에 적합한 계층적 JSON 노드를 생성하라.\`;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab === 'sql' ? SQL_SCHEMA : AI_SYSTEM_PROMPTS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                DB 스키마 (SQL) & AI 파이프라인 명세서
              </h2>
              <p className="text-xs text-slate-400">
                PostgreSQL / Supabase DDL • REST API & WebSocket 명세 • AI 프롬프트 아키텍처
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'sql'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              PostgreSQL DDL 스키마 (SQL)
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'prompts'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              AI 시스템 프롬프트
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'architecture'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              아키텍처 & API 엔드포인트
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '복사 완료' : '코드 복사'}
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed">
          {activeTab === 'sql' && (
            <pre className="whitespace-pre overflow-x-auto text-emerald-400">
              {SQL_SCHEMA}
            </pre>
          )}

          {activeTab === 'prompts' && (
            <pre className="whitespace-pre overflow-x-auto text-purple-300">
              {AI_SYSTEM_PROMPTS}
            </pre>
          )}

          {activeTab === 'architecture' && (
            <div className="font-sans space-y-4 text-slate-300 text-xs">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                <span className="font-bold text-white text-sm">1. 주요 REST API 엔드포인트:</span>
                <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-blue-400">
                  <li>POST /api/candidates/:id/status (면접 시작, 결시, 면접 종료, 취소)</li>
                  <li>GET /api/candidates/:id/evaluations?interviewerId=... (블라인드 평가 격리)</li>
                  <li>POST /api/candidates/:id/stt (실시간 자막 추가 및 AI 피드백 트리거)</li>
                  <li>POST /api/ai/universal-parser (비정형 데이터 ➔ 자동 타임슬롯 JSON)</li>
                  <li>POST /api/admin/unlock-edit (5분 한시적 수정 권한 활성화)</li>
                  <li>POST /api/admin/modify-evaluation (감사 로그 자동 기록 및 정정)</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                <span className="font-bold text-white text-sm">2. AI 실시간 연동 구조:</span>
                <p className="text-slate-300 leading-relaxed">
                  초저지연 AI 엔진 API를 호출하여 지원자의 실시간 음성 STT 텍스트와 제출 서류를 기반으로 답변 요약 및 검증 꼬리 질문을 즉각 생성합니다.
                  정성 분석과 계층형 마인드맵 생성 또한 비동기 AI 파이프라인을 통해 실시간으로 처리됩니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-md hover:bg-slate-800 transition-colors text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
