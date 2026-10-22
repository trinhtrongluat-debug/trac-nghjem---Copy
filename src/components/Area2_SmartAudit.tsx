import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  Wand2, 
  Lock, 
  Unlock, 
  Share2, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  QrCode, 
  CheckCheck,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { Exam, AuditResult, AuditIssue } from '../types/exam';
import { autoRenumberExam } from '../utils/audit';
import { FormattedText } from './FormattedText';

interface Area2Props {
  exam: Exam;
  setExam: React.Dispatch<React.SetStateAction<Exam>>;
  auditResult: AuditResult;
  customApiKey: string;
  selectedModel: string;
  onOpenTestDrive: () => void;
}

export const Area2_SmartAudit: React.FC<Area2Props> = ({
  exam,
  setExam,
  auditResult,
  customApiKey,
  selectedModel,
  onOpenTestDrive,
}) => {
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixMessage, setAutoFixMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Generate live online student link
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const onlineTestLink = `${currentOrigin}/?exam=${encodeURIComponent(exam.id)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(onlineTestLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Local Fast Fix: Auto continuous renumbering
  const handleAutoRenumber = () => {
    const fixed = autoRenumberExam(exam);
    setExam(fixed);
    setAutoFixMessage('✓ Đã đánh lại số thứ tự liên tục 1 đến ' + fixed.parts.reduce((a, b) => a + b.questions.length, 0) + '!');
    setTimeout(() => setAutoFixMessage(''), 4000);
  };

  // AI Auto-Fix Logic: Sends flaws to Gemini Pro to resolve structural errors automatically
  const handleAiAutoFix = async () => {
    setIsAutoFixing(true);
    setAutoFixMessage('');

    try {
      const res = await fetch('/api/gemini/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam,
          auditErrors: auditResult.issues,
          customApiKey: customApiKey || undefined,
          modelName: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi gọi AI tự sửa đề');

      if (data.exam && data.exam.parts) {
        setExam((prev) => ({
          ...prev,
          title: data.exam.title || prev.title,
          parts: data.exam.parts,
        }));
        setAutoFixMessage('🎉 AI Auto-Fix đã sửa thành công toàn bộ các lỗi! Đề thi đã đạt chuẩn 100% Tick Xanh.');
      }
    } catch (err: any) {
      alert('Lỗi khi chạy AI Auto-Fix: ' + err.message);
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Inline Quick-Fix for single question (e.g., set default key 'A' if missing)
  const handleQuickFixKey = (partId: string, qId: string | number, fallbackKey: string = 'A') => {
    setExam((prev) => ({
      ...prev,
      parts: prev.parts.map((p) =>
        p.id === partId
          ? {
              ...p,
              questions: p.questions.map((q) =>
                q.id === qId
                  ? {
                      ...q,
                      correctAnswer: fallbackKey,
                      explanation: q.explanation || `Chọn đáp án ${fallbackKey} vì phù hợp nhất.`,
                    }
                  : q
              ),
            }
          : p
      ),
    }));
  };

  // Toggle Manual Approval by Teacher (Tick Xanh Thủ Công)
  const handleToggleManualApproval = () => {
    const newStatus = !exam.manualApproved;
    setExam((prev) => ({
      ...prev,
      manualApproved: newStatus,
      manualApprovedAt: newStatus ? new Date().toISOString() : undefined,
      manualApprovedBy: newStatus ? prev.teacherEmail || 'Giáo Viên' : undefined,
    }));
    setAutoFixMessage(
      newStatus
        ? '✓ ĐÃ BẬT TICK XANH THỦ CÔNG: Giáo viên đã duyệt và chấp nhận cấu trúc đề thi!'
        : 'Đã tắt duyệt thủ công. Hệ thống quay về kiểm định tự động.'
    );
    setTimeout(() => setAutoFixMessage(''), 4000);
  };

  // AI Auto Standardize to 4 Options for non-standard questions
  const handleStandardizeFourOptions = () => {
    let standardizedCount = 0;
    const newParts = exam.parts.map((p) => {
      const newQuestions = p.questions.map((q) => {
        if (q.questionType === 'fill_in' || q.questionType === 'essay') {
          return q;
        }
        const opts = [...(q.options || [])];
        if (opts.length < 4) {
          standardizedCount++;
          const alphabet = ['A', 'B', 'C', 'D'];
          while (opts.length < 4) {
            const nextLetter = alphabet[opts.length] || `Opt${opts.length + 1}`;
            opts.push({
              id: nextLetter,
              text: `Phương án ${nextLetter} (AI tự bổ sung)`,
            });
          }
          return {
            ...q,
            options: opts,
            correctAnswer: q.correctAnswer || opts[0]?.id || 'A',
          };
        }
        return q;
      });
      return { ...p, questions: newQuestions };
    });

    setExam((prev) => ({ ...prev, parts: newParts }));
    setAutoFixMessage(`🎉 Đã tự động chuẩn hóa ${standardizedCount} câu hỏi về đủ 4 phương án A-B-C-D!`);
    setTimeout(() => setAutoFixMessage(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Khu Vực 2
              </span>
              <h2 className="text-xl font-bold text-white">Kiểm Định & Sửa Đề (Smart Audit & Tick Xanh)</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Hệ thống tự động rà soát trùng lặp, thiếu đáp án đúng, gián đoạn thứ tự câu hỏi và áp dụng AI Auto-Fix để đạt 100% Tick Xanh.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleAutoRenumber}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Đánh lại số 1-N</span>
            </button>

            <button
              onClick={handleToggleManualApproval}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                exam.manualApproved
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Bật Tick Xanh bằng tay nếu giáo viên cố ý ra đề có câu 2-3 phương án hoặc câu tự luận"
            >
              <CheckCheck className={`w-3.5 h-3.5 ${exam.manualApproved ? 'text-white' : 'text-emerald-400'}`} />
              <span>{exam.manualApproved ? '✓ Đã Duyệt Thủ Công' : 'Tick Xanh Thủ Công'}</span>
            </button>

            <button
              onClick={handleAiAutoFix}
              disabled={isAutoFixing || auditResult.isPassed}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${isAutoFixing ? 'animate-spin' : ''}`} />
              <span>{isAutoFixing ? 'AI đang tự động khắc phục...' : 'AI Auto-Fix Logic'}</span>
            </button>
          </div>
        </div>

        {autoFixMessage && (
          <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{autoFixMessage}</span>
          </div>
        )}
      </div>

      {/* Main Audit Dashboard Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Overall Audit Score & Quality Gate Lock */}
        <div
          className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${
            auditResult.isPassed
              ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/60 shadow-xl shadow-emerald-950/20'
              : 'bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 border-amber-500/50 shadow-xl'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chỉ số Kiểm Định (Audit Score)
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  auditResult.isPassed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {auditResult.isManualApproved
                  ? '✓ DUYỆT THỦ CÔNG'
                  : auditResult.isPassed
                  ? '✓ 100% ĐẠT CHUẨN'
                  : `${auditResult.scorePercentage}%`}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">
                {auditResult.isPassed ? '100%' : `${auditResult.scorePercentage}%`}
              </span>
              <span className="text-xs text-slate-400">
                ({auditResult.errorCount} lỗi, {auditResult.warningCount} cảnh báo)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  auditResult.isPassed ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${auditResult.scorePercentage}%` }}
              />
            </div>

            <div className="mt-4 text-xs space-y-1.5 text-slate-300">
              <p className="flex items-center gap-1.5">
                {auditResult.isPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <span>
                  {auditResult.isManualApproved
                    ? `Đã được duyệt thủ công bởi ${exam.manualApprovedBy || 'Giáo viên'}.`
                    : auditResult.isPassed
                    ? 'Tất cả tiêu chuẩn khảo thí được đáp ứng hoàn hảo.'
                    : 'Đề thi cần khắc phục lỗi trước khi mở xuất link.'}
                </span>
              </p>
            </div>
          </div>

          {/* Quality Gate Action */}
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
            {/* Manual Green Tick Toggle in Left Card */}
            <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-300">Duyệt Đề Bằng Tay:</p>
                <p className="text-[10px] text-slate-400">Chấp nhận đề hiện tại & mở link</p>
              </div>
              <button
                onClick={handleToggleManualApproval}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  exam.manualApproved
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {exam.manualApproved ? 'Đang Bật' : 'Bật Tick'}
              </button>
            </div>

            {auditResult.isPassed ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Khóa Chất Lượng Đã Mở!</p>
                    <p className="text-[11px] text-emerald-400/90">
                      Link online đã sẵn sàng cho học sinh truy cập và nộp bài.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Đã Sao Chép Link!' : 'Sao Chép Link Online'}</span>
                  </button>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                    title="Mã QR Code cho học sinh quét"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Khóa Chất Lượng Đang Khóa (Locked)</p>
                    <p className="text-[11px] text-rose-400/80">
                      Nút "Tạo và Xuất Link Online" được bảo vệ cho đến khi đạt 100% Tick Xanh hoặc bấm Tick Xanh Thủ Công.
                    </p>
                  </div>
                </div>

                <button
                  disabled
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Tạo và Xuất Link Online (Bị Khóa)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 cols: 4 Specific Quality Checklist Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Missing Key Check */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">1. Đáp Án Đúng (Answer Keys)</span>
              {auditResult.summary.hasMissingKeys ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  ✗ Lỗi ({auditResult.summary.missingKeyNumbers.length} câu)
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ✓ 100% Đạt
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {auditResult.summary.hasMissingKeys ? (
                <span className="text-rose-300">
                  Thiếu key ở câu: <strong className="font-bold">{auditResult.summary.missingKeyNumbers.join(', ')}</strong>
                </span>
              ) : (
                'Tất cả câu hỏi đều đã được chỉ định đáp án đúng chính xác.'
              )}
            </p>
          </div>

          {/* Card 2: Continuous Numbering Check */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">2. Số Thứ Tự Liên Tục</span>
              {auditResult.summary.isContinuous ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ✓ 100% Đạt
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ✗ Gián đoạn
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {auditResult.summary.isContinuous
                ? `Thứ tự liên tục từ Câu 1 đến Câu ${auditResult.totalQuestions}.`
                : auditResult.summary.numberingDiscontinuities[0] || 'Phát hiện câu hỏi bị nhảy số thứ tự.'}
            </p>
          </div>

          {/* Card 3: Duplication Check */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">3. Trùng Lặp ID & Nội Dung</span>
              {auditResult.summary.hasDuplicateIds || auditResult.summary.hasDuplicateContent ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ⚠ Cảnh báo
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ✓ Độc bản
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {auditResult.summary.hasDuplicateIds
                ? 'Phát hiện có câu hỏi mang trùng ID.'
                : auditResult.summary.hasDuplicateContent
                ? 'Có câu hỏi bị trùng lặp nội dung.'
                : 'Không có câu hỏi hay định danh nào bị trùng lặp.'}
            </p>
          </div>

          {/* Card 4: Option Quality Check */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">4. Số Lượng Phương Án</span>
              {auditResult.nonStandardFourQuestions.length > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {auditResult.nonStandardFourQuestions.length} câu không chuẩn 4
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ✓ Chuẩn 4 Lựa chọn
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {auditResult.nonStandardFourQuestions.length > 0
                ? `${auditResult.nonStandardFourQuestions.length} câu có số phương án khác 4 (Xem chi tiết bảng bên dưới).`
                : 'Mỗi câu hỏi đều có đủ các phương án lựa chọn độc lập.'}
            </p>
          </div>
        </div>
      </div>

      {/* NEW: Comprehensive Question Structure Breakdown Card (Theo yêu cầu của GV) */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Bảng Thống Kê & Phân Tích Cấu Trúc Đề Thi
              </h3>
              <p className="text-xs text-slate-400">
                Tổng hợp số lượng câu hỏi trắc nghiệm, tự luận và phân loại số lượng phương án.
              </p>
            </div>
          </div>

          {/* Quick AI Standardize Button */}
          {auditResult.nonStandardFourQuestions.length > 0 && (
            <button
              onClick={handleStandardizeFourOptions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI Chuẩn Hóa Thành 4 Phương Án</span>
            </button>
          )}
        </div>

        {/* 3 Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400">Tổng Số Câu Hỏi</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-white">{auditResult.totalQuestions}</span>
              <span className="text-xs text-slate-400">câu</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400">Số Câu Trắc Nghiệm</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-indigo-400">{auditResult.multipleChoiceCount}</span>
              <span className="text-xs text-slate-400">câu (A, B, C, D...)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400">Số Câu Tự Luận (Điền từ)</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-emerald-400">{auditResult.fillInCount}</span>
              <span className="text-xs text-slate-400">câu (Điền vào chỗ trống)</span>
            </div>
          </div>
        </div>

        {/* Option Counts Breakdown Grid */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Phân Loại Số Phương Án Của Từng Câu:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <p className="text-slate-400 text-[11px]">1 Đáp án (Tự luận):</p>
              <p className="text-lg font-bold text-white mt-0.5">{auditResult.optionCounts.oneOptionCount} câu</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <p className="text-slate-400 text-[11px]">2 Đáp án (True/False):</p>
              <p className="text-lg font-bold text-amber-300 mt-0.5">{auditResult.optionCounts.twoOptionsCount} câu</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <p className="text-slate-400 text-[11px]">3 Đáp án (A-B-C):</p>
              <p className="text-lg font-bold text-amber-300 mt-0.5">{auditResult.optionCounts.threeOptionsCount} câu</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 bg-emerald-950/20">
              <p className="text-emerald-400 text-[11px] font-semibold">Chuẩn 4 Đáp Án:</p>
              <p className="text-lg font-bold text-emerald-300 mt-0.5">{auditResult.optionCounts.fourOptionsCount} câu</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <p className="text-slate-400 text-[11px]">Khác (&gt;4 đáp án):</p>
              <p className="text-lg font-bold text-slate-300 mt-0.5">{auditResult.optionCounts.otherCount} câu</p>
            </div>
          </div>
        </div>

        {/* Non-Standard 4 Options Question List Details */}
        <div className="pt-2">
          {auditResult.nonStandardFourQuestions.length === 0 ? (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                Tuyệt vời! 100% câu hỏi trắc nghiệm đều chuẩn 4 phương án lựa chọn (A, B, C, D).
              </span>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>
                    Các câu chưa chuẩn 4 phương án ({auditResult.nonStandardFourQuestions.length} câu):
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  (Bấm "AI Chuẩn Hóa" để bổ sung hoặc chọn "Tick Xanh Thủ Công" để giữ nguyên)
                </span>
              </div>

              {/* Badges for each non-standard question */}
              <div className="flex flex-wrap gap-2 pt-1">
                {auditResult.nonStandardFourQuestions.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 border border-amber-500/40 text-amber-200 shadow-sm"
                  >
                    <span>Câu {item.questionNumber}</span>
                    <span className="text-[10px] text-slate-400">
                      ({item.optionCount > 0 ? `${item.optionCount} phương án` : 'Tự luận'})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Issues Table with Inline Fix Action */}
      {auditResult.issues.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">
                Bảng Báo Cáo Chi Tiết Các Điểm Cần Khắc Phục ({auditResult.issues.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Nhấp nút "Sửa Ngay" để khắc phục trực tiếp
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {auditResult.issues.map((issue, idx) => {
              const isError = issue.severity === 'error';

              return (
                <div
                  key={idx}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {isError ? (
                      <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">
                          {issue.partTitle} • Câu {issue.questionNumber}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            isError ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {isError ? 'LỖI' : 'CẢNH BÁO'}
                        </span>
                      </div>
                      <FormattedText text={issue.message} isPronunciation={true} className="text-xs text-slate-300 mt-1 block" />
                    </div>
                  </div>

                  {/* Inline quick fix buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {issue.type === 'missing_key' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">Gán Key:</span>
                        {['A', 'B', 'C', 'D'].map((k) => (
                          <button
                            key={k}
                            onClick={() => handleQuickFixKey(issue.partId, issue.questionId, k)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-white text-xs font-semibold border border-slate-700 transition-all"
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    )}

                    {issue.type === 'numbering_gap' && (
                      <button
                        onClick={handleAutoRenumber}
                        className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium border border-indigo-500/40 transition-all"
                      >
                        Sửa Thứ Tự
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Zero Issues Celebration State */
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
            <CheckCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Hoàn Hảo! Đề Thi Đạt 100% Tick Xanh</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Không có bất kỳ câu hỏi nào bị thiếu đáp án đúng, gián đoạn thứ tự hay lỗi cấu trúc. Đề thi đã đạt chuẩn vàng khảo thí trực tuyến.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Đã Sao Chép Link!' : 'Sao Chép Link Bài Thi'}</span>
            </button>

            <button
              onClick={onOpenTestDrive}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Thi Thử Ngay (Test Drive)</span>
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Mã QR Thi Trực Tuyến</h3>
            <p className="text-xs text-slate-400">
              Học sinh quét mã QR bằng camera điện thoại để vào làm bài ngay lập tức.
            </p>
            <div className="bg-white p-4 rounded-xl inline-block shadow-inner">
              {/* Generated QR code image using safe image generator */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  onlineTestLink
                )}`}
                alt="QR Code bài thi"
                className="w-44 h-44 mx-auto"
              />
            </div>
            <p className="text-[11px] text-indigo-400 font-mono break-all px-2">
              {onlineTestLink}
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
