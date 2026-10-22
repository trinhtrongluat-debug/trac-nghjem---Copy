import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Download, 
  Lock, 
  Unlock, 
  FileSpreadsheet, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Share2, 
  ExternalLink,
  Code2,
  Copy,
  Check,
  Award,
  TrendingUp,
  Clock,
  ShieldAlert,
  FolderOpen,
  QrCode
} from 'lucide-react';
import { Exam, StudentSubmission } from '../types/exam';
import { exportSubmissionsToCsv, GOOGLE_APPS_SCRIPT_SAMPLE_CODE } from '../utils/googleSheetsSync';
import { FormattedText } from './FormattedText';

interface Area3Props {
  exam: Exam;
  allExams: Exam[];
  onSelectExam: (ex: Exam) => void;
  setExam: React.Dispatch<React.SetStateAction<Exam>>;
  onToggleStatus: () => void;
}

export const Area3_SubmissionsAndLinks: React.FC<Area3Props> = ({
  exam,
  allExams,
  onSelectExam,
  setExam,
  onToggleStatus,
}) => {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [allSubmissionsMap, setAllSubmissionsMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentForReview, setSelectedStudentForReview] = useState<StudentSubmission | null>(null);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeQrLink, setActiveQrLink] = useState<string | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const onlineTestLink = `${currentOrigin}/?exam=${encodeURIComponent(exam.id)}`;

  // Fetch submissions for active exam
  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/submissions?examId=${encodeURIComponent(exam.id)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubmissions(data);
      }

      // Also fetch submission counts for all exams
      const allRes = await fetch('/api/submissions');
      const allData = await allRes.json();
      if (Array.isArray(allData)) {
        const counts: Record<string, number> = {};
        allData.forEach((s: StudentSubmission) => {
          counts[s.examId] = (counts[s.examId] || 0) + 1;
        });
        setAllSubmissionsMap(counts);
      }
    } catch (e) {
      console.error('Error fetching submissions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 20000);
    return () => clearInterval(interval);
  }, [exam.id]);

  const handleDeleteSubmission = async (subId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bản nộp này của học sinh?')) return;
    try {
      await fetch(`/api/submissions/${subId}`, { method: 'DELETE' });
      setSubmissions((prev) => prev.filter((s) => s.id !== subId));
    } catch (e) {
      alert('Lỗi khi xóa bài nộp');
    }
  };

  const handleCopyLink = (linkToCopy?: string) => {
    navigator.clipboard.writeText(linkToCopy || onlineTestLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SAMPLE_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // Filter submissions by student name or class
  const filteredSubmissions = submissions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.studentName || '').toLowerCase().includes(q) ||
      (s.studentClass || '').toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q)
    );
  });

  // Calculate summary analytics for active exam
  const totalCount = submissions.length;
  const avgScore = totalCount > 0 ? submissions.reduce((acc, s) => acc + s.score, 0) / totalCount : 0;
  const highestScore = totalCount > 0 ? Math.max(...submissions.map((s) => s.score)) : 0;
  const lowestScore = totalCount > 0 ? Math.min(...submissions.map((s) => s.score)) : 0;
  const passedCount = submissions.filter((s) => s.score >= (exam.passingScore || 5.0)).length;
  const passRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

  // Score distribution buckets
  const buckets = [
    { label: '0 - 2.9 điểm', count: submissions.filter((s) => s.score < 3).length, color: 'bg-rose-500' },
    { label: '3 - 4.9 điểm', count: submissions.filter((s) => s.score >= 3 && s.score < 5).length, color: 'bg-amber-500' },
    { label: '5 - 6.4 điểm', count: submissions.filter((s) => s.score >= 5 && s.score < 6.5).length, color: 'bg-blue-500' },
    { label: '6.5 - 7.9 điểm', count: submissions.filter((s) => s.score >= 6.5 && s.score < 8).length, color: 'bg-indigo-500' },
    { label: '8 - 10 điểm (Giỏi)', count: submissions.filter((s) => s.score >= 8).length, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Khu Vực 3
              </span>
              <h2 className="text-xl font-bold text-white">Xem Kết Quả Bài Thi & Quản Lý Link Đề Đã Gửi</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Bảng quản lý tất cả các đề đã tạo và phát hành cho học sinh. Nhấp vào bài thi bất kỳ để xem kết quả chi tiết.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={onToggleStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                exam.isActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              }`}
            >
              {exam.isActive ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{exam.isActive ? 'Đang Mở Nhận Bài' : 'Đang Khóa Đề Thi'}</span>
            </button>

            <button
              onClick={() => exportSubmissionsToCsv(submissions, exam.title || exam.id)}
              disabled={submissions.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 shadow-sm transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Xuất Excel ({submissions.length})</span>
            </button>

            <button
              onClick={() => setShowAppsScriptModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-all"
            >
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>Đồng Bộ Google Sheets</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. MASTER EXAM MANAGER TABLE (Danh Sách Các Bài Thi Đã Tạo & Gửi Cho HS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-2">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">
              Bảng Danh Sách Các Đề Thi Đã Tạo & Gửi Học Sinh ({allExams.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Chọn hàng để xem thống kê và bảng điểm chi tiết bên dưới
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Mã Đề Thi</th>
                <th className="p-3.5">Tên Đề Thi</th>
                <th className="p-3.5">Môn Học</th>
                <th className="p-3.5">Số Câu</th>
                <th className="p-3.5">Trạng Thái</th>
                <th className="p-3.5">Lượt Nộp</th>
                <th className="p-3.5">Link Trực Tuyến</th>
                <th className="p-3.5 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {allExams.map((ex) => {
                const isSelected = ex.id === exam.id;
                const submissionCount = allSubmissionsMap[ex.id] || (isSelected ? submissions.length : 0);
                const testLink = `${currentOrigin}/?exam=${encodeURIComponent(ex.id)}`;

                return (
                  <tr
                    key={ex.id}
                    onClick={() => onSelectExam(ex)}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500 font-medium'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="p-3.5 font-mono font-bold text-indigo-300">{ex.id}</td>
                    <td className="p-3.5 font-semibold text-white">
                      {ex.title}
                      {isSelected && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                          Đang chọn xem
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">{ex.subject || 'N/A'}</td>
                    <td className="p-3.5 font-mono">
                      {ex.parts?.reduce((acc, p) => acc + (p.questions?.length || 0), 0) || 0} câu
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          ex.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {ex.isActive ? 'Mở' : 'Khóa'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-white">
                      {submissionCount} bài nộp
                    </td>
                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyLink(testLink)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3 text-indigo-400" />
                          <span>Chép link</span>
                        </button>
                        <button
                          onClick={() => setActiveQrLink(testLink)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Mã QR cho học sinh quét"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectExam(ex)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? 'Đang Xem' : 'Xem Kết Quả'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. ANALYTICS CARDS FOR CURRENTLY SELECTED EXAM */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tổng lượt nộp</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{totalCount}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Điểm trung bình</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{avgScore.toFixed(1)} / 10</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Điểm cao nhất</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{highestScore.toFixed(1)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Điểm thấp nhất</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-300 mt-1">{lowestScore.toFixed(1)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tỷ lệ Đạt (&gt;= {exam.passingScore || 5.0})</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-teal-400 mt-1">{passRate.toFixed(0)}%</p>
        </div>
      </div>

      {/* Grade Distribution Histogram */}
      {totalCount > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Phổ Điểm Thống Kê ({exam.title})
          </h4>
          <div className="space-y-2">
            {buckets.map((b, idx) => {
              const pct = totalCount > 0 ? (b.count / totalCount) * 100 : 0;
              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-32 text-slate-300 font-medium">{b.label}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${b.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-slate-400 font-mono">
                    {b.count} hs ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SUBMISSIONS TABLE FOR SELECTED EXAM */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        {/* Table Filter & Search Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-white">
              Kết Quả Nộp Bài Của: <span className="text-indigo-400">{exam.title}</span> ({filteredSubmissions.length})
            </h3>
            {isLoading && <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm học sinh, lớp, mã số..."
                className="bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-56"
              />
            </div>

            <button
              onClick={fetchSubmissions}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title="Làm mới dữ liệu nộp bài"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        {filteredSubmissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Học Sinh</th>
                  <th className="p-3.5">Lớp</th>
                  <th className="p-3.5">Điểm Số</th>
                  <th className="p-3.5">Số Câu Đúng</th>
                  <th className="p-3.5">Thời Gian Làm</th>
                  <th className="p-3.5">Tab Switch</th>
                  <th className="p-3.5">Lần Thi</th>
                  <th className="p-3.5">Thời Điểm Nộp</th>
                  <th className="p-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredSubmissions.map((sub) => {
                  const isPassed = sub.score >= (exam.passingScore || 5.0);
                  const minutes = Math.floor(sub.timeSpentSeconds / 60);
                  const seconds = sub.timeSpentSeconds % 60;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-semibold text-white">
                        {sub.studentName}
                        {sub.studentId && (
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">
                            MSHS: {sub.studentId}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                          {sub.studentClass || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold text-sm px-2 py-0.5 rounded ${
                            isPassed
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {sub.score.toFixed(1)} / 10
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {sub.correctCount} / {sub.totalQuestions} câu
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">
                        {minutes}p {seconds}s
                      </td>
                      <td className="p-3.5">
                        {sub.violations > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-max">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            {sub.violations} lần
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium text-[11px]">0 lần</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">Lần {sub.attempt || 1}</td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(sub.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedStudentForReview(sub)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all"
                            title="Xem chi tiết câu trả lời của học sinh này"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem Bài</span>
                          </button>

                          <button
                            onClick={() => handleDeleteSubmission(sub.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                            title="Xóa bài nộp này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Chưa có học sinh nào nộp bài cho đề: {exam.title}
            </p>
            <p className="text-xs text-slate-500">
              Gửi link trực tuyến cho học sinh hoặc chuyển qua bài khác trong danh sách ở trên!
            </p>
          </div>
        )}
      </div>

      {/* Individual Student Review Modal */}
      {selectedStudentForReview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Chi Tiết Bài Làm: {selectedStudentForReview.studentName}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                    Lớp {selectedStudentForReview.studentClass || 'N/A'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Điểm số: <strong className="text-emerald-400 font-bold">{selectedStudentForReview.score.toFixed(1)}/10</strong> ({selectedStudentForReview.correctCount}/{selectedStudentForReview.totalQuestions} câu đúng) • {new Date(selectedStudentForReview.timestamp).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForReview(null)}
                className="text-slate-400 hover:text-white text-lg px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {selectedStudentForReview.questionSnapshots && selectedStudentForReview.questionSnapshots.length > 0 ? (
                selectedStudentForReview.questionSnapshots.map((item, idx) => {
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-2.5 ${
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
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            item.isCorrect
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {item.isCorrect ? '✓ Đúng' : '✗ Sai'}
                        </span>
                      </div>

                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt="Minh họa"
                          className="h-28 rounded-lg object-contain bg-slate-950"
                        />
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {item.options.map((opt) => {
                          const isStudentPick = item.studentChoice === opt.id;
                          const isTargetKey = item.correctAnswer === opt.id;

                          let bgClass = 'bg-slate-900/60 border-slate-800 text-slate-300';
                          if (isTargetKey) {
                            bgClass = 'bg-emerald-950/50 border-emerald-500/70 text-emerald-200 font-semibold';
                          } else if (isStudentPick && !item.isCorrect) {
                            bgClass = 'bg-rose-950/50 border-rose-500/70 text-rose-200 line-through';
                          }

                          return (
                            <div key={opt.id} className={`p-2.5 rounded-xl border flex items-center justify-between ${bgClass}`}>
                              <span>
                                <strong className="mr-1.5">{opt.id}.</strong>
                                <FormattedText text={opt.text} isPronunciation={true} />
                              </span>
                              {isStudentPick && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300">
                                  Học sinh chọn
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {item.explanation && (
                        <div className="p-2.5 bg-slate-950/80 rounded-xl text-xs text-slate-300 border border-slate-800 mt-1">
                          <strong className="text-emerald-400 mr-1">Lời giải:</strong>
                          <span>{item.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400">Không có bản chụp chi tiết câu hỏi cho bài nộp này.</p>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedStudentForReview(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {activeQrLink && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Mã QR Thi Trực Tuyến</h3>
            <p className="text-xs text-slate-400">Học sinh quét camera điện thoại để vào làm bài ngay.</p>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  activeQrLink
                )}`}
                alt="QR Code"
                className="w-44 h-44 mx-auto"
              />
            </div>
            <p className="text-[11px] text-indigo-400 font-mono break-all px-2">{activeQrLink}</p>
            <button
              onClick={() => setActiveQrLink(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Google Apps Script Modal */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Đồng Bộ Trực Tiếp Vào Google Sheets</h3>
              </div>
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="text-slate-400 hover:text-white text-lg px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <p className="text-slate-300">
                Tự động đẩy điểm số và thông tin học sinh vào Google Sheet của riêng bạn qua Google Apps Script Web App.
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  1. Dán URL Ứng Dụng Web (Google Apps Script Web App URL):
                </label>
                <input
                  type="text"
                  value={exam.googleAppsScriptUrl || ''}
                  onChange={(e) =>
                    setExam((prev) => ({ ...prev, googleAppsScriptUrl: e.target.value }))
                  }
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold">
                    2. Mã Script Google Apps Script (Code.gs):
                  </label>
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-all"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Đã sao chép' : 'Sao chép mã .gs'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                  {GOOGLE_APPS_SCRIPT_SAMPLE_CODE}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Lưu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
