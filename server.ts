import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const examsFile = path.join(dataDir, 'exams.json');
const submissionsFile = path.join(dataDir, 'submissions.json');

function loadExams(): any[] {
  try {
    if (fs.existsSync(examsFile)) {
      return JSON.parse(fs.readFileSync(examsFile, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading exams file:', e);
  }
  return [];
}

function saveExams(exams: any[]) {
  try {
    fs.writeFileSync(examsFile, JSON.stringify(exams, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing exams file:', e);
  }
}

function loadSubmissions(): any[] {
  try {
    if (fs.existsSync(submissionsFile)) {
      return JSON.parse(fs.readFileSync(submissionsFile, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading submissions file:', e);
  }
  return [];
}

function saveSubmissions(submissions: any[]) {
  try {
    fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing submissions file:', e);
  }
}

// Seed sample exam if empty so teacher immediately has a working sample
function seedSampleExam() {
  const exams = loadExams();
  if (exams.length === 0) {
    const sampleExam = {
      id: 'ENG-12-HK2-2026',
      title: 'Đề Khảo Sát Chất Lượng Tiếng Anh 12 - Học Kỳ II',
      subject: 'Tiếng Anh',
      school: 'Trường THPT Chuyên Lê Hồng Phong',
      teacher: 'Thầy Nguyễn Văn Nam',
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
          '🏆 Tuyệt vời! Bạn nằm trong Top 5% học sinh xuất sắc nhất kỳ thi!',
        ],
        defaultMessage: 'Bạn đã hoàn thành bài thi! Hãy tiếp tục rèn luyện để đạt kết quả cao hơn nhé.',
      },
      googleAppsScriptUrl: '',
      parts: [
        {
          id: 'part-1',
          title: 'PART 1: LISTENING & PRONUNCIATION (Nghe & Ngữ Âm)',
          description: 'Chọn từ có phần gạch chân phát âm khác biệt hoặc trọng âm khác.',
          audioUrl: '',
          audioScript: 'Listen carefully to the audio and choose the correct pronunciation.',
          mixQ: true,
          mixA: true,
          questions: [
            {
              id: 1,
              questionNumber: 1,
              text: 'Choose the word whose underlined part is pronounced differently from the others.',
              options: [
                { id: 'A', text: 'watched' },
                { id: 'B', text: 'stopped' },
                { id: 'C', text: 'cleaned' },
                { id: 'D', text: 'laughed' },
              ],
              correctAnswer: 'C',
              explanation: 'Chọn đáp án C vì "cleaned" có đuôi "-ed" phát âm là /d/, trong khi các từ còn lại phát âm là /t/ sau các âm vô thanh /tʃ/, /p/, /f/.',
              isLocked: false,
              mixA: true,
            },
            {
              id: 2,
              questionNumber: 2,
              text: 'Choose the word that differs from the other three in the position of primary stress.',
              options: [
                { id: 'A', text: 'protect' },
                { id: 'B', text: 'energy' },
                { id: 'C', text: 'animal' },
                { id: 'D', text: 'natural' },
              ],
              correctAnswer: 'A',
              explanation: 'Chọn đáp án A vì "protect" có trọng âm rơi vào âm tiết thứ 2 /prəˈtekt/, các từ còn lại trọng âm rơi vào âm tiết thứ nhất.',
              isLocked: false,
              mixA: true,
            },
          ],
        },
        {
          id: 'part-2',
          title: 'PART 2: GRAMMAR & VOCABULARY (Ngữ Pháp & Từ Vựng)',
          description: 'Chọn phương án đúng nhất A, B, C hoặc D để hoàn thành các câu sau.',
          audioUrl: '',
          audioScript: '',
          mixQ: true,
          mixA: true,
          questions: [
            {
              id: 3,
              questionNumber: 3,
              text: 'If she had studied harder, she ________ the graduation exam last semester.',
              options: [
                { id: 'A', text: 'would pass' },
                { id: 'B', text: 'would have passed' },
                { id: 'C', text: 'will pass' },
                { id: 'D', text: 'had passed' },
              ],
              correctAnswer: 'B',
              explanation: 'Chọn đáp án B vì đây là câu điều kiện loại 3 (Third Conditional) diễn tả điều kiện trái với quá khứ: If + S + had + P2, S + would have + P2.',
              isLocked: false,
              mixA: true,
            },
            {
              id: 4,
              questionNumber: 4,
              text: 'Renewable energy sources such as wind and solar are vital to ________ greenhouse gas emissions.',
              options: [
                { id: 'A', text: 'reducing' },
                { id: 'B', text: 'increase' },
                { id: 'C', text: 'protect' },
                { id: 'D', text: 'destroy' },
              ],
              correctAnswer: 'A',
              explanation: 'Chọn đáp án A vì cụm "vital to + V-ing" (thiết yếu để làm gì), "reducing emissions" mang nghĩa cắt giảm khí thải nhà kính.',
              isLocked: false,
              mixA: true,
            },
            {
              id: 5,
              questionNumber: 5,
              text: 'The scientist ________ discovered the new compound received an international award.',
              options: [
                { id: 'A', text: 'which' },
                { id: 'B', text: 'whom' },
                { id: 'C', text: 'who' },
                { id: 'D', text: 'whose' },
              ],
              correctAnswer: 'C',
              explanation: 'Chọn đáp án C vì đại từ quan hệ "who" thay thế cho danh từ chỉ người "The scientist" và đóng vai trò làm chủ ngữ trong mệnh đề quan hệ.',
              isLocked: false,
              mixA: true,
            },
          ],
        },
        {
          id: 'part-3',
          title: 'PART 3: READING COMPREHENSION (Đọc Hiểu)',
          description: 'Đọc đoạn văn sau và chọn câu trả lời thích hợp nhất cho các câu hỏi.',
          passageText: 'Artificial Intelligence (AI) is transforming modern education by providing personalized learning pathways for each student. Rather than following a one-size-fits-all curriculum, AI algorithms analyze students learning habits and pace, pinpointing areas where they need extra support. Teachers can use these insights to design tailored tutoring, fostering greater student engagement and confidence.',
          audioUrl: '',
          audioScript: '',
          mixQ: false,
          mixA: true,
          questions: [
            {
              id: 6,
              questionNumber: 6,
              text: 'What is the main topic of the passage?',
              options: [
                { id: 'A', text: 'The history of computer science' },
                { id: 'B', text: 'How AI personalizes and improves modern education' },
                { id: 'C', text: 'The disadvantages of relying on technology' },
                { id: 'D', text: 'Why teachers will soon be completely replaced' },
              ],
              correctAnswer: 'B',
              explanation: 'Chọn đáp án B vì toàn bộ đoạn văn tập trung vào việc trí tuệ nhân tạo (AI) cá nhân hóa lộ trình học và giúp giáo viên hỗ trợ học sinh hiệu quả hơn.',
              isLocked: false,
              mixA: true,
            },
            {
              id: 7,
              questionNumber: 7,
              text: 'According to the passage, AI algorithms help students by:',
              options: [
                { id: 'A', text: 'Grading homework without any human supervision' },
                { id: 'B', text: 'Replacing school textbooks entirely' },
                { id: 'C', text: 'Analyzing learning pace and pinpointing areas needing support' },
                { id: 'D', text: 'Taking exams on behalf of students' },
              ],
              correctAnswer: 'C',
              explanation: 'Chọn đáp án C vì trong bài có câu trực tiếp: "AI algorithms analyze students learning habits and pace, pinpointing areas where they need extra support".',
              isLocked: false,
              mixA: true,
            },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveExams([sampleExam]);
  }
}
seedSampleExam();

// Helper to get GoogleGenAI client
function getGenAIClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ======================== API ROUTES ========================

// Health check & status
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasEnvKey: !!process.env.GEMINI_API_KEY });
});

// Exams CRUD
app.get('/api/exams', (req, res) => {
  const exams = loadExams();
  res.json(exams);
});

app.get('/api/exams/:id', (req, res) => {
  const exams = loadExams();
  const exam = exams.find((e) => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ error: 'Không tìm thấy đề thi' });
  }
  res.json(exam);
});

app.post('/api/exams', (req, res) => {
  const examData = req.body;
  if (!examData || !examData.id) {
    return res.status(400).json({ error: 'Mã đề thi (ID) là bắt buộc' });
  }

  const exams = loadExams();
  const existingIndex = exams.findIndex((e) => e.id === examData.id);

  const now = new Date().toISOString();
  if (existingIndex >= 0) {
    exams[existingIndex] = {
      ...examData,
      updatedAt: now,
    };
  } else {
    exams.push({
      ...examData,
      createdAt: now,
      updatedAt: now,
    });
  }

  saveExams(exams);
  res.json({ success: true, exam: examData });
});

app.patch('/api/exams/:id/status', (req, res) => {
  const { isActive } = req.body;
  const exams = loadExams();
  const exam = exams.find((e) => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ error: 'Không tìm thấy đề thi' });
  }
  exam.isActive = !!isActive;
  exam.updatedAt = new Date().toISOString();
  saveExams(exams);
  res.json({ success: true, isActive: exam.isActive });
});

app.delete('/api/exams/:id', (req, res) => {
  let exams = loadExams();
  exams = exams.filter((e) => e.id !== req.params.id);
  saveExams(exams);
  res.json({ success: true });
});

// Submissions
app.get('/api/submissions', (req, res) => {
  const { examId } = req.query;
  let submissions = loadSubmissions();
  if (examId) {
    submissions = submissions.filter((s) => s.examId === examId);
  }
  // Sort descending by timestamp
  submissions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(submissions);
});

app.post('/api/submissions', async (req, res) => {
  const submission = req.body;
  if (!submission || !submission.examId || !submission.studentName) {
    return res.status(400).json({ error: 'Thiếu thông tin học sinh hoặc bài thi' });
  }

  // Load exam to check active state and verify scoring
  const exams = loadExams();
  const exam = exams.find((e) => e.id === submission.examId);
  if (exam && exam.isActive === false) {
    return res.status(403).json({ error: 'Đề thi hiện đang bị khóa, không thể nộp bài.' });
  }

  const submissions = loadSubmissions();
  const newSubmission = {
    id: 'SUB-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    ...submission,
    timestamp: new Date().toISOString(),
  };

  submissions.unshift(newSubmission);
  saveSubmissions(submissions);

  // Sync to Google Apps Script if URL is provided
  if (exam && exam.googleAppsScriptUrl && exam.googleAppsScriptUrl.trim().startsWith('http')) {
    try {
      fetch(exam.googleAppsScriptUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitExam',
          timestamp: newSubmission.timestamp,
          examId: newSubmission.examId,
          examTitle: exam.title || '',
          studentName: newSubmission.studentName,
          studentClass: newSubmission.studentClass || '',
          studentId: newSubmission.studentId || '',
          score: newSubmission.score,
          totalQuestions: newSubmission.totalQuestions,
          correctCount: newSubmission.correctCount,
          timeSpentSeconds: newSubmission.timeSpentSeconds,
          violations: newSubmission.violations || 0,
          attempt: newSubmission.attempt || 1,
        }),
      }).catch((err) => console.warn('Background Google Apps Script sync error:', err.message));
    } catch (e) {
      console.warn('Google Apps Script call failed:', e);
    }
  }

  res.json({ success: true, submission: newSubmission });
});

app.delete('/api/submissions/:id', (req, res) => {
  let submissions = loadSubmissions();
  submissions = submissions.filter((s) => s.id !== req.params.id);
  saveSubmissions(submissions);
  res.json({ success: true });
});

// ======================== GEMINI AI ROUTES ========================

// 1. Generate full structured exam
app.post('/api/gemini/generate-exam', async (req, res) => {
  const { prompt, subject, grade, numQuestions, numParts, customApiKey, modelName } = req.body;
  const ai = getGenAIClient(customApiKey);
  const selectedModel = modelName || 'gemini-3.8-flash';

  const systemInstruction = `Bạn là chuyên gia giáo dục và khảo thí hàng đầu Việt Nam.
Nhiệm vụ của bạn là tạo đề thi trắc nghiệm hoàn chỉnh, chuẩn sư phạm, chất lượng cao theo yêu cầu của giáo viên.
Đề thi gồm nhiều Phần (Parts). Mỗi câu hỏi phải có:
- ID duy nhất
- questionNumber liên tục từ 1 đến N
- Nội dung câu hỏi rõ ràng (text)
- 4 lựa chọn (A, B, C, D)
- Đáp án đúng chính xác (correctAnswer là 'A', 'B', 'C', hoặc 'D')
- Lời giải thích chi tiết, thuyết phục theo định dạng: "Chọn đáp án [X] vì... [lập luận, kiến thức, công thức]"
- mixA: true (cho phép trộn đáp án)

QUY TẮC BẮT BUỘC VỀ VỊ TRÍ NỘI DUNG:
1. Nếu là phần Nghe (Listening) hoặc có kịch bản đối thoại nghe: BẮT BUỘC lưu nội dung vào trường "audioScript" (ví dụ: "Boy: Hi, I am Ben. I am eight years old.\\nGirl: Look at my school bag!"). TUYỆT ĐỐI KHÔNG ĐƯỢC đặt Audio Script vào trường "passageText".
2. Trường "passageText" CHỈ DÀNH RIÊNG cho bài đọc hiểu (Reading Comprehension). Nếu không phải bài đọc hiểu thì để trống "".
3. Với câu hỏi tìm từ phát âm khác hoặc trọng âm: Bao bọc chữ cái cần gạch chân bằng thẻ <u>...</u> (Ví dụ: "m<u>y</u>", "<u>p</u>en", "<u>th</u>ese").
4. Có thể bổ sung câu hỏi dạng nhìn tranh / nghe tranh nếu giáo viên yêu cầu.

Output phải tuân thủ nghiêm ngặt định dạng JSON.`;

  const userPrompt = `Hãy tạo một đề thi ${subject || 'Tiếng Anh'} cho học sinh ${grade || 'Lớp 12'}.
Tổng số câu hỏi: ${numQuestions || 10} câu.
Số phần: ${numParts || 2} phần.
Yêu cầu nội dung cụ thể: ${prompt || 'Đề khảo sát năng lực chuẩn kiến thức'}.

Đảm bảo:
1. Số thứ tự câu hỏi liên tục 1, 2, 3...
2. Mọi câu đều có correctAnswer và explanation chuẩn mẫu "Chọn đáp án X vì...".
3. Tách bạch hoàn toàn: Audio Script nằm trong "audioScript", Passage nằm trong "passageText".
4. Trả về đúng JSON cấu trúc:
{
  "title": "Tên bài thi",
  "parts": [
    {
      "id": "part-1",
      "title": "Tên phần 1",
      "description": "Hướng dẫn làm bài",
      "passageText": "Đoạn văn đọc hiểu nếu có (hoặc để trống)",
      "audioScript": "Kịch bản nghe thoại nếu có (hoặc để trống)",
      "mixQ": true,
      "mixA": true,
      "questions": [
        {
          "id": 1,
          "questionNumber": 1,
          "text": "Nội dung câu hỏi",
          "options": [
            { "id": "A", "text": "Lựa chọn A" },
            { "id": "B", "text": "Lựa chọn B" },
            { "id": "C", "text": "Lựa chọn C" },
            { "id": "D", "text": "Lựa chọn D" }
          ],
          "correctAnswer": "A",
          "explanation": "Chọn đáp án A vì...",
          "isLocked": false,
          "mixA": true
        }
      ]
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Gemini generate-exam error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi gọi Gemini AI tạo đề' });
  }
});

// 2. Part-specific Assistant
app.post('/api/gemini/part-assistant', async (req, res) => {
  const { partTitle, currentQuestions, userRequest, passageText, customApiKey, modelName } = req.body;
  const ai = getGenAIClient(customApiKey);
  const selectedModel = modelName || 'gemini-3.8-flash';

  const systemInstruction = `Bạn là Trợ lý AI chuyên biệt cho từng Part của đề thi.
Bạn hỗ trợ giáo viên thực hiện các tác vụ:
- Viết bài đọc hiểu mới (passage text)
- Viết kịch bản nghe (audio script) & câu hỏi nghe hiểu
- Tạo thêm câu hỏi trắc nghiệm mới chuẩn format
- Tinh chỉnh độ khó của Part (Dễ, Trung bình, Nâng cao)
- Trả về JSON chứa nội dung phản hồi, kèm danh sách câu hỏi mới nếu được yêu cầu.`;

  const prompt = `Giáo viên đang chỉnh sửa phần: "${partTitle || 'Part'}".
Nội dung đoạn văn hiện tại (nếu có): ${passageText || 'Không có'}.
Số câu hỏi hiện tại: ${currentQuestions?.length || 0}.
Yêu cầu của giáo viên: "${userRequest}".

Hãy thực hiện yêu cầu và trả về JSON:
{
  "assistantReply": "Lời giải thích hoặc kịch bản/nội dung trao đổi với giáo viên",
  "newPassageText": "Đoạn văn đọc hiểu mới nếu có hoặc giữ nguyên",
  "audioScript": "Kịch bản nghe nếu đây là phần Listening",
  "generatedQuestions": [
    {
      "id": 999,
      "questionNumber": 1,
      "text": "Nội dung câu hỏi",
      "options": [
        { "id": "A", "text": "Lựa chọn A" },
        { "id": "B", "text": "Lựa chọn B" },
        { "id": "C", "text": "Lựa chọn C" },
        { "id": "D", "text": "Lựa chọn D" }
      ],
      "correctAnswer": "A",
      "explanation": "Chọn đáp án A vì...",
      "isLocked": false,
      "mixA": true
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Gemini part-assistant error:', error);
    res.status(500).json({ error: error.message || 'Lỗi trợ lý Gemini cho Part' });
  }
});

// 2b. Generate Part or Specific Questions for a Part
app.post('/api/gemini/generate-part-questions', async (req, res) => {
  const { mode, partTitle, prompt, numQuestions, passageText, subject, customApiKey, modelName } = req.body;
  const count = Math.max(1, Math.min(Number(numQuestions) || 5, 25));
  const ai = getGenAIClient(customApiKey);
  const selectedModel = modelName || 'gemini-3.8-flash';

  const systemInstruction = `Bạn là chuyên gia giáo dục và khảo thí hàng đầu Việt Nam.
Nhiệm vụ của bạn là tạo câu hỏi trắc nghiệm chất lượng cao, chuẩn mực sư phạm theo đúng yêu cầu của giáo viên.
Quy tắc:
1. Mỗi câu hỏi gồm:
   - "text": Nội dung câu hỏi rõ ràng.
   - "options": Mảng đúng 4 lựa chọn A, B, C, D (mỗi phần tử có "id": "A"|"B"|"C"|"D", "text": "nội dung").
   - "correctAnswer": Một ký tự duy nhất trong ["A", "B", "C", "D"].
   - "explanation": Giải thích bắt buộc mở đầu bằng: "Chọn đáp án [X] vì... [lập luận chi tiết]".
   - "questionType": "multiple_choice" hoặc "pronunciation".
   - "mixA": true.
2. Với câu hỏi phát âm / trọng âm: BẮT BUỘC dùng thẻ <u>...</u> bọc phần chữ cái cần gạch chân kiểm tra phát âm (ví dụ: cl<u>ea</u>n, h<u>ea</u>d, look<u>ed</u>).
3. Nếu giáo viên có cung cấp đoạn văn đọc hiểu (passageText) hoặc kịch bản nghe (audioScript), các câu hỏi phải bám sát ngữ liệu này.
4. Trả về đúng định dạng JSON chuẩn.`;

  const userPrompt = `Yêu cầu: Hãy tạo ${count} câu hỏi trắc nghiệm ${subject || 'Tiếng Anh'}.
Yêu cầu cụ thể từ giáo viên: "${prompt || 'Tạo câu hỏi trắc nghiệm chuẩn kiến thức'}".
${partTitle ? `Phần thi: "${partTitle}".` : ''}
${passageText ? `Ngữ liệu đọc hiểu / Kịch bản tham chiếu:\n"""\n${passageText}\n"""\n` : ''}

Trả về định dạng JSON:
{
  "title": "${partTitle || 'PART MỚI: CHỦ ĐỀ'}",
  "passageText": ${passageText ? JSON.stringify(passageText) : '""'},
  "audioScript": "",
  "questions": [
    {
      "text": "Nội dung câu hỏi",
      "options": [
        { "id": "A", "text": "Phương án A" },
        { "id": "B", "text": "Phương án B" },
        { "id": "C", "text": "Phương án C" },
        { "id": "D", "text": "Phương án D" }
      ],
      "correctAnswer": "A",
      "explanation": "Chọn đáp án A vì...",
      "questionType": "multiple_choice",
      "mixA": true
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Gemini generate-part-questions error:', error);
    res.status(500).json({ error: error.message || 'Lỗi tạo câu hỏi bằng AI' });
  }
});

// 3. AI Explanation Generator
app.post('/api/gemini/generate-explanations', async (req, res) => {
  const { questions, customApiKey, modelName } = req.body;
  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Danh sách câu hỏi không hợp lệ' });
  }

  const ai = getGenAIClient(customApiKey);
  const selectedModel = modelName || 'gemini-3.8-flash';

  const systemInstruction = `Bạn là trợ lý giải thích đề thi trắc nghiệm sư phạm.
Nhiệm vụ: Viết lời giải thích đáp án cực kỳ chi tiết, mạch lạc, dễ hiểu.
Mỗi lời giải thích BẮT BUỘC bắt đầu bằng định dạng: "Chọn đáp án [X] vì...".
Chỉ ra nguyên tắc ngữ pháp, công thức toán học hoặc dẫn chứng từ bài đọc để người học hiểu sâu lý do tại sao đáp án đó đúng và tại sao các lựa chọn khác sai.`;

  const prompt = `Hãy tạo giải thích chi tiết cho các câu hỏi sau:
${JSON.stringify(questions, null, 2)}

Trả về JSON:
{
  "explanations": [
    {
      "questionId": 1,
      "explanation": "Chọn đáp án B vì..."
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Gemini generate-explanations error:', error);
    res.status(500).json({ error: error.message || 'Lỗi tạo giải thích AI' });
  }
});

// 4. AI Auto-Fix Logic (Resolves missing keys, numbering gaps, duplicates, option errors)
app.post('/api/gemini/auto-fix', async (req, res) => {
  const { exam, auditErrors, customApiKey, modelName } = req.body;
  const ai = getGenAIClient(customApiKey);
  const selectedModel = modelName || 'gemini-3.8-flash';

  const systemInstruction = `Bạn là hệ thống kiểm định và sửa lỗi đề thi tự động.
Nhiệm vụ: Phân tích toàn bộ đề thi và các lỗi phát hiện (như thiếu đáp án đúng, câu hỏi không liên tục, trùng lặp, thiếu options) rồi TỰ ĐỘNG SỬA HẾT MỌI LỖI để đạt chuẩn 100% Tick Xanh.
Nguyên tắc:
1. Câu hỏi nào thiếu correctAnswer: Xác định đáp án logic nhất và điền 'A', 'B', 'C', hoặc 'D'.
2. Đánh lại questionNumber liên tục từ 1 đến tổng số câu trên toàn bộ đề thi.
3. Nếu có câu hỏi hoặc phương án trùng lặp, hãy làm mới hoặc điều chỉnh nội dung.
4. Mỗi câu phải có đủ 4 phương án rõ ràng.
5. Tạo hoặc bổ sung lời giải thích theo chuẩn "Chọn đáp án [X] vì...".
Trả về toàn bộ cấu trúc exam đã được sửa hoàn chỉnh.`;

  const prompt = `Đề thi hiện tại:
${JSON.stringify(exam, null, 2)}

Các lỗi kiểm định:
${JSON.stringify(auditErrors, null, 2)}

Hãy sửa toàn bộ đề thi để đạt chuẩn 100% hợp lệ. Trả về đúng JSON cấu trúc exam.`;

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, exam: parsed });
  } catch (error: any) {
    console.error('Gemini auto-fix error:', error);
    res.status(500).json({ error: error.message || 'Lỗi tự động sửa đề bằng AI' });
  }
});

// Helper to concatenate multiple RIFF WAV buffers into a single playable WAV file
function concatWavBuffers(buffers: Buffer[]): Buffer {
  const validBuffers = buffers.filter((b) => b && b.length > 44);
  if (validBuffers.length === 0) return Buffer.alloc(0);
  if (validBuffers.length === 1) return validBuffers[0];

  const header = Buffer.from(validBuffers[0].subarray(0, 44));
  const pcmList: Buffer[] = [];

  for (const buf of validBuffers) {
    pcmList.push(buf.subarray(44));
  }

  const allPcm = Buffer.concat(pcmList);
  // Update ChunkSize (bytes 4-7) = totalLength - 8 = allPcm.length + 36
  header.writeUInt32LE(allPcm.length + 36, 4);
  // Update Subchunk2Size (bytes 40-43) = allPcm.length
  header.writeUInt32LE(allPcm.length, 40);

  return Buffer.concat([header, allPcm]);
}

// 5. Professional Speech & Dialogue Audio Studio (Single, Dual, Trio & Multi-Speaker)
app.post('/api/gemini/tts-audio', async (req, res) => {
  const { text, mode, voiceName, characters, contextPrompt, customApiKey } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Nội dung đọc không được để trống' });
  }

  const ai = getGenAIClient(customApiKey);
  const cleanContext = contextPrompt || 'Clear, natural, professional educational audio with clear pronunciation';

  try {
    // MODE 1: Single Speaker
    if (!mode || mode === 'single') {
      const selectedVoice = voiceName || 'Kore';
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.substring(0, 2000),
                speechMetadata: {
                  style: cleanContext,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({ success: true, audioDataUrl: `data:audio/wav;base64,${base64Audio}` });
      } else {
        throw new Error('Không nhận được dữ liệu audio từ Gemini TTS');
      }
    }

    // MODE 2: Dual Speaker Dialogue (2 Characters)
    if (mode === 'dialogue_2') {
      const char1 = (characters && characters[0]) || { name: 'Boy', voiceName: 'Puck' };
      const char2 = (characters && characters[1]) || { name: 'Girl', voiceName: 'Kore' };

      // Parse lines
      const rawLines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      const partsPayload: any[] = [];

      for (const line of rawLines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const rawSpeaker = line.substring(0, colonIdx).trim();
          const speechContent = line.substring(colonIdx + 1).trim();
          const isChar1 = rawSpeaker.toLowerCase().includes(char1.name.toLowerCase());
          const speakerTag = isChar1 ? char1.name : char2.name;

          partsPayload.push({
            text: `${speakerTag}: ${speechContent}`,
            speechMetadata: {
              speaker: speakerTag,
              style: cleanContext,
            },
          });
        } else {
          partsPayload.push({
            text: `${char1.name}: ${line}`,
            speechMetadata: {
              speaker: char1.name,
              style: cleanContext,
            },
          });
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: partsPayload.slice(0, 20),
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: char1.name,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: char1.voiceName || 'Puck' },
                  },
                },
                {
                  speaker: char2.name,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: char2.voiceName || 'Kore' },
                  },
                },
              ],
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({ success: true, audioDataUrl: `data:audio/wav;base64,${base64Audio}` });
      }
    }

    // MODE 3: Trio or Multi-turn Dialogue (Stitching turns via concatWavBuffers)
    const rawLines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    const audioBuffers: Buffer[] = [];

    const charList = characters && characters.length > 0 ? characters : [
      { name: 'Narrator', voiceName: 'Zephyr' },
      { name: 'Boy', voiceName: 'Puck' },
      { name: 'Girl', voiceName: 'Kore' },
    ];

    for (const line of rawLines.slice(0, 15)) {
      let speakerVoice = 'Kore';
      let contentText = line;

      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const rawSpeaker = line.substring(0, colonIdx).trim().toLowerCase();
        contentText = line.substring(colonIdx + 1).trim();
        const matchedChar = charList.find((c: any) => rawSpeaker.includes(c.name.toLowerCase()));
        if (matchedChar) {
          speakerVoice = matchedChar.voiceName || 'Kore';
        }
      }

      try {
        const turnRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [{ text: contentText, speechMetadata: { style: cleanContext } }],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerVoice } },
            },
          },
        });

        const turnBase64 = turnRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (turnBase64) {
          audioBuffers.push(Buffer.from(turnBase64, 'base64'));
        }
      } catch (errTurn) {
        console.warn('Error on turn TTS:', errTurn);
      }
    }

    if (audioBuffers.length > 0) {
      const merged = concatWavBuffers(audioBuffers);
      return res.json({
        success: true,
        audioDataUrl: `data:audio/wav;base64,${merged.toString('base64')}`,
      });
    }

    throw new Error('Không thể tạo file âm thanh đối thoại');
  } catch (error: any) {
    console.error('Gemini TTS studio error:', error);
    res.status(500).json({ error: error.message || 'Lỗi phòng thu âm thanh AI' });
  }
});

// ======================== VITE & STATIC HANDLING ========================
async function setupServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Exam Platform Server running on port ${PORT}`);
  });
}

setupServer();
