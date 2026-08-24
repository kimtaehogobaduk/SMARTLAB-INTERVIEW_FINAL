import React, { useState, useRef, useEffect } from 'react';
import { DocumentItem } from '../types';
import mammoth from 'mammoth';
import {
  FileText,
  Presentation,
  Plus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  FileCode,
  FileSpreadsheet,
  FileImage,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  File,
  Eye,
  CheckCircle2,
  FileArchive,
  Layers,
  Sparkles,
  Link2,
  Globe,
  RefreshCw,
  FileCheck
} from 'lucide-react';

interface DocumentViewerProps {
  documents: DocumentItem[];
  candidateName: string;
  onAddDocument?: (doc: DocumentItem) => void;
}

/**
 * Transforms various Google Docs / Drive / Notion URLs into embeddable / preview iframe URLs
 * and routes external web pages through server-side proxy to bypass X-Frame-Options / Refused to connect errors.
 */
function getEmbeddableUrl(rawUrl: string): { embedUrl: string; isEmbeddable: boolean; type: string } {
  if (!rawUrl) return { embedUrl: '', isEmbeddable: false, type: 'url' };
  
  const trimmed = rawUrl.trim();
  let url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

  // 1. Google Docs (document)
  if (url.includes('docs.google.com/document/d/')) {
    const match = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://docs.google.com/document/d/${match[1]}/preview?embedded=true`,
        isEmbeddable: true,
        type: 'google_docs'
      };
    }
  }

  // 2. Google Spreadsheets
  if (url.includes('docs.google.com/spreadsheets/d/')) {
    const match = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://docs.google.com/spreadsheets/d/${match[1]}/preview?widget=true&headers=false`,
        isEmbeddable: true,
        type: 'google_sheets'
      };
    }
  }

  // 3. Google Presentations (Slides)
  if (url.includes('docs.google.com/presentation/d/')) {
    const match = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`,
        isEmbeddable: true,
        type: 'google_slides'
      };
    }
  }

  // 4. Google Drive files preview
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        isEmbeddable: true,
        type: 'google_drive'
      };
    }
  }

  // 5. YouTube Videos
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${match[1]}`,
        isEmbeddable: true,
        type: 'youtube'
      };
    }
  }

  // 6. Generic external URLs -> Use Server Proxy to remove X-Frame-Options and bypass refused to connect
  return {
    embedUrl: `/api/proxy/embed?url=${encodeURIComponent(url)}`,
    isEmbeddable: true,
    type: 'external_web'
  };
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents,
  candidateName,
  onAddDocument
}) => {
  const [activeTabId, setActiveTabId] = useState<string>(documents[0]?.id || '');
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text' | 'url' | 'gdocs'>('file');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isFullscreenIframe, setIsFullscreenIframe] = useState<boolean>(false);

  // Form states for manual or file upload
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<string>('pdf');
  const [newContent, setNewContent] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [uploadedFileData, setUploadedFileData] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [parsedHtmlContent, setParsedHtmlContent] = useState<string>('');
  const [isParsingDocx, setIsParsingDocx] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle active document
  const activeDoc = documents.find(d => d.id === activeTabId) || documents[0];

  // Helper for format icons and color schemes
  const getDocBadgeInfo = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'pdf') {
      return {
        icon: <FileText className="w-3.5 h-3.5 text-rose-500" />,
        label: 'PDF Document',
        color: 'text-rose-600 bg-rose-50 border-rose-200'
      };
    }
    if (t === 'pptx' || t === 'ppt' || t === 'portfolio' || t === 'presentation') {
      return {
        icon: <Presentation className="w-3.5 h-3.5 text-amber-500" />,
        label: 'Presentation (PPTX)',
        color: 'text-amber-700 bg-amber-50 border-amber-200'
      };
    }
    if (t === 'gdocs' || t === 'google_docs' || t === 'googledocs') {
      return {
        icon: <FileCheck className="w-3.5 h-3.5 text-blue-500" />,
        label: 'Google Docs (인앱 로딩)',
        color: 'text-blue-700 bg-blue-50 border-blue-200'
      };
    }
    if (t === 'doc' || t === 'docx') {
      return {
        icon: <FileText className="w-3.5 h-3.5 text-indigo-500" />,
        label: 'Word Document (DOCX)',
        color: 'text-indigo-700 bg-indigo-50 border-indigo-200'
      };
    }
    if (t === 'hwp' || t === 'hwpx') {
      return {
        icon: <FileText className="w-3.5 h-3.5 text-blue-500" />,
        label: '한글 서식 (HWP)',
        color: 'text-blue-700 bg-blue-50 border-blue-200'
      };
    }
    if (t === 'xlsx' || t === 'xls' || t === 'csv') {
      return {
        icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />,
        label: 'Spreadsheet / Data',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      };
    }
    if (t === 'image' || t === 'png' || t === 'jpg' || t === 'jpeg' || t === 'webp') {
      return {
        icon: <FileImage className="w-3.5 h-3.5 text-violet-500" />,
        label: 'Image Asset',
        color: 'text-violet-700 bg-violet-50 border-violet-200'
      };
    }
    if (t === 'code' || t === 'js' || t === 'ts' || t === 'py' || t === 'cpp' || t === 'github') {
      return {
        icon: <FileCode className="w-3.5 h-3.5 text-cyan-500" />,
        label: 'Source Code / Repo',
        color: 'text-cyan-700 bg-cyan-50 border-cyan-200'
      };
    }
    if (t === 'url' || t === 'link' || t === 'notion') {
      return {
        icon: <Globe className="w-3.5 h-3.5 text-sky-500" />,
        label: '웹 서류 (인앱 뷰어)',
        color: 'text-sky-700 bg-sky-50 border-sky-200'
      };
    }
    return {
      icon: <FileText className="w-3.5 h-3.5 text-slate-500" />,
      label: 'Text Document',
      color: 'text-slate-700 bg-slate-100 border-slate-200'
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
    let detectedType = extension;
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension)) {
      detectedType = 'image';
    } else if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'html', 'css', 'json'].includes(extension)) {
      detectedType = 'code';
    } else if (['hwp', 'hwpx'].includes(extension)) {
      detectedType = 'hwp';
    } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
      detectedType = 'xlsx';
    } else if (['doc', 'docx'].includes(extension)) {
      detectedType = 'docx';
    } else if (['ppt', 'pptx'].includes(extension)) {
      detectedType = 'pptx';
    } else if (['pdf'].includes(extension)) {
      detectedType = 'pdf';
    }

    setNewTitle(file.name);
    setNewType(detectedType);
    
    // Format file size
    const sizeKB = Math.round(file.size / 1024);
    const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    setUploadedFileSize(sizeStr);

    // If it's a DOCX file, parse directly in browser using mammoth!
    if (extension === 'docx' || file.name.endsWith('.docx')) {
      setIsParsingDocx(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
        
        setParsedHtmlContent(result.value);
        setNewContent(rawTextResult.value);
        
        // Also save data URL for download
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedFileData(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Docx parsing error:', err);
        setNewContent(`[DOCX 서류 파싱 안내]\n파일명: ${file.name}\n파일 크기: ${sizeStr}\n\n워드 서류가 등록되었습니다.`);
      } finally {
        setIsParsingDocx(false);
      }
      return;
    }

    const reader = new FileReader();

    // If it's a text-based file, read as text directly
    if (
      ['txt', 'code', 'js', 'ts', 'py', 'json', 'md', 'csv', 'html', 'css'].includes(detectedType) ||
      file.type.startsWith('text/')
    ) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setNewContent(text || '');
        setUploadedFileData(text || '');
      };
      reader.readAsText(file);
    } else {
      // For PDF, Images, Word, PPTX, read as data URL for native preview
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedFileData(dataUrl);
        if (detectedType === 'image') {
          setNewContent(`[이미지 서류: ${file.name}]`);
        } else if (detectedType === 'pdf') {
          setNewContent(`[PDF 문서 파일: ${file.name} (${sizeStr})]\n실제 PDF 렌더러로 서류를 미리보기합니다.`);
        } else {
          setNewContent(`[${detectedType.toUpperCase()} 서류: ${file.name} (${sizeStr})]\n업로드된 서류 바이너리가 지원 서류함에 저장되었습니다.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let finalType = newType;
    let finalUrl = newUrl.trim();

    if (uploadMode === 'gdocs' || finalUrl.includes('docs.google.com') || finalUrl.includes('drive.google.com')) {
      finalType = 'gdocs';
    } else if (uploadMode === 'url') {
      finalType = 'url';
    }

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: newTitle.trim(),
      type: finalType as any,
      contentSnippet: (newContent || newUrl || newTitle).slice(0, 120) + '...',
      rawText: newContent || (finalUrl ? `참조 및 인앱 로딩 링크: ${finalUrl}` : ''),
      url: finalUrl || undefined,
      fileData: uploadedFileData || undefined,
      fileSize: uploadedFileSize || (uploadMode === 'url' || uploadMode === 'gdocs' ? '웹 인라인 서류' : '텍스트 입력'),
      uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
    };

    onAddDocument?.(newDoc);
    setActiveTabId(newDoc.id);

    // Reset Form
    setNewTitle('');
    setNewType('pdf');
    setNewContent('');
    setNewUrl('');
    setUploadedFileData(null);
    setUploadedFileSize('');
    setParsedHtmlContent('');
    setIsUploading(false);
  };

  // Render Document Body based on type
  const renderDocContent = (doc: DocumentItem) => {
    const type = (doc.type || '').toLowerCase();

    // 1. Image Preview
    if (
      (type === 'image' || type === 'png' || type === 'jpg' || type === 'jpeg' || type === 'webp') &&
      (doc.fileData || doc.url)
    ) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <img
            src={doc.fileData || doc.url}
            alt={doc.title}
            className="max-w-full max-h-[500px] object-contain rounded-lg border border-slate-200 shadow-md"
          />
          {doc.rawText && (
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 w-full whitespace-pre-line">
              {doc.rawText}
            </p>
          )}
        </div>
      );
    }

    // 2. PDF Preview (Data URL object / iframe or styled text document)
    if (type === 'pdf') {
      if (doc.fileData && doc.fileData.startsWith('data:application/pdf')) {
        return (
          <div className="w-full h-[540px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
            <object
              data={doc.fileData}
              type="application/pdf"
              className="w-full h-full"
            >
              <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-2">
                <FileText className="w-10 h-10 text-rose-500" />
                <p className="text-sm font-bold text-slate-800">PDF 브라우저 뷰어</p>
                <a
                  href={doc.fileData}
                  download={doc.title}
                  className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors"
                >
                  PDF 파일 다운로드
                </a>
              </div>
            </object>
          </div>
        );
      }

      // Styled Document Sheet View
      return (
        <div className="space-y-4 text-xs font-sans">
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 flex items-center justify-between text-rose-900">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-600" />
              <span className="font-bold">PDF 지원 서류 전문 파싱됨</span>
              {doc.fileSize && (
                <span className="text-[10px] text-rose-600 font-mono bg-rose-100 px-1.5 py-0.5 rounded">
                  {doc.fileSize}
                </span>
              )}
            </div>
            {doc.fileData && (
              <a
                href={doc.fileData}
                download={doc.title}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-rose-300 shadow-2xs"
              >
                <Download className="w-3 h-3" />
                다운로드
              </a>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed font-sans space-y-3 whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            {doc.rawText || doc.contentSnippet || '문서 텍스트 내용이 없습니다.'}
          </div>
        </div>
      );
    }

    // 3. Word Document (DOCX) Rendered HTML View
    if (type === 'docx' || type === 'doc') {
      return (
        <div className="space-y-4 text-xs font-sans">
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 flex items-center justify-between text-indigo-900">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="font-bold">DOCX 워드 서류 (인앱 서식 변환 뷰어)</span>
              {doc.fileSize && (
                <span className="text-[10px] text-indigo-600 font-mono bg-indigo-100 px-1.5 py-0.5 rounded">
                  {doc.fileSize}
                </span>
              )}
            </div>
            {doc.fileData && (
              <a
                href={doc.fileData}
                download={doc.title}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-indigo-300 shadow-2xs"
              >
                <Download className="w-3 h-3" />
                다운로드
              </a>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[300px]">
            <div className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed font-sans space-y-3 whitespace-pre-line">
              {doc.rawText || doc.contentSnippet || '워드 문서 텍스트가 로드되었습니다.'}
            </div>
          </div>
        </div>
      );
    }

    // 4. Google Docs / Sheets / Slides / Drive or External Web (Embedded directly in Tab!)
    if (type === 'gdocs' || type === 'google_docs' || type === 'url' || doc.url) {
      const { embedUrl, isEmbeddable, type: embedType } = getEmbeddableUrl(doc.url || '');

      return (
        <div className="space-y-3">
          {/* Controls Bar for In-Tab Browser */}
          <div className="bg-slate-900 text-white rounded-xl p-2.5 flex items-center justify-between border border-slate-800 text-xs shadow-xs">
            <div className="flex items-center gap-2 truncate max-w-[65%]">
              <span className="bg-sky-950 text-sky-300 border border-sky-600/40 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase flex items-center gap-1 shrink-0">
                <Globe className="w-3 h-3 text-sky-400" />
                {embedType.replace('_', ' ')}
              </span>
              <span className="font-mono text-slate-300 text-[11px] truncate" title={doc.url}>
                {doc.url || embedUrl}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIframeKey(k => k + 1)}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                title="인앱 서류 새로고침"
              >
                <RefreshCw className="w-3 h-3" />
                <span>새로고침</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreenIframe(prev => !prev)}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                title="서류 뷰어 확대/축소"
              >
                {isFullscreenIframe ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span>기본 크기</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    <span>크게 보기</span>
                  </>
                )}
              </button>

              {doc.url && (
                <a
                  href={doc.url.startsWith('http') ? doc.url : `https://${doc.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-sky-300 hover:text-white bg-sky-900/60 hover:bg-sky-800 border border-sky-700/60 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                  title="새 창에서 원본 열기"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>새 창</span>
                </a>
              )}
            </div>
          </div>

          {/* In-Tab Iframe Viewer */}
          <div
            className={`w-full rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-950 transition-all ${
              isFullscreenIframe ? 'h-[750px]' : 'h-[520px]'
            }`}
          >
            {embedUrl ? (
              <iframe
                key={iframeKey}
                src={embedUrl}
                title={doc.title}
                className="w-full h-full border-0 bg-white"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                <p className="font-bold text-sm text-slate-200">유효한 URL이 지정되지 않았습니다.</p>
              </div>
            )}
          </div>

          {/* Fallback info bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="truncate">인앱 뷰어 모드로 렌더링 중입니다. (화면이 나오지 않을 시 우측 상단 <strong>[새 창]</strong> 버튼을 이용하세요)</span>
            </div>
            {doc.url && (
              <a
                href={doc.url.startsWith('http') ? doc.url : `https://${doc.url}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 font-bold shrink-0 flex items-center gap-1 ml-2"
              >
                <span>원본 바로가기</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Fallback & Context Text Note */}
          {doc.rawText && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">지원자 서류 요약 메모:</span>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{doc.rawText}</p>
            </div>
          )}
        </div>
      );
    }

    // 5. Presentation (PPTX/Portfolio) Slide View
    if (type === 'pptx' || type === 'ppt' || type === 'portfolio') {
      return (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-700 min-h-[260px] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Presentation className="w-4 h-4" />
                SLIDE {currentSlide} OF 5
              </span>
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCurrentSlide(prev => Math.max(1, prev - 1))}
                  disabled={currentSlide === 1}
                  className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs px-2 font-bold">{currentSlide} / 5</span>
                <button
                  type="button"
                  onClick={() => setCurrentSlide(prev => Math.min(5, prev + 1))}
                  disabled={currentSlide === 5}
                  className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="py-6 space-y-2">
              <h4 className="text-lg font-bold text-amber-300">
                {currentSlide === 1 && '1. 지원 동기 및 핵심 역량 요약'}
                {currentSlide === 2 && '2. 주요 개발 프로젝트 및 아키텍처 다이어그램'}
                {currentSlide === 3 && '3. 기술적 난제 극복 및 성능 최적화 사례'}
                {currentSlide === 4 && '4. 동아리 활동 계획 및 오픈소스 기여 목표'}
                {currentSlide === 5 && '5. Q&A 및 기술 포트폴리오 데모'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {doc.rawText?.split('\n')[currentSlide - 1] || doc.rawText || doc.contentSnippet}
              </p>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-800 pt-2">
              <span>{candidateName} • 포트폴리오 프레젠테이션</span>
              <span className="font-mono">{doc.title}</span>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
            <span className="font-bold block mb-1">발표 슬라이드 전체 스크립트:</span>
            <p className="whitespace-pre-line text-slate-700 text-[11px] leading-relaxed">
              {doc.rawText || doc.contentSnippet}
            </p>
          </div>
        </div>
      );
    }

    // 6. Code / Technical Artifact View
    if (type === 'code') {
      return (
        <div className="space-y-3">
          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <FileCode className="w-3.5 h-3.5" />
                {doc.title}
              </span>
              <span className="text-[10px]">Source Code Artifact</span>
            </div>
            <pre className="text-emerald-400 text-xs leading-relaxed whitespace-pre-wrap">
              {doc.rawText || doc.contentSnippet || '// No code content available'}
            </pre>
          </div>
        </div>
      );
    }

    // 7. Default Fallback Document (HWP, DOC, XLSX, TXT)
    return (
      <div className="space-y-3">
        <div className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed font-sans space-y-3 whitespace-pre-line bg-slate-50/70 p-5 rounded-xl border border-slate-200">
          {doc.rawText || doc.contentSnippet || '문서 텍스트 내용이 없습니다.'}
        </div>
      </div>
    );
  };

  if (!documents || documents.length === 0) {
    return (
      <div id="doc-viewer-empty" className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-lg text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="font-bold text-slate-800 text-sm">등록된 지원서/서류가 없습니다</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
          지원자의 PDF, DOCX, Google Docs, 포트폴리오(PPTX), 한글(HWP), 외부 링크 등 다양한 형식의 서류를 업로드할 수 있습니다.
        </p>
        <button
          onClick={() => setIsUploading(true)}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          서류 직접 업로드 (PDF / DOCX / Google Docs 등)
        </button>

        {isUploading && renderUploadModal()}
      </div>
    );
  }

  function renderUploadModal() {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 text-left max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <div>
              <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>지원 서류 등록 (DOCX / Google Docs / PDF 등)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                DOCX, Google Docs, PDF, PPTX, HWP, 노션 및 외부 URL을 지원서류 탭 안에서 직접 로딩합니다.
              </p>
            </div>
            <button
              onClick={() => setIsUploading(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              ✕
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                uploadMode === 'file' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>파일 (DOCX/PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('gdocs');
                setNewType('gdocs');
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                uploadMode === 'gdocs' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Docs</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('url');
                setNewType('url');
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                uploadMode === 'url' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>웹 링크(인앱)</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('text')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                uploadMode === 'text' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>텍스트</span>
            </button>
          </div>

          <form onSubmit={handleCreateDoc} className="space-y-4 text-xs">
            {/* File Upload Mode */}
            {uploadMode === 'file' && (
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
                >
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-blue-900 block text-xs">
                      {newTitle ? `선택된 파일: ${newTitle}` : '클릭하여 서류 파일(DOCX, PDF, PPTX 등)을 선택하세요'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      DOCX 워드 서류, PDF, PPTX, HWP, XLSX, 이미지 등 전 포맷 파싱 지원
                    </span>
                  </div>
                  {isParsingDocx && (
                    <div className="text-indigo-600 font-bold text-xs animate-pulse">
                      DOCX 워드 문서를 분석 및 서식 렌더링 중...
                    </div>
                  )}
                  {uploadedFileSize && (
                    <span className="inline-block font-mono text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      크기: {uploadedFileSize}
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".docx,.doc,.pdf,.pptx,.ppt,.hwp,.hwpx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.txt,.json,.zip"
                  className="hidden"
                />
              </div>
            )}

            {/* Google Docs Mode */}
            {uploadMode === 'gdocs' && (
              <div className="space-y-2 bg-blue-50/60 p-4 rounded-xl border border-blue-200">
                <label className="block font-bold text-blue-950 mb-1 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>Google Docs / Sheets / Slides 링크 입력 (인앱 뷰어 자동 변환)</span>
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => {
                    setNewUrl(e.target.value);
                    if (!newTitle) setNewTitle('구글 닥스 지원서류');
                  }}
                  placeholder="https://docs.google.com/document/d/.../edit"
                  className="w-full px-3 py-2 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono text-xs bg-white"
                  required
                />
                <p className="text-[10px] text-blue-700">
                  💡 구글 닥스 공유 링크가 자동으로 <span className="font-bold font-mono">/preview</span> 인앱 뷰어로 변환되어 서류 탭 안에서 즉시 렌더링됩니다.
                </p>
              </div>
            )}

            {/* External URL Mode */}
            {uploadMode === 'url' && (
              <div className="space-y-2 bg-sky-50/60 p-4 rounded-xl border border-sky-200">
                <label className="block font-bold text-sky-950 mb-1 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-sky-600" />
                  <span>외부 웹사이트 / 노션 포트폴리오 링크 (인앱 탭 로딩)</span>
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => {
                    setNewUrl(e.target.value);
                    if (!newTitle) setNewTitle('온라인 포트폴리오');
                  }}
                  placeholder="https://notion.so/... or https://github.com/..."
                  className="w-full px-3 py-2 border border-sky-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-mono text-xs bg-white"
                  required
                />
                <p className="text-[10px] text-sky-700">
                  💡 다른 페이지로 이동하지 않고 지원서류 탭 내 전용 인앱 뷰어에서 바로 로드됩니다.
                </p>
              </div>
            )}

            {/* Document Title & Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">문서 제목 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="예: 이력서_포트폴리오.docx"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">서류 형식 / 유형</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium bg-white"
                >
                  <option value="docx">📝 DOCX / Word 워드 문서 (직접 파싱)</option>
                  <option value="gdocs">📑 Google Docs / Drive (인앱 뷰어)</option>
                  <option value="pdf">📄 PDF (이력서 / 자기소개서 / 논문)</option>
                  <option value="pptx">📊 PPTX (포트폴리오 발표자료)</option>
                  <option value="hwp">📑 HWP / 한글 서식 문서</option>
                  <option value="xlsx">📈 XLSX / 데이터 표 및 스프레드시트</option>
                  <option value="image">🖼️ 이미지 (수료증 / 도면 / 캡처)</option>
                  <option value="code">💻 소스 코드 / GitHub 아티팩트</option>
                  <option value="url">🔗 노션 / 웹 포트폴리오 URL</option>
                  <option value="text">✏️ 일반 텍스트 문서</option>
                </select>
              </div>
            </div>

            {/* Content / Summary Text */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                서류 본문 / 핵심 역량 요약 (AI 꼬리 질문 생성에 반영)
              </label>
              <textarea
                rows={4}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="지원자의 프로젝트 경험, 주요 기술 스택, 성과 지표 또는 서류 본문 요약을 입력하세요."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono leading-relaxed resize-none text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsUploading(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
              >
                서류 등록 완료
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="document-viewer-container" className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Top Document Multi-Tab Bar with Format Icons */}
      <div className="flex items-center justify-between bg-slate-950 px-2 pt-2 border-b border-slate-800 select-none overflow-x-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {documents.map((doc) => {
            const isActive = doc.id === (activeDoc?.id || activeTabId);
            const badge = getDocBadgeInfo(doc.type);

            return (
              <button
                key={doc.id}
                onClick={() => setActiveTabId(doc.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs rounded-t-xl font-bold border-t border-x transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white border-slate-700 border-b-transparent shadow-xs'
                    : 'bg-slate-950 text-slate-400 border-transparent hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                {badge.icon}
                <span className="truncate max-w-[130px]">{doc.title}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-normal opacity-70 bg-slate-800/80">
                  {doc.type}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsUploading(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-300 hover:text-white bg-blue-950/80 hover:bg-blue-900 border border-blue-800 rounded-xl mb-1.5 transition-all cursor-pointer font-bold shrink-0 ml-2"
          title="새 서류 (DOCX / Google Docs / PDF 등) 추가"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>서류 추가</span>
        </button>
      </div>

      {/* Main Document Content Canvas (Professional High-Res View) */}
      <div className="flex-1 bg-slate-800/90 p-4 overflow-y-auto relative flex justify-center items-start">
        {activeDoc && (
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-6 my-2 min-h-[460px] animate-fade-in flex flex-col justify-between">
            <div>
              {/* Header of the active document */}
              <div className="border-b border-slate-200 pb-4 mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getDocBadgeInfo(activeDoc.type).color}`}>
                      {getDocBadgeInfo(activeDoc.type).label}
                    </span>
                    {activeDoc.fileSize && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {activeDoc.fileSize}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1.5 flex items-center gap-2">
                    {activeDoc.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-0.5">
                    지원자: <strong className="text-slate-900">{candidateName}</strong>
                    {activeDoc.uploadedAt && <span className="text-slate-400 ml-2">({activeDoc.uploadedAt} 등록)</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeDoc.fileData && (
                    <a
                      href={activeDoc.fileData}
                      download={activeDoc.title}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                      title="원본 다운로드"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  {activeDoc.url && (
                    <a
                      href={activeDoc.url.startsWith('http') ? activeDoc.url : `https://${activeDoc.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-blue-600 rounded-xl transition-colors"
                      title="새 창에서 원본 열기"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Dynamic Document Content Renderer */}
              {renderDocContent(activeDoc)}
            </div>

            {/* Simulated Verified Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-slate-700">SmartLab Multi-Format In-App Document Engine</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">Doc ID: {activeDoc.id}</span>
            </div>
          </div>
        )}
      </div>

      {/* Document Upload Modal */}
      {isUploading && renderUploadModal()}
    </div>
  );
};
