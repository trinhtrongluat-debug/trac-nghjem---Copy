import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  Lock, 
  Unlock, 
  Eye, 
  Settings, 
  FileText, 
  Users, 
  Save, 
  CheckCheck,
  Mail
} from 'lucide-react';
import { Exam, AuditResult } from '../types/exam';
import { TeacherUser } from './TeacherAuthModal';

interface HeaderProps {
  exam: Exam;
  auditResult: AuditResult;
  activeTab: number;
  setActiveTab: (tab: number) => void;
  onSaveExam: () => void;
  onToggleStatus: () => void;
  isSaving: boolean;
  saveMessage?: string;
  currentTeacher: TeacherUser | null;
  onOpenAuthModal: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  exam,
  auditResult,
  activeTab,
  setActiveTab,
  onSaveExam,
  onToggleStatus,
  isSaving,
  saveMessage,
  currentTeacher,
  onOpenAuthModal,
  onLogout,
}) => {
  const tabs = [
    { id: 1, label: 'Khu Vực 1: Tạo Đề & Gemini Part', icon: FileText },
    { 
      id: 2, 
      label: 'Khu Vực 2: Kiểm Định Tick Xanh', 
      icon: CheckCircle2,
      badge: auditResult.isPassed ? '100% Đạt' : `${auditResult.scorePercentage}%`,
      badgeColor: auditResult.isPassed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white',
    },
    { id: 3, label: 'Khu Vực 3: Kết Quả & Link Online', icon: Users },
    { id: 4, label: 'Khu Vực 4: Thi Thử (Test Drive)', icon: Eye },
    { id: 5, label: 'Khu Vực 5: Cài Đặt & Chống Gian Lận', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-xl">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Exam Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  Smart Teacher Exam Creator
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini AI Powered
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="font-medium text-slate-300">{exam.title || 'Chưa đặt tên bài thi'}</span>
                <span>•</span>
                <span className="text-indigo-400">Mã: {exam.id}</span>
                <span>•</span>
                <span>{exam.parts?.reduce((acc, p) => acc + (p.questions?.length || 0), 0) || 0} câu hỏi</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Real Teacher Google Account / Sign-In Button */}
            {currentTeacher ? (
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 pr-2 shadow-sm">
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity text-left text-xs"
                  title="Nhấp để xem chi tiết Google Drive & Gemini Pro Quota"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow">
                    {currentTeacher.name.charAt(currentTeacher.name.length - 1) || 'G'}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white max-w-[120px] truncate">{currentTeacher.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    </div>
                    <span className="text-[10px] text-indigo-300 max-w-[140px] truncate font-mono">
                      {currentTeacher.email}
                    </span>
                  </div>
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="ml-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-700 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition-all border border-slate-600 hover:border-rose-500/40"
                    title="Đăng xuất khỏi tài khoản này"
                  >
                    Đăng xuất
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-md hover:shadow-lg transition-all"
                title="Đăng nhập bằng tài khoản Google thật hoặc chọn email trên trình duyệt"
              >
                {/* Official Google G Icon */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-slate-800 leading-tight">Đăng nhập bằng Google</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">Chọn email trình duyệt / Gmail GV</span>
                </div>
              </button>
            )}

            {/* Status Indicator & Toggle */}
            <button
              onClick={onToggleStatus}
              title={exam.isActive ? 'Nhấp để tạm khóa link thi' : 'Nhấp để mở lại link thi'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                exam.isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
              }`}
            >
              {exam.isActive ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đề đang Mở</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Đề đang Khóa</span>
                </>
              )}
            </button>

            {/* Audit Status Pill */}
            <div
              onClick={() => setActiveTab(2)}
              className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                auditResult.isPassed
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-emerald-900/30 shadow-sm'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/50'
              }`}
            >
              {auditResult.isPassed ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Tick Xanh</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Audit: {auditResult.errorCount} lỗi ({auditResult.scorePercentage}%)</span>
                </>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={onSaveExam}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Đề Thi'}</span>
            </button>

            {saveMessage && (
              <span className="text-xs text-emerald-400 font-medium animate-pulse">
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex space-x-1 py-1.5 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
