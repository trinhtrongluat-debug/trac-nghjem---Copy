import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Flag, 
  ArrowLeft, 
  ArrowRight, 
  Volume2, 
  Gift, 
  Sparkles, 
  Lock, 
  AlertTriangle,
  RotateCcw,
  Check,
  Send,
  Headphones,
  ScrollText,
  Layers,
  ListFilter
} from 'lucide-react';
import { Exam, StudentSubmission, Question } from '../types/exam';
import { prepareShuffledExam } from '../utils/shuffler';
import { isPronunciationPart, sanitizeExamPronunciation } from '../utils/parser';
import { FormattedText } from './FormattedText';

interface Area4Props {
  exam: Exam;
  isStudentMode?: boolean; // When rendered for a real student via online link
  onBackToDashboard?: () => void;
}

export const Area4_TestDrive: React.FC<Area4Props> = ({
  exam,
  isStudentMode = false,
  onBackToDashboard,
}) => {
  // Test Drive States
  const [hasStarted, setHasStarted] = useState(false);
  const [studentName, setStudentName] = useState(isStudentMode ? '' : 'Nguyễn Văn An (Giáo Viên Thi Thử)');
  const [studentClass, setStudentClass] = useState(isStudentMode ? '' : '12A1');
  const [studentId, setStudentId] = useState(isStudentMode ? '' : 'HS-2026-001');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Working prepared exam (with shuffling applied) and answer mapping
  const [workingExam, setWorkingExam] = useState<Exam>(() => sanitizeExamPronunciation(exam));
  const [answerKeyMapping, setAnswerKeyMapping] = useState<Record<string | number, string>>({});

  // Sync workingExam when incoming exam prop changes before exam starts
  useEffect(() => {
    if (!hasStarted) {
      setWorkingExam(sanitizeExamPronunciation(exam));
    }
  }, [exam, hasStarted]);

  // Navigation & Answers
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string | number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string | number, boolean>>({});

  // View Mode: 'scroll' = Cuộn toàn bài (mặc định để hs không phải bấm câu tiếp theo), 'step' = Từng câu một
  const [viewMode, setViewMode] = useState<'scroll' | 'step'>('scroll');
  const [highlightedQId, setHighlightedQId] = useState<string | number | null>(null);
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'unanswered' | 'answered' | 'flagged'>('all');

  // Timer
  const [secondsLeft, setSecondsLeft] = useState((exam.timeLimit || 45) * 60);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);

  // Anti-Cheat tracking
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [antiCheatReason, setAntiCheatReason] = useState('');

  // Submission & Result
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<StudentSubmission | null>(null);
  const [rewardMessage, setRewardMessage] = useState('');
  const [isRewardTriggered, setIsRewardTriggered] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Flattened questions for navigator
  const allFlattenedQuestions: { q: Question; partIndex: number; qIndex: number; partTitle: string }[] = [];
  workingExam.parts.forEach((p, pIdx) => {
    p.questions.forEach((q, qIdx) => {
      allFlattenedQuestions.push({ q, partIndex: pIdx, qIndex: qIdx, partTitle: p.title });
    });
  });

  // Check if exam is closed
  if (!exam.isActive && isStudentMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Đề Thi Hiện Đang Bị Khóa</h2>
          <p className="text-xs text-slate-400">
            Giáo viên đã tạm khóa hoặc kết thúc thời gian làm bài cho mã đề: <strong className="text-indigo-400">{exam.id}</strong>.
            Vui lòng liên hệ giáo viên để biết thêm thông tin!
          </p>
        </div>
      </div>
    );
  }

  // --- Handlers: Start Test Drive ---
  const handleStartExam = () => {
    if (!studentName.trim()) {
      alert('Vui lòng nhập Họ và tên trước khi bắt đầu!');
      return;
    }
    if (exam.password && exam.password.trim() !== '') {
      if (enteredPassword !== exam.password) {
        setPasswordError('Mật khẩu đề thi không đúng!');
        return;
      }
    }

    // Prepare shuffled exam
    const { shuffledExam, answerMapping } = prepareShuffledExam(sanitizeExamPronunciation(exam));
    setWorkingExam(shuffledExam);
    setAnswerKeyMapping(answerMapping);

    setSecondsLeft((exam.timeLimit || 45) * 60);
    setTimeSpentSeconds(0);
    setViolationCount(0);
    setSelectedAnswers({});
    setFlaggedQuestions({});
    setHasStarted(true);
    setIsSubmitted(false);
  };

  // --- Anti-Cheat Listeners ---
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

    // 1. Right Click Prevention
    const handleContextMenu = (e: MouseEvent) => {
      if (exam.antiCheat.blockRightClick) {
        e.preventDefault();
      }
    };

    // 2. Copy / Cut / Paste Prevention
    const handleCopyPaste = (e: ClipboardEvent) => {
      if (exam.antiCheat.blockCopyPaste) {
        e.preventDefault();
        alert('Hành vi sao chép / dán đã bị vô hiệu hóa bởi giám thị!');
      }
    };

    // 3. Tab Visibility / Screen Switch Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const nextViolations = violationCount + 1;
        setViolationCount(nextViolations);

        if (exam.antiCheat.autoSubmitOnViolation && nextViolations >= (exam.antiCheat.maxViolations || 3)) {
          setAntiCheatReason('Bài thi đã bị hệ thống tự động thu do chuyển tab quá 3 lần!');
          handleSubmitExam(true);
        } else {
          setShowViolationWarning(true);
        }
      }
    };

    const handleWindowBlur = () => {
      // Also catch window blur (e.g. alt-tab)
      if (!document.hidden) {
        handleVisibilityChange();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopyPaste);
    window.addEventListener('cut', handleCopyPaste);
    window.addEventListener('paste', handleCopyPaste);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopyPaste);
      window.removeEventListener('cut', handleCopyPaste);
      window.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [hasStarted, isSubmitted, violationCount, exam.antiCheat]);

  // --- Countdown Timer Effect ---
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(false);
          return 0;
        }
        return prev - 1;
      });
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, isSubmitted]);

  // --- Submit Exam Logic ---
  const handleSubmitExam = async (forcedByCheat = false) => {
    setShowConfirmSubmit(false);
    setIsSubmitted(true);

    // Calculate score
    let correctCount = 0;
    const snapshots: any[] = [];

    allFlattenedQuestions.forEach(({ q, partTitle }) => {
      const studentChoice = selectedAnswers[q.id] || '';
      const originalKey = q.correctAnswer;
      const isFillIn = q.questionType === 'fill_in' || q.questionType === 'essay';
      let isCorrect = false;

      if (isFillIn) {
        const studentAns = (studentChoice || '').trim().toLowerCase();
        const targetAns = (originalKey || '').trim().toLowerCase();
        const acceptable = (q.acceptableAnswers || [originalKey || '']).map((a) => a.trim().toLowerCase());
        isCorrect = studentAns !== '' && (studentAns === targetAns || acceptable.includes(studentAns));
      } else {
        isCorrect = studentChoice === originalKey;
      }

      if (isCorrect) correctCount++;

      snapshots.push({
        questionId: q.id,
        questionNumber: q.questionNumber,
        partTitle,
        text: q.text,
        imageUrl: q.imageUrl,
        options: q.options || [],
        studentChoice,
        correctAnswer: originalKey,
        isCorrect,
        explanation: q.explanation || (isFillIn ? `Từ cần điền chính xác: "${originalKey}".` : `Chọn đáp án ${originalKey} vì đáp ứng kiến thức cốt lõi.`),
        questionType: q.questionType || (isFillIn ? 'fill_in' : 'multiple_choice'),
      });
    });

    const totalQuestions = Math.max(1, allFlattenedQuestions.length);
    const score = (correctCount / totalQuestions) * 10;

    // Check Reward / Gift Trigger
    const { rewardConfig } = exam;
    let earnedReward = false;
    let chosenRewardText = '';

    if (
      rewardConfig &&
      rewardConfig.enabled &&
      score >= rewardConfig.minScore &&
      timeSpentSeconds <= (rewardConfig.maxTimeMinutes || 45) * 60
    ) {
      earnedReward = true;
      setIsRewardTriggered(true);

      // Rotator support: select random or sequential reward message
      const messages = rewardConfig.successMessages || [];
      if (messages.length > 0) {
        const randomIdx = Math.floor(Math.random() * messages.length);
        chosenRewardText = messages[randomIdx];
      } else {
        chosenRewardText = '🎉 Chúc mừng bạn đã hoàn thành xuất sắc bài thi!';
      }
      setRewardMessage(chosenRewardText);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } else {
      setIsRewardTriggered(false);
      setRewardMessage(rewardConfig.defaultMessage || 'Chúc mừng bạn đã nộp bài thành công!');
    }

    const submissionPayload: StudentSubmission = {
      id: 'SUB-' + Date.now(),
      examId: exam.id,
      studentName: studentName || 'Học sinh',
      studentClass: studentClass || '',
      studentId: studentId || '',
      score: Number(score.toFixed(2)),
      totalQuestions,
      correctCount,
      timeSpentSeconds,
      violations: violationCount + (forcedByCheat ? 1 : 0),
      attempt: 1,
      timestamp: new Date().toISOString(),
      answers: selectedAnswers as Record<string, string>,
      questionSnapshots: snapshots,
    };

    setSubmissionResult(submissionPayload);

    // Sync to backend API
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });
    } catch (e) {
      console.warn('Submission sync failed:', e);
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Current question data
  const currentPart = workingExam.parts[currentPartIndex];
  const currentQ = currentPart?.questions[currentQuestionIndex];

  // Helper to jump to question (supports smooth scrolling in scroll mode)
  const jumpToQuestion = (partIdx: number, qIdx: number, qId?: string | number) => {
    setCurrentPartIndex(partIdx);
    setCurrentQuestionIndex(qIdx);
    if (qId) {
      const el = document.getElementById(`test-q-${qId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedQId(qId);
        setTimeout(() => setHighlightedQId(null), 2200);
      }
    }
  };

  // Helper to toggle flag
  const toggleFlag = (qId: string | number) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // --- View: Start Screen ---
  if (!hasStarted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {isStudentMode ? 'Cổng Thi Trực Tuyến' : 'Khu Vực 4: Thi Thử Đề (Test Drive)'}
            </span>
            <h2 className="text-2xl font-extrabold text-white">{exam.title}</h2>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span>Trường: <strong className="text-slate-300">{exam.school}</strong></span>
              <span>•</span>
              <span>Giáo viên: <strong className="text-slate-300">{exam.teacher}</strong></span>
              <span>•</span>
              <span>Môn: <strong className="text-indigo-400">{exam.subject}</strong></span>
            </div>
          </div>

          {/* Exam Details Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-center">
            <div>
              <p className="text-[11px] text-slate-400">Thời gian làm bài</p>
              <p className="text-lg font-bold text-white mt-0.5">{exam.timeLimit || 45} phút</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Tổng số câu hỏi</p>
              <p className="text-lg font-bold text-white mt-0.5">{allFlattenedQuestions.length} câu</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Số phần thi</p>
              <p className="text-lg font-bold text-white mt-0.5">{exam.parts.length} phần</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Điểm xem đáp án</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">&gt;= {exam.minScoreViewAnswers || 7.0}</p>
            </div>
          </div>

          {/* Student Info Inputs */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Thông Tin Thí Sinh
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Họ và tên thí sinh <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nhập đầy đủ họ và tên..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Lớp / Khối</label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="Ví dụ: 12A1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mã số học sinh</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Ví dụ: HS-001"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Password check if required */}
            {exam.password && exam.password.trim() !== '' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mật khẩu bài thi <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Nhập mật khẩu do giáo viên cung cấp..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                {passwordError && (
                  <p className="text-xs text-rose-400 mt-1">{passwordError}</p>
                )}
              </div>
            )}
          </div>

          {/* Anti-Cheat Regulations Notice */}
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>Quy Chế Phòng Thi Trực Tuyến:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
              <li>Hệ thống giám sát vi phạm: Tự động thu bài nếu chuyển tab quá 3 lần.</li>
              <li>Chặn sao chép, nhấp chuột phải và dán nội dung trong suốt thời gian làm bài.</li>
              <li>Đồng hồ đếm ngược sẽ tự động nộp bài khi hết giờ.</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {onBackToDashboard && !isStudentMode && (
              <button
                onClick={onBackToDashboard}
                className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Quay Lại Dashboard
              </button>
            )}

            <button
              onClick={handleStartExam}
              className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>{isStudentMode ? 'Bắt Đầu Làm Bài' : 'Bắt Đầu Thi Thử (Test Drive)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- View: Result Screen ---
  if (isSubmitted && submissionResult) {
    const isPassed = submissionResult.score >= (exam.passingScore || 5.0);
    const canViewAnswers = submissionResult.score >= (exam.minScoreViewAnswers || 7.0);

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          {/* Confetti Celebration or Normal icon */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl ${
              isPassed
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/20'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {isPassed ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">
              {isPassed ? 'Hoàn Thành Bài Thi Xuất Sắc!' : 'Đã Nộp Bài Thi'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Thí sinh: <strong className="text-white">{submissionResult.studentName}</strong> • Lớp {submissionResult.studentClass || 'N/A'}
            </p>
          </div>

          {/* Score Badge */}
          <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl max-w-sm mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Điểm Số Của Bạn</span>
            <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300">
              {submissionResult.score.toFixed(1)} <span className="text-lg text-slate-500">/ 10</span>
            </div>
            <p className="text-xs text-slate-400">
              Số câu đúng: <strong className="text-emerald-400 font-bold">{submissionResult.correctCount}</strong> / {submissionResult.totalQuestions} câu • Thời gian làm: {formatTime(submissionResult.timeSpentSeconds)}
            </p>
          </div>

          {/* Gift / Reward Mode Module Message */}
          {isRewardTriggered ? (
            <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-900 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs space-y-1 shadow-lg shadow-emerald-950/40">
              <div className="flex items-center justify-center gap-2 font-bold text-sm text-emerald-300">
                <Gift className="w-5 h-5 text-emerald-400" />
                <span>Phần Thưởng Đạt Chuẩn (Reward Mode Activated):</span>
              </div>
              <p className="font-semibold text-white">{rewardMessage}</p>
            </div>
          ) : (
            <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-400">
              {rewardMessage}
            </div>
          )}

          {/* View Answers Protection Notice */}
          {!canViewAnswers && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>
                Yêu cầu điểm số tối thiểu để xem đáp án và giải thích là <strong>{exam.minScoreViewAnswers} điểm</strong>. Bạn chưa đủ điều kiện mở khóa phần giải thích chi tiết.
              </span>
            </div>
          )}

          {/* Action to re-test drive */}
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setHasStarted(false);
                setIsSubmitted(false);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm Lại Bài Thi</span>
            </button>

            {onBackToDashboard && !isStudentMode && (
              <button
                onClick={onBackToDashboard}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
              >
                Trở Về Bảng Điều Khiển
              </button>
            )}
          </div>
        </div>

        {/* Detailed Answers Review (If allowed by minScoreViewAnswers) */}
        {canViewAnswers && submissionResult.questionSnapshots && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Chi Tiết Đáp Án & Lời Giải Thích Từng Câu</span>
            </h3>

            <div className="space-y-3">
              {submissionResult.questionSnapshots.map((item, idx) => {
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border space-y-2 ${
                      item.isCorrect
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-rose-950/20 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">
                        Câu {item.questionNumber}: <FormattedText text={item.text} isPronunciation={true} />
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.isCorrect
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {item.isCorrect ? '✓ Đúng' : '✗ Sai'}
                      </span>
                    </div>

                    {item.imageUrl && (
                      <div className="my-2">
                        <img
                          src={item.imageUrl}
                          alt="Minh họa câu hỏi"
                          className="max-h-48 rounded-xl border border-slate-800 object-contain bg-slate-950"
                        />
                      </div>
                    )}

                    {item.questionType === 'fill_in' || !item.options || item.options.length === 0 ? (
                      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Câu trả lời bạn đã điền:</span>
                          <span
                            className={`font-bold px-2.5 py-1 rounded-lg ${
                              item.isCorrect
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {item.studentChoice ? `"${item.studentChoice}"` : '(Bỏ trống)'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <span className="text-slate-400 font-medium">Đáp án chuẩn của đề:</span>
                          <span className="font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                            "{item.correctAnswer}"
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {item.options.map((opt) => {
                          const isStudent = item.studentChoice === opt.id;
                          const isTarget = item.correctAnswer === opt.id;

                          let style = 'bg-slate-950/60 border-slate-800 text-slate-300';
                          if (isTarget) style = 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200 font-bold';
                          else if (isStudent && !item.isCorrect) style = 'bg-rose-950/70 border-rose-500/80 text-rose-200 line-through';

                          return (
                            <div key={opt.id} className={`p-2.5 rounded-xl border flex items-center justify-between ${style}`}>
                              <span>
                                <strong className="mr-1.5">{opt.id}.</strong>
                                <FormattedText text={opt.text} isPronunciation={true} />
                              </span>
                              {isStudent && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300">
                                  Bạn chọn
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {item.explanation && (
                      <div className="p-2.5 bg-slate-950/90 rounded-xl text-xs text-slate-300 border border-slate-800">
                        <strong className="text-emerald-400 mr-1">Giải thích:</strong>
                        <span>{item.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper to render question card in both scroll and step modes
  const renderQuestionCard = (q: Question, partTitle: string, isScrollMode: boolean) => {
    const isPronun = isPronunciationPart(partTitle, q.text) && q.questionType === 'pronunciation';

    const isFillIn = q.questionType === 'fill_in' || !q.options || q.options.length === 0;
    const isHighlighted = highlightedQId === q.id;

    return (
      <div
        key={q.id}
        id={`test-q-${q.id}`}
        className={`rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg transition-all border ${
          isHighlighted
            ? 'bg-slate-900 border-indigo-400 ring-2 ring-indigo-400 shadow-xl shadow-indigo-600/30'
            : selectedAnswers[q.id]
            ? 'bg-slate-900/90 border-slate-700/80'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Question Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30">
              Câu {q.questionNumber}
            </span>
            <span className="text-xs text-slate-400 font-medium">({partTitle})</span>
            {isPronun && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Bài Phát Âm
              </span>
            )}
            {isFillIn && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Tự Luận Điền Từ
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleFlag(q.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              flaggedQuestions[q.id]
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{flaggedQuestions[q.id] ? 'Đã Đánh Dấu' : 'Đánh Dấu Xem Lại'}</span>
          </button>
        </div>

        {/* Question Text */}
        {isPronun ? (
          <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed tracking-wide">
            <FormattedText text={q.text || 'Tìm từ có phần gạch chân phát âm khác:'} isPronunciation={true} />
          </h3>
        ) : (
          <div className="text-sm sm:text-base font-semibold text-white leading-relaxed">
            <FormattedText text={q.text} isPronunciation={false} />
          </div>
        )}

        {/* Question Image if any */}
        {q.imageUrl && (
          <div className="text-center my-3">
            <img
              src={q.imageUrl}
              alt={`Hình minh họa câu ${q.questionNumber}`}
              className="max-h-64 rounded-2xl border border-slate-700 shadow-lg object-contain bg-slate-950 mx-auto"
            />
          </div>
        )}

        {/* Question Input / Options */}
        {isFillIn ? (
          <div className="p-4 sm:p-5 bg-slate-950/80 border border-indigo-500/40 rounded-2xl space-y-3 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>✍️ Câu Hỏi Tự Luận / Điền Từ Vào Chỗ Trống:</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={selectedAnswers[q.id] || ''}
                onChange={(e) =>
                  setSelectedAnswers((prev) => ({
                    ...prev,
                    [q.id]: e.target.value,
                  }))
                }
                placeholder="Gõ từ hoặc cụm từ bạn muốn điền vào đây (ví dụ: an, biggest)..."
                className="w-full px-4 py-3 bg-slate-900 border-2 border-indigo-500/60 focus:border-indigo-400 focus:outline-none rounded-xl text-white font-semibold text-sm sm:text-base placeholder-slate-500 shadow-md transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400 italic">
              * Thí sinh gõ đáp án vào ô trên. Hệ thống sẽ tự động so khớp và chấm điểm chính xác.
            </p>
          </div>
        ) : (
          <div
            className={`pt-1 ${
              q.options.some((o) => o.imageUrl) || isPronun
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                : 'space-y-2.5'
            }`}
          >
            {q.options.map((opt) => {
              const isChecked = selectedAnswers[q.id] === opt.id;

              return (
                <label
                  key={opt.id}
                  onClick={() =>
                    setSelectedAnswers((prev) => ({
                      ...prev,
                      [q.id]: opt.id,
                    }))
                  }
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all ${
                        isChecked
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {opt.id}
                    </div>
                    <div
                      className={`flex-1 ${
                        isPronun
                          ? 'text-base sm:text-lg font-bold text-white tracking-wide'
                          : 'text-xs sm:text-sm font-medium'
                      }`}
                    >
                      <FormattedText text={opt.text} isPronunciation={isPronun} />
                    </div>
                  </div>

                  {opt.imageUrl && (
                    <img
                      src={opt.imageUrl}
                      alt={`Tranh phương án ${opt.id}`}
                      className="h-28 rounded-xl border border-slate-700 object-contain bg-slate-900 mx-auto sm:ml-auto mt-2 sm:mt-0"
                    />
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // --- View: Active Test Drive Taking Mode ---
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top Test Header Bar with Live Countdown Timer & View Mode Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sticky top-16 z-30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm text-white truncate max-w-md">{exam.title}</h2>
          <p className="text-xs text-slate-400">
            Thí sinh: <strong className="text-slate-300">{studentName}</strong> • {allFlattenedQuestions.length} câu hỏi
          </p>
        </div>

        {/* Center: View Mode Switcher Tabs (Cuộn Toàn Bài vs Từng Câu Một) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('scroll')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'scroll'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Cuộn toàn bộ đề thi để làm liên tục không cần bấm Câu Kế Tiếp"
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Cuộn Toàn Bài</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-200">
              {allFlattenedQuestions.length} câu
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('step')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'step'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Làm từng câu một kèm nút Câu Kế Tiếp"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Từng Câu Một</span>
          </button>
        </div>

        {/* Right: Countdown & Submit Button */}
        <div className="flex items-center gap-3">
          {/* Live Timer Countdown */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold ${
              secondsLeft < 300
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse'
                : 'bg-slate-950 border-slate-800 text-indigo-300'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-sm">{formatTime(secondsLeft)}</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp Bài Thi</span>
          </button>
        </div>
      </div>

      {/* Main Examination Layout: Question Area + Question Navigator Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 cols: Question Display & Options */}
        <div className="lg:col-span-3 space-y-5">
          {viewMode === 'scroll' ? (
            /* --- SCROLL VIEW: All Parts and All Questions Continuously (Không cần bấm Câu Kế Tiếp) --- */
            <div className="space-y-6">
              {/* Mode notification banner for seamless exam taking */}
              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-indigo-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                  <span><strong>Chế độ Cuộn Toàn Bài:</strong> Cuộn tự do làm bài liên tục {allFlattenedQuestions.length} câu mà không cần bấm "Câu Kế Tiếp". Nhấp số câu ở danh mục bên phải để cuộn nhanh đến câu đó.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('step')}
                  className="text-[11px] font-semibold text-indigo-300 hover:text-white underline flex-shrink-0"
                >
                  Đổi sang làm từng câu
                </button>
              </div>

              {workingExam.parts.map((part) => (
                <div key={part.id} className="space-y-4">
                  {/* Part Header & Resources (Passage, Audio, Part Image) */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                        {part.title}
                      </span>
                      {part.description && (
                        <span className="text-xs text-slate-400">{part.description}</span>
                      )}
                    </div>

                    {part.audioUrl && (
                      <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <Headphones className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-slate-300 block mb-1">
                            File Nghe (Audio Track):
                          </span>
                          <audio controls src={part.audioUrl} className="w-full h-8" />
                        </div>
                      </div>
                    )}

                    {part.imageUrl && (
                      <div className="text-center my-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-semibold text-indigo-300 block mb-2 text-left">
                          🖼️ Tài liệu hình ảnh của phần thi:
                        </span>
                        <img
                          src={part.imageUrl}
                          alt={`Hình minh họa ${part.title}`}
                          className="max-h-80 rounded-xl border border-slate-700/80 shadow-md object-contain mx-auto"
                        />
                      </div>
                    )}

                    {part.passageText && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Đoạn Văn Đọc Hiểu / Ngữ Liệu:
                        </span>
                        <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-300 leading-relaxed font-serif max-h-60 overflow-y-auto">
                          {part.passageText}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* All Questions of this Part */}
                  <div className="space-y-4">
                    {part.questions.map((q) => renderQuestionCard(q, part.title, true))}
                  </div>
                </div>
              ))}

              {/* Bottom Submit Examination Bar */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Đã Xem Hết Toàn Bộ {allFlattenedQuestions.length} Câu Hỏi</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đã trả lời: <strong className="text-emerald-400 font-bold">{Object.keys(selectedAnswers).length}/{allFlattenedQuestions.length}</strong> câu hỏi.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Hoàn Thành & Nộp Bài Thi</span>
                </button>
              </div>
            </div>
          ) : (
            /* --- STEP VIEW: 1 Question At A Time with Prev/Next Buttons --- */
            <div className="space-y-4">
              {/* Quick switch banner to scroll mode */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-300 shadow-sm">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>Đang xem từng câu một. Để cuộn xem toàn bài không cần bấm nút "Câu Kế Tiếp":</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('scroll')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 flex-shrink-0"
                >
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Bật Chế Độ Cuộn Toàn Bài</span>
                </button>
              </div>

              {/* Part Passage / Audio / Image for currentPart */}
              {(currentPart?.passageText || currentPart?.audioUrl || currentPart?.imageUrl) && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                  {currentPart.audioUrl && (
                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <Headphones className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-slate-300 block mb-1">
                          File Nghe (Audio Track):
                        </span>
                        <audio controls src={currentPart.audioUrl} className="w-full h-8" />
                      </div>
                    </div>
                  )}

                  {currentPart.imageUrl && (
                    <div className="text-center my-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                      <img
                        src={currentPart.imageUrl}
                        alt={`Hình minh họa ${currentPart.title}`}
                        className="max-h-80 rounded-xl border border-slate-700/80 shadow-md object-contain mx-auto"
                      />
                    </div>
                  )}

                  {currentPart.passageText && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        Đoạn Văn Đọc Hiểu / Ngữ Liệu:
                      </span>
                      <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-300 leading-relaxed font-serif max-h-56 overflow-y-auto">
                        {currentPart.passageText}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Single Question Box */}
              {currentQ && renderQuestionCard(currentQ, currentPart.title, false)}

              {/* Step Navigation Controls */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                <button
                  disabled={currentPartIndex === 0 && currentQuestionIndex === 0}
                  onClick={() => {
                    if (currentQuestionIndex > 0) {
                      setCurrentQuestionIndex(currentQuestionIndex - 1);
                    } else if (currentPartIndex > 0) {
                      const prevP = workingExam.parts[currentPartIndex - 1];
                      setCurrentPartIndex(currentPartIndex - 1);
                      setCurrentQuestionIndex(prevP.questions.length - 1);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Câu Trước</span>
                </button>

                <button
                  disabled={
                    currentPartIndex === workingExam.parts.length - 1 &&
                    currentQuestionIndex === currentPart.questions.length - 1
                  }
                  onClick={() => {
                    if (currentQuestionIndex < currentPart.questions.length - 1) {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    } else if (currentPartIndex < workingExam.parts.length - 1) {
                      setCurrentPartIndex(currentPartIndex + 1);
                      setCurrentQuestionIndex(0);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40 shadow-md transition-all"
                >
                  <span>Câu Kế Tiếp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 col: Question Navigator Grid Sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4 sticky top-36">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Danh Mục ({Object.keys(selectedAnswers).length}/{allFlattenedQuestions.length} Đã Làm)
              </h3>
              {viewMode === 'scroll' && (
                <span className="text-[10px] text-indigo-400 font-semibold animate-pulse">
                  Cuộn nhanh ↓
                </span>
              )}
            </div>

            {/* Quick Filter Tabs: Tất cả, Chưa làm, Đã làm, Đánh dấu */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setSidebarFilter('all')}
                className={`py-1 rounded font-semibold transition-all ${
                  sidebarFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setSidebarFilter('unanswered')}
                className={`py-1 rounded font-semibold transition-all ${
                  sidebarFilter === 'unanswered' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chưa làm
              </button>
              <button
                type="button"
                onClick={() => setSidebarFilter('answered')}
                className={`py-1 rounded font-semibold transition-all ${
                  sidebarFilter === 'answered' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Đã làm
              </button>
              <button
                type="button"
                onClick={() => setSidebarFilter('flagged')}
                className={`py-1 rounded font-semibold transition-all ${
                  sidebarFilter === 'flagged' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Đánh dấu
              </button>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-600" />
                <span>Đã làm ({Object.keys(selectedAnswers).length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
                <span>Chưa làm ({allFlattenedQuestions.length - Object.keys(selectedAnswers).length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span>Đánh dấu ({Object.keys(flaggedQuestions).filter((k) => flaggedQuestions[k]).length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 border-indigo-400" />
                <span>Đang xem</span>
              </div>
            </div>

            {/* Parts & Question buttons */}
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {workingExam.parts.map((p, pIdx) => {
                const filteredQuestions = p.questions.filter((q) => {
                  if (sidebarFilter === 'unanswered') return !selectedAnswers[q.id];
                  if (sidebarFilter === 'answered') return !!selectedAnswers[q.id];
                  if (sidebarFilter === 'flagged') return !!flaggedQuestions[q.id];
                  return true;
                });

                if (filteredQuestions.length === 0) return null;

                return (
                  <div key={p.id} className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-300 truncate">{p.title}</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {filteredQuestions.map((q) => {
                        const qIdx = p.questions.findIndex((x) => x.id === q.id);
                        const isCurrent = currentPartIndex === pIdx && currentQuestionIndex === qIdx;
                        const isAnswered = !!selectedAnswers[q.id];
                        const isFlagged = !!flaggedQuestions[q.id];

                        let btnClass = 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white';
                        if (isAnswered) {
                          btnClass = 'bg-indigo-600 text-white font-bold shadow-sm';
                        }
                        if (isFlagged) {
                          btnClass = 'bg-amber-500 text-white font-bold ring-2 ring-amber-300';
                        }
                        if (isCurrent) {
                          btnClass += ' ring-2 ring-white scale-105';
                        }

                        return (
                          <button
                            key={q.id}
                            onClick={() => jumpToQuestion(pIdx, qIdx, q.id)}
                            className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${btnClass}`}
                            title={`Câu ${q.questionNumber}: ${isAnswered ? 'Đã làm' : 'Chưa làm'}`}
                          >
                            {q.questionNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Violation Alert Modal */}
      {showViolationWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Cảnh Báo Giám Sát Chống Gian Lận!</h3>
              <p className="text-xs text-rose-300 mt-1">
                Phát hiện hành vi rời khỏi màn hình hoặc chuyển tab (Lần {violationCount} / 3).
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                Quy chế thi: Nếu chuyển màn hình đến lần thứ 3, hệ thống sẽ tự động khóa và nộp bài thi ngay lập tức!
              </p>
            </div>
            <button
              onClick={() => setShowViolationWarning(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Tôi Đã Hiểu & Quay Lại Làm Bài
            </button>
          </div>
        </div>
      )}

      {/* Confirm Submission Dialog */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">Xác Nhận Nộp Bài Thi</h3>
            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Bạn đã làm: <strong className="text-indigo-400">{Object.keys(selectedAnswers).length}</strong> / {allFlattenedQuestions.length} câu hỏi.
              </p>
              {allFlattenedQuestions.length - Object.keys(selectedAnswers).length > 0 && (
                <p className="text-amber-400 font-semibold">
                  ⚠️ Còn {allFlattenedQuestions.length - Object.keys(selectedAnswers).length} câu hỏi chưa được chọn đáp án!
                </p>
              )}
              <p className="text-slate-400 text-[11px]">
                Thời gian còn lại: {formatTime(secondsLeft)}. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Tiếp Tục Làm Bài
              </button>
              <button
                onClick={() => handleSubmitExam(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
              >
                Xác Nhận Nộp Bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
