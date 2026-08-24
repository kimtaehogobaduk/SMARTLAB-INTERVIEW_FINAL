import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { Candidate, Evaluation, PlatformSettings, AuditLog, InterviewRoomInfo, AIKnowledgeItem, DocumentItem, LiveNotification } from '../src/types';

// Load config safely in Node environment
let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (existsSync(configPath)) {
    firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('[Firebase Cloud Store] Could not read firebase-applet-config.json:', e);
}

let firestoreInstance: Firestore | null = null;
if (firebaseConfig && firebaseConfig.projectId) {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    console.log('[Firebase Cloud Store] Connected to Firestore project:', firebaseConfig.projectId);
  } catch (e) {
    console.error('[Firebase Cloud Store] Initialization error:', e);
  }
}

export interface DatabaseState {
  rooms: InterviewRoomInfo[];
  candidates: Candidate[];
  evaluations: Evaluation[];
  auditLogs: AuditLog[];
  notifications: LiveNotification[];
  settings: PlatformSettings;
  adminUnlock: {
    candidateId: string | null;
    expiresAt: number | null;
  };
}

export const defaultCriteria = [
  {
    id: 'technical',
    name: '1. 기술 직무 역량',
    description: '직무 이해도, 기술 스택 깊이, 문제 접근 및 설계 논리',
    weight: 40,
    maxScore: 100,
    color: 'blue'
  },
  {
    id: 'problemSolving',
    name: '2. 논리적 문제 해결력',
    description: '돌발 질문 대응, 트러블슈팅 논리, 한계 극복 및 문제 분해 역량',
    weight: 30,
    maxScore: 100,
    color: 'purple'
  },
  {
    id: 'communication',
    name: '3. 의사소통 및 전달력',
    description: '두괄식 설명, 경청 태도 및 질문 의도 파악 역량',
    weight: 20,
    maxScore: 100,
    color: 'emerald'
  },
  {
    id: 'cultureFit',
    name: '4. 조직 적합도 & 성장성',
    description: 'SmartLab 동아리 문화 수용성, 열정 및 협업 주도성',
    weight: 10,
    maxScore: 100,
    color: 'amber'
  }
];

export const initialRooms: InterviewRoomInfo[] = [
  {
    id: 'room-1',
    name: 'SmartLab Studio 1 (AI 엔지니어링)',
    title: 'SmartLab Studio 1 (AI 엔지니어링)',
    description: 'LLM, Multi-Agent, Computer Vision 직무 심층 면접실',
    createdBy: 'SmartLab 운영진',
    createdAt: new Date().toISOString(),
    panelCount: 3,
    minutesPerPerson: 30,
    interviewers: [
      { id: 'intv-1-1', name: '김태호 면접관', role: 'interviewer', trackExpertise: 'AI / LLM 연구' },
      { id: 'intv-1-2', name: '이지은 면접관', role: 'interviewer', trackExpertise: 'MLOps 및 시스템 설계' },
      { id: 'intv-1-3', name: '박준혁 면접관', role: 'interviewer', trackExpertise: '알고리즘 및 문제해결' }
    ]
  },
  {
    id: 'room-2',
    name: 'SmartLab Studio 2 (풀스택 & 클라우드)',
    title: 'SmartLab Studio 2 (풀스택 & 클라우드)',
    description: 'React, TypeScript, 고성능 분산 백엔드 직무 심층 면접실',
    createdBy: 'SmartLab 운영진',
    createdAt: new Date().toISOString(),
    panelCount: 3,
    minutesPerPerson: 30,
    interviewers: [
      { id: 'intv-2-1', name: '최수민 면접관', role: 'interviewer', trackExpertise: '프론트엔드 아키텍처' },
      { id: 'intv-2-2', name: '정동훈 면접관', role: 'interviewer', trackExpertise: '분산 백엔드 & DB' },
      { id: 'intv-2-3', name: '강민지 면접관', role: 'interviewer', trackExpertise: '인프라 및 동아리 리더' }
    ]
  }
];

export const SHARED_GDOC_LINK = 'https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk';

export const createSharedGDocItem = (): DocumentItem => ({
  id: `gdoc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  title: '면접평가기준',
  type: 'gdocs',
  url: SHARED_GDOC_LINK,
  fileSize: 'Google Docs (인앱 연동)',
  contentSnippet: '구글 닥스 지원서류 원본 (인앱 미리보기 및 검토 지원)',
  rawText: `SmartLab 지원자 공식 구글 닥스 서류 링크: ${SHARED_GDOC_LINK}`,
  uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
});

export const initialCandidates: Candidate[] = [
  {
    id: 'cand-1',
    roomId: 'room-1',
    name: '김태호',
    track: 'AI 엔지니어링',
    studentId: '202410101',
    phone: '010-3829-1928',
    email: 'taeho@smartlab.edu',
    timeslot: {
      start: '14:00',
      end: '14:30',
      room: 'SmartLab Studio 1 (AI 엔지니어링)'
    },
    status: 'PENDING',
    interviewers: ['김태호 면접관', '이지은 면접관', '박준혁 면접관'],
    documents: [
      {
        id: 'doc-1-gdoc',
        title: '면접평가기준',
        type: 'gdocs',
        url: SHARED_GDOC_LINK,
        fileSize: 'Google Docs (인앱 연동)',
        contentSnippet: '구글 닥스 지원서류 원본 (인앱 미리보기 지원)',
        rawText: `SmartLab 지원자 공식 구글 닥스 서류 링크: ${SHARED_GDOC_LINK}`,
        uploadedAt: '14:00:00'
      },
      {
        id: 'doc-1-pdf',
        title: '김태호_지원서_이력서.pdf',
        type: 'pdf',
        fileSize: '2.4 MB',
        contentSnippet: '대규모 언어모델 경량화 파인튜닝(QLoRA) 및 온디바이스 멀티에이전트 오케스트레이션 시스템 구현',
        rawText: 'SmartLab AI 리서치 트랙에 지원한 김태호입니다.\n- 주요 연구: vLLM 기반 고속 추론 서빙 파이프라인 및 멀티턴 RAG 시스템 설계\n- 기술 스택: PyTorch, CUDA, Hugging Face, vLLM, LangChain, Triton Server\n- 온디바이스 4비트 양자화(AWQ/GPTQ) 적용을 통한 모바일 NPU 가속 경험 보유'
      },
      {
        id: 'doc-1-pptx',
        title: '김태호_포트폴리오_발표자료.pptx',
        type: 'pptx',
        fileSize: '14.8 MB',
        contentSnippet: '온디바이스 LLM 최적화 아키텍처 슬라이드 및 벤치마크 결과',
        rawText: '1. 온디바이스 에이전트 개발 프로젝트 개요 및 배경\n2. 4비트 양자화 및 KV Cache 최적화 파이프라인 다이어그램\n3. 토큰 생성 지연시간 2.8배 개선 벤치마크 (vs FP16 Baseline)\n4. 오픈소스 동아리 활동 계획 및 후배 멘토링 계획\n5. 실시간 질의응답 (Q&A)'
      },
      {
        id: 'doc-1-code',
        title: 'llm_quant_server.py (핵심 코드)',
        type: 'code',
        fileSize: '4.2 KB',
        contentSnippet: 'vLLM 커스텀 KV-Cache 압축 및 어텐션 풀링 모듈',
        rawText: `import torch
import torch.nn as nn
from transformers import AutoModelForCausalLM, AutoTokenizer

class OptimizedKVCacheCompressor(nn.Module):
    """SmartLab On-Device Fast Attention with KV-Compression"""
    def __init__(self, layer_dim: int, compression_ratio: float = 0.5):
        super().__init__()
        self.proj = nn.Linear(layer_dim, int(layer_dim * compression_ratio), bias=False)

    def forward(self, key: torch.Tensor, value: torch.Tensor):
        compressed_k = self.proj(key)
        compressed_v = self.proj(value)
        return compressed_k, compressed_v`
      }
    ],
    sttTranscript: [
      {
        id: 'stt-1',
        speaker: 'interviewer',
        text: '지원자님, 최근 진행하신 LLM 온디바이스 프로젝트에서 가장 큰 병목과 이를 해결한 방법을 말씀해주세요.',
        timestamp: '14:02:10'
      },
      {
        id: 'stt-2',
        speaker: 'candidate',
        text: '모바일 환경에서 메모리 대역폭 한계로 인한 토큰 생성 지연이 가장 컸습니다. 이를 해결하기 위해 4비트 양자화와 KV 캐시 압축 기법을 적용해 추론 속도를 2.8배 개선했습니다.',
        timestamp: '14:03:00'
      }
    ],
    aiInsights: {
      realtimeSummaries: [
        {
          id: 'sum-1',
          timestamp: '14:03:15',
          text: '지원자는 온디바이스 환경에서 4비트 양자화 및 KV 캐시 최적화 기법을 능숙하게 활용하여 추론 지연 문제를 해결함.',
          source: 'groq'
        }
      ],
      tailQuestions: [
        {
          id: 'tq-1',
          timestamp: '14:03:20',
          question: 'KV 캐시 압축 시 긴 컨텍스트에서 발생할 수 있는 정보 손실(Attention Degradation)은 어떻게 검증하셨나요?',
          reason: '실제 서빙 시 긴 문맥 정확도 유지 여부 확인',
          category: '기술 검증',
          used: false
        },
        {
          id: 'tq-2',
          timestamp: '14:03:25',
          question: '4비트 양자화 모델 배포 시 서빙 프레임워크와의 호환성 문제는 없었는지 구체적인 벤치마크 수치가 있나요?',
          reason: '실전 서빙 파이프라인 경험 검증',
          category: '성능 최적화',
          used: false
        }
      ],
      contradictions: []
    }
  },
  {
    id: 'cand-2',
    roomId: 'room-1',
    name: '이지은',
    track: 'AI 엔지니어링',
    studentId: '202311204',
    phone: '010-5821-9921',
    email: 'jieun@smartlab.edu',
    timeslot: {
      start: '14:35',
      end: '15:05',
      room: 'SmartLab Studio 1 (AI 엔지니어링)'
    },
    status: 'PENDING',
    interviewers: ['김태호 면접관', '이지은 면접관', '박준혁 면접관'],
    documents: [
      {
        id: 'doc-2-gdoc',
        title: '면접평가기준',
        type: 'gdocs',
        url: SHARED_GDOC_LINK,
        fileSize: 'Google Docs (인앱 연동)',
        contentSnippet: '구글 닥스 지원서류 원본 (인앱 미리보기 지원)',
        rawText: `SmartLab 지원자 공식 구글 닥스 서류 링크: ${SHARED_GDOC_LINK}`,
        uploadedAt: '14:35:00'
      },
      {
        id: 'doc-2-hwp',
        title: '이지은_연구계획서_및_서식.hwp',
        type: 'hwp',
        fileSize: '3.1 MB',
        contentSnippet: '컴퓨터 비전 실시간 객체 인식 및 자율주행 센서 퓨전 프로젝트 리드',
        rawText: '1. 지원 배경 및 동기\n2. 주요 연구 실적: 비전 트랜스포머(ViT) 및 YOLOv10을 결합한 실시간 임베디드 엣지 비전 파이프라인 구축\n3. SmartLab 랩실 기여 방안: 자율주행 소모임 멘토링 및 하계 오픈소스 스프린트 주관'
      },
      {
        id: 'doc-2-url',
        title: '이지은 노션 포트폴리오 (외부 링크)',
        type: 'url',
        url: 'https://notion.site/jieun-vision-portfolio',
        fileSize: '웹 페이지',
        contentSnippet: '노션 기반 인터랙티브 비전 AI 데모 및 인터뷰 질문 레퍼런스',
        rawText: '노션 상세 포트폴리오:\n- Vision AI 실시간 데모 영상 3편 수록\n- 학부 졸업작품 최우수상 수상 논문 전문 포함\n- 깃허브 오픈소스 스타 150+ 기록'
      }
    ],
    sttTranscript: [],
    aiInsights: {
      realtimeSummaries: [],
      tailQuestions: [],
      contradictions: []
    }
  },
  {
    id: 'cand-3',
    roomId: 'room-2',
    name: '박준혁',
    track: '풀스택 & 클라우드',
    studentId: '202213309',
    phone: '010-7712-4432',
    email: 'junhyuk@smartlab.edu',
    timeslot: {
      start: '14:00',
      end: '14:30',
      room: 'SmartLab Studio 2 (풀스택 & 클라우드)'
    },
    status: 'PENDING',
    interviewers: ['최수민 면접관', '정동훈 면접관', '강민지 면접관'],
    documents: [
      {
        id: 'doc-3-gdoc',
        title: '면접평가기준',
        type: 'gdocs',
        url: SHARED_GDOC_LINK,
        fileSize: 'Google Docs (인앱 연동)',
        contentSnippet: '구글 닥스 지원서류 원본 (인앱 미리보기 지원)',
        rawText: `SmartLab 지원자 공식 구글 닥스 서류 링크: ${SHARED_GDOC_LINK}`,
        uploadedAt: '14:00:00'
      },
      {
        id: 'doc-3-docx',
        title: '박준혁_클라우드_아키텍처_설계서.doc',
        type: 'doc',
        fileSize: '5.2 MB',
        contentSnippet: '초당 10만 TPS 분산 트랜잭션 처리 및 이벤트 드리븐 마이크로서비스 설계',
        rawText: '대용량 트래픽 처리를 위한 백엔드 인프라 설계 보고서:\n- Kafka와 Redis 분산 락을 이용한 고성능 선착순 예매 트랜잭션 완결성 보장\n- Kubernetes 오토스케일링 및 장애 복구(Failover) 무중단 배포 전략'
      },
      {
        id: 'doc-3-xlsx',
        title: '박준혁_부하테스트_벤치마크_결과표.xlsx',
        type: 'xlsx',
        fileSize: '820 KB',
        contentSnippet: 'k6 부하 테스트 TPS, p99 지연 시간 및 서버 리소스 사용률 데이터',
        rawText: '벤치마크 데이터 요약 (k6 Spike Test):\n- 가상 사용자 (VU): 5,000명 동시 접속\n- 처리량: 평균 84,200 TPS (최대 112,000 TPS)\n- 응답 지연: p95 18ms / p99 42ms\n- 에러율: 0.001% 미만'
      }
    ],
    sttTranscript: [],
    aiInsights: {
      realtimeSummaries: [],
      tailQuestions: [],
      contradictions: []
    }
  }
];

export const initialKnowledgeBase: AIKnowledgeItem[] = [
  {
    id: 'kb-yt-1',
    title: 'SmartLab 2026 AI 세미나: 실전 LLM 멀티에이전트 & RAG 아키텍처',
    sourceType: 'youtube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeVideoId: 'dQw4w9WgXcQ',
    description: '스마트랩 핵심 기술 세미나 - 온디바이스 양자화, vLLM 서빙, 에이전트 도구 호출(Tool Calling) 최적화 강의 영상',
    content: 'SmartLab AI 리서치 팀의 2026 최신 기술 스택 세미나 녹화본입니다. LangChain 및 LlamaIndex의 한계를 극복하기 위해 자체 오케스트레이터를 구축한 사례와 4비트 AWQ 양자화 모델 배포 시 지연시간 개선 기법을 다룹니다.',
    tags: ['YouTube', 'AI 엔지니어링', 'LLM', 'Multi-Agent', 'vLLM'],
    extractedInsights: {
      summary: '멀티에이전트 오케스트레이션 설계와 vLLM 추론 엔진 최적화, KV Cache 절약 및 실시간 툴 콜링 신뢰성 확보 전략',
      keyConcepts: ['Multi-Agent Architecture', 'Tool Calling Fallback', '4-bit Quantization (AWQ)', 'KV Cache Compression', 'vLLM Inference'],
      suggestedQuestions: [
        '에이전트 간 비동기 메시지 전달 시 발생할 수 있는 교착 상태(Deadlock)나 환각 루프를 어떻게 방지했나요?',
        '4비트 양자화 모델 배포 시 긴 컨텍스트에서의 PPL(Perplexity) 저하 문제를 어떻게 측정하고 보완했나요?',
        'vLLM Continuous Batching 환경에서 GPU 메모리 파편화를 제어해 본 경험이 있나요?'
      ],
      evaluationCriteria: [
        '최신 LLM 프레임워크의 내부 동작 원리를 깊이 이해하고 있는가',
        '단순 API 호출을 넘어 성능 최적화 및 프로덕션 레벨 트러블슈팅 경험이 있는가'
      ],
      redFlags: ['프롬프트 엔지니어링 수준에만 머물러 있고 모델 구조나 서빙 병목을 모름', '오픈소스 패키지를 그대로 복사해 튜닝 경험 없음']
    },
    isActive: true,
    createdAt: '2026. 8. 20. 14:00:00',
    fileSize: 'YouTube 비디오',
    addedBy: '동아리 관리자 (Admin)'
  },
  {
    id: 'kb-doc-1',
    title: '2026 SmartLab 인재상 및 합격자 평가 가이드라인',
    sourceType: 'document',
    description: '스마트랩 동아리 4대 핵심 가치와 컬처핏/문제해결력 심층 평가 기준',
    content: 'SmartLab은 능동적으로 기술적 병목을 해결하고 팀원과 지식을 공유하는 엔지니어를 지향합니다. 실패한 프로젝트라도 원인을 논리적으로 분석하고 회고한 경험을 높게 평가합니다.',
    tags: ['동아리 인재상', '평가 기준', '컬처핏', '필수 지침'],
    extractedInsights: {
      summary: 'SmartLab의 핵심 인재상 4요소: 능동적 문제해결, 투명한 소통 및 지식 공유, 기술적 끈기, 동료 존중',
      keyConcepts: ['협업 마인드셋', '기술적 집요함', '실패 회고 능력', '두괄식 커뮤니케이션'],
      suggestedQuestions: [
        '가장 크게 실패했던 프로젝트에서 무엇을 배웠고, 그 경험이 본인의 개발 습관을 어떻게 바꾸었나요?',
        '팀원이 본인의 코드나 아키텍처에 강하게 반대했을 때 어떤 방식으로 타협점을 찾았나요?'
      ],
      evaluationCriteria: [
        '상대방의 의견을 경청하고 감정적이지 않게 논리적으로 의견을 개진하는가',
        '어려운 기술적 문제를 만났을 때 회피하지 않고 원인을 파고드는 집요함이 있는가'
      ],
      redFlags: ['팀 프로젝트 실패 원인을 팀원 탓으로 돌림', '자신의 코드 스타일에 대한 고집으로 피드백 거부']
    },
    isActive: true,
    createdAt: '2026. 8. 21. 10:30:00',
    fileSize: '1.2 MB (문서)',
    addedBy: '동아리 관리자 (Admin)'
  }
];

export const db: DatabaseState = {
  rooms: [...initialRooms],
  candidates: [...initialCandidates],
  evaluations: [],
  notifications: [],
  auditLogs: [
    {
      id: 'log-init',
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: '시스템',
      field: 'SYSTEM_BOOT',
      beforeVal: null,
      afterVal: 'SmartLab 클라우드 데이터베이스 연동 준비 완료',
      reason: '시스템 부팅'
    }
  ],
  settings: {
    isCriteriaConfirmed: false, // Must be confirmed by Admin before interview evaluations have effect
    criteriaConfirmedAt: undefined,
    criteriaConfirmedBy: undefined,
    scoringFormula: 'TRIMMED_MEAN',
    passThresholdScore: 70,
    criteria: defaultCriteria,
    weights: {
      technical: 40,
      problemSolving: 30,
      communication: 20,
      cultureFit: 10
    },
    panelSize: 3,
    adminOverrideWindowSeconds: 300,
    aiProvider: 'groq',
    aiModel: 'llama-3.3-70b-versatile',
    knowledgeBase: [...initialKnowledgeBase]
  },
  adminUnlock: {
    candidateId: null,
    expiresAt: null
  }
};

const DOC_ID = 'smartlab_state_v1';
const COLLECTION_NAME = 'app_state';
const LOCAL_CACHE_PATH = path.join(process.cwd(), '.smartlab_state_cache.json');

// Try reading local cache immediately on module load for instant server boot
try {
  if (existsSync(LOCAL_CACHE_PATH)) {
    const raw = readFileSync(LOCAL_CACHE_PATH, 'utf8');
    const localData = JSON.parse(raw);
    if (Array.isArray(localData.rooms)) db.rooms = localData.rooms;
    if (Array.isArray(localData.candidates)) {
      db.candidates = localData.candidates.map((c: Candidate) => {
        const docs = Array.isArray(c.documents) ? [...c.documents] : [];
        const existingGdoc = docs.find(d => d.url && d.url.includes('1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4'));
        if (!existingGdoc) {
          docs.unshift({
            id: `gdoc-${c.id}`,
            title: '면접평가기준',
            type: 'gdocs',
            url: SHARED_GDOC_LINK,
            fileSize: 'Google Docs (인앱 연동)',
            contentSnippet: '구글 닥스 면접평가기준 원본 (인앱 미리보기 지원)',
            rawText: `SmartLab 지원자 공식 구글 닥스 서류 링크: ${SHARED_GDOC_LINK}`,
            uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
          });
        } else {
          existingGdoc.title = '면접평가기준';
        }
        return { ...c, documents: docs };
      });
    }
    if (Array.isArray(localData.evaluations)) db.evaluations = localData.evaluations;
    if (Array.isArray(localData.auditLogs)) db.auditLogs = localData.auditLogs;
    if (localData.settings) db.settings = { ...db.settings, ...localData.settings };
    console.log(`[SmartLab Cache] Loaded local state from disk. Rooms: ${db.rooms.length}, Candidates: ${db.candidates.length}`);
  }
} catch (e) {
  // Ignore local cache read error
}

/**
 * Loads entire persistent state from Firestore on server startup or recovery with a safe timeout
 */
export async function loadCloudState(): Promise<void> {
  if (!firestoreInstance) {
    console.warn('[Firebase Cloud Store] Firestore is not configured, running on local memory.');
    return;
  }

  try {
    const fetchPromise = async () => {
      const docRef = doc(firestoreInstance!, COLLECTION_NAME, DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.rooms)) db.rooms = data.rooms;
        if (Array.isArray(data.candidates)) {
          db.candidates = data.candidates.map((c: Candidate) => {
            const docs = Array.isArray(c.documents) ? [...c.documents] : [];
            const existingGdoc = docs.find(d => d.url && d.url.includes('1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4'));
            if (!existingGdoc) {
              docs.unshift({
                id: `gdoc-${c.id}`,
                title: '면접평가기준',
                type: 'gdocs',
                url: SHARED_GDOC_LINK,
                fileSize: 'Google Docs (인앱 연동)',
                contentSnippet: '구글 닥스 면접평가기준 원본 (인앱 미리보기 지원)',
                rawText: `SmartLab 지원자 공식 구글 닥스 서류 링크: ${SHARED_GDOC_LINK}`,
                uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
              });
            } else {
              existingGdoc.title = '면접평가기준';
            }
            return { ...c, documents: docs };
          });
        }
        if (Array.isArray(data.evaluations)) db.evaluations = data.evaluations;
        if (Array.isArray(data.auditLogs)) db.auditLogs = data.auditLogs;
        if (data.settings) db.settings = { ...db.settings, ...data.settings };
        console.log(`[Firebase Cloud Store] State successfully loaded. Rooms: ${db.rooms.length}, Candidates: ${db.candidates.length}, Evaluations: ${db.evaluations.length}`);
      } else {
        console.log('[Firebase Cloud Store] No existing cloud state found. Initializing new state...');
        await saveCloudState();
      }
    };

    // Safe 2500ms timeout race so server startup is never blocked
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore connection timeout')), 2500)
    );

    await Promise.race([fetchPromise(), timeoutPromise]);
  } catch (e: any) {
    console.warn('[Firebase Cloud Store] Proceeding with current state cache:', e.message || e);
  }
}

/**
 * Saves current in-memory database state to Firestore & local cache with debounce protection
 */
let saveTimeout: NodeJS.Timeout | null = null;
export async function saveCloudState(): Promise<void> {
  // Save to local cache first
  try {
    const fs = await import('fs');
    fs.writeFileSync(
      LOCAL_CACHE_PATH,
      JSON.stringify(
        {
          rooms: db.rooms,
          candidates: db.candidates,
          evaluations: db.evaluations,
          auditLogs: db.auditLogs.slice(0, 100),
          settings: db.settings,
          lastUpdatedAt: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (e) {
    // Ignore local save errors
  }

  if (!firestoreInstance) return;

  if (saveTimeout) clearTimeout(saveTimeout);

  return new Promise((resolve) => {
    saveTimeout = setTimeout(async () => {
      try {
        const docRef = doc(firestoreInstance!, COLLECTION_NAME, DOC_ID);
        await setDoc(docRef, {
          rooms: db.rooms,
          candidates: db.candidates,
          evaluations: db.evaluations,
          auditLogs: db.auditLogs.slice(0, 100), // Keep recent 100 logs
          settings: db.settings,
          lastUpdatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error('[Firebase Cloud Store] Error saving state:', e);
      } finally {
        resolve();
      }
    }, 150); // Fast 150ms debounce
  });
}
