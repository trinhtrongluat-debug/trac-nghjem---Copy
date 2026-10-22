import React, { useState } from 'react';
import { 
  FileCode, 
  FileText, 
  Sparkles, 
  Plus, 
  Trash2, 
  Shuffle, 
  Lock, 
  Unlock, 
  Bot, 
  HelpCircle, 
  Volume2, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  Copy, 
  RefreshCw,
  MessageSquare,
  Wand2,
  Headphones,
  CheckCircle2,
  Image as ImageIcon,
  Sliders,
  FileCheck2,
  X
} from 'lucide-react';
import { Exam, ExamPart, Question, QuestionOption } from '../types/exam';
import { parseDocxFile, parseHtmlFileContent, parseRawExamText } from '../utils/parser';
import { AudioStudioModal } from './AudioStudioModal';
import { FormattedText } from './FormattedText';

interface Area1Props {
  exam: Exam;
  setExam: React.Dispatch<React.SetStateAction<Exam>>;
  customApiKey: string;
  selectedModel: string;
}

export const Area1_ExamCreator: React.FC<Area1Props> = ({
  exam,
  setExam,
  customApiKey,
  selectedModel,
}) => {
  // Input method tab: 'upload' | 'text' | 'ai'
  const [inputTab, setInputTab] = useState<'upload' | 'text' | 'ai'>('ai');

  // AI Prompt generator state
  const [aiPrompt, setAiPrompt] = useState(
    'Tạo đề thi tiếng Anh gồm 3 phần: Phần 1 phát âm từ gạch chân (dùng thẻ <u>...</u>); Phần 2 nghe hội thoại 2 bạn nhỏ Ben và Mai; Phần 3 nhìn tranh và chọn đáp án đúng'
  );
  const [aiSubject, setAiSubject] = useState(exam.subject || 'Tiếng Anh');
  const [aiGrade, setAiGrade] = useState('Lớp 3');
  const [aiNumQuestions, setAiNumQuestions] = useState(10);
  const [aiNumParts, setAiNumParts] = useState(3);
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [aiGenerateError, setAiGenerateError] = useState('');

  // Upload state with progress bar
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');

  // Raw text import state
  const [pastedText, setPastedText] = useState('');
  const [isParsingText, setIsParsingText] = useState(false);

  // Bulk AI Explanation generator state
  const [isGeneratingExplanations, setIsGeneratingExplanations] = useState(false);
  const [explanationMessage, setExplanationMessage] = useState('');

  // Part-specific Gemini Assistant Modal state
  const [activePartForAssistant, setActivePartForAssistant] = useState<ExamPart | null>(null);
  const [partAssistantPrompt, setPartAssistantPrompt] = useState('');
  const [partAssistantLoading, setPartAssistantLoading] = useState(false);
  const [partAssistantReply, setPartAssistantReply] = useState('');

  // Audio Studio Modal state
  const [partForAudioStudio, setPartForAudioStudio] = useState<ExamPart | null>(null);

  // Expanded parts tracker
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({
    'part-1': true,
    'part-2': true,
    'part-3': true,
  });

  const togglePartExpand = (partId: string) => {
    setExpandedParts((prev) => ({
      ...prev,
      [partId]: !prev[partId],
    }));
  };

  // --- Handlers: File Upload with Animated Progress Bar (Word .docx & HTML) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(15);
    setUploadMessage('Đang tải và giải nén tệp...');

    try {
      const fileName = file.name.toLowerCase();
      let parsedResult: Partial<Exam> = {};

      if (fileName.endsWith('.docx')) {
        setUploadProgress(35);
        setUploadMessage('Đang chuyển đổi tệp Word (.docx), trích xuất hình ảnh và bảng đáp án...');
        const html = await parseDocxFile(file);
        setUploadProgress(70);
        setUploadMessage('Đang ánh xạ từng câu hỏi với bảng đáp án...');
        parsedResult = parseHtmlFileContent(html);
      } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        setUploadProgress(40);
        setUploadMessage('Đang giải mã tệp HTML đề thi offline (Q_ENC & CFG)...');
        const text = await file.text();
        setUploadProgress(75);
        setUploadMessage('Đang trích xuất các Part, Audio, Hình ảnh và Bảng đáp án...');
        parsedResult = parseHtmlFileContent(text);
      } else {
        throw new Error('Chỉ hỗ trợ tệp .docx (Word) hoặc .html / .htm');
      }

      setUploadProgress(100);
      setUploadMessage('Hoàn tất phân tích dữ liệu!');

      if (parsedResult.parts && parsedResult.parts.length > 0) {
        const totalQs = parsedResult.parts.reduce((a, b) => a + b.questions.length, 0);
        const answeredQs = parsedResult.parts.reduce(
          (a, b) => a + b.questions.filter((q) => q.correctAnswer).length,
          0
        );

        const newExamTitle = parsedResult.title || file.name.replace(/\.[^/.]+$/, '');
        setExam((prev) => {
          const updated: Exam = {
            ...prev,
            ...parsedResult,
            title: newExamTitle,
            parts: parsedResult.parts as ExamPart[],
          };

          // Auto-save to backend database immediately in background
          fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch((err) => console.warn('Auto-save to backend failed', err));

          return updated;
        });

        // Expand all imported parts
        const expMap: Record<string, boolean> = {};
        parsedResult.parts.forEach((p) => {
          expMap[p.id] = true;
        });
        setExpandedParts(expMap);

        setTimeout(() => {
          setUploadProgress(null);
          setUploadMessage('');
          alert(
            `🎉 TẢI LÊN VÀ PHÂN TÍCH THÀNH CÔNG!\n\n` +
            `• Tên đề: ${newExamTitle}\n` +
            `• Số phần: ${parsedResult.parts?.length} Part\n` +
            `• Tổng số câu: ${totalQs} câu hỏi\n` +
            `• Đã khớp đáp án chính xác: ${answeredQs}/${totalQs} câu\n\n` +
            `Toàn bộ dữ liệu đề thi đã được tự động lưu lại vào hệ thống. Bạn có thể sang Khu Vực 5 chỉnh sửa cài đặt và quay lại bất cứ lúc nào mà không sợ bị mất đề!`
          );
        }, 500);
      } else {
        throw new Error('Không tìm thấy câu hỏi trắc nghiệm nào trong tệp');
      }
    } catch (err: any) {
      setUploadProgress(null);
      setUploadMessage('');
      alert('Lỗi tải tệp: ' + err.message);
    }
  };

  // --- Handlers: Rich Paste Clipboard Event (Detects HTML underlines, highlights, images) ---
  const handleClipboardPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Check if clipboard contains HTML (from Word or web browser)
    const htmlData = e.clipboardData.getData('text/html');
    if (htmlData && htmlData.includes('<')) {
      e.preventDefault();
      setPastedText(htmlData);
      setIsParsingText(true);
      try {
        const parsed = parseHtmlFileContent(htmlData);
        if (parsed.parts && parsed.parts.length > 0) {
          const totalQs = parsed.parts.reduce((a, b) => a + b.questions.length, 0);
          const answeredQs = parsed.parts.reduce(
            (a, b) => a + b.questions.filter((q) => q.correctAnswer).length,
            0
          );
          setExam((prev) => {
            const updated: Exam = {
              ...prev,
              ...parsed,
              parts: parsed.parts as ExamPart[],
            };
            fetch('/api/exams', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated),
            }).catch((err) => console.warn('Auto-save failed', err));
            return updated;
          });
          alert(
            `✓ Đã nhận diện thành công định dạng gạch chân, màu sắc và bảng đáp án:\n• ${parsed.parts.length} Phần\n• ${totalQs} Câu hỏi\n• ${answeredQs} câu đã khớp đáp án!`
          );
        }
      } catch (err) {
        console.warn('HTML parse error, fallback to raw text', err);
      } finally {
        setIsParsingText(false);
      }
      return;
    }

    // Check if clipboard contains images
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const dataUrl = uploadEvent.target?.result as string;
            // Attach to the first question of part 1 or alert
            if (exam.parts[0]?.questions[0]) {
              handleUpdateQuestion(exam.parts[0].id, exam.parts[0].questions[0].id, {
                imageUrl: dataUrl,
              });
              alert('✓ Đã dán hình ảnh từ clipboard vào Câu 1!');
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  // --- Handlers: Text Parser Button ---
  const handleParseText = () => {
    if (!pastedText.trim()) {
      alert('Vui lòng dán nội dung văn bản đề thi vào ô!');
      return;
    }
    setIsParsingText(true);
    try {
      const parsed = parseRawExamText(pastedText);
      if (parsed.parts && parsed.parts.length > 0) {
        setExam((prev) => {
          const updated: Exam = {
            ...prev,
            parts: parsed.parts as ExamPart[],
          };
          fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch((err) => console.warn('Auto-save failed', err));
          return updated;
        });
        alert(
          `Đã phân tích cú pháp thành công ${parsed.parts.reduce(
            (a, b) => a + b.questions.length,
            0
          )} câu hỏi!`
        );
      }
    } catch (e: any) {
      alert('Lỗi phân tích: ' + e.message);
    } finally {
      setIsParsingText(false);
    }
  };

  // --- Handlers: AI Full Exam Generation ---
  const handleGenerateExamAI = async () => {
    setIsGeneratingExam(true);
    setAiGenerateError('');
    try {
      const res = await fetch('/api/gemini/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          subject: aiSubject,
          grade: aiGrade,
          numQuestions: Number(aiNumQuestions),
          numParts: Number(aiNumParts),
          customApiKey: customApiKey || undefined,
          modelName: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tạo đề thi bằng AI');

      if (data.data && data.data.parts) {
        // Post-process to ensure audio scripts are placed properly
        const sanitizedParts = data.data.parts.map((p: any) => {
          let audioScript = p.audioScript || '';
          let passageText = p.passageText || '';

          // If passageText mistakenly contains Audio Script, move it over
          if (passageText.toLowerCase().includes('audio script:') || /boy:|girl:|speaker/i.test(passageText)) {
            if (!audioScript) {
              audioScript = passageText.replace(/audio script:\s*/i, '');
              passageText = '';
            }
          }

          return {
            ...p,
            audioScript,
            passageText,
          };
        });

        setExam((prev) => ({
          ...prev,
          title: data.data.title || prev.title,
          subject: aiSubject,
          parts: sanitizedParts,
        }));

        const expMap: Record<string, boolean> = {};
        sanitizedParts.forEach((p: ExamPart) => {
          expMap[p.id] = true;
        });
        setExpandedParts(expMap);
      }
    } catch (err: any) {
      setAiGenerateError(err.message || 'Không thể tạo đề thi');
    } finally {
      setIsGeneratingExam(false);
    }
  };

  // --- Handlers: Bulk AI Explanation Generator ---
  const handleGenerateExplanations = async () => {
    setIsGeneratingExplanations(true);
    setExplanationMessage('');

    const allQuestions: Question[] = [];
    exam.parts.forEach((p) => {
      p.questions.forEach((q) => allQuestions.push(q));
    });

    if (allQuestions.length === 0) {
      alert('Đề thi chưa có câu hỏi nào để tạo giải thích!');
      setIsGeneratingExplanations(false);
      return;
    }

    try {
      const res = await fetch('/api/gemini/generate-explanations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: allQuestions.map((q) => ({
            id: q.id,
            questionNumber: q.questionNumber,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
          })),
          customApiKey: customApiKey || undefined,
          modelName: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tạo giải thích');

      if (data.explanations && Array.isArray(data.explanations)) {
        const expMap = new Map<string | number, string>();
        data.explanations.forEach((item: any) => {
          expMap.set(item.questionId, item.explanation);
        });

        setExam((prev) => ({
          ...prev,
          parts: prev.parts.map((p) => ({
            ...p,
            questions: p.questions.map((q) => ({
              ...q,
              explanation:
                expMap.get(q.id) ||
                q.explanation ||
                `Chọn đáp án ${q.correctAnswer} vì phù hợp với kiến thức trọng tâm.`,
            })),
          })),
        }));

        setExplanationMessage(
          `✓ Đã tạo thành công giải thích chuẩn sư phạm cho ${data.explanations.length} câu hỏi!`
        );
        setTimeout(() => setExplanationMessage(''), 5000);
      }
    } catch (err: any) {
      alert('Lỗi tạo giải thích AI: ' + err.message);
    } finally {
      setIsGeneratingExplanations(false);
    }
  };

  // --- Handlers: Upload Audio from PC ---
  const handleUploadAudioFromPC = (partId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setExam((prev) => ({
        ...prev,
        parts: prev.parts.map((p) => (p.id === partId ? { ...p, audioUrl: dataUrl } : p)),
      }));
      alert('✓ Đã tải lên file audio thành công từ máy tính của bạn!');
    };
    reader.readAsDataURL(file);
  };

  // --- Handlers: Delete Audio ---
  const handleDeleteAudio = (partId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa file âm thanh của phần này để tạo lại?')) {
      setExam((prev) => ({
        ...prev,
        parts: prev.parts.map((p) => (p.id === partId ? { ...p, audioUrl: '' } : p)),
      }));
    }
  };

  // --- Handlers: Upload Image for Question or Option ---
  const handleUploadQuestionImage = (
    partId: string,
    qId: string | number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      handleUpdateQuestion(partId, qId, { imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadOptionImage = (
    partId: string,
    qId: string | number,
    optionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setExam((prev) => ({
        ...prev,
        parts: prev.parts.map((p) => {
          if (p.id === partId) {
            return {
              ...p,
              questions: p.questions.map((q) => {
                if (q.id === qId) {
                  return {
                    ...q,
                    options: q.options.map((opt) =>
                      opt.id === optionId ? { ...opt, imageUrl: dataUrl } : opt
                    ),
                  };
                }
                return q;
              }),
            };
          }
          return p;
        }),
      }));
    };
    reader.readAsDataURL(file);
  };

  // --- Handlers: Granular Question and Part management ---
  const handleAddPart = () => {
    const newPartId = `part-${Date.now()}`;
    const newPart: ExamPart = {
      id: newPartId,
      title: `PART ${exam.parts.length + 1}: CHỦ ĐỀ MỚI`,
      description: 'Chọn phương án đúng nhất cho các câu hỏi bên dưới.',
      passageText: '',
      audioUrl: '',
      audioScript: '',
      mixQ: true,
      mixA: true,
      questions: [
        {
          id: `q-${Date.now()}`,
          questionNumber: exam.parts.reduce((acc, p) => acc + p.questions.length, 0) + 1,
          text: 'Nội dung câu hỏi mẫu?',
          options: [
            { id: 'A', text: 'Phương án A' },
            { id: 'B', text: 'Phương án B' },
            { id: 'C', text: 'Phương án C' },
            { id: 'D', text: 'Phương án D' },
          ],
          correctAnswer: 'A',
          explanation: 'Chọn đáp án A vì lý do chính xác.',
          isLocked: false,
          mixA: true,
        },
      ],
    };

    setExam((prev) => ({
      ...prev,
      parts: [...prev.parts, newPart],
    }));
    setExpandedParts((prev) => ({ ...prev, [newPartId]: true }));
  };

  const handleDeletePart = (partId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ phần này cùng các câu hỏi bên trong?')) {
      setExam((prev) => ({
        ...prev,
        parts: prev.parts.filter((p) => p.id !== partId),
      }));
    }
  };

  const handleAddQuestionToPart = (partId: string) => {
    setExam((prev) => ({
      ...prev,
      parts: prev.parts.map((p) => {
        if (p.id === partId) {
          const newQ: Question = {
            id: `q-${Date.now()}`,
            questionNumber: prev.parts.reduce((a, b) => a + b.questions.length, 0) + 1,
            text: 'Nội dung câu hỏi mới...',
            options: [
              { id: 'A', text: 'Phương án A' },
              { id: 'B', text: 'Phương án B' },
              { id: 'C', text: 'Phương án C' },
              { id: 'D', text: 'Phương án D' },
            ],
            correctAnswer: 'A',
            explanation: 'Chọn đáp án A vì...',
            isLocked: false,
            mixA: true,
          };
          return {
            ...p,
            questions: [...p.questions, newQ],
          };
        }
        return p;
      }),
    }));
  };

  const handleDeleteQuestion = (partId: string, qId: string | number) => {
    setExam((prev) => ({
      ...prev,
      parts: prev.parts.map((p) =>
        p.id === partId ? { ...p, questions: p.questions.filter((q) => q.id !== qId) } : p
      ),
    }));
  };

  const handleUpdateQuestion = (
    partId: string,
    qId: string | number,
    updates: Partial<Question>
  ) => {
    setExam((prev) => ({
      ...prev,
      parts: prev.parts.map((p) =>
        p.id === partId
          ? {
              ...p,
              questions: p.questions.map((q) => (q.id === qId ? { ...q, ...updates } : q)),
            }
          : p
      ),
    }));
  };

  // Quick phonetic underline helper for pronunciation questions (gạch chân âm cần phân biệt)
  const handleUnderlinePattern = (partId: string, qId: string | number, pattern: string) => {
    setExam((prev) => ({
      ...prev,
      parts: prev.parts.map((p) => {
        if (p.id !== partId) return p;
        return {
          ...p,
          questions: p.questions.map((q) => {
            if (q.id !== qId) return q;
            const updatedOptions = q.options.map((opt) => {
              const stripped = opt.text.replace(/<\/?u\b[^>]*>/gi, '');
              let newText = stripped;
              if (pattern === 'ed') {
                newText = stripped.replace(/(ed)$/i, '<u>$1</u>');
              } else if (pattern === 's/es') {
                if (/es$/i.test(stripped.trim())) {
                  newText = stripped.replace(/(es)$/i, '<u>$1</u>');
                } else {
                  newText = stripped.replace(/(s)$/i, '<u>$1</u>');
                }
              } else if (pattern === 'clear') {
                newText = stripped;
              } else {
                newText = stripped.replace(new RegExp(`(${pattern})`, 'i'), '<u>$1</u>');
              }
              return { ...opt, text: newText };
            });
            return {
              ...q,
              options: updatedOptions,
              questionType: pattern === 'clear' ? 'multiple_choice' : 'pronunciation',
            };
          }),
        };
      }),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Khu Vực 1
              </span>
              <h2 className="text-xl font-bold text-white">
                Tạo Đề Thi & Trợ Lý Gemini Pro Từng Part
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Phòng thu âm thanh AI đa giọng đọc, hiển thị chuẩn Audio Script, tự sinh đề thi, phân tích file Word/HTML và bài tập nhìn tranh sinh động.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleGenerateExplanations}
              disabled={isGeneratingExplanations}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${isGeneratingExplanations ? 'animate-spin' : ''}`} />
              <span>
                {isGeneratingExplanations
                  ? 'Đang tạo giải thích AI...'
                  : 'Tạo giải thích đáp án bằng AI'}
              </span>
            </button>

            <button
              onClick={handleAddPart}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Part Mới</span>
            </button>
          </div>
        </div>

        {explanationMessage && (
          <div className="mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{explanationMessage}</span>
          </div>
        )}

        {/* Global Shuffling Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Shuffle className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold">Bộ Điều Khiển Trộn Đề Toàn Cục:</span>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={exam.mixQ}
                onChange={(e) => setExam((prev) => ({ ...prev, mixQ: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
              <span>Trộn thứ tự câu hỏi (mixQ Toàn Cục)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={exam.mixA}
                onChange={(e) => setExam((prev) => ({ ...prev, mixA: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
              <span>Trộn phương án đáp án (mixA Toàn Cục)</span>
            </label>
          </div>
        </div>
      </div>

      {/* 3 Input Methods Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        {/* Method Switcher Header */}
        <div className="flex border-b border-slate-800 bg-slate-950/60">
          <button
            onClick={() => setInputTab('ai')}
            className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              inputTab === 'ai'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Cách 1: Gemini Pro AI Tạo Đề Tự Động</span>
          </button>

          <button
            onClick={() => setInputTab('upload')}
            className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              inputTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Cách 2: Tải File Word (.docx) / HTML</span>
          </button>

          <button
            onClick={() => setInputTab('text')}
            className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              inputTab === 'text'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Copy className="w-4 h-4 text-emerald-400" />
            <span>Cách 3: Copy/Dán Nhận Diện Gạch Chân & Màu Sắc</span>
          </button>
        </div>

        {/* Method 1: AI Prompt Generator */}
        {inputTab === 'ai' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Môn học</label>
                <input
                  type="text"
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  placeholder="Tiếng Anh, Toán, GDCD, Tin Học..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Khối lớp / Trình độ
                </label>
                <input
                  type="text"
                  value={aiGrade}
                  onChange={(e) => setAiGrade(e.target.value)}
                  placeholder="Lớp 3, Lớp 10, TOEIC, IELTS..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Số lượng câu hỏi
                </label>
                <input
                  type="number"
                  min={2}
                  max={60}
                  value={aiNumQuestions}
                  onChange={(e) => setAiNumQuestions(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Số phần (Parts)</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={aiNumParts}
                  onChange={(e) => setAiNumParts(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Yêu cầu đề thi chi tiết (Prompt cho Gemini Pro)
              </label>
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ví dụ: Tạo đề kiểm tra học kỳ tiếng Anh lớp 3: Part 1 tìm từ gạch chân phát âm khác (dùng thẻ <u>...</u>); Part 2 nghe đối thoại giữa 2 bạn nhỏ; Part 3 từ vựng..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {aiGenerateError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30">
                {aiGenerateError}
              </p>
            )}

            <button
              onClick={handleGenerateExamAI}
              disabled={isGeneratingExam}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingExam ? 'animate-spin' : ''}`} />
              <span>
                {isGeneratingExam
                  ? 'Gemini Pro đang biên soạn đề thi & phân tách Audio Script chuẩn...'
                  : 'Bắt Đầu Sinh Đề Thi Bằng Gemini Pro'}
              </span>
            </button>
          </div>
        )}

        {/* Method 2: Upload Word (.docx) or HTML with % Progress Bar */}
        {inputTab === 'upload' && (
          <div className="p-6 text-center space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-3xl p-8 transition-colors bg-slate-950/40 max-w-xl mx-auto">
              <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">Chọn tệp Word (.docx) hoặc HTML từ máy tính</p>
              <p className="text-xs text-slate-400 mt-1">
                Tự động trích xuất chữ gạch chân phát âm, các phương án A-B-C-D trên cùng dòng, và nhận diện đáp án tô màu!
              </p>

              {/* Upload Progress Bar if active */}
              {uploadProgress !== null ? (
                <div className="mt-4 p-4 bg-slate-900 border border-indigo-500/30 rounded-2xl space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                    <span>{uploadMessage}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <label className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-lg shadow-indigo-600/30 transition-all">
                  <Upload className="w-4 h-4" />
                  <span>Chọn Tệp .docx Hoặc .html</span>
                  <input
                    type="file"
                    accept=".docx,.html,.htm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Method 3: Copy/Paste with Underline & Highlight & Image detection */}
        {inputTab === 'text' && (
          <div className="p-5 space-y-3">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Hỗ Trợ Copy Trực Tiếp Từ Word / Web:</span>
              </p>
              <p className="text-[11px] text-emerald-400/80">
                Nhấn <strong>Ctrl+V</strong> vào ô bên dưới. Hệ thống tự động giữ nguyên chữ gạch chân (<u>y</u>, <u>th</u>), đáp án được tô màu/bôi đậm, và hỗ trợ dán ảnh trực tiếp từ clipboard!
              </p>
            </div>

            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              onPaste={handleClipboardPaste}
              placeholder="Dán nội dung từ Word vào đây...&#10;Part 7. Tìm từ phát âm khác&#10;23. A. m<u>y</u>   B. fl<u>y</u>   C. sk<u>y</u>   D. stud<u>y</u>&#10;24. A. <u>th</u>ese   B. <u>th</u>ank   C. <u>th</u>ree   D. ma<u>th</u>"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            />

            <button
              onClick={handleParseText}
              disabled={isParsingText}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isParsingText ? 'animate-spin' : ''}`} />
              <span>{isParsingText ? 'Đang phân tích văn bản...' : 'Phân Tích Cú Pháp & Nhập Vào Đề'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Part List & Inline Questions Editor */}
      <div className="space-y-6">
        {exam.parts.map((part) => {
          const isExpanded = expandedParts[part.id] !== false;
          const isListeningPart =
            part.title.toLowerCase().includes('listen') ||
            part.title.toLowerCase().includes('nghe') ||
            !!part.audioScript;

          return (
            <div
              key={part.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg transition-all"
            >
              {/* Part Header */}
              <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => togglePartExpand(part.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  <div className="flex-1">
                    <input
                      type="text"
                      value={part.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setExam((prev) => ({
                          ...prev,
                          parts: prev.parts.map((p) => (p.id === part.id ? { ...p, title: newTitle } : p)),
                        }));
                      }}
                      className="w-full bg-transparent font-bold text-sm sm:text-base text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1"
                    />
                    <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                      <span>{part.questions.length} câu hỏi</span>
                      {part.audioUrl && (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <Volume2 className="w-3.5 h-3.5" /> Có Audio phát âm
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Part Shuffling & Audio Studio Actions */}
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={part.mixQ}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setExam((prev) => ({
                          ...prev,
                          parts: prev.parts.map((p) => (p.id === part.id ? { ...p, mixQ: val } : p)),
                        }));
                      }}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    <span>mixQ Part</span>
                  </label>

                  <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={part.mixA}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setExam((prev) => ({
                          ...prev,
                          parts: prev.parts.map((p) => (p.id === part.id ? { ...p, mixA: val } : p)),
                        }));
                      }}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    <span>mixA Part</span>
                  </label>

                  {/* Professional Audio Studio Button */}
                  <button
                    onClick={() => setPartForAudioStudio(part)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-semibold shadow-md transition-all"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Phòng Thu AI Đa Giọng</span>
                  </button>

                  <button
                    onClick={() => handleDeletePart(part.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                    title="Xóa Part này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Part Body */}
              {isExpanded && (
                <div className="p-5 space-y-5">
                  {/* Listening Script & Audio Controls Section */}
                  {isListeningPart && (
                    <div className="p-4 bg-slate-950/80 border border-indigo-500/30 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Headphones className="w-4 h-4 text-indigo-400" />
                          <span>Kịch Bản Nghe (Listening Audio Script) Của Phần Này:</span>
                        </label>

                        {/* Audio Controls: Delete, Upload from PC, Studio */}
                        <div className="flex items-center gap-2">
                          {/* Upload audio from PC */}
                          <label className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer text-[11px] font-semibold transition-all">
                            <Upload className="w-3 h-3 text-blue-400" />
                            <span>Tải Audio Từ Máy</span>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => handleUploadAudioFromPC(part.id, e)}
                              className="hidden"
                            />
                          </label>

                          {/* Delete Audio if present */}
                          {part.audioUrl && (
                            <button
                              onClick={() => handleDeleteAudio(part.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-semibold transition-all"
                              title="Xóa file âm thanh hiện tại"
                            >
                              <X className="w-3 h-3" />
                              <span>Xóa Audio</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={part.audioScript || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExam((prev) => ({
                            ...prev,
                            parts: prev.parts.map((p) =>
                              p.id === part.id ? { ...p, audioScript: val } : p
                            ),
                          }));
                        }}
                        placeholder="Boy: Hi, I'm Ben. I am eight years old.&#10;Girl: Look at my school bag! It is blue and yellow."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                      />

                      {/* Audio Player if generated or uploaded */}
                      {part.audioUrl && (
                        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                            <span className="font-semibold text-emerald-300">
                              File Audio Của Part (Sẵn sàng cho học sinh nghe):
                            </span>
                          </div>
                          <audio controls src={part.audioUrl} className="h-8 max-w-xs" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reading Passage if present or not listening */}
                  {(!isListeningPart || part.passageText) && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Đoạn Văn Đọc Hiểu / Ngữ Liệu (Reading Passage)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={part.passageText || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExam((prev) => ({
                            ...prev,
                            parts: prev.parts.map((p) =>
                              p.id === part.id ? { ...p, passageText: val } : p
                            ),
                          }));
                        }}
                        placeholder="Chỉ điền đoạn văn đọc hiểu tại đây nếu là phần Reading..."
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  )}

                  {/* Questions List */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Danh Sách Câu Hỏi ({part.questions.length})
                      </h4>
                      <button
                        onClick={() => handleAddQuestionToPart(part.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm câu hỏi</span>
                      </button>
                    </div>

                    {part.questions.map((q, qIndex) => {
                      const isPronunciationQ = q.questionType === 'pronunciation';

                      return (
                        <div
                          key={q.id}
                          className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 relative group"
                        >
                          {/* Question Top Row: Number, Text Input, Formatted Preview, Pin toggles */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                                Câu {q.questionNumber || qIndex + 1}
                              </span>
                              <input
                                type="text"
                                value={q.text}
                                onChange={(e) =>
                                  handleUpdateQuestion(part.id, q.id, { text: e.target.value })
                                }
                                placeholder="Nhập nội dung câu hỏi..."
                                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                              />
                            </div>

                            {/* Controls: Image Attach, Pin lock, Option Shuffle lock, Delete */}
                            <div className="flex items-center gap-1.5 text-[11px] self-end sm:self-auto">
                              {/* Upload Image for Question */}
                              <label
                                className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer transition-all ${
                                  q.imageUrl
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                                title="Gắn hình ảnh minh họa cho câu hỏi (Nhìn tranh và làm bài)"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>{q.imageUrl ? 'Có Ảnh Minh Họa' : 'Thêm Ảnh'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleUploadQuestionImage(part.id, q.id, e)}
                                  className="hidden"
                                />
                              </label>

                              {/* Question Type Switcher: Trắc Nghiệm vs Tự Luận */}
                              <button
                                onClick={() => {
                                  const isNowFillIn = q.questionType !== 'fill_in';
                                  handleUpdateQuestion(part.id, q.id, {
                                    questionType: isNowFillIn ? 'fill_in' : 'multiple_choice',
                                    options: isNowFillIn
                                      ? []
                                      : [
                                          { id: 'A', text: 'Phương án A' },
                                          { id: 'B', text: 'Phương án B' },
                                          { id: 'C', text: 'Phương án C' },
                                          { id: 'D', text: 'Phương án D' },
                                        ],
                                    correctAnswer: isNowFillIn ? (q.correctAnswer || 'an') : 'A',
                                  });
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition-all ${
                                  q.questionType === 'fill_in'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                                }`}
                                title="Chuyển đổi giữa Trắc nghiệm (A, B, C, D) và Tự luận (Điền từ)"
                              >
                                <span>{q.questionType === 'fill_in' ? '✍️ Tự Luận' : '🔘 Trắc Nghiệm'}</span>
                              </button>

                              {/* Pronunciation Mode Switcher */}
                              <button
                                onClick={() => {
                                  const isNowPronun = q.questionType !== 'pronunciation';
                                  handleUpdateQuestion(part.id, q.id, {
                                    questionType: isNowPronun ? 'pronunciation' : 'multiple_choice',
                                  });
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition-all ${
                                  q.questionType === 'pronunciation'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                                }`}
                                title="Bật/Tắt chế độ câu hỏi Ngữ âm / Gạch chân âm phát âm"
                              >
                                <span>{q.questionType === 'pronunciation' ? '🔊 Bài Phát Âm' : 'Phát Âm'}</span>
                              </button>

                              <button
                                onClick={() =>
                                  handleUpdateQuestion(part.id, q.id, { isLocked: !q.isLocked })
                                }
                                title={
                                  q.isLocked
                                    ? 'Đang Ghim vị trí (Không bị trộn vị trí)'
                                    : 'Cho phép trộn vị trí'
                                }
                                className={`flex items-center gap-1 px-2 py-1 rounded border transition-all ${
                                  q.isLocked
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                }`}
                              >
                                {q.isLocked ? (
                                  <Lock className="w-3 h-3 text-amber-400" />
                                ) : (
                                  <Unlock className="w-3 h-3" />
                                )}
                                <span>{q.isLocked ? 'Đã Ghim' : 'Trộn Câu'}</span>
                              </button>

                              <button
                                onClick={() =>
                                  handleUpdateQuestion(part.id, q.id, {
                                    mixA: q.mixA === false ? true : false,
                                  })
                                }
                                title={
                                  q.mixA === false
                                    ? 'Khóa thứ tự A-B-C-D'
                                    : 'Cho phép xáo trộn đáp án'
                                }
                                className={`flex items-center gap-1 px-2 py-1 rounded border transition-all ${
                                  q.mixA === false
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                }`}
                              >
                                <Shuffle className="w-3 h-3" />
                                <span>{q.mixA === false ? 'Khóa mixA' : 'mixA Bật'}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteQuestion(part.id, q.id)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                                title="Xóa câu hỏi này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Question Image Preview if attached */}
                          {q.imageUrl && (
                            <div className="relative inline-block mt-2">
                              <img
                                src={q.imageUrl}
                                alt={`Ảnh minh họa câu ${q.questionNumber}`}
                                className="max-h-44 rounded-xl border border-slate-700 shadow-md object-contain bg-slate-900"
                              />
                              <button
                                onClick={() =>
                                  handleUpdateQuestion(part.id, q.id, { imageUrl: '' })
                                }
                                className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-500"
                                title="Xóa ảnh này"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Decoded Pronunciation / Heading Preview & Quick Underline Toolbar */}
                          {(isPronunciationQ || q.questionType === 'pronunciation') && (
                            <div className="p-3 bg-slate-900/90 border border-amber-500/40 rounded-xl text-xs space-y-2.5">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] uppercase font-bold text-amber-300 flex items-center gap-1.5">
                                  <span>🔊 Hiển thị từ gạch chân âm phân biệt (Học sinh nhìn thấy):</span>
                                </span>
                                {/* Quick 1-click Phonetic Underline Buttons */}
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-medium mr-1">Gạch chân âm:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUnderlinePattern(part.id, q.id, 'ed')}
                                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold"
                                    title="Gạch chân đuôi -ed"
                                  >
                                    <u>ed</u>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUnderlinePattern(part.id, q.id, 's/es')}
                                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold"
                                    title="Gạch chân đuôi -s hoặc -es"
                                  >
                                    <u>s</u>/<u>es</u>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUnderlinePattern(part.id, q.id, 'ch')}
                                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold"
                                  >
                                    <u>ch</u>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUnderlinePattern(part.id, q.id, 'th')}
                                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold"
                                  >
                                    <u>th</u>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUnderlinePattern(part.id, q.id, 'ea')}
                                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold"
                                  >
                                    <u>ea</u>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUnderlinePattern(part.id, q.id, 'oo')}
                                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold"
                                  >
                                    <u>oo</u>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUnderlinePattern(part.id, q.id, 'clear')}
                                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-[10px]"
                                    title="Xóa tất cả gạch chân"
                                  >
                                    Bỏ gạch chân
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white pt-1">
                                {q.options.map((opt) => (
                                  <div
                                    key={opt.id}
                                    className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                                      q.correctAnswer === opt.id
                                        ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200'
                                        : 'bg-slate-950 border-slate-800 text-slate-300'
                                    }`}
                                  >
                                    <span className="font-bold text-slate-400">{opt.id}.</span>
                                    <FormattedText text={opt.text} isPronunciation={true} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Conditional Options Render: Tự Luận (Điền từ) VS Trắc Nghiệm (A, B, C, D) */}
                          {q.questionType === 'fill_in' || !q.options || q.options.length === 0 ? (
                            <div className="p-3.5 bg-slate-900/90 border border-emerald-500/40 rounded-xl space-y-2 mt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                  <span>✍️ Đáp án từ cần điền (Tự Luận):</span>
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Học sinh gõ đúng từ này sẽ được cộng điểm
                                </span>
                              </div>
                              <input
                                type="text"
                                value={q.correctAnswer || ''}
                                onChange={(e) =>
                                  handleUpdateQuestion(part.id, q.id, {
                                    correctAnswer: e.target.value,
                                    acceptableAnswers: [e.target.value],
                                  })
                                }
                                placeholder="Nhập từ chính xác học sinh cần điền (ví dụ: an, biggest, went)..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {q.options.map((opt) => {
                                const isCorrect = q.correctAnswer === opt.id;

                                return (
                                  <div
                                    key={opt.id}
                                    className={`flex flex-col p-2 rounded-xl border transition-all ${
                                      isCorrect
                                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {/* Radio button to select correct answer key */}
                                      <button
                                        onClick={() =>
                                          handleUpdateQuestion(part.id, q.id, {
                                            correctAnswer: opt.id,
                                          })
                                        }
                                        title={`Nhấp để chọn ${opt.id} làm đáp án đúng`}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                                          isCorrect
                                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                      >
                                        {opt.id}
                                      </button>

                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => {
                                          const updatedOptions = q.options.map((o) =>
                                            o.id === opt.id ? { ...o, text: e.target.value } : o
                                          );
                                          handleUpdateQuestion(part.id, q.id, {
                                            options: updatedOptions,
                                          });
                                        }}
                                        className="flex-1 bg-transparent text-xs text-white focus:outline-none px-1"
                                        placeholder={`Phương án ${opt.id}...`}
                                      />

                                      {/* Attach Image to Option */}
                                      <label
                                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 cursor-pointer"
                                        title="Thêm tranh minh họa cho phương án này"
                                      >
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) =>
                                            handleUploadOptionImage(part.id, q.id, opt.id, e)
                                          }
                                          className="hidden"
                                        />
                                      </label>
                                    </div>

                                    {/* Option Image preview if attached */}
                                    {opt.imageUrl && (
                                      <div className="relative mt-2 inline-block">
                                        <img
                                          src={opt.imageUrl}
                                          alt={`Tranh phương án ${opt.id}`}
                                          className="h-20 rounded-lg border border-slate-700 object-contain bg-slate-950"
                                        />
                                        <button
                                          onClick={() => {
                                            const updatedOptions = q.options.map((o) =>
                                              o.id === opt.id ? { ...o, imageUrl: '' } : o
                                            );
                                            handleUpdateQuestion(part.id, q.id, {
                                              options: updatedOptions,
                                            });
                                          }}
                                          className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Inline Explanation Editor */}
                          <div className="pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                                <HelpCircle className="w-3 h-3" />
                                <span>Lời giải thích chi tiết:</span>
                              </span>
                              <span className="text-[10px] text-slate-400 italic">
                                Chuẩn format: "Chọn đáp án {q.correctAnswer} vì..."
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              value={q.explanation || ''}
                              onChange={(e) =>
                                handleUpdateQuestion(part.id, q.id, {
                                  explanation: e.target.value,
                                })
                              }
                              placeholder={`Chọn đáp án ${q.correctAnswer} vì...`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans resize-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Audio Studio Modal */}
      {partForAudioStudio && (
        <AudioStudioModal
          part={partForAudioStudio}
          customApiKey={customApiKey}
          onClose={() => setPartForAudioStudio(null)}
          onApplyAudio={(audioUrl, scriptText) => {
            setExam((prev) => ({
              ...prev,
              parts: prev.parts.map((p) =>
                p.id === partForAudioStudio.id
                  ? { ...p, audioUrl, audioScript: scriptText }
                  : p
              ),
            }));
            alert('✓ Đã áp dụng file Audio AI phòng thu vào phần thi thành công!');
          }}
        />
      )}
    </div>
  );
};
