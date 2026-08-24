-- ====================================================================
-- SmartLab AI Interview Platform Database Schema (PostgreSQL / Supabase)
-- ====================================================================

-- 1. Enum types for statuses and tracks
CREATE TYPE candidate_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'CLOSING_PENDING',
  'COMPLETED',
  'NO_SHOW'
);

CREATE TYPE evaluation_status AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED'
);

CREATE TYPE candidate_track AS ENUM (
  'AI/ML',
  'Frontend',
  'Backend',
  'Embedded/Robotics',
  'Product/Design'
);

CREATE TYPE pass_decision AS ENUM (
  'PASS',
  'CONDITIONAL_PASS',
  'FAIL'
);

-- 2. Interviewers Table
CREATE TABLE interviewers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'interviewer', -- 'interviewer' | 'admin'
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Candidates (지원자) Table
CREATE TABLE candidates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  track candidate_track NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(150) NOT NULL,
  timeslot_start TIMESTAMP WITH TIME ZONE NOT NULL,
  timeslot_end TIMESTAMP WITH TIME ZONE NOT NULL,
  room VARCHAR(50) DEFAULT 'Room 1 (SmartLab Studio)',
  status candidate_status NOT NULL DEFAULT 'PENDING',
  interviewers_assigned JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of interviewer IDs
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  stt_transcript JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, speaker, text, timestamp }
  ai_insights JSONB NOT NULL DEFAULT '{"realtimeSummaries":[],"tailQuestions":[],"contradictions":[]}'::jsonb,
  qualitative_ai_summary JSONB, -- { strengths, improvements, oneLineVerdict, recommendedRole }
  mindmap_data JSONB, -- D3 hierarchical node tree
  is_modified_under_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_modified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Candidate Documents (서류 목록) Table
CREATE TABLE candidate_documents (
  id VARCHAR(50) PRIMARY KEY,
  candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  doc_type VARCHAR(50) NOT NULL, -- 'pdf', 'pptx', 'doc', 'portfolio', 'text'
  file_url TEXT,
  content_snippet TEXT,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Interview Evaluations (면접관별 정량/정성 평가) Table
CREATE TABLE evaluations (
  id VARCHAR(50) PRIMARY KEY,
  candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE CASCADE,
  interviewer_id VARCHAR(50) REFERENCES interviewers(id) ON DELETE CASCADE,
  interviewer_name VARCHAR(100) NOT NULL,
  status evaluation_status NOT NULL DEFAULT 'NOT_STARTED',
  submitted_at TIMESTAMP WITH TIME ZONE,
  -- 정량 평가 점수 (0 ~ 100)
  score_technical NUMERIC(5,2) DEFAULT 0,
  score_problem_solving NUMERIC(5,2) DEFAULT 0,
  score_communication NUMERIC(5,2) DEFAULT 0,
  score_culture_fit NUMERIC(5,2) DEFAULT 0,
  -- 정성 평가 코멘트
  technical_note TEXT,
  attitude_note TEXT,
  overall_comment TEXT,
  pass_decision pass_decision DEFAULT 'PASS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_candidate_interviewer UNIQUE(candidate_id, interviewer_id)
);

-- 6. Audit Logs (관리자 수정 감사 로그) Table
CREATE TABLE audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE CASCADE,
  evaluation_id VARCHAR(50) REFERENCES evaluations(id) ON DELETE SET NULL,
  modified_by VARCHAR(100) NOT NULL,
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  field_name VARCHAR(100) NOT NULL,
  before_value JSONB,
  after_value JSONB,
  reason TEXT,
  admin_auth_timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 7. Platform Settings (클럽 설정 및 계산식) Table
CREATE TABLE platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  scoring_formula VARCHAR(50) NOT NULL DEFAULT 'TRIMMED_MEAN', -- 'TRIMMED_MEAN', 'MEDIAN', 'MEAN', 'WEIGHTED_MEAN'
  weights JSONB NOT NULL DEFAULT '{"technical":40, "problemSolving":30, "communication":20, "cultureFit":10}'::jsonb,
  panel_size INT NOT NULL DEFAULT 3,
  admin_override_window_seconds INT NOT NULL DEFAULT 300, -- 5 minutes
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_timeslot ON candidates(timeslot_start);
CREATE INDEX idx_evaluations_candidate ON evaluations(candidate_id);
CREATE INDEX idx_audit_logs_candidate ON audit_logs(candidate_id);
