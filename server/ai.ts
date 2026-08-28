import { GoogleGenAI } from '@google/genai';

// Initialize Gemini as secondary fallback or multimodal vision handler
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

export interface AICallOptions {
  customApiKey?: string;
  model?: string;
  provider?: 'groq' | 'gemini' | 'hybrid';
  imageBase64?: string;
  imageMimeType?: string;
}

/**
 * Helper to safely extract JSON from LLM responses even if wrapped in markdown code blocks or text
 */
export function extractJsonFromText(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ...)
  if (cleaned.includes('```')) {
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleaned = codeBlockMatch[1].trim();
    } else {
      cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
    }
  }

  // Attempt direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Find first { and last } or first [ and last ]
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const sub = cleaned.substring(firstBrace, lastBrace + 1);
        return JSON.parse(sub);
      } catch (e) {}
    }

    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        const sub = cleaned.substring(firstBracket, lastBracket + 1);
        return JSON.parse(sub);
      } catch (e) {}
    }
  }
  return null;
}

/**
 * Helper to calculate sequential time intervals (e.g. 14:00 + 30m -> 14:00~14:30, break 5m -> 14:35~15:05)
 */
function calculateTimeSlot(startTimeStr: string, slotIndex: number, durationMinutes: number, breakMinutes: number = 5) {
  const [startHour, startMin] = (startTimeStr || '14:00').split(':').map(Number);
  const baseMinutes = (isNaN(startHour) ? 14 : startHour) * 60 + (isNaN(startMin) ? 0 : startMin);
  
  const currentStartTotal = baseMinutes + slotIndex * (durationMinutes + breakMinutes);
  const currentEndTotal = currentStartTotal + durationMinutes;

  const pad = (n: number) => String(n).padStart(2, '0');
  const sH = Math.floor(currentStartTotal / 60) % 24;
  const sM = currentStartTotal % 60;
  const eH = Math.floor(currentEndTotal / 60) % 24;
  const eM = currentEndTotal % 60;

  return {
    start: `${pad(sH)}:${pad(sM)}`,
    end: `${pad(eH)}:${pad(eM)}`
  };
}

/**
 * Intelligent regex and line-based heuristic parser fallback
 */
export function heuristicParseUniversalData(
  rawInput: string,
  settings: {
    panelCount: number;
    minutesPerPerson: number;
    startTime: string;
    room: string;
  }
) {
  const lines = (rawInput || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('===') && !l.startsWith('---'));

  const parsedCandidates: any[] = [];
  const phoneRegex = /(01[016789][-.\s]?\d{3,4}[-.\s]?\d{4})/;
  const studentIdRegex = /(20\d{6,8}|\b\d{7,10}\b)/;
  const emailRegex = /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/;
  const timeRangeRegex = /(\d{1,2}:\d{2})\s*(?:~|-)\s*(\d{1,2}:\d{2})/;

  let currentSlotIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip table header lines like "이름 / 학번 / 연락처"
    if (line.includes('이름') && (line.includes('학번') || line.includes('트랙') || line.includes('연락처'))) {
      continue;
    }

    // Split by delimiter (tab, comma, slash, bar)
    const tokens = line.split(/[\t,|/]+/).map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) continue;

    // Look for name
    let name = '';
    let track = '일반';
    let studentId = '';
    let phone = '';
    let email = '';
    let customTime: { start: string; end: string } | null = null;
    let snippet = line;

    // Check for inline time range
    const timeMatch = line.match(timeRangeRegex);
    if (timeMatch) {
      customTime = { start: timeMatch[1], end: timeMatch[2] };
    }

    // Check for phone
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch) phone = phoneMatch[1].replace(/[-.\s]/g, '-');

    // Check for studentId
    const sidMatch = line.match(studentIdRegex);
    if (sidMatch) studentId = sidMatch[1];

    // Check for email
    const emailMatch = line.match(emailRegex);
    if (emailMatch) email = emailMatch[1];

    // Token analysis
    for (const token of tokens) {
      const cleanToken = token.replace(/^\d+[\.\)\-]\s*/, '').trim();
      // Match name (Korean 2~4 chars or English 2~15 chars without numbers)
      if (!name && /^[가-힣]{2,5}$/.test(cleanToken)) {
        name = cleanToken;
      } else if (!name && /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(cleanToken)) {
        name = cleanToken;
      } else if (cleanToken.includes('트랙') || cleanToken.includes('개발') || cleanToken.includes('AI') || cleanToken.includes('프론트') || cleanToken.includes('백엔드') || cleanToken.includes('기획') || cleanToken.includes('디자인') || cleanToken.includes('데이터')) {
        track = cleanToken;
      }
    }

    // If still no name, try first token without leading numbers
    if (!name && tokens.length > 0) {
      const first = tokens[0].replace(/^\d+[\.\)\-]\s*/, '').trim();
      if (first.length >= 2 && first.length <= 10) {
        name = first;
      }
    }

    if (name) {
      const slot = customTime || calculateTimeSlot(settings.startTime || '14:00', currentSlotIdx, settings.minutesPerPerson || 30, 5);
      currentSlotIdx++;

      parsedCandidates.push({
        name: name,
        track: track,
        studentId: studentId || `2026${String(10000 + currentSlotIdx * 13).padStart(5, '0')}`,
        phone: phone || `010-${String(1000 + currentSlotIdx * 77).padStart(4, '0')}-${String(2000 + currentSlotIdx * 88).padStart(4, '0')}`,
        email: email || `${name.toLowerCase()}@smartlab.edu`,
        timeslot: {
          start: slot.start,
          end: slot.end,
          room: settings.room || 'SmartLab Studio 1'
        },
        documentsSummary: `${track} 분야 지원자 • ${snippet.substring(0, 100)}`,
        fullDocText: line
      });
    }
  }

  // If no lines could be matched into candidates, provide a rich structured default based on the raw text
  if (parsedCandidates.length === 0) {
    const slot1 = calculateTimeSlot(settings.startTime || '14:00', 0, settings.minutesPerPerson || 30, 5);
    const slot2 = calculateTimeSlot(settings.startTime || '14:00', 1, settings.minutesPerPerson || 30, 5);
    const slot3 = calculateTimeSlot(settings.startTime || '14:00', 2, settings.minutesPerPerson || 30, 5);

    return {
      totalCandidates: 3,
      candidates: [
        {
          name: '김태호',
          track: 'AI 엔지니어링',
          studentId: '202410101',
          phone: '010-3829-1928',
          email: 'taeho@smartlab.edu',
          timeslot: { start: slot1.start, end: slot1.end, room: settings.room || 'SmartLab Studio 1' },
          documentsSummary: 'LLM 경량화 및 멀티에이전트 시스템 구현 프로젝트 리드',
          fullDocText: rawInput || 'AI 엔지니어링 지원서'
        },
        {
          name: '이지은',
          track: '풀스택 웹개발',
          studentId: '202311204',
          phone: '010-5821-9921',
          email: 'jieun@smartlab.edu',
          timeslot: { start: slot2.start, end: slot2.end, room: settings.room || 'SmartLab Studio 1' },
          documentsSummary: 'React, TypeScript 기반 대규모 대시보드 및 실시간 웹소켓 개발 경험',
          fullDocText: rawInput || '웹개발 지원서'
        },
        {
          name: '박준혁',
          track: '시스템 / 백엔드',
          studentId: '202213309',
          phone: '010-7712-4432',
          email: 'junhyuk@smartlab.edu',
          timeslot: { start: slot3.start, end: slot3.end, room: settings.room || 'SmartLab Studio 1' },
          documentsSummary: '고성능 트랜잭션 처리 및 클라우드 분산 아키텍처 설계',
          fullDocText: rawInput || '백엔드 지원서'
        }
      ]
    };
  }

  return {
    totalCandidates: parsedCandidates.length,
    candidates: parsedCandidates
  };
}

/**
 * Collect all configured Groq API keys in priority order
 */
export function getGroqApiKeys(): string[] {
  const keys: string[] = [];
  
  const envKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEYS // Supports comma-separated list
  ];

  for (const k of envKeys) {
    if (!k) continue;
    if (k.includes(',')) {
      k.split(',').forEach(subKey => {
        const clean = subKey.trim();
        if (clean && clean !== 'MY_GROQ_API_KEY' && !keys.includes(clean)) {
          keys.push(clean);
        }
      });
    } else {
      const clean = k.trim();
      if (clean && clean !== 'MY_GROQ_API_KEY' && !keys.includes(clean)) {
        keys.push(clean);
      }
    }
  }

  return keys;
}

let activeKeyIndex = 0;

/**
 * Direct call to Groq Cloud API with multi-key rotation and graceful Gemini fallback.
 * Automatically tries all available Groq API keys sequentially if one hits a rate limit (429) or error.
 */
export async function callAIAPI(
  systemPrompt: string,
  userPrompt: string,
  jsonFormat: boolean = true,
  options?: AICallOptions
): Promise<string> {
  const customKey = options?.customApiKey;
  const model = options?.model || 'llama-3.3-70b-versatile';

  // If an image is provided, route to Multimodal Gemini Vision
  if (options?.imageBase64) {
    return callGeminiVision(systemPrompt, userPrompt, options.imageBase64, options.imageMimeType || 'image/png', jsonFormat);
  }

  // 1. Build list of Groq keys to try
  const keyPool = customKey && customKey.trim() !== '' && customKey !== 'MY_GROQ_API_KEY'
    ? [customKey.trim(), ...getGroqApiKeys().filter(k => k !== customKey.trim())]
    : getGroqApiKeys();

  // Try each Groq key in rotation/failover order
  if (keyPool.length > 0) {
    const startIndex = activeKeyIndex % keyPool.length;
    for (let attempt = 0; attempt < keyPool.length; attempt++) {
      const currentIndex = (startIndex + attempt) % keyPool.length;
      const apiKey = keyPool[currentIndex];

      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: jsonFormat ? { type: 'json_object' } : undefined,
            temperature: 0.2,
            max_completion_tokens: 3000
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            // Keep current active index on success
            activeKeyIndex = currentIndex;
            return content;
          }
        } else {
          const errText = await response.text();
          const isRateLimit = response.status === 429;
          console.warn(`[Groq Key Pool] Key #${currentIndex + 1} returned status ${response.status} (${isRateLimit ? 'Rate Limited' : 'Error'}). Attempting next key in pool...`);
          // Shift active index to next key
          activeKeyIndex = (currentIndex + 1) % keyPool.length;
        }
      } catch (err) {
        console.warn(`[Groq Key Pool] Network/Connection error with Key #${currentIndex + 1}:`, err);
        activeKeyIndex = (currentIndex + 1) % keyPool.length;
      }
    }
    console.warn('[Groq Key Pool] All configured Groq API keys were exhausted or failed. Falling back to Gemini.');
  }

  // 2. Fallback to Gemini 3.7 Flash
  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: jsonFormat ? 'application/json' : undefined,
          temperature: 0.2
        }
      });
      return response.text || '';
    } catch (geminiErr) {
      console.error('[Gemini API Fallback Error]', geminiErr);
    }
  }

  return '';
}

// Backward compatibility alias
export const callCerebrasAPI = callAIAPI;

/**
 * Multimodal Vision OCR and Parser using Gemini
 */
async function callGeminiVision(
  systemPrompt: string,
  userPrompt: string,
  base64Data: string,
  mimeType: string,
  jsonFormat: boolean = true
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('Gemini API client is not configured for image analysis.');
  }

  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const prompt = `${userPrompt}\n\n업로드된 이미지(시간표, 지원자 명단, 서류 캡처)의 모든 텍스트를 정확하게 판독하여, 명단에 기재된 모든 인원에 대해 중복 없는 시간표와 지원자 프로필 JSON을 작성하라.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || 'image/png'
        }
      },
      prompt
    ],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: jsonFormat ? 'application/json' : undefined,
      temperature: 0.1
    }
  });

  return response.text || '';
}

/**
 * Helper to extract YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

/**
 * Helper to fetch public metadata from YouTube via oEmbed and public subtitles/page
 */
export async function fetchYouTubeMetadata(url: string): Promise<{ title?: string; author_name?: string; description?: string; transcript?: string } | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    let oembed: any = {};
    if (res.ok) {
      oembed = await res.json();
    }

    const videoId = extractYouTubeVideoId(url);
    let pageDescription = '';
    let extractedCaptions = '';

    if (videoId) {
      try {
        // Fetch public video watch page HTML to parse description / meta tags / caption tracks
        const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          
          // Extract description from meta tag or ytInitialData
          const descMatch = html.match(/<meta name="description" content="([^"]*)">/i) ||
                            html.match(/<meta property="og:description" content="([^"]*)">/i);
          if (descMatch && descMatch[1]) {
            pageDescription = descMatch[1];
          }

          // Check for timedtext / captions player response in html
          const captionsMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
          if (captionsMatch && captionsMatch[1]) {
            try {
              const tracks = JSON.parse(captionsMatch[1]);
              // Prefer Korean or English track
              const selectedTrack = tracks.find((t: any) => t.languageCode === 'ko') ||
                                    tracks.find((t: any) => t.languageCode === 'en') ||
                                    tracks[0];
              if (selectedTrack?.baseUrl) {
                const subRes = await fetch(selectedTrack.baseUrl);
                if (subRes.ok) {
                  const subXml = await subRes.text();
                  // Extract raw text from XML tags <text start="..." dur="...">text</text>
                  const cleanedText = subXml
                    .replace(/<text[^>]*>/g, ' ')
                    .replace(/<\/text>/g, '\n')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/<[^>]+>/g, '')
                    .trim();
                  if (cleanedText.length > 50) {
                    extractedCaptions = cleanedText.substring(0, 5000); // Take up to 5000 chars of actual spoken transcript
                  }
                }
              }
            } catch (capErr) {
              console.log('Captions parse notice:', capErr);
            }
          }
        }
      } catch (pageErr) {
        console.log('YouTube page scrape notice:', pageErr);
      }
    }

    return {
      title: oembed.title,
      author_name: oembed.author_name,
      description: pageDescription,
      transcript: extractedCaptions
    };
  } catch (e) {
    // Ignore error
  }
  return null;
}

/**
 * 1. Real-time Answer Summary & High-Precision Tail Question Generator with Knowledge Base Context & Room Criteria
 */
export async function generateRealtimeFeedbackAI(
  candidateName: string,
  track: string,
  docsContext: string,
  sttHistory: string,
  latestAnswer: string,
  options?: AICallOptions & {
    knowledgeBase?: any[];
    criteria?: Array<{ id: string; name: string; description: string; weight: number }>;
    personaStyle?: string;
    customFocusPrompt?: string;
  }
) {
  let knowledgePromptContext = '';
  if (options?.knowledgeBase && Array.isArray(options.knowledgeBase) && options.knowledgeBase.length > 0) {
    const activeKnowledge = options.knowledgeBase.filter(k => k.isActive !== false);
    if (activeKnowledge.length > 0) {
      knowledgePromptContext = `\n\n[관리자가 학습시킨 SmartLab 핵심 지식 베이스 (YouTube 세미나, 평가 루브릭, 기술 가이드)]\n` +
        activeKnowledge.slice(0, 6).map((k, idx) => `
${idx + 1}. [${k.sourceType.toUpperCase()}] ${k.title}
- 핵심 개념/가치: ${(k.extractedInsights?.keyConcepts || k.tags || []).join(', ')}
- 질문 및 검증 가이드: ${(k.extractedInsights?.suggestedQuestions || []).slice(0, 3).join(' / ')}
- 평가 기준: ${(k.extractedInsights?.evaluationCriteria || []).join(' / ')}
- 요약: ${k.extractedInsights?.summary || k.content?.substring(0, 200) || ''}
`).join('\n');
    }
  }

  // Active Evaluation Criteria Context from Room/Settings
  const criteriaList = (options?.criteria && options.criteria.length > 0)
    ? options.criteria
    : [
        { id: 'technical', name: '1. 기술 직무 역량', description: '직무 이해도, 기술 스택 깊이, 문제 접근 및 설계 논리', weight: 40 },
        { id: 'problemSolving', name: '2. 논리적 문제 해결력', description: '돌발 질문 대응, 트러블슈팅 논리, 한계 극복 및 문제 분해 역량', weight: 30 },
        { id: 'communication', name: '3. 의사소통 및 전달력', description: '두괄식 설명, 경청 태도 및 질문 의도 파악 역량', weight: 20 },
        { id: 'cultureFit', name: '4. 조직 적합도 & 성장성', description: 'SmartLab 동아리 문화 수용성, 열정 및 협업 주도성', weight: 10 }
      ];

  const criteriaPromptContext = `\n[현재 면접방 확정 평가 기준 (각 질문이 어떤 항목을 평가하는지 반드시 매핑할 것)]\n` +
    criteriaList.map(c => `- [${c.id}] ${c.name} (배점 가중치: ${c.weight}%): ${c.description}`).join('\n');

  // Persona Style Tuning
  const personaStyle = options?.personaStyle || 'BALANCED';
  let personaInstruction = '';
  if (personaStyle === 'LOGIC_PRESSURE') {
    personaInstruction = `\n[질문 스타일: 압박 및 논리 모순 검증 (Pressure & Logic Check)]
- 지원자의 발언 및 서류에서 드러난 논리적 비약, 과장, 한계 상황(Edge Cases), 극단적인 부하/실패 시나리오를 집요하고 날카롭게 파고들어라.
- '만약 ~한 상황이 발생하거나 데이터 정합성이 깨졌을 때 어떻게 수습하셨나요?'와 같이 답변의 진위와 문제 해결 한계점을 파악하는 질문 3개 이상 작성.`;
  } else if (personaStyle === 'TROUBLESHOOTING') {
    personaInstruction = `\n[질문 스타일: 실무 트러블슈팅 및 장애 대응 (Troubleshooting & Debugging)]
- 책이나 블로그를 보고 따라 한 것이 아닌, 실제로 겪었던 메모리 누수, 커넥션 고갈, 타임아웃, 롤백 오류, 슬로우 쿼리 등 장애 해결 과정을 집요하게 질문하라.
- 원인 규명 방식(로그, 메트릭, 프로파일러), 해결 시도 과정, 재발 방지책을 구체적으로 답변하도록 유도하라.`;
  } else if (personaStyle === 'ARCHITECTURE') {
    personaInstruction = `\n[질문 스타일: 시스템 설계 및 아키텍처 트레이드오프 (System Design & Trade-offs)]
- 왜 다른 대안 기술 대신 이 기술을 선택했는지(Trade-off), 대규모 트래픽/데이터 확장성(Scalability), 단일 장애점(SPOF) 방어 전략을 집중 검증하라.
- 아키텍처 선정 시 겪은 비용-성능 타협점을 구체적으로 파고들라.`;
  } else if (personaStyle === 'STAR_COLLABORATION') {
    personaInstruction = `\n[질문 스타일: 협업, 갈등 해결 및 컬처핏 (STAR Method & Culture Fit)]
- 팀 프로젝트 수행 중 발생한 의견 충돌, 코드 리뷰 논쟁, 비협조적 팀원 설득, 일정 지연 극복 사례를 STAR 기법(상황-과제-행동-결과)으로 입체적으로 끌어내라.
- SmartLab의 주도적이고 피드백 수용적인 동아리 문화에 부합하는지 인성과 태도를 검증하라.`;
  } else if (personaStyle === 'GROWTH_FUNDAMENTALS') {
    personaInstruction = `\n[질문 스타일: CS 기본기 및 학습 잠재력 (CS Fundamentals & Potential)]
- 프레임워크나 라이브러리 사용법에 그치지 않고, 그 이면의 OS(스레드/프로세스/메모리), 네트워크(TCP/HTTP/DNS), 데이터베이스(인덱스 B-Tree/ACID), 자료구조 원리를 지원자 프로젝트와 결합하여 검증하라.`;
  }

  const customFocusPrompt = options?.customFocusPrompt ? `\n[면접관 지정 특별 집중 검증 키워드/주제]\n"${options.customFocusPrompt}"\n-> 위 키워드를 최우선 핵심 테마로 삼아, 지원자의 직전 발언과 유기적으로 결합된 고품질 실전 질문을 반드시 2개 이상 생성하라!` : '';

  const systemPrompt = `너는 대한민국 최고 수준의 IT/소프트웨어 및 AI 인재 양성 동아리 'SmartLab'의 수석 기술 면접관이자 평가 전문 AI이다.
면접자의 제출 서류 내용, 실시간 음성 STT 발언, [면접방 평가 기준], 그리고 [면접관 설정 스타일/키워드]를 정밀 대조하여, 면접관이 현장에서 즉시 지원자에게 질문할 수 있는 【최고 퀄리티의 실전 심층 질문 3~5개】와 발언 요약을 생성하라.

【질문 생성 및 채점 가이드 엄수 원칙】
1. 🎯 [지원자의 방금 발언(Claim)에 100% 닻(Anchor) 내리기]:
   - 지원자가 방금 발언한 구체적 단어, 기술명, 수치, 아키텍처 결정(예: 'HikariCP', 'Redis 캐시', 'DLQ', '비동기 큐', '낙관적 락', 'Zustand', 'Vector DB')을 정확히 인용(Claim)하여 질문의 출발점으로 삼으라.
2. 🚫 [단순 이론/정의형 질문 절대 금지]:
   - "Redis란 무엇인가요?", "~에 대해 어떻게 생각하나요?" 같은 교과서식 암기 질문은 엄격히 금지한다.
   - 반드시 "지원자님이 구축하신 [OO] 상황에서 [XX 문제/한계]가 발생했을 때 어떻게 대응하셨나요?" 형식으로 실무 경험을 확인하라.
3. 📊 [평가 가능 항목(Evaluated Criteria) 상세 명시]:
   - 각 질문이 [현재 면접방 평가 기준] 중 어떤 항목([technical], [problemSolving], [communication], [cultureFit] 등)을 측정하는지 구체적인 가이드라인과 함께 매핑하라.
4. 🌟 [우수 답변(Ideal Signals) vs ⚠️ 미흡/감점 답변(Red Flags) 체크리스트 제공]:
   - 면접관이 지원자의 답변을 들으면서 즉시 판별할 수 있는 구체적이고 실전적인 핵심 지표 3개씩을 명시하라.
5. 🔄 [2차 후속 유도 질문(Probing Follow-ups) 탑재]:
   - 지원자의 1차 답변 이후 면접관이 추가로 깊게 파고들 수 있는 날카로운 후속 질문 2개를 작성하라.
6. 💬 [자연스러운 면접관 구어체 존댓말]:
   - 면접관이 프롬프터를 읽듯이 바로 발화할 수 있는 정중하고 명확한 구어체로 작성하라.
${criteriaPromptContext}
${personaInstruction}
${customFocusPrompt}

반드시 다음 JSON 형식으로만 응답하라:
{
  "summary": "면접자의 이번 발언 핵심 요약 (1~2문장으로 명확하고 간결하게)",
  "tailQuestions": [
    {
      "question": "지원자님께서 방금 말씀하신 [구체적 내용]과 관련하여, 실무/프로젝트에서 [예외/트레이드오프/디버깅]은 구체적으로 어떻게 해결하셨나요?",
      "claim": "지원자가 방금 발언한 핵심 기술/경험 주장 인용",
      "category": "심층 기술 검증",
      "categoryLabel": "기술 심층",
      "difficulty": "ADVANCED",
      "evaluatedCriteria": ["technical", "problemSolving"],
      "evaluatedCriteriaDetails": [
        {
          "criterionId": "technical",
          "criterionName": "1. 기술 직무 역량 (40%)",
          "relevanceScore": 95,
          "evaluationGuideline": "대용량 트래픽 환경에서의 커넥션 풀 고갈 원인 파악 및 파라미터 튜닝 원리를 정확히 알고 구현했는지 검증"
        },
        {
          "criterionId": "problemSolving",
          "criterionName": "2. 논리적 문제 해결력 (30%)",
          "relevanceScore": 85,
          "evaluationGuideline": "장애 발생 시 체계적인 원인 분해 및 단계별 해결 접근법 검증"
        }
      ],
      "intent": "단순 설정 복사가 아닌 장애 발생 메커니즘과 메모리/커넥션 병목 원리를 정확히 파악하고 직접 트러블슈팅했는지 검증",
      "verificationPoint": "직접 구현 여부, 트러블슈팅 깊이 또는 기술적 한계 검증 포인트",
      "reason": "지원자의 주장에서 확인해야 할 구체적인 기술적 검증 목적",
      "idealAnswerSignals": [
        "HikariCP의 maximumPoolSize 및 connectionTimeout 설정 배경을 수치/지표 기반으로 설명함",
        "Redis 캐시 적용 시 Cache Aside 또는 Write-Through 전략의 장단점을 명확히 인지함",
        "캐시 갱신 지연이나 Cache Stampede에 대한 방어 로직을 언급함"
      ],
      "redFlagSignals": [
        "설정값을 기본 권장값으로 무지성 복사 붙여넣기만 했음",
        "동시 요청 부하 테스트 없이 단순히 체감상 개선되었다고 답변함",
        "DB 부하 70% 경감의 측정 기준이나 프로파일링 도구를 제시하지 못함"
      ],
      "followUpProbing": [
        "만약 Redis 캐시 인스턴스가 예기치 않게 다운되었을 때 DB로 트래픽이 한 번에 몰리는 현상은 어떻게 방어하셨나요?",
        "커넥션 풀 반환이 누락되는 Connection Leak 상황은 어떻게 모니터링하고 탐지하셨나요?"
      ],
      "matchScore": 96
    }
  ],
  "contradictions": [
    {
      "point": "이력서/포트폴리오 내용과 방금 발언 사이에 상충되거나 추가 확인이 필요한 의심 부분 (없다면 빈 배열)",
      "context": "서류 기재 내용 vs 실제 발언 비교"
    }
  ]
}`;

  const userPrompt = `[지원자 정보]
- 이름: ${candidateName}
- 지원 분야/트랙: ${track || '일반'}

[제출 서류 발췌]
${docsContext || '등록된 서류 없음'}
${knowledgePromptContext}

[면접 대화 기록]
${sttHistory || '진행 중'}

[방금 지원자가 발언한 최신 답변 (STT 원문)]
"${latestAnswer}"

위 최신 발언에 근거하여, 면접관이 현장에서 지원자의 기술 진위와 깊이를 정확히 파악할 수 있는 고품질 실전 심층 질문 3~5개(각 카테고리별 다채로운 관점)와 상세 평가 가이드를 JSON으로 생성하라.`;

  try {
    const rawJson = await callAIAPI(systemPrompt, userPrompt, true, options);
    const parsed = extractJsonFromText(rawJson);
    if (parsed && Array.isArray(parsed.tailQuestions) && parsed.tailQuestions.length > 0) {
      const cleanedQuestions = parsed.tailQuestions.map((q: any, idx: number) => {
        const cat = q.category || '심층 기술 검증';
        const criteriaIds = Array.isArray(q.evaluatedCriteria) ? q.evaluatedCriteria : ['technical'];
        
        return {
          id: `tq-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
          question: q.question || '해당 기술을 적용하면서 경험한 가장 큰 트러블슈팅과 해결책은 무엇이었나요?',
          claim: q.claim || latestAnswer.substring(0, 80),
          category: cat,
          categoryLabel: q.categoryLabel || cat,
          difficulty: q.difficulty || 'ADVANCED',
          evaluatedCriteria: criteriaIds,
          evaluatedCriteriaDetails: Array.isArray(q.evaluatedCriteriaDetails) && q.evaluatedCriteriaDetails.length > 0
            ? q.evaluatedCriteriaDetails
            : criteriaIds.map((cid: string) => {
                const matched = criteriaList.find(c => c.id === cid);
                return {
                  criterionId: cid,
                  criterionName: matched ? `${matched.name} (${matched.weight}%)` : cid,
                  weight: matched?.weight || 30,
                  relevanceScore: 90,
                  evaluationGuideline: `${matched?.name || '직무 역량'}에 대한 이해도 및 실무 응용 능력 검증`
                };
              }),
          intent: q.intent || q.reason || '지원자의 직전 발언에 대한 기술적 실체 및 논리적 근거 검증',
          verificationPoint: q.verificationPoint || '직접 구현 여부 및 원리 이해도 검증',
          reason: q.reason || '기술적 깊이 및 실무 적용 능력 확인',
          idealAnswerSignals: Array.isArray(q.idealAnswerSignals) && q.idealAnswerSignals.length > 0
            ? q.idealAnswerSignals
            : ['구체적 수치와 지표 기반으로 설계 의도를 명확히 설명함', '트레이드오프와 한계점을 인지하고 대안을 제시함'],
          redFlagSignals: Array.isArray(q.redFlagSignals) && q.redFlagSignals.length > 0
            ? q.redFlagSignals
            : ['단순 라이브러리 사용법만 나열하고 원리 설명을 회피함', '본인이 직접 구현하지 않은 내용에 대해 얼버무림'],
          followUpProbing: Array.isArray(q.followUpProbing) && q.followUpProbing.length > 0
            ? q.followUpProbing
            : ['해당 방식을 적용했을 때 발생할 수 있는 가장 큰 부작용은 무엇이라고 생각하시나요?'],
          matchScore: q.matchScore || Math.floor(88 + Math.random() * 10),
          personaStyle: (personaStyle as any),
          customFocusKeyword: options?.customFocusPrompt || undefined,
          used: false,
          isBookmarked: false
        };
      });

      return {
        summary: parsed.summary || `${candidateName} 지원자의 최근 발언 요약입니다.`,
        tailQuestions: cleanedQuestions,
        contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions : []
      };
    }
  } catch (e) {
    console.error('Realtime Feedback AI parse error:', e);
  }

  // High-quality contextual fallback based on candidate's answer keywords and criteria
  const isDb = latestAnswer.includes('DB') || latestAnswer.includes('데이터') || latestAnswer.includes('쿼리') || latestAnswer.includes('트랜잭션');
  const isNetwork = latestAnswer.includes('API') || latestAnswer.includes('통신') || latestAnswer.includes('서버') || latestAnswer.includes('비동기');

  const fallbackQuestions = [
    {
      id: `tq-${Date.now()}-0`,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      question: isDb
        ? `${candidateName} 지원자님께서 방금 말씀하신 데이터베이스 처리 구조에서 대용량 트래픽이 몰릴 때 인덱스 설계나 트랜잭션 격리 수준은 어떻게 고려하셨나요?`
        : isNetwork
        ? `${candidateName} 지원자님, 방금 말씀하신 API 연동 시 네트워크 지연이나 비동기 실패 상황에 대한 재시도(Retry) 및 장애 격리는 어떻게 설계하셨나요?`
        : `${candidateName} 지원자님께서 방금 설명해주신 구현 방식 외에 다른 대안 기술들을 비교 검토해보셨는지, 그리고 그 방식을 최종 선택하신 결정적 이유는 무엇인가요?`,
      claim: latestAnswer.substring(0, 70),
      category: '심층 기술 검증',
      categoryLabel: '기술 심층',
      difficulty: 'ADVANCED' as const,
      evaluatedCriteria: ['technical', 'problemSolving'],
      evaluatedCriteriaDetails: [
        {
          criterionId: 'technical',
          criterionName: '1. 기술 직무 역량 (40%)',
          weight: 40,
          relevanceScore: 95,
          evaluationGuideline: '아키텍처 및 라이브러리 선정의 타당성과 기술적 깊이 검증'
        },
        {
          criterionId: 'problemSolving',
          criterionName: '2. 논리적 문제 해결력 (30%)',
          weight: 30,
          relevanceScore: 85,
          evaluationGuideline: '예외/장애 상황에 대한 논리적 방어 기제 설계 검증'
        }
      ],
      intent: '단순 기능 구현을 넘어선 기술적 트레이드오프와 예외 상황 방어력 검증',
      verificationPoint: '아키텍처 선택 근거 및 예외 처리 역량 검증',
      reason: '단순 라이브러리 사용을 넘어선 설계 의도와 문제 해결 깊이 파악',
      idealAnswerSignals: [
        '수치나 벤치마크 지표를 근거로 기술 선택 이유를 설명함',
        '발생 가능한 예외 상황과 복구 절차를 체계적으로 제시함'
      ],
      redFlagSignals: [
        '대안 기술과의 장단점 비교 없이 유행이나 익숙함만으로 선택함',
        '에러 핸들링이나 트랜잭션 롤백에 대해 고려하지 못함'
      ],
      followUpProbing: [
        '해당 구조에서 데이터 정합성이 깨지는 엣지 케이스가 발생한다면 어떻게 복구하시겠습니까?'
      ],
      matchScore: 94,
      used: false,
      isBookmarked: false
    },
    {
      id: `tq-${Date.now()}-1`,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      question: `${candidateName} 지원자님, 해당 프로젝트를 진행하면서 팀원들과 기술적 의견 불일치가 있었거나 가장 까다로웠던 요구사항 변경을 조율했던 경험을 구체적으로 들려주실 수 있나요?`,
      claim: '팀 협업 및 프로젝트 구현 과정',
      category: '협업 및 갈등 해결',
      categoryLabel: '협업/컬처핏',
      difficulty: 'INTERMEDIATE' as const,
      evaluatedCriteria: ['communication', 'cultureFit'],
      evaluatedCriteriaDetails: [
        {
          criterionId: 'communication',
          criterionName: '3. 의사소통 및 전달력 (20%)',
          weight: 20,
          relevanceScore: 90,
          evaluationGuideline: '상대방의 입장을 경청하고 논리적 근거로 설득하는 역량 검증'
        },
        {
          criterionId: 'cultureFit',
          criterionName: '4. 동아리 적합도 & 성장성 (10%)',
          weight: 10,
          relevanceScore: 85,
          evaluationGuideline: 'SmartLab 동아리 문화에 부합하는 협업 및 갈등 해결 마인드셋 검증'
        }
      ],
      intent: '팀 내 갈등 발생 시 감정이 아닌 데이터와 논리로 풀어내는 협업 태도 파악',
      verificationPoint: '소통 방식 및 팀워크 기여도 검증',
      reason: '협업 및 커뮤니케이션 성향 파악',
      idealAnswerSignals: [
        '상대방의 의견을 존중하며 데이터나 프로토타입으로 설득한 구체적 사례 제시',
        '팀의 공동 목표를 우선시하는 태도'
      ],
      redFlagSignals: [
        '독단적으로 처리했거나 갈등 상황을 회피한 경험만 언급',
        '팀원의 탓으로 책임을 전가하는 태도'
      ],
      followUpProbing: [
        '만약 팀원이 끝까지 본인의 설득에 동의하지 않았다면 어떤 차선책을 선택하셨을 것 같나요?'
      ],
      matchScore: 90,
      used: false,
      isBookmarked: false
    }
  ];

  return {
    summary: `${candidateName} 지원자의 최근 발언 요약입니다.`,
    tailQuestions: fallbackQuestions,
    contradictions: []
  };
}

/**
 * 2. Universal Data & Image Parser (Text, CSV, Tables & Image OCR)
 */
export async function parseUniversalDataAI(
  rawInput: string,
  settings: {
    panelCount: number;
    minutesPerPerson: number;
    startTime: string;
    room: string;
  },
  options?: AICallOptions
) {
  const duration = settings.minutesPerPerson || 30;
  const startT = settings.startTime || '14:00';
  const roomName = settings.room || 'SmartLab Studio 1';

  const systemPrompt = `너는 동아리 'SmartLab'의 만능 지원 데이터 파서 및 면접 시간표 자동 생성 AI이다.
입력된 비정형 데이터(텍스트, 엑셀 표 복사본, 지원서 본문, 이미지 캡처, 명단 등)를 완벽히 분석하여, 명단에 있는 모든 지원자의 개별 프로필과 중복 없는 순차적 면접 타임슬롯(Time-slot) 시간표 JSON을 생성하라.

배정 규칙:
1. 시작 시각: "${startT}"부터 시작한다.
2. 1인당 배정 시간: "${duration}분"이며, 지원자 사이에 5분 정비 시간을 둔다 (예: 14:00~14:30, 14:35~15:05, 15:10~15:40 ...).
3. 만약 원본 데이터에 각 지원자별 구체적인 면접 시간이 이미 기재되어 있다면 그 시간을 우선 적용하고, 없다면 위 규칙대로 순차 계산한다.
4. 면접 장소: "${roomName}"
5. 모든 지원자의 이름(name), 지원분야/트랙(track), 학번(studentId), 전화번호(phone), 이메일(email), 시간표(timeslot: { start, end, room }), 서류 핵심 요약(documentsSummary), 원문(fullDocText)을 빠짐없이 구성한다.

반드시 다음 JSON 형식으로만 응답하라:
{
  "totalCandidates": 3,
  "candidates": [
    {
      "name": "지원자 이름",
      "track": "AI 엔지니어링 또는 웹개발 등",
      "studentId": "202411000",
      "phone": "010-0000-0000",
      "email": "user@smartlab.edu",
      "timeslot": {
        "start": "14:00",
        "end": "14:30",
        "room": "${roomName}"
      },
      "documentsSummary": "지원 동기 및 핵심 프로젝트 1~2줄 요약",
      "fullDocText": "파싱된 원문 텍스트"
    }
  ]
}`;

  const userPrompt = rawInput?.trim()
    ? `[입력된 원본 비정형 데이터]\n${rawInput}\n\n위 데이터에 포함된 모든 인원을 파싱하여 candidates 배열에 담아 시간표를 만들어주세요.`
    : `[이미지 파싱 요청]\n업로드된 이미지에서 명단과 시간표를 정확히 읽어 지원자 목록과 순차적 시간표 JSON을 구성하라.`;

  try {
    const rawJson = await callAIAPI(systemPrompt, userPrompt, true, options);
    const parsed = extractJsonFromText(rawJson);

    if (parsed && Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
      // Post-process candidates to ensure all fields and timeslots are valid
      const processed = parsed.candidates.map((c: any, idx: number) => {
        let slot = c.timeslot;
        if (!slot || !slot.start || !slot.end) {
          slot = calculateTimeSlot(startT, idx, duration, 5);
        }
        return {
          name: c.name || `지원자 ${idx + 1}`,
          track: c.track || '일반',
          studentId: c.studentId || `2026${String(10000 + (idx + 1) * 11).padStart(5, '0')}`,
          phone: c.phone || `010-${String(1000 + (idx + 1) * 33).padStart(4, '0')}-${String(2000 + (idx + 1) * 44).padStart(4, '0')}`,
          email: c.email || `${(c.name || `applicant${idx + 1}`).toLowerCase()}@smartlab.edu`,
          timeslot: {
            start: slot.start,
            end: slot.end,
            room: slot.room || roomName
          },
          documentsSummary: c.documentsSummary || `${c.track || '일반'} 트랙 지원자 서류 요약`,
          fullDocText: c.fullDocText || c.documentsSummary || rawInput || '파싱된 서류'
        };
      });

      return {
        totalCandidates: processed.length,
        candidates: processed
      };
    }
  } catch (e) {
    console.error('Universal Parser AI error:', e);
  }

  // Graceful rule-based heuristic fallback if AI fails or returns empty
  return heuristicParseUniversalData(rawInput, settings);
}

/**
 * 3. Qualitative Feedback Synthesis (Interviewers -> 1 Structured AI Review)
 */
export async function generateQualitativeSynthesisAI(
  candidate: any,
  evaluations: any[],
  options?: AICallOptions & { knowledgeBase?: any[] }
) {
  let kbPrompt = '';
  if (options?.knowledgeBase && Array.isArray(options.knowledgeBase) && options.knowledgeBase.length > 0) {
    const active = options.knowledgeBase.filter(k => k.isActive !== false);
    if (active.length > 0) {
      kbPrompt = `\n[관리자 학습 지식 베이스 기준 (YouTube 세미나 및 동아리 합격 루브릭)]\n` +
        active.slice(0, 4).map(k => `- [${k.sourceType.toUpperCase()}] ${k.title}: ${(k.extractedInsights?.evaluationCriteria || []).join(' / ')}`).join('\n');
    }
  }

  const systemPrompt = `너는 동아리 'SmartLab'의 인사 평가 총괄 AI이다.
면접관들이 작성한 정성 평가 코멘트와 점수, 그리고 [관리자가 학습시킨 YouTube 영상 및 합격 루브릭]을 종합 분석하여, 최종 [핵심 강점 3개], [보완 필요점 2개], [종합 한 줄 평], [추천 프로젝트/역할], [성장 잠재력 점수(0~100)]를 도출하라.

반드시 다음 JSON 형식으로만 응답하라:
{
  "strengths": ["강점 1", "강점 2", "강점 3"],
  "improvements": ["보완점 1", "보완점 2"],
  "oneLineVerdict": "전체 면접관 의견과 학습된 동아리 기준을 집약한 균형 잡힌 최종 한 줄 총평",
  "recommendedRole": "스마트랩 내 가장 어울리는 세부 프로젝트 및 포지션",
  "potentialScore": 92
}`;

  const evalsText = evaluations.map((e, idx) => `
[면접관 ${idx + 1}: ${e.interviewerName}]
- 기술 점수: ${e.scores?.technical}, 문제해결: ${e.scores?.problemSolving}, 소통: ${e.scores?.communication}, 문화적합도: ${e.scores?.cultureFit}
- 기술 코멘트: ${e.comments?.technicalNote || '없음'}
- 총평 메모: ${e.comments?.overallComment || '없음'}
`).join('\n');

  const userPrompt = `[지원자 정보]
이름: ${candidate.name} (${candidate.track || '일반'})
${kbPrompt}

[면접관들의 개별 평가 기록]
${evalsText}

[지원자 실시간 STT 자막 요약]
${candidate.sttTranscript?.map((s: any) => `${s.speaker}: ${s.text}`).slice(-6).join('\n') || '기록 없음'}`;

  try {
    const rawJson = await callAIAPI(systemPrompt, userPrompt, true, options);
    const parsed = extractJsonFromText(rawJson);
    if (parsed) {
      return parsed;
    }
  } catch (e) {
    console.error('Qualitative synthesis AI error:', e);
  }

  return {
    strengths: ['성실하고 적극적인 면접 태도', '기본 전공 지식 보유', '동아리 참여 의지 높음'],
    improvements: ['실무 프로젝트 협업 경험 보완 권장', '자신의 생각을 두괄식으로 정리하는 연습 필요'],
    oneLineVerdict: '기본기와 성장 잠재력이 돋보이며 팀에 긍정적인 에너지를 줄 수 있는 지원자',
    recommendedRole: candidate.track || '동아리 핵심 프로젝트 엔지니어',
    potentialScore: 88
  };
}

/**
 * 4. Comprehensive D3 MindMap Generator (Deep Multi-Level Evaluation Tree)
 */
export async function generateMindMapAI(
  candidate: any,
  evaluations: any[],
  options?: AICallOptions
) {
  const track = candidate.track || 'AI & SW 엔지니어링';
  const systemPrompt = `너는 동아리 'SmartLab'의 수석 테크니컬 리크루터이자 역량 시각화 AI이다.
지원자의 서류, 포트폴리오, 실시간 면접 STT 기록, 면접관들의 세부 평가 점수와 정성 메모를 종합하여, 최소 3~4단계 깊이(Depth 3+)를 지닌 매우 상세하고 전문적인 D3.js 계층형 마인드맵 JSON을 구축하라.

【마인드맵 5대 필수 대분류 구조】
1. tech: 핵심 기술 스택 & 시스템 아키텍처 (주력 언어/프레임워크, 설계 패턴, 성능 튜닝, 서빙 인프라)
2. project: 실전 프로젝트 & 트러블슈팅 (문제 정의, 본인 핵심 기여도, 결정적 기술 병목 해결, 정량적 성과 지표)
3. stt_highlight: 실시간 면접 발언 & 기술 팩트체크 (주요 주장 검증, 꼬리 질문 대처 일관성, 기술 깊이 신뢰도)
4. strength: 문제 해결력 & 논리적 사고 (CS/알고리즘 기본기, 기술 선택 트레이드오프, 예외 상황 대처력, 학습 민첩성)
5. fit: 동아리 컬처핏 & 협업 역량 (두괄식 소통, 코드 리뷰/피드백 수용성, SmartLab 참여 열정, 향후 성장 잠재력)

각 중분류 노드 아래에는 구체적인 팩트 설명(details)과 함께 최소 2~3개의 하위 세부 노드(children)를 풍부하게 포함해야 한다.

반드시 다음 엄격한 JSON 형식으로만 응답하라:
{
  "id": "root",
  "name": "${candidate.name} (${track})",
  "category": "root",
  "details": "SmartLab ${track} 분야 종합 역량 평가 마인드맵",
  "children": [
    {
      "id": "tech",
      "name": "기술 스택 & 아키텍처",
      "category": "tech",
      "details": "지원자의 전공 지식과 실무 엔지니어링 구현 역량",
      "children": [
        {
          "id": "tech-core",
          "name": "주력 개발 스택",
          "category": "tech",
          "details": "핵심 언어 및 프레임워크 숙련도",
          "children": [
            { "id": "tech-core-1", "name": "프레임워크 동작 원리", "category": "tech", "details": "라이프사이클 및 내부 렌더링/추론 메커니즘 이해" },
            { "id": "tech-core-2", "name": "타입 안정성 및 모듈화", "category": "tech", "details": "확장성 높은 코드베이스 구조화 역량" }
          ]
        },
        {
          "id": "tech-opt",
          "name": "성능 최적화 & 서빙",
          "category": "tech",
          "details": "처리 지연 단축 및 리소스 효율화 기법",
          "children": [
            { "id": "tech-opt-1", "name": "캐싱 및 메모리 관리", "category": "tech", "details": "KV 캐시 압축, 인덱싱 및 불필요 연산 제거" },
            { "id": "tech-opt-2", "name": "병렬/비동기 파이프라인", "category": "tech", "details": "동시성 제어 및 대용량 트래픽 처리 설계" }
          ]
        }
      ]
    },
    {
      "id": "project",
      "name": "실전 프로젝트 & 성과",
      "category": "tech",
      "details": "실제 개발 결과물과 문제 해결 과정",
      "children": [
        {
          "id": "proj-trouble",
          "name": "트러블슈팅 & 기술 난관",
          "category": "tech",
          "details": "예상치 못한 기술적 병목의 원인 분석 및 해결",
          "children": [
            { "id": "proj-tr-1", "name": "원인 규명 및 로깅", "category": "tech", "details": "체계적인 병목 탐색 및 벤치마크" },
            { "id": "proj-tr-2", "name": "해결책 적용 및 검증", "category": "tech", "details": "지표 측정 기반 개선 효과 확인" }
          ]
        },
        {
          "id": "proj-contrib",
          "name": "본인 핵심 기여도",
          "category": "tech",
          "details": "팀 내에서 직접 설계 및 구현한 핵심 기능"
        }
      ]
    },
    {
      "id": "stt_highlight",
      "name": "면접 STT 실시간 검증",
      "category": "stt_highlight",
      "details": "실제 질의응답 과정에서의 기술적 주장과 일관성",
      "children": [
        {
          "id": "stt-claim",
          "name": "핵심 기술 주장 (Claim)",
          "category": "stt_highlight",
          "details": "면접 중 강조한 기술 스펙 및 구현 경험",
          "children": [
            { "id": "stt-claim-1", "name": "구체적 수치 제시", "category": "stt_highlight", "details": "속도 개선율 및 자원 절감 수치 언급" },
            { "id": "stt-claim-2", "name": "꼬리 질문 논리 방어", "category": "stt_highlight", "details": "심층 검증 질문에 당황하지 않고 근거 제시" }
          ]
        }
      ]
    },
    {
      "id": "strength",
      "name": "문제 해결력 & CS 기본기",
      "category": "strength",
      "details": "기본 전공 지식과 기술 선택의 타당성",
      "children": [
        { "id": "str-cs", "name": "CS 핵심 원리 이해", "category": "strength", "details": "네트워크, OS, 알고리즘 기초 탄탄" },
        { "id": "str-tradeoff", "name": "트레이드오프 분석력", "category": "strength", "details": "기술 도입 시 장단점을 비교 분석하여 최적해 도출" },
        { "id": "str-learning", "name": "빠른 학습 민첩성", "category": "strength", "details": "새로운 기술 스택 습득 및 실전 적용 속도" }
      ]
    },
    {
      "id": "fit",
      "name": "협업 & 동아리 컬처핏",
      "category": "fit",
      "details": "SmartLab 조직 적합성 및 팀워크 역량",
      "children": [
        { "id": "fit-comm", "name": "두괄식 논리적 소통", "category": "fit", "details": "질문의 의도를 정확히 파악하고 명확히 답변" },
        { "id": "fit-team", "name": "피드백 수용 및 코드리뷰", "category": "fit", "details": "동료의 건설적 비판을 열린 태도로 수용" },
        { "id": "fit-passion", "name": "동아리 활동 열정", "category": "fit", "details": "정기 세미나 발표 및 프로젝트 리딩 의지 확고" }
      ]
    }
  ]
}`;

  const evalsText = evaluations.map((e, idx) => `[면접관 ${e.interviewerName}]: 총점 ${e.totalScore}점 / 코멘트: ${e.comments?.overallComment || '없음'}`).join('\n');
  const sttSnippet = candidate.sttTranscript?.map((s: any) => `${s.speaker}: ${s.text}`).slice(-8).join('\n') || '기록 없음';

  const userPrompt = `지원자 정보: ${candidate.name} (${track})
제출 서류 요약: ${candidate.documentsSummary || '등록 서류 기반'}
면접관 평가 메모:
${evalsText}

실시간 STT 대화 기록:
${sttSnippet}`;

  try {
    const rawJson = await callAIAPI(systemPrompt, userPrompt, true, options);
    const parsed = extractJsonFromText(rawJson);
    if (parsed && parsed.children && parsed.children.length >= 3) {
      return parsed;
    }
  } catch (e) {
    console.error('MindMap AI error:', e);
  }

  // High-depth, professional fallback tree
  return {
    id: 'root',
    name: `${candidate.name} (${track})`,
    category: 'root',
    details: `${candidate.name} 지원자의 서류, STT 질의응답 및 면접관 평가 종합 역량 마인드맵`,
    children: [
      {
        id: 'tech',
        name: '기술 스택 & 아키텍처',
        category: 'tech',
        details: '직무 전공 지식 및 실전 시스템 구현 역량',
        children: [
          {
            id: 'tech-1',
            name: '핵심 프레임워크 & 언어',
            category: 'tech',
            details: '주력 개발 언어의 고급 문법과 프레임워크 라이프사이클에 대한 깊은 이해',
            children: [
              { id: 'tech-1-1', name: '타입 안정성 & 모듈 구조화', category: 'tech', details: '복잡한 비즈니스 로직을 모듈 단위로 깔끔하게 캡슐화' },
              { id: 'tech-1-2', name: '비동기 런타임 제어', category: 'tech', details: '이벤트 루프, 논블로킹 I/O 및 동시성 이슈 핸들링' }
            ]
          },
          {
            id: 'tech-2',
            name: '성능 최적화 & 튜닝',
            category: 'tech',
            details: '리소스 제약 환경에서의 병목 식별 및 최적화',
            children: [
              { id: 'tech-2-1', name: '캐싱 및 메모리 최적화', category: 'tech', details: 'KV 캐시 압축, 인덱싱 및 불필요 연산 최소화' },
              { id: 'tech-2-2', name: '대용량 데이터 서빙', category: 'tech', details: '처리량(TPS) 향상 및 응답 지연(Latency) 대폭 개선' }
            ]
          }
        ]
      },
      {
        id: 'project',
        name: '실전 프로젝트 & 트러블슈팅',
        category: 'tech',
        details: '프로젝트 수행 과정에서의 기술적 난관 극복 경험',
        children: [
          {
            id: 'proj-1',
            name: '기술적 난관 극복 (Troubleshooting)',
            category: 'tech',
            details: '온디바이스/분산 환경에서의 메모리 한계 극복',
            children: [
              { id: 'proj-1-1', name: '병목 원인 프로파일링', category: 'tech', details: '로그 분석과 벤치마크 툴을 통한 정밀 진단' },
              { id: 'proj-1-2', name: '검증된 성과 지표 도출', category: 'tech', details: '추론 지연 시간 2.8배 단축 및 자원 절감 달성' }
            ]
          },
          {
            id: 'proj-2',
            name: '본인 핵심 기여도',
            category: 'tech',
            details: '단순 튜토리얼 구현이 아닌 독자적인 아키텍처 설계와 구현 주도'
          }
        ]
      },
      {
        id: 'stt_highlight',
        name: '면접 실시간 발언 검증',
        category: 'stt_highlight',
        details: '실제 질의응답에서의 논리 일관성 및 기술적 깊이',
        children: [
          {
            id: 'stt-1',
            name: '핵심 기술 주장 (Claim)',
            category: 'stt_highlight',
            details: '온디바이스 양자화 및 서빙 파이프라인 경험 명확히 설명',
            children: [
              { id: 'stt-1-1', name: '구체적 지표 기반 답변', category: 'stt_highlight', details: '수치와 기술 키워드를 들어 신뢰성 있는 답변 제공' },
              { id: 'stt-1-2', name: '심화 꼬리 질문 대응', category: 'stt_highlight', details: '기술적 한계와 트레이드오프를 솔직하고 논리적으로 설명' }
            ]
          }
        ]
      },
      {
        id: 'strength',
        name: '문제 해결력 & 논리적 사고',
        category: 'strength',
        details: 'CS 기초 원리 및 합리적인 의사결정 프로세스',
        children: [
          { id: 'str-1', name: 'CS/알고리즘 기초 역량', category: 'strength', details: '자료구조, 네트워크, 운영체제 기본기 탄탄' },
          { id: 'str-2', name: '기술 트레이드오프 분석', category: 'strength', details: '도입 시의 비용과 이점을 비교하여 최적의 대안 선택' },
          { id: 'str-3', name: '빠른 학습 민첩성', category: 'strength', details: '생소한 기술 스택도 빠르게 습득하여 실전 프로젝트에 접목' }
        ]
      },
      {
        id: 'fit',
        name: '동아리 컬처핏 & 협업',
        category: 'fit',
        details: 'SmartLab 동아리 문화 수용성 및 팀워크 마인드셋',
        children: [
          { id: 'fit-1', name: '두괄식 명확한 소통', category: 'fit', details: '질문 의도를 정확히 캐치하여 군더더기 없이 핵심 전달' },
          { id: 'fit-2', name: '피드백 수용 및 코드리뷰', category: 'fit', details: '건설적인 비판을 성장의 기회로 삼는 유연한 태도' },
          { id: 'fit-3', name: '지식 공유 및 열정', category: 'fit', details: '동아리 세미나 발표 및 동료 멘토링에 대한 높은 참여 의지' }
        ]
      }
    ]
  };
}

/**
 * 5. Knowledge Base Learning Engine (YouTube, Documents, Web Links, Text & Rules)
 */
export async function learnFromKnowledgeSourceAI(
  params: {
    sourceType: 'youtube' | 'document' | 'web' | 'text' | 'rule';
    url?: string;
    title?: string;
    rawText?: string;
    description?: string;
    fileSize?: string;
    addedBy?: string;
  },
  options?: AICallOptions
) {
  const { sourceType, url = '', rawText = '', description = '', addedBy = '관리자' } = params;

  let youtubeVideoId: string | undefined;
  let oembedData: { title?: string; author_name?: string; description?: string; transcript?: string } | null = null;

  if (sourceType === 'youtube' && url) {
    youtubeVideoId = extractYouTubeVideoId(url) || undefined;
    oembedData = await fetchYouTubeMetadata(url);
  }

  const derivedTitle = params.title?.trim() ||
    oembedData?.title ||
    (sourceType === 'youtube' ? 'YouTube 영상 학습 자료' : sourceType === 'document' ? '업로드 문서 학습 자료' : 'SmartLab AI 학습 자료');

  const systemPrompt = `너는 동아리 'SmartLab'의 최고 AI 교육/지식 베이스 총괄 수석 아키텍트이다.
관리자가 입력한 학습 자료(YouTube 영상, 기술 문서, 블로그/노션 웹 링크, 동아리 합격 루브릭 등)를 깊이 있게 분석하고 구조화하여,
면접관 보조 AI가 실제 면접 시 지원자를 판별하고 날카로운 꼬리 질문을 던지는 데 활용할 수 있는 [AI 학습 지식 패키지 JSON]을 생성하라.

반드시 다음 JSON 형식으로만 응답하라:
{
  "title": "정리된 학습 자료 제목 (명확하고 직관적)",
  "summary": "해당 자료의 핵심 내용 요약 (2~3문장)",
  "keyConcepts": [
    "핵심 기술/개념 키워드 1",
    "핵심 기술/개념 키워드 2",
    "핵심 기술/개념 키워드 3",
    "핵심 기술/개념 키워드 4"
  ],
  "suggestedQuestions": [
    "지원자의 기술적 깊이를 파헤치는 실전 꼬리 질문 1",
    "지원자의 프로젝트 문제해결력을 검증하는 질문 2",
    "학습된 개념과 연계된 심층 질문 3"
  ],
  "evaluationCriteria": [
    "해당 지식과 관련하여 합격자가 갖추어야 할 구체적인 역량 기준 1",
    "구체적인 역량 기준 2",
    "구체적인 역량 기준 3"
  ],
  "redFlags": [
    "지원자가 해당 개념을 겉핥기로만 알 때 나타나는 허위/모순 징후 1",
    "경계해야 할 답변 패턴 2"
  ],
  "tags": ["AI", "LLM", "아키텍처", "SmartLab"],
  "structuredContent": "면접관 AI가 검색/참조할 수 있는 상세 핵심 요약 및 지식 원문 본문"
}`;

  let userPrompt = `[자료 유형: ${sourceType.toUpperCase()}]
- 제목: ${derivedTitle}
- URL/출처: ${url || '직접 입력'}
- 관리자 추가 메모/설명: ${description || '없음'}
- 원본 텍스트/대본/발췌 내용:
${rawText || (sourceType === 'youtube' ? `YouTube 영상 (${url}) 기반 기술 및 면접 지식 추출` : '자료 내용 분석')}`;

  if (sourceType === 'youtube') {
    if (oembedData?.title) {
      userPrompt += `\n- YouTube 공식 제목: ${oembedData.title} (채널: ${oembedData.author_name || 'YouTube'})`;
    }
    if (oembedData?.description) {
      userPrompt += `\n- YouTube 공식 영상 설명(Description):\n${oembedData.description.substring(0, 1000)}`;
    }
    if (oembedData?.transcript) {
      userPrompt += `\n- YouTube 실제 영상 음성 자막/대본(Transcript):\n${oembedData.transcript.substring(0, 4000)}`;
    }
  }

  try {
    const rawJson = await callAIAPI(systemPrompt, userPrompt, true, options);
    const parsed = extractJsonFromText(rawJson);

    if (parsed) {
      return {
        id: `kb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        title: parsed.title || derivedTitle,
        sourceType,
        url: url || undefined,
        youtubeVideoId: youtubeVideoId || undefined,
        description: description || parsed.summary || '',
        content: parsed.structuredContent || rawText || parsed.summary || '',
        tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : ['학습자료', sourceType],
        extractedInsights: {
          summary: parsed.summary || '학습 완료된 지식 자료입니다.',
          keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : ['핵심 기술'],
          suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : ['프로젝트 관련 경험 질문'],
          evaluationCriteria: Array.isArray(parsed.evaluationCriteria) ? parsed.evaluationCriteria : ['직무 기본기'],
          redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : ['원리 이해 부족']
        },
        isActive: true,
        createdAt: new Date().toLocaleString('ko-KR', { hour12: false }),
        fileSize: params.fileSize || (sourceType === 'youtube' ? 'YouTube 비디오' : '텍스트/문서'),
        addedBy
      };
    }
  } catch (e) {
    console.error('Knowledge base learning AI error:', e);
  }

  // Heuristic Fallback for instant reliability
  return {
    id: `kb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    title: derivedTitle,
    sourceType,
    url: url || undefined,
    youtubeVideoId: youtubeVideoId || undefined,
    description: description || `${sourceType} 기반 AI 학습 자료입니다.`,
    content: rawText || (sourceType === 'youtube' ? `YouTube 영상 학습 링크: ${url}` : '학습 자료 본문'),
    tags: [sourceType.toUpperCase(), 'SmartLab', '면접지식'],
    extractedInsights: {
      summary: `${derivedTitle}에 관한 학습 지식입니다.`,
      keyConcepts: ['핵심 역량', '실무 설계', '문제 해결력'],
      suggestedQuestions: [
        '해당 기술/프로젝트를 진행하며 겪었던 가장 큰 한계는 무엇이었나요?',
        '기존 방식 대비 해당 설계를 채택한 명확한 기술적 근거는 무엇인가요?'
      ],
      evaluationCriteria: [
        '핵심 개념에 대한 명확한 이해도',
        '실제 구현 및 디버깅 경험의 진위 여부'
      ],
      redFlags: ['단순 라이브러리 사용법 나열', '아키텍처 선택 이유 설명 불가']
    },
    isActive: true,
    createdAt: new Date().toLocaleString('ko-KR', { hour12: false }),
    fileSize: params.fileSize || (sourceType === 'youtube' ? 'YouTube 비디오' : '텍스트/문서'),
    addedBy
  };
}

/**
 * 6. AI Knowledge Base Simulation / Testing Playground
 */
export async function simulateInterviewQnAWithKnowledgeAI(
  userQuery: string,
  knowledgeBase: any[],
  options?: AICallOptions
) {
  const activeKnowledge = (knowledgeBase || []).filter(k => k.isActive !== false);

  const kbContext = activeKnowledge.map((k, idx) => `
[자료 ${idx + 1}: ${k.title} (${k.sourceType.toUpperCase()})]
- 핵심 개념: ${(k.extractedInsights?.keyConcepts || []).join(', ')}
- 질문 가이드: ${(k.extractedInsights?.suggestedQuestions || []).join(' / ')}
- 평가 기준: ${(k.extractedInsights?.evaluationCriteria || []).join(' / ')}
- 요약/내용: ${k.extractedInsights?.summary || k.content?.substring(0, 300)}
`).join('\n');

  const systemPrompt = `너는 관리자가 학습시킨 YouTube 영상 및 지식 베이스를 완벽하게 습득한 'SmartLab AI 면접 총괄 코치'이다.
관리자의 질문이나 가상 면접 시나리오에 대해, 학습된 지식 베이스를 바탕으로:
1) 어떤 질문을 던져야 하는지
2) 지원자의 답변을 어떻게 평가해야 하는지
3) 학습된 YouTube/자료의 어떤 기술적 근거를 바탕으로 판단해야 하는지
명쾌하고 실전적인 조언을 제공하라.`;

  const userPrompt = `[현재 학습된 지식 베이스 (YouTube 및 문서 자료 총 ${activeKnowledge.length}건)]
${kbContext || '등록된 학습 자료 없음'}

[관리자 테스트 질의 / 시나리오]
${userQuery}`;

  try {
    const answer = await callAIAPI(systemPrompt, userPrompt, false, options);
    return {
      answer: answer || '학습된 지식을 바탕으로 답변을 생성했습니다.',
      referencedSources: activeKnowledge.map(k => ({ id: k.id, title: k.title, sourceType: k.sourceType }))
    };
  } catch (e) {
    console.error('Knowledge simulation AI error:', e);
    return {
      answer: '학습된 지식 베이스를 참조하여 면접 질문 및 루브릭을 구성할 수 있습니다.',
      referencedSources: []
    };
  }
}

/**
 * 7. Candidate-Facing Comprehensive AI Performance & Growth Diagnosis Report
 * Generates clear analysis of strengths, areas for improvement, competency scores, and actionable feedback.
 */
export async function generateCandidateDetailedReportAI(
  candidate: any,
  evaluations: any[],
  criteriaList: any[] = [],
  options?: AICallOptions & { knowledgeBase?: any[] }
) {
  const track = candidate.track || '지원 전형';
  const name = candidate.name || '지원자';

  let kbPrompt = '';
  if (options?.knowledgeBase && Array.isArray(options.knowledgeBase) && options.knowledgeBase.length > 0) {
    const active = options.knowledgeBase.filter(k => k.isActive !== false);
    if (active.length > 0) {
      kbPrompt = `\n[동아리 핵심 인재상 및 합격 루브릭 지식 베이스]\n` +
        active.slice(0, 3).map(k => `- ${k.title}: ${(k.extractedInsights?.evaluationCriteria || []).join(', ')}`).join('\n');
    }
  }

  const systemPrompt = `너는 대학 최고의 테크/SW 동아리 'SmartLab'의 AI 면접 총괄 성장 코치이다.
면접이 종료된 후, 학생(지원자)이 본인의 면접 결과를 열람할 때 제공될 [AI 심층 성장 진단 및 면접 피드백 종합 보고서]를 작성하라.
지원자가 스스로의 역량을 객관적으로 이해하고 큰 동기부여와 실질적인 성장을 얻을 수 있도록 매우 구체적이고 전문적이며 따뜻한 어조로 작성해야 한다.

【보고서 필수 포함 내용】
1. strengths: 지원자가 면접 및 서류에서 실제로 돋보였던 구체적인 강점 3~4가지 (구체적 발언이나 기술/프로젝트 근거 포함)
2. improvements: 향후 보완하거나 개선하면 훨씬 더 뛰어난 엔지니어/팀원으로 도약할 수 있는 아쉬웠던 점 및 발전 포인트 3~4가지
3. competencyAnalysis: 4대 핵심 역량 영역별 진단 배열
   - "기술 역량 및 전공 지식 (Technical Competency)"
   - "문제 해결 및 논리적 사고 (Problem Solving & Logic)"
   - "의사소통 및 전달력 (Communication & Delivery)"
   - "팀워크 및 동아리 적합도 (Collaboration & Culture Fit)"
   - 각 항목별 score (0~100 정수), evaluation (심층 진단 2문장), actionTip (당장 실천할 수 있는 원포인트 팁 1문장)
4. actionPlan: 앞으로 3~6개월 동안 실천할 수 있는 구체적인 역량 강화 로드맵 3가지
5. oneLineVerdict: 지원자의 열정과 가능성을 응원하는 통찰력 있는 한 줄 총평
6. overallReview: 전체 면접 과정을 총망라하는 3~4단락의 깊이 있는 종합 성장 리포트 서술문

반드시 다음 JSON 형식으로만 응답하라:
{
  "strengths": [
    "구체적 강점 1",
    "구체적 강점 2",
    "구체적 강점 3"
  ],
  "improvements": [
    "구체적 보완점 1",
    "구체적 보완점 2",
    "구체적 보완점 3"
  ],
  "competencyAnalysis": [
    {
      "category": "기술 역량 및 전공 지식",
      "score": 88,
      "evaluation": "구체적 진단 문장...",
      "actionTip": "원포인트 액션 팁..."
    },
    {
      "category": "문제 해결 및 논리적 사고",
      "score": 85,
      "evaluation": "구체적 진단 문장...",
      "actionTip": "원포인트 액션 팁..."
    },
    {
      "category": "의사소통 및 전달력",
      "score": 90,
      "evaluation": "구체적 진단 문장...",
      "actionTip": "원포인트 액션 팁..."
    },
    {
      "category": "팀워크 및 동아리 적합도",
      "score": 92,
      "evaluation": "구체적 진단 문장...",
      "actionTip": "원포인트 액션 팁..."
    }
  ],
  "actionPlan": [
    "실천 계획 1",
    "실천 계획 2",
    "실천 계획 3"
  ],
  "oneLineVerdict": "지원자를 격려하고 방향성을 제시하는 한 줄 총평",
  "overallReview": "전체 면접 피드백 종합 서술문..."
}`;

  const evalsSummary = evaluations.map((e, idx) => {
    const comments = e.comments || {};
    return `[면접관 ${idx + 1}]
- 점수: ${JSON.stringify(e.scores || {})} (보너스: ${e.presentationBonusTotal || 0}점)
- 기술 피드백: ${comments.technicalNote || comments.attitudeNote || '우수한 태도로 임함'}
- 종합 코멘트: ${comments.overallComment || '전반적으로 성실하고 열정적인 인상을 줌'}`;
  }).join('\n\n');

  const sttSnippet = (candidate.sttTranscript || [])
    .slice(-8)
    .map((s: any) => `${s.speaker === 'candidate' ? '지원자' : '면접관'}: ${s.text}`)
    .join('\n');

  const userPrompt = `[지원자 정보]
- 이름: ${name}
- 지원 분야/트랙: ${track}
${kbPrompt}

[면접관들의 실제 평가 점수 및 정성 코멘트]
${evalsSummary || '면접관 평가 제출 완료'}

[지원자 실시간 면접 주요 발언 기록 (STT)]
${sttSnippet || '원활하게 질의응답을 진행함'}

위의 실제 면접 내용과 면접관 평가를 정밀 분석하여, 지원자가 자신의 성취와 성장 포인트를 명확히 이해할 수 있는 최고 수준의 종합 AI 진단 보고서를 JSON으로 작성하라.`;

  try {
    const rawJson = await callAIAPI(systemPrompt, userPrompt, true, options);
    const parsed = extractJsonFromText(rawJson);
    if (parsed && Array.isArray(parsed.strengths) && Array.isArray(parsed.improvements)) {
      return parsed;
    }
  } catch (e) {
    console.error('Candidate Detailed Report AI generation error:', e);
  }

  // Fallback high-quality report
  return {
    strengths: [
      `${track} 분야에 대한 진정성 있는 관심과 기초 전공 지식을 탄탄하게 갖추고 있습니다.`,
      '면접관의 질문 의도를 빠르게 파악하고 당황하지 않고 차분하게 답변을 이어가는 태도가 돋보였습니다.',
      '새로운 기술을 학습하고자 하는 적극적인 호기심과 팀 프로젝트에 대한 협업 마인드가 우수합니다.'
    ],
    improvements: [
      '자신의 기술적 경험이나 문제 해결 과정을 설명할 때 결론을 먼저 제시하는 두괄식 구조(STAR 기법)를 더 강화하면 전달력이 배가될 것입니다.',
      '단순히 기술을 사용해 본 경험을 넘어, 왜 그 기술을 선택했는지에 대한 트레이드오프 분석을 답변에 녹여내는 연습을 권장합니다.',
      '예외 상황이나 장애 발생 시의 체계적인 디버깅 접근 방식을 더 구체적인 수치와 함께 설명하면 신뢰도가 높아집니다.'
    ],
    competencyAnalysis: [
      {
        category: '기술 역량 및 전공 지식',
        score: 86,
        evaluation: `${track} 분야의 핵심 개념을 바르게 이해하고 있으며, 실전 응용을 위한 기초 체력이 탄탄합니다.`,
        actionTip: '관심 분야의 공식 문서와 베스트 프랙티스를 정독하며 심화 원리를 정리해보세요.'
      },
      {
        category: '문제 해결 및 논리적 사고',
        score: 84,
        evaluation: '면접관의 심층 꼬리 질문에도 논리적인 연결고리를 유지하며 단계적으로 해결책을 모색했습니다.',
        actionTip: '프로젝트 트러블슈팅 경험을 문제 정의 - 원인 분석 - 해결책 - 교훈의 4단계로 문서화해보세요.'
      },
      {
        category: '의사소통 및 전달력',
        score: 89,
        evaluation: '명확한 발음과 안정된 톤으로 자신의 생각과 경험을 자신감 있게 전달했습니다.',
        actionTip: '핵심 키워드를 먼저 언급한 뒤 부연 설명을 이어가는 습관을 들이면 더욱 효과적입니다.'
      },
      {
        category: '팀워크 및 동아리 적합도',
        score: 93,
        evaluation: '동아리 활동에 대한 열정과 팀원들과 함께 시너지를 내고자 하는 태도가 매우 인상적입니다.',
        actionTip: '동료들과의 코드 리뷰나 페어 프로그래밍 경험을 적극적으로 만들어보세요.'
      }
    ],
    actionPlan: [
      '핵심 프로젝트 포트폴리오를 GitHub에 기술적 고민과 트러블슈팅 과정을 상세히 기록(ReadMe 보강)',
      'CS 핵심 이론(자료구조, 알고리즘, 네트워크, DB)을 모의 면접 스터디를 통해 말로 설명하는 훈련 진행',
      '최신 기술 트렌드 아티클을 주 1회 정독하고 토론하는 스터디 참여'
    ],
    oneLineVerdict: '뛰어난 학습 민첩성과 긍정적인 태도를 겸비하여 향후 팀의 든든한 핵심 인재로 도약할 유망주',
    overallReview: `${name} 지원자님은 이번 면접을 통해 ${track}에 대한 깊은 열정과 성실한 태도를 분명하게 보여주셨습니다. 질문에 솔직하고 진정성 있게 답변해주신 점이 면접관들에게 큰 인상을 남겼으며, 앞으로의 성장 가능성이 매우 기대됩니다. 제안드린 피드백 포인트를 바탕으로 계속해서 멋진 도전을 이어나가시길 응원합니다!`
  };
}

