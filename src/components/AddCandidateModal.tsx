import React, { useState } from 'react';
import { Plus, Upload, Loader2 } from 'lucide-react';

export interface NewCandidateFormData {
  name: string;
  fieldNote: string;
  studentId: string;
  phone: string;
  startTime: string;
  endTime: string;
  docType: string;
  docUrl: string;
  docText: string;
  docTitle: string;
}

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewCandidateFormData) => Promise<void>;
  isSubmitting: boolean;
}

export const AddCandidateModal: React.FC<AddCandidateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const [newName, setNewName] = useState('');
  const [newFieldNote, setNewFieldNote] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStartTime, setNewStartTime] = useState('14:00');
  const [newEndTime, setNewEndTime] = useState('14:30');
  const [newDocType, setNewDocType] = useState('docx');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocText, setNewDocText] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewDocTitle(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setNewDocType('pdf');
    else if (ext === 'docx' || ext === 'doc') setNewDocType('docx');
    else if (ext === 'pptx' || ext === 'ppt') setNewDocType('pptx');
    else if (ext === 'hwp' || ext === 'hwpx') setNewDocType('hwp');
    else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') setNewDocType('xlsx');
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) setNewDocType('image');

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result;
      if (typeof result === 'string') {
        setNewDocUrl(result);
        if (!newDocText) {
          setNewDocText(`[첨부 파일: ${file.name} / ${(file.size / 1024).toFixed(1)} KB]`);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await onSubmit({
      name: newName.trim(),
      fieldNote: newFieldNote.trim(),
      studentId: newStudentId.trim(),
      phone: newPhone.trim(),
      startTime: newStartTime.trim(),
      endTime: newEndTime.trim(),
      docType: newDocType,
      docUrl: newDocUrl,
      docText: newDocText,
      docTitle: newDocTitle
    });

    // Reset fields
    setNewName('');
    setNewFieldNote('');
    setNewStudentId('');
    setNewPhone('');
    setNewDocUrl('');
    setNewDocText('');
    setNewDocTitle('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden text-white">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" />
            신규 면접 지원자 직접 등록
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">지원자 성명 *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-medium text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5">분야 / 메모 (선택)</label>
              <input
                type="text"
                value={newFieldNote}
                onChange={(e) => setNewFieldNote(e.target.value)}
                placeholder="예: AI, 프론트, 기획 등"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">학번 / 식별번호</label>
              <input
                type="text"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
                placeholder="202610291"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-mono text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5">연락처</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-mono text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">시작 시간</label>
              <input
                type="text"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                placeholder="14:00"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5">종료 시간</label>
              <input
                type="text"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                placeholder="14:30"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-mono font-bold text-white"
              />
            </div>
          </div>

          {/* Multi-Format Document Attachment Section */}
          <div className="space-y-2.5 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-300">
                지원 서류 첨부 (PDF / PPTX / HWP / 이미지 / Word / 링크 등)
              </label>
              <span className="text-[10px] text-blue-400 font-bold bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-md">
                다양한 서식 지원
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">서류 형식 선택</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden cursor-pointer"
                >
                  <option value="docx">📝 DOCX / Word 워드 문서</option>
                  <option value="gdocs">📑 Google Docs / Drive (인앱 로딩)</option>
                  <option value="pdf">📄 PDF (이력서 / 자소서)</option>
                  <option value="pptx">📊 PPTX (포트폴리오)</option>
                  <option value="hwp">📑 HWP (한글 문서)</option>
                  <option value="xlsx">📈 XLSX (스프레드시트)</option>
                  <option value="image">🖼️ 이미지 (수료증 / 캡처)</option>
                  <option value="code">💻 소스 코드 / GitHub</option>
                  <option value="url">🔗 외부 URL / 노션 (인앱 로딩)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">서류 파일 직접 업로드</label>
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 cursor-pointer transition-colors truncate">
                  <Upload className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{newDocTitle || '파일 선택 (DOCX, PDF 등)'}</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".docx,.doc,.pdf,.pptx,.ppt,.hwp,.hwpx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.txt,.json,.zip"
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {(newDocType === 'url' || newDocType === 'gdocs') && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {newDocType === 'gdocs' ? 'Google Docs / Sheets / Drive 공유 URL (인앱 뷰어로 변환)' : '외부 서류 / 웹사이트 URL (인앱 로딩)'}
                </label>
                <input
                  type="url"
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  placeholder={newDocType === 'gdocs' ? 'https://docs.google.com/document/d/...' : 'https://notion.so/... 또는 https://github.com/...'}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                지원 서류 본문 / 핵심 역량 요약 (AI 질문 생성에 활용)
              </label>
              <textarea
                rows={3}
                value={newDocText}
                onChange={(e) => setNewDocText(e.target.value)}
                placeholder="지원 동기, 프로젝트 경험, 포트폴리오 텍스트를 입력하면 실시간 AI 꼬리 질문 생성에 활용됩니다..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden resize-none text-xs text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-800 rounded-xl text-slate-300 font-semibold hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? '등록 중...' : '지원자 등록 완료'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
