/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Area1_ExamCreator } from './components/Area1_ExamCreator';
import { Area2_SmartAudit } from './components/Area2_SmartAudit';
import { Area3_SubmissionsAndLinks } from './components/Area3_SubmissionsAndLinks';
import { Area4_TestDrive } from './components/Area4_TestDrive';
import { Area5_SettingsAndAntiCheat } from './components/Area5_SettingsAndAntiCheat';
import { TeacherAuthModal, TeacherUser } from './components/TeacherAuthModal';
import { Exam } from './types/exam';
import { auditExam } from './utils/audit';
import { sanitizeExamPronunciation } from './utils/parser';
import { Plus, FolderOpen, Sparkles, Eye, Check, X, Trash2, AlertTriangle } from 'lucide-react';

export default function App() {
  // Check URL query params for student test link: ?exam=ID or ?id=ID
  const [studentExamId, setStudentExamId] = useState<string | null>(null);
  const [isStudentModeActive, setIsStudentModeActive] = useState(false);

  // Teacher Authentication state (real Google account management)
  const [currentTeacher, setCurrentTeacher] = useState<TeacherUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('smart_exam_current_teacher');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Default verified teacher account from environment
    return {
      email: 'trinhtrongluat@gmail.com',
      name: 'Thầy Trịnh Trọng Luật',
      school: 'Trường THPT Chuyên',
      isGoogleLinked: true,
      driveSyncEnabled: true,
      sheetsSyncEnabled: true,
      lastLogin: new Date().toISOString(),
    };
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Teacher dashboard state
  const [activeTab, setActiveTab] = useState(1);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  // Teacher working exam state from localStorage or initial
  const [currentExam, setCurrentExam] = useState<Exam | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smart_exam_working_exam');
      if (saved) {
        try {
          return sanitizeExamPronunciation(JSON.parse(saved));
        } catch (e) {}
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);

  // Gemini API Key & Model selection from localStorage
  const [customApiKey, setCustomApiKey] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('smart_exam_gemini_key') || '' : '';
  });
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');

  // Save API key when changed
  const handleSetCustomApiKey = (key: string) => {
    setCustomApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smart_exam_gemini_key', key);
    }
  };

  // Centralized exam updater that guarantees localStorage & allExams sync
  const handleUpdateExam = (updater: React.SetStateAction<Exam>) => {
    setCurrentExam((prev) => {
      const updated = typeof updater === 'function' ? (updater as (p: Exam) => Exam)(prev!) : updater;
      if (!updated) return prev;

      // Persist to localStorage immediately
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('smart_exam_working_exam', JSON.stringify(updated));
        } catch (e) {}
      }

      // Sync into allExams array
      setAllExams((prevAll) => {
        const idx = prevAll.findIndex((x) => x.id === updated.id);
        if (idx >= 0) {
          const next = [...prevAll];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prevAll];
      });

      return updated;
    });
  };

  // Switch active exam
  const handleSelectExam = (ex: Exam) => {
    const cleanEx = sanitizeExamPronunciation(ex);
    setCurrentExam(cleanEx);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smart_exam_working_exam', JSON.stringify(cleanEx));
      } catch (e) {}
    }
  };

  // Delete an exam after user confirmation
  const handleConfirmDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeletingExam(true);
    try {
      await fetch(`/api/exams/${encodeURIComponent(examToDelete.id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Error deleting exam:', e);
    } finally {
      setIsDeletingExam(false);
    }

    const remaining = allExams.filter((x) => x.id !== examToDelete.id);
    setAllExams(remaining);

    if (currentExam?.id === examToDelete.id) {
      if (remaining.length > 0) {
        const nextExam = sanitizeExamPronunciation(remaining[0]);
        setCurrentExam(nextExam);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('smart_exam_working_exam', JSON.stringify(nextExam));
          } catch (e) {}
        }
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('smart_exam_working_exam');
        }
        createNewExam();
      }
    }

    setExamToDelete(null);
  };

  // 1. Initial Load: Detect query params or load default exams from server
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramExamId = params.get('exam') || params.get('id');

    if (paramExamId) {
      setStudentExamId(paramExamId);
      setIsStudentModeActive(true);
      fetchExamById(paramExamId);
    } else {
      fetchAllExams();
    }
  }, []);

  const fetchAllExams = async (preserveId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/exams');
      const rawData = await res.json();
      if (Array.isArray(rawData) && rawData.length > 0) {
        const data = rawData.map((item: Exam) => sanitizeExamPronunciation(item));
        setAllExams(data);

        // Determine which exam to keep active:
        // 1. preserveId
        // 2. currentExam already in state
        // 3. localStorage saved ID
        // 4. first exam from backend
        let targetId = preserveId || currentExam?.id;
        if (!targetId && typeof window !== 'undefined') {
          const savedStr = localStorage.getItem('smart_exam_working_exam');
          if (savedStr) {
            try {
              const parsed = JSON.parse(savedStr);
              targetId = parsed.id;
            } catch (e) {}
          }
        }

        const found = data.find((x: Exam) => x.id === targetId);
        if (currentExam) {
          // Keep current in-memory exam (sanitized) and ensure it's in allExams
          const sanitizedCurrent = sanitizeExamPronunciation(currentExam);
          if (found && preserveId) {
            setCurrentExam(found);
          } else {
            setCurrentExam(sanitizedCurrent);
          }
        } else if (found) {
          setCurrentExam(found);
        } else {
          setCurrentExam(data[0]);
        }
      } else {
        if (!currentExam) createNewExam();
      }
    } catch (e) {
      console.error('Failed to load exams:', e);
      if (!currentExam) createNewExam();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExamById = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/exams/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentExam(data);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('smart_exam_working_exam', JSON.stringify(data));
          } catch (e) {}
        }
      } else {
        alert('Không tìm thấy đề thi với mã: ' + id);
        setIsStudentModeActive(false);
        fetchAllExams();
      }
    } catch (e) {
      console.error('Failed to fetch exam by id:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewExam = () => {
    const newId = 'TEST-' + Math.floor(1000 + Math.random() * 9000);
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('smart_exam_teacher_email') || 'trinhtrongluat@gmail.com' : 'trinhtrongluat@gmail.com';
    const newExam: Exam = {
      id: newId,
      title: 'Đề Kiểm Tra Mới ' + newId,
      subject: 'Tiếng Anh',
      school: 'Trường THPT Chuyên',
      teacher: 'Giáo Viên Bộ Môn',
      teacherEmail: savedEmail,
      timeLimit: 45,
      maxAttempts: 2,
      minScoreViewAnswers: 7.0,
      passingScore: 5.0,
      password: '',
      isActive: true,
      mixQ: true,
      mixA: true,
      antiCheat: {
        blockRightClick: true,
        blockCopyPaste: true,
        maxViolations: 3,
        autoSubmitOnViolation: true,
        enforceFullscreen: false,
      },
      rewardConfig: {
        enabled: true,
        minScore: 8.5,
        maxTimeMinutes: 35,
        maxAttempt: 1,
        successMessages: [
          '🎉 Xuất sắc! Bạn được tặng 1 Điểm Cộng kiểm tra 15 phút!',
          '🌟 Đỉnh cao học vấn! Mã quà tặng voucher sách 50k: EXAM-PRO-VIP',
        ],
        defaultMessage: 'Bạn đã hoàn thành bài thi! Hãy tiếp tục rèn luyện nhé.',
      },
      parts: [
        {
          id: 'part-1',
          title: 'Phần 1: Trắc Nghiệm Cơ Bản',
          description: 'Chọn phương án đúng nhất.',
          mixQ: true,
          mixA: true,
          questions: [
            {
              id: 'q-1',
              questionNumber: 1,
              text: 'Nội dung câu hỏi đầu tiên?',
              options: [
                { id: 'A', text: 'Phương án A' },
                { id: 'B', text: 'Phương án B' },
                { id: 'C', text: 'Phương án C' },
                { id: 'D', text: 'Phương án D' },
              ],
              correctAnswer: 'A',
              explanation: 'Chọn đáp án A vì phương án này chính xác nhất.',
              isLocked: false,
              mixA: true,
            },
          ],
        },
      ],
    };

    setCurrentExam(newExam);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smart_exam_working_exam', JSON.stringify(newExam));
      } catch (e) {}
    }
    setAllExams((prev) => [newExam, ...prev]);
  };

  // Save current exam to backend
  const handleSaveExam = async () => {
    if (!currentExam) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentExam),
      });
      if (res.ok) {
        setSaveMessage('✓ Đã lưu thành công!');
        setTimeout(() => setSaveMessage(''), 3000);
        // Refresh all exams list while strictly preserving the current working exam ID!
        fetchAllExams(currentExam.id);
      } else {
        alert('Lỗi khi lưu đề thi');
      }
    } catch (e) {
      alert('Lỗi lưu đề thi: ' + e);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle open/closed status
  const handleToggleStatus = async () => {
    if (!currentExam) return;
    const newStatus = !currentExam.isActive;
    setCurrentExam((prev) => (prev ? { ...prev, isActive: newStatus } : null));

    try {
      await fetch(`/api/exams/${encodeURIComponent(currentExam.id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
    } catch (e) {
      console.error('Status toggle failed:', e);
    }
  };

  // Handle teacher sign out
  const handleTeacherLogout = () => {
    setCurrentTeacher(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smart_exam_current_teacher');
    }
    if (currentExam) {
      setCurrentExam((prev) =>
        prev ? { ...prev, teacherEmail: '' } : null
      );
    }
  };

  // Loading state
  if (isLoading || !currentExam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse mb-3">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Đang khởi tạo Smart Teacher Exam Creator...</p>
      </div>
    );
  }

  // Real Student Mode (Online Exam Link taker)
  if (isStudentModeActive) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
        {/* Top minimal bar to allow teacher preview exit if needed */}
        <div className="max-w-6xl mx-auto mb-4 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-slate-300">Cổng Thi Trực Tuyến Học Sinh (Online Testing Link)</span>
          </div>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setIsStudentModeActive(false);
            }}
            className="text-indigo-400 hover:text-indigo-300 underline font-medium"
          >
            Chuyển sang Bảng Điều Khiển Giáo Viên
          </button>
        </div>

        <Area4_TestDrive
          exam={currentExam}
          isStudentMode={true}
          onBackToDashboard={() => setIsStudentModeActive(false)}
        />
      </div>
    );
  }

  // Perform live audit of current exam
  const auditResult = auditExam(currentExam);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header with 5 tab buttons & Quick Controllers */}
      <Header
        exam={currentExam}
        auditResult={auditResult}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSaveExam={handleSaveExam}
        onToggleStatus={handleToggleStatus}
        isSaving={isSaving}
        saveMessage={saveMessage}
        currentTeacher={currentTeacher}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleTeacherLogout}
      />

      {/* Exam Switcher Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 overflow-x-auto py-1.5 px-1">
            <span className="text-slate-400 font-medium flex items-center gap-1 flex-shrink-0">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Đề thi:</span>
            </span>
            {allExams.map((ex) => (
              <div
                key={ex.id}
                className={`relative group flex items-center rounded-xl transition-all border flex-shrink-0 ${
                  currentExam.id === ex.id
                    ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 font-bold shadow-md shadow-indigo-950/50'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-700/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectExam(ex)}
                  className="px-3 py-1.5 pr-6 text-left truncate max-w-[240px]"
                  title={`${ex.id} • ${ex.title}`}
                >
                  {ex.id} • {ex.title.length > 20 ? ex.title.substring(0, 20) + '...' : ex.title}
                </button>

                {/* Red X delete button at top-right corner of each exam card */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExamToDelete(ex);
                  }}
                  title={`Xóa đề thi "${ex.title}"`}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md border border-rose-400/70 transition-transform hover:scale-110 z-10"
                >
                  <X className="w-2.5 h-2.5 stroke-[3]" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={createNewExam}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold border border-slate-700 transition-all flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Đề Mới</span>
          </button>
        </div>
      </div>

      {/* Main Area Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 1 && (
          <Area1_ExamCreator
            exam={currentExam}
            setExam={handleUpdateExam}
            customApiKey={customApiKey}
            selectedModel={selectedModel}
          />
        )}

        {activeTab === 2 && (
          <Area2_SmartAudit
            exam={currentExam}
            setExam={handleUpdateExam}
            auditResult={auditResult}
            customApiKey={customApiKey}
            selectedModel={selectedModel}
            onOpenTestDrive={() => setActiveTab(4)}
          />
        )}

        {activeTab === 3 && (
          <Area3_SubmissionsAndLinks
            exam={currentExam}
            allExams={allExams}
            onSelectExam={handleSelectExam}
            setExam={handleUpdateExam}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {activeTab === 4 && (
          <Area4_TestDrive
            exam={currentExam}
            isStudentMode={false}
            onBackToDashboard={() => setActiveTab(1)}
          />
        )}

        {activeTab === 5 && (
          <Area5_SettingsAndAntiCheat
            exam={currentExam}
            setExam={handleUpdateExam}
            customApiKey={customApiKey}
            setCustomApiKey={handleSetCustomApiKey}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            onSaveExam={handleSaveExam}
          />
        )}
      </main>

      {/* Confirm Delete Exam Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xác Nhận Xóa Đề Thi?</h3>
                <p className="text-xs text-slate-400">Bạn có chắc chắn muốn xóa đề thi này khỏi danh sách không?</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400">
                Mã đề: <strong className="text-indigo-300 font-bold">{examToDelete.id}</strong>
              </div>
              <div className="text-slate-300 font-semibold">
                Tên đề: <span className="text-white">{examToDelete.title}</span>
              </div>
              <div className="text-slate-400">
                Số lượng: <strong className="text-emerald-400">{examToDelete.parts.reduce((a, b) => a + b.questions.length, 0)} câu hỏi</strong> ({examToDelete.parts.length} phần)
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                disabled={isDeletingExam}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                Hủy Bỏ (Giữ Lại)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExam}
                disabled={isDeletingExam}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingExam ? 'Đang xóa...' : 'Đồng Ý Xóa Đề Này'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Google Authentication Modal */}
      <TeacherAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentTeacher}
        onLoginSuccess={(user) => {
          setCurrentTeacher(user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('smart_exam_current_teacher', JSON.stringify(user));
            localStorage.setItem('smart_exam_teacher_email', user.email);
          }
          if (currentExam) {
            setCurrentExam((prev) =>
              prev
                ? {
                    ...prev,
                    teacherEmail: user.email,
                    teacher: user.name,
                  }
                : null
            );
          }
        }}
        onLogout={() => {
          setCurrentTeacher(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('smart_exam_current_teacher');
          }
          if (currentExam) {
            setCurrentExam((prev) =>
              prev ? { ...prev, teacherEmail: '' } : null
            );
          }
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>Smart Teacher Exam Creator & Online Testing Platform • Gemini AI Powered • 100% Tick Xanh Quality Gate</p>
      </footer>
    </div>
  );
}
