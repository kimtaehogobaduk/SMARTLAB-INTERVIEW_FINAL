export type CandidateStatus = 'PENDING' | 'IN_PROGRESS' | 'CLOSING_PENDING' | 'COMPLETED' | 'NO_SHOW';

export type CandidateTrack = string; // Flexible track naming

export type ScoringFormula = 'TRIMMED_MEAN' | 'MEDIAN' | 'MEAN' | 'WEIGHTED_MEAN';

export interface DocumentItem {
  id: string;
  title: string;
  type: 'pdf' | 'pptx' | 'doc' | 'portfolio' | 'text' | 'image' | 'hwp' | 'xlsx' | 'zip' | 'code' | 'url' | string;
  contentSnippet?: string;
  rawText?: string;
  url?: string;
  fileData?: string; // Base64 data URL for PDFs, images, etc.
  fileSize?: string;
  pageCount?: number;
  uploadedAt?: string;
}

export interface STTMessage {
  id: string;
  speaker: 'candidate' | 'interviewer' | 'system';
  text: string;
  timestamp: string;
  confidence?: number;
  isImportant?: boolean;
  isBookmarked?: boolean;
  wordCount?: number;
  keyEntities?: string[];
}

export interface EvaluatedCriterionDetail {
  criterionId: string;
  criterionName: string;
  weight?: number;
  relevanceScore?: number; // 0 ~ 100
  evaluationGuideline: string; // e.g. "지원자의 데이터 일관성 제어 능력과 DB 트랜잭션 깊이 검증 (가중치 40% 기술 직무 역량 반영)"
}

export type QuestionPersonaStyle =
  | 'BALANCED'
  | 'LOGIC_PRESSURE'
  | 'TROUBLESHOOTING'
  | 'ARCHITECTURE'
  | 'STAR_COLLABORATION'
  | 'GROWTH_FUNDAMENTALS'
  | 'CUSTOM';

export interface TailQuestion {
  id: string;
  timestamp: string;
  question: string;
  reason: string;
  category: string;
  categoryLabel?: string;
  claim?: string; // 지원자의 직전 발언 닻 (Claim/Anchor)
  verificationPoint?: string;
  intent?: string; // 출제 의도 및 목적
  difficulty?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'HARD';
  evaluatedCriteria?: string[]; // 기준 ID 리스트 (e.g. ['technical', 'problemSolving'])
  evaluatedCriteriaDetails?: EvaluatedCriterionDetail[]; // 평가 가능한 항목 상세 매핑
  idealAnswerSignals?: string[]; // 우수 답변 핵심 시그널 (체크포인트)
  redFlagSignals?: string[]; // 감점 / 주의 시그널
  followUpProbing?: string[]; // 답변에 따른 2단계 심화 질문 제안
  used?: boolean;
  isBookmarked?: boolean;
  matchScore?: number; // 최근 발언 적합도 (%)
  personaStyle?: QuestionPersonaStyle;
  customFocusKeyword?: string;
  // Sharing & User Custom Intent
  isShared?: boolean;
  sharedBy?: string;
  sharedById?: string;
  sharedAt?: string;
  isUserCreated?: boolean;
  userTypedIntent?: string;
  isCustomGenerated?: boolean;
  shareCount?: number;
}

export interface ContradictionPoint {
  id: string;
  timestamp: string;
  point: string;
  context: string;
}

export interface RealtimeSummary {
  id: string;
  timestamp: string;
  text: string;
  source?: 'groq' | 'gemini' | 'ai' | 'cerebras' | string;
}

export interface MindMapNode {
  id: string;
  name: string;
  category?: 'root' | 'profile' | 'tech' | 'stt_highlight' | 'strength' | 'weakness' | 'fit';
  details?: string;
  children?: MindMapNode[];
  color?: string;
}

export interface QualitativeSummary {
  strengths: string[];
  improvements: string[];
  oneLineVerdict: string;
  recommendedRole: string;
  potentialScore: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  modifiedBy: string;
  field: string;
  beforeVal: any;
  afterVal: any;
  reason?: string;
}

export interface Candidate {
  id: string;
  roomId?: string;
  name: string;
  track: string;
  studentId: string;
  phone: string;
  email: string;
  timeslot: {
    start: string;
    end: string;
    room: string;
  };
  status: CandidateStatus;
  interviewers: string[];
  documents: DocumentItem[];
  sttTranscript: STTMessage[];
  aiInsights: {
    realtimeSummaries: RealtimeSummary[];
    tailQuestions: TailQuestion[];
    customQuestions?: TailQuestion[];
    contradictions: ContradictionPoint[];
  };
  qualitativeAiSummary?: QualitativeSummary;
  mindMapData?: MindMapNode;
  auditLogs?: AuditLog[];
  noShowVotes?: string[]; // Interviewer IDs or names who agreed to mark as No-Show
  completedAt?: string; // Original completion timestamp in KST (면접 완료 시간)
  initialCompletedAt?: string; // Preserved initial completion timestamp in KST (처음 완료된 시간 유지)
  reopenedUntil?: number; // Epoch timestamp (ms) until which 5-minute admin re-edit is active
  reopenedAt?: string; // When the 5-minute grace period was triggered (KST)
  reopenedBy?: string; // Who authorized the 5-minute re-edit
  isModifiedUnderAdmin?: boolean;
  lastModifiedAt?: string;
  // Candidate Self-Service Portal additions
  interviewDate?: string;
  reminder10MinEnabled?: boolean;
  candidateNotes?: string;
  lastCandidateActiveAt?: string;
  startedAt?: string;
  interviewStartedTimestamp?: number;
}

export interface EvaluationScores {
  [criterionId: string]: number;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage, e.g. 40
  maxScore?: number; // default 100
  color?: string; // Tailwind color name like 'blue', 'purple', 'emerald', 'amber', 'rose', 'indigo'
}

export interface EvaluationComments {
  technicalNote?: string;
  attitudeNote?: string;
  overallComment?: string;
  [customCommentKey: string]: string | undefined;
}

export interface Evaluation {
  id: string;
  candidateId: string;
  roomId?: string;
  interviewerId: string;
  interviewerName: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED';
  submittedAt?: string;
  scores: EvaluationScores;
  presentationBonuses?: Record<string, number>; // Bonus points per criterion (up to +10% of criterion weight, e.g. up to 3.0 for 30 weight)
  presentationBonusTotal?: number; // Sum of presentation bonus points (up to 10.0 pts)
  presentationNote?: string; // Optional memo for presentation/pitch feedback
  comments: EvaluationComments;
}

export type LeadershipRole = 'CAPTAIN' | 'VICE_CAPTAIN' | 'NONE';

export interface LeadershipMember {
  id: string;
  name: string;
  role: 'CAPTAIN' | 'VICE_CAPTAIN';
  appointedAt: string;
  appointedBy?: string;
  memo?: string;
}

export interface ClubLeadership {
  captain: LeadershipMember | null; // 정원 1명 (기장)
  viceCaptains: LeadershipMember[]; // 최대 2명 (부기장)
}

export interface InterviewerUser {
  id: string;
  name: string;
  role: 'interviewer' | 'admin';
  leadershipRole?: LeadershipRole;
  trackExpertise?: string;
  avatarColor?: string;
  pinCode?: string; // 4-digit PIN password
  isPinSet?: boolean;
  pinSetAt?: string;
}

export interface SecurityQuizItem {
  id: string;
  question: string;
  answer: string;
}

export interface InterviewRoomInfo {
  id: string;
  name: string;
  title?: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  candidateCount?: number;
  panelCount?: number;
  minutesPerPerson?: number;
  interviewers?: InterviewerUser[];
  // Room-specific evaluation criteria and scoring formula
  isCriteriaConfirmed?: boolean;
  criteriaConfirmedAt?: string;
  criteriaConfirmedBy?: string;
  scoringFormula?: ScoringFormula;
  passThresholdScore?: number;
  criteria?: EvaluationCriterion[];
  weights?: Record<string, number>;
  defaultQuestionPersona?: QuestionPersonaStyle;
  customFocusKeywords?: string[];
  // Room-specific Access Security (Password or Security Questions)
  securityType?: 'NONE' | 'PASSWORD' | 'QUIZ';
  password?: string;
  roomPassword?: string;
  securityQuestion?: string;
  quizQuestion?: string;
  securityAnswer?: string;
  quizAnswer?: string;
  securityQuizzes?: SecurityQuizItem[];
  hasSecurityLock?: boolean;
}

export type InterviewRoomItem = InterviewRoomInfo;

export type AppView =
  | 'ROLE_SELECT'
  | 'CANDIDATE_ROOM_SELECT'
  | 'CANDIDATE_LOGIN'
  | 'CANDIDATE_PORTAL'
  | 'LANDING_ENTRY'
  | 'ADMIN_PORTAL'
  | 'ROOM_LOBBY'
  | 'SELECT_INTERVIEWER'
  | 'CANDIDATE_LIST'
  | 'INTERVIEW_ROOM'
  | 'ROOM_SELECT'
  | 'LOGIN';

export interface CandidateChatMessage {
  id: string;
  roomId: string;
  candidateId: string;
  studentId: string;
  candidateName: string;
  senderType: 'candidate' | 'interviewer' | 'system';
  senderName: string; // e.g. "김태호" (지원자) 또는 "김태호 면접관" (면접관이 작성)
  senderInterviewerId?: string; // 면접관 ID
  text: string;
  timestamp: string; // KST string e.g. "14:25:30"
  createdAt: number; // Unix timestamp
  readByCandidate?: boolean;
  readByInterviewers?: string[];
}

export interface PanelVisibility {
  showSTT: boolean;
  showDocs: boolean;
  showEval: boolean;
  showChat?: boolean;
}

export type LayoutStructure =
  | 'COLUMNS'
  | 'TOP_ONE_BOTTOM_TWO'
  | 'TOP_TWO_BOTTOM_ONE'
  | 'LEFT_ONE_RIGHT_TWO'
  | 'GRID_2X2';

export type PanelId = 'STT' | 'DOCS' | 'EVAL' | 'CHAT';

export type LayoutPreset =
  | 'ALL_THREE'
  | 'ALL_FOUR'
  | 'TOP_BOTTOM_T'
  | 'TOP_BOTTOM_INV_T'
  | 'LEFT_RIGHT_STACK'
  | 'GRID_2X2'
  | 'DOCS_AND_EVAL'
  | 'STT_AND_EVAL'
  | 'EVAL_AND_CHAT'
  | 'STT_AND_CHAT'
  | 'DOCS_AND_CHAT'
  | 'EVAL_ONLY'
  | 'CHAT_ONLY'
  | 'ALL_OFF';

export type KnowledgeSourceType = 'youtube' | 'document' | 'web' | 'text' | 'rule';

export interface AIKnowledgeExtractedInsights {
  keyConcepts: string[];
  suggestedQuestions: string[];
  evaluationCriteria: string[];
  redFlags?: string[];
  summary: string;
}

export interface AIKnowledgeItem {
  id: string;
  title: string;
  sourceType: KnowledgeSourceType;
  url?: string;
  youtubeVideoId?: string;
  description?: string;
  content: string; // The extracted full knowledge / transcript / summary
  tags: string[];
  extractedInsights: AIKnowledgeExtractedInsights;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  fileSize?: string;
  addedBy?: string;
}

export interface LiveNotification {
  id: string;
  type: 'INTERVIEW_STARTED' | 'INTERVIEW_FINISHED' | 'EVALUATION_SUBMITTED' | 'NO_SHOW_VOTE' | 'INTERVIEWER_ACTION' | 'QUESTION_INTENT' | 'SUSPICION_ALERT' | 'TAIL_QUESTION_REQUEST' | 'TIME_ALERT' | 'YIELD_FLOOR' | 'SHARED_QUESTION' | 'ADMIN_ALERT';
  actionType?: 'question' | 'suspicion' | 'tail_question' | 'yield' | 'time_check' | 'share_question' | 'admin_reopen' | string;
  title: string;
  message: string;
  timestamp: string;
  createdAt: number;
  roomId?: string;
  roomName?: string;
  candidateId?: string;
  candidateName?: string;
  operatorId?: string;
  operatorName?: string;
  operatorLeadershipRole?: LeadershipRole;
  questionId?: string;
}

export type InterviewerNameDisplayPolicy = 'LEADERS_ONLY' | 'ALL_PUBLIC' | 'ALL_ANONYMOUS';

export interface CandidateResultStats {
  totalCandidates: number;
  meanScore: number;
  stdDev: number;
  maxScore: number;
  minScore: number;
  medianScore: number;
  myRank: number;
  myPercentile: number;
  criteriaStats: Record<string, {
    criterionName: string;
    mean: number;
    stdDev: number;
    max: number;
    min: number;
    myAvgScore: number;
  }>;
}

export interface CandidateEvaluatorScoreDetail {
  interviewerDisplayName: string;
  isLeader: boolean;
  leadershipRole: LeadershipRole;
  roleLabel: string;
  scores: Record<string, number>;
  presentationBonus: number;
  calculatedTotal: number;
  comments: EvaluationComments;
  submittedAt?: string;
}

export interface CandidateDetailedAIReport {
  strengths: string[];
  improvements: string[];
  competencyAnalysis: {
    category: string;
    score: number;
    evaluation: string;
    actionTip: string;
  }[];
  actionPlan: string[];
  oneLineVerdict: string;
  overallReview: string;
}

export interface CandidateFullResultData {
  isPublished: boolean;
  isAllCompleted: boolean;
  showPassFail: boolean;
  isPassed?: boolean;
  passThresholdScore: number;
  myTotalScore: number;
  myEvaluations: CandidateEvaluatorScoreDetail[];
  stats: CandidateResultStats;
  aiReport?: CandidateDetailedAIReport;
  criteria: EvaluationCriterion[];
  publishedAt?: string;
}

export interface PlatformSettings {
  isCriteriaConfirmed: boolean;
  criteriaConfirmedAt?: string;
  criteriaConfirmedBy?: string;
  scoringFormula: ScoringFormula;
  passThresholdScore?: number;
  criteria: EvaluationCriterion[];
  weights: Record<string, number>;
  panelSize: number;
  adminOverrideWindowSeconds: number;
  aiProvider?: 'groq' | 'gemini' | 'cerebras' | 'hybrid' | string;
  aiModel?: string;
  cerebrasModel?: string;
  knowledgeBase?: AIKnowledgeItem[];
  adminMasterPassword?: string;
  leadership?: ClubLeadership;
  // Results Publication and Candidate Access Policies
  isAllInterviewsCompleted?: boolean;
  allInterviewsCompletedAt?: string;
  allInterviewsCompletedBy?: string;
  isResultsPublished?: boolean;
  resultsPublishedAt?: string;
  resultsPublishedBy?: string;
  showPassFailToCandidates?: boolean;
  interviewerNameDisplayPolicy?: InterviewerNameDisplayPolicy;
  showStatsToCandidates?: boolean;
  showDetailedComments?: boolean;
  interviewerPins?: Record<string, string>; // Normalized interviewer key -> 4-digit PIN
  interviewerPinSetAt?: Record<string, string>; // Normalized interviewer key -> KST timestamp
}

export interface InterviewerPresence {
  interviewerId: string;
  interviewerName: string;
  leadershipRole?: LeadershipRole;
  roomId?: string;
  candidateId?: string;
  mode: 'evaluating' | 'observing' | 'left';
  lastActiveAt: number;
}

export type ThemeMode = 'dark' | 'light' | 'system';
export type ThemePalette = 'blue' | 'orange' | 'yellow' | 'emerald' | 'purple' | 'rose' | 'zinc' | 'cyan';

export interface ThemeConfig {
  mode: ThemeMode;
  palette: ThemePalette;
}

export interface InterviewerChatMessage {
  id: string;
  roomId?: string;
  roomName?: string;
  candidateId?: string;
  candidateName?: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderLeadershipRole?: LeadershipRole;
  isOfficialLeaderNotice?: boolean;
  message: string;
  timestamp: string;
  createdAt: number;
  isImportant?: boolean;
  sharedQuestion?: TailQuestion;
}
