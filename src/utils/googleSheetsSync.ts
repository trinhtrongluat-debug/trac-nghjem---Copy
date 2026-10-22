import { StudentSubmission } from '../types/exam';

export const GOOGLE_APPS_SCRIPT_SAMPLE_CODE = `/**
 * GOOGLE APPS SCRIPT CHO HỆ THỐNG SMART EXAM CREATOR
 * Hướng dẫn cài đặt:
 * 1. Mở Google Sheet mới -> Nhấp "Tiện ích mở rộng" (Extensions) -> "Apps Script".
 * 2. Dán toàn bộ mã này vào tệp Code.gs.
 * 3. Nhấp "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment).
 * 4. Chọn loại: "Ứng dụng web" (Web app).
 * 5. Tại mục "Người có quyền truy cập" (Who has access): Chọn "Bất kỳ ai" (Anyone).
 * 6. Nhấp "Triển khai" -> Sao chép URL ứng dụng web và dán vào Cài đặt đề thi trên Nền tảng.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Tạo tiêu đề nếu trang tính còn trống
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Thời gian nộp",
        "Mã đề thi",
        "Tên bài thi",
        "Họ và tên học sinh",
        "Lớp",
        "Mã học sinh",
        "Điểm số (Thang 10)",
        "Số câu đúng",
        "Tổng số câu",
        "Thời gian làm bài (giây)",
        "Số lần vi phạm tab",
        "Lần thi"
      ]);
      sheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#4F46E5").setFontColor("#FFFFFF");
    }
    
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString("vi-VN"),
      data.examId || "",
      data.examTitle || "",
      data.studentName || "",
      data.studentClass || "",
      data.studentId || "",
      data.score !== undefined ? data.score : "",
      data.correctCount !== undefined ? data.correctCount : "",
      data.totalQuestions !== undefined ? data.totalQuestions : "",
      data.timeSpentSeconds || 0,
      data.violations || 0,
      data.attempt || 1
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      message: "Đã lưu kết quả thành công vào Google Sheet!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;

export function exportSubmissionsToCsv(submissions: StudentSubmission[], examTitle: string): void {
  const headers = [
    'Mã nộp bài',
    'Thời gian nộp',
    'Mã đề thi',
    'Họ và tên học sinh',
    'Lớp',
    'Mã học sinh',
    'Điểm số (Thang 10)',
    'Số câu đúng',
    'Tổng số câu',
    'Tỷ lệ đúng (%)',
    'Thời gian làm (giây)',
    'Số lần vi phạm tab',
    'Lần nộp',
  ];

  const rows = submissions.map((s) => [
    s.id,
    new Date(s.timestamp).toLocaleString('vi-VN'),
    s.examId,
    `"${(s.studentName || '').replace(/"/g, '""')}"`,
    `"${(s.studentClass || '').replace(/"/g, '""')}"`,
    `"${(s.studentId || '').replace(/"/g, '""')}"`,
    s.score.toFixed(2),
    s.correctCount,
    s.totalQuestions,
    ((s.correctCount / Math.max(1, s.totalQuestions)) * 100).toFixed(1) + '%',
    s.timeSpentSeconds,
    s.violations || 0,
    s.attempt || 1,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bang_Diem_${examTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
