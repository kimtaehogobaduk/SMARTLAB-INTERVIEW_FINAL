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
}

export interface TailQuestion {
  id: string;
  timestamp: string;
  question: string;
  reason: string;
  category: string;
  claim?: string;
  verificationPoint?: string;
  used?: boolean;
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
    contradictions: ContradictionPoint[];
  };
  qualitativeAiSummary?: QualitativeSummary;
  mindMapData?: MindMapNode;
  auditLogs?: AuditLog[];
  noShowVotes?: string[]; // Interviewer IDs or names who agreed to mark as No-Show
  isModifiedUnderAdmin?: boolean;
  lastModifiedAt?: string;
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

export interface InterviewerUser {
  id: string;
  name: string;
  role: 'interviewer' | 'admin';
  trackExpertise?: string;
  avatarColor?: string;
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
}

export type InterviewRoomItem = InterviewRoomInfo;

export type AppView = 'LANDING_ENTRY' | 'ADMIN_PORTAL' | 'ROOM_LOBBY' | 'SELECT_INTERVIEWER' | 'CANDIDATE_LIST' | 'INTERVIEW_ROOM' | 'ROOM_SELECT' | 'LOGIN';

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
  type: 'INTERVIEW_STARTED' | 'INTERVIEW_FINISHED' | 'EVALUATION_SUBMITTED' | 'NO_SHOW_VOTE' | 'INTERVIEWER_ACTION' | 'QUESTION_INTENT' | 'SUSPICION_ALERT' | 'TAIL_QUESTION_REQUEST' | 'TIME_ALERT' | 'YIELD_FLOOR';
  actionType?: 'question' | 'suspicion' | 'tail_question' | 'yield' | 'time_check' | string;
  title: string;
  message: string;
  timestamp: string;
  createdAt: number;
  roomId?: string;
  roomName?: string;
  candidateId: string;
  candidateName: string;
  operatorId?: string;
  operatorName?: string;
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
}

export interface InterviewerPresence {
  interviewerId: string;
  interviewerName: string;
  roomId?: string;
  candidateId?: string;
  mode: 'evaluating' | 'observing' | 'left';
  lastActiveAt: number;
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
  message: string;
  timestamp: string;
  createdAt: number;
  isImportant?: boolean;
}
