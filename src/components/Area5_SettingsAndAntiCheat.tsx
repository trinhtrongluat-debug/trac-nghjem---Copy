import React, { useState } from 'react';
import { 
  Settings, 
  ShieldAlert, 
  Gift, 
  Key, 
  Clock, 
  School, 
  User, 
  BookOpen, 
  Hash, 
  Lock, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles,
  Bot,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Exam } from '../types/exam';

interface Area5Props {
  exam: Exam;
  setExam: React.Dispatch<React.SetStateAction<Exam>>;
  customApiKey: string;
  setCustomApiKey: (key: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onSaveExam: () => void;
}

export const Area5_SettingsAndAntiCheat: React.FC<Area5Props> = ({
  exam,
  setExam,
  customApiKey,
  setCustomApiKey,
  selectedModel,
  setSelectedModel,
  onSaveExam,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [newRewardMessage, setNewRewardMessage] = useState('');
  const [testApiStatus, setTestApiStatus] = useState<string>('');
  const [isTestingApi, setIsTestingApi] = useState(false);

  // Add new rotator reward message
  const handleAddRewardMessage = () => {
    if (!newRewardMessage.trim()) return;
    setExam((prev) => ({
      ...prev,
      rewardConfig: {
        ...prev.rewardConfig,
        successMessages: [...(prev.rewardConfig?.successMessages || []), newRewardMessage.trim()],
      },
    }));
    setNewRewardMessage('');
  };

  const handleDeleteRewardMessage = (idx: number) => {
    setExam((prev) => ({
      ...prev,
      rewardConfig: {
        ...prev.rewardConfig,
        successMessages: (prev.rewardConfig?.successMessages || []).filter((_, i) => i !== idx),
      },
    }));
  };

  // Test Gemini API key connectivity
  const handleTestApiKey = async () => {
    setIsTestingApi(true);
    setTestApiStatus('Đang kiểm tra kết nối Gemini AI...');
    try {
      const res = await fetch('/api/gemini/part-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partTitle: 'Test Connection',
          userRequest: 'Ping test',
          customApiKey: customApiKey || undefined,
          modelName: selectedModel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestApiStatus('✓ Kết nối Gemini API thành công! Tất cả tính năng AI đã sẵn sàng.');
      } else {
        setTestApiStatus('✗ Lỗi kết nối: ' + (data.error || 'Vui lòng kiểm tra lại API Key'));
      }
    } catch (e: any) {
      setTestApiStatus('✗ Không thể kết nối: ' + e.message);
    } finally {
      setIsTestingApi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Khu Vực 5
              </span>
              <h2 className="text-xl font-bold text-white">Cài Đặt Thông Số, Chống Gian Lận & Gemini API</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Thiết lập thông tin trường lớp, thời gian làm bài, quy chế chống gian lận, chế độ quà tặng và cấu hình Gemini API Key.
            </p>
          </div>

          <button
            onClick={onSaveExam}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all self-start md:self-auto"
          >
            <Check className="w-4 h-4" />
            <span>Lưu Toàn Bộ Cài Đặt</span>
          </button>
        </div>
      </div>

      {/* Grid: Exam Info & Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Exam Header Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <School className="w-4 h-4 text-indigo-400" />
            <span>Thông Tin Bài Thi & Giáo Viên</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Tên bài thi / Đề kiểm tra</label>
              <input
                type="text"
                value={exam.title}
                onChange={(e) => setExam((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Mã đề thi (Test ID duy nhất)</label>
              <input
                type="text"
                value={exam.id}
                onChange={(e) => setExam((prev) => ({ ...prev, id: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Môn học</label>
                <input
                  type="text"
                  value={exam.subject}
                  onChange={(e) => setExam((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tên trường / Đơn vị</label>
                <input
                  type="text"
                  value={exam.school}
                  onChange={(e) => setExam((prev) => ({ ...prev, school: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Họ và tên giáo viên</label>
                <input
                  type="text"
                  value={exam.teacher}
                  onChange={(e) => setExam((prev) => ({ ...prev, teacher: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Mật khẩu đề thi (Tùy chọn)</label>
                <input
                  type="text"
                  value={exam.password || ''}
                  onChange={(e) => setExam((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Để trống nếu công khai"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                <span>Gmail Quản Lý Của Giáo Viên (Dùng đồng bộ dữ liệu)</span>
                <span className="text-[10px] text-indigo-400 font-semibold">Tài khoản chính</span>
              </label>
              <input
                type="email"
                value={exam.teacherEmail || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setExam((prev) => ({ ...prev, teacherEmail: val }));
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('smart_exam_teacher_email', val);
                  }
                }}
                placeholder="Ví dụ: gv.nguyenvannam@gmail.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-emerald-300 font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Time & Grading Parameters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Thời Gian & Thang Điểm Khảo Thí</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Thời gian làm bài (Phút)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={exam.timeLimit}
                  onChange={(e) => setExam((prev) => ({ ...prev, timeLimit: Number(e.target.value) }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Số lần làm bài tối đa
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={exam.maxAttempts}
                  onChange={(e) => setExam((prev) => ({ ...prev, maxAttempts: Number(e.target.value) }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Điểm tối thiểu xem đáp án
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={10}
                  value={exam.minScoreViewAnswers}
                  onChange={(e) =>
                    setExam((prev) => ({ ...prev, minScoreViewAnswers: Number(e.target.value) }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-emerald-400 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Chỉ học sinh đạt mức này mới được xem lời giải
                </span>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Điểm đạt tiêu chuẩn (Pass)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={10}
                  value={exam.passingScore}
                  onChange={(e) => setExam((prev) => ({ ...prev, passingScore: Number(e.target.value) }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-teal-400 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Google Sheets Web App URL */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Apps Script Web App URL (Tự động đồng bộ)</span>
              </label>
              <input
                type="text"
                value={exam.googleAppsScriptUrl || ''}
                onChange={(e) =>
                  setExam((prev) => ({ ...prev, googleAppsScriptUrl: e.target.value }))
                }
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Module: Anti-Cheat & Supervision */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="font-bold text-sm text-white">
            Mô-đun Chống Gian Lận (Anti-Cheat Security Module)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <label className="flex items-start gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={exam.antiCheat.blockRightClick}
              onChange={(e) =>
                setExam((prev) => ({
                  ...prev,
                  antiCheat: { ...prev.antiCheat, blockRightClick: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded text-rose-600 bg-slate-800 border-slate-700 mt-0.5"
            />
            <div>
              <span className="font-bold text-white block">Khóa Chuột Phải (Context Menu)</span>
              <span className="text-slate-400 text-[11px]">
                Ngăn chặn học sinh nhấp chuột phải để tra cứu Google hoặc mở DevTools.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={exam.antiCheat.blockCopyPaste}
              onChange={(e) =>
                setExam((prev) => ({
                  ...prev,
                  antiCheat: { ...prev.antiCheat, blockCopyPaste: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded text-rose-600 bg-slate-800 border-slate-700 mt-0.5"
            />
            <div>
              <span className="font-bold text-white block">Chặn Copy / Cắt / Paste</span>
              <span className="text-slate-400 text-[11px]">
                Không cho phép bôi đen sao chép câu hỏi hoặc dán lời giải từ bên ngoài.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={exam.antiCheat.autoSubmitOnViolation}
              onChange={(e) =>
                setExam((prev) => ({
                  ...prev,
                  antiCheat: { ...prev.antiCheat, autoSubmitOnViolation: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded text-rose-600 bg-slate-800 border-slate-700 mt-0.5"
            />
            <div>
              <span className="font-bold text-white block">Tự Động Thu Bài Khi Vi Phạm</span>
              <span className="text-slate-400 text-[11px]">
                Tự động kết thúc và nộp bài nếu thí sinh chuyển tab hoặc rời màn hình quá 3 lần.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Module: Gift / Reward Mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              Chế Độ Tặng Thưởng & Khích Lệ (Gift / Reward Mode)
            </h3>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
            <span>Kích hoạt phần thưởng:</span>
            <input
              type="checkbox"
              checked={exam.rewardConfig?.enabled}
              onChange={(e) =>
                setExam((prev) => ({
                  ...prev,
                  rewardConfig: { ...prev.rewardConfig, enabled: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-700"
            />
          </label>
        </div>

        {exam.rewardConfig?.enabled && (
          <div className="space-y-4 pt-2 text-xs">
            {/* Triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Điểm tối thiểu nhận thưởng
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={10}
                  value={exam.rewardConfig.minScore}
                  onChange={(e) =>
                    setExam((prev) => ({
                      ...prev,
                      rewardConfig: { ...prev.rewardConfig, minScore: Number(e.target.value) },
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Thời gian làm bài tối đa (Phút)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={exam.rewardConfig.maxTimeMinutes}
                  onChange={(e) =>
                    setExam((prev) => ({
                      ...prev,
                      rewardConfig: { ...prev.rewardConfig, maxTimeMinutes: Number(e.target.value) },
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Chỉ thưởng ở lần nộp thứ
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={exam.rewardConfig.maxAttempt}
                  onChange={(e) =>
                    setExam((prev) => ({
                      ...prev,
                      rewardConfig: { ...prev.rewardConfig, maxAttempt: Number(e.target.value) },
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold"
                />
              </div>
            </div>

            {/* Success Messages Rotator */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold">
                Danh Sách Thông Điệp Phần Thưởng (Hỗ trợ quay vòng / Rotator):
              </label>

              <div className="space-y-2">
                {(exam.rewardConfig.successMessages || []).map((msg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800"
                  >
                    <span className="text-emerald-300 font-medium">{msg}</span>
                    <button
                      onClick={() => handleDeleteRewardMessage(idx)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRewardMessage}
                  onChange={(e) => setNewRewardMessage(e.target.value)}
                  placeholder="Thêm lời chúc / mã voucher sách / điểm cộng mới..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddRewardMessage}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>
            </div>

            {/* Default Fail/Encouragement Message */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Lời khích lệ mặc định (Khi chưa đạt điều kiện nhận thưởng):
              </label>
              <input
                type="text"
                value={exam.rewardConfig.defaultMessage || ''}
                onChange={(e) =>
                  setExam((prev) => ({
                    ...prev,
                    rewardConfig: { ...prev.rewardConfig, defaultMessage: e.target.value },
                  }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Module: Gemini Pro API Key & Model Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-sm text-white">
            Cấu Hình Gemini Pro API (Gemini Pro API Key Input)
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          Nhập Gemini API Key của bạn để sử dụng toàn bộ tính năng trợ lý Part, sinh đề tự động, giải thích chi tiết và AI Auto-Fix.
          Nếu để trống, hệ thống sẽ tự động sử dụng khóa máy chủ mặc định.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2">
            <label className="block text-slate-300 font-medium mb-1">Gemini API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="AIzaSy... (Để trống nếu dùng Server Key)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 pr-10 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Phiên Bản Mô Hình AI</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Tốc độ cao, Khuyên dùng)</option>
              <option value="gemini-4-argon">gemini-4-argon (Suy luận nâng cao)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTestApiKey}
            disabled={isTestingApi}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
            <span>{isTestingApi ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối Gemini API'}</span>
          </button>

          {testApiStatus && (
            <span
              className={`text-xs font-medium ${
                testApiStatus.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {testApiStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
