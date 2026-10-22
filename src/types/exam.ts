export interface QuestionOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
  imageUrl?: string; // Image for picture-based choices
}

export interface Question {
  id: number | string;
  questionNumber: number;
  text: string;
  options: QuestionOption[];
  correctAnswer: string; // 'A', 'B', 'C', 'D'
  explanation?: string;
  isLocked?: boolean; // Lock position (do not shuffle)
  mixA?: boolean;     // Allow shuffling options for this question
  audioUrl?: string;
  imageUrl?: string;  // Image illustration for the question
  questionType?: 'multiple_choice' | 'look_and_choose' | 'listen_and_choose' | 'pronunciation' | 'fill_in' | 'essay';
  acceptableAnswers?: string[]; // For fill-in questions (e.g. ['an', 'An'])
  originalQuestionNumber?: number;
}

export interface ExamPart {
  id: string;
  title: string;
  description?: string;
  passageText?: string;
  audioUrl?: string;
  audioScript?: string;
  imageUrl?: string;
  mixQ: boolean;
  mixA: boolean;
  questions: Question[];
}

export interface AntiCheatConfig {
  blockRightClick: boolean;
  blockCopyPaste: boolean;
  maxViolations: number;
  autoSubmitOnViolation: boolean;
  enforceFullscreen: boolean;
}

export interface RewardConfig {
  enabled: boolean;
  minScore: number;
  maxTimeMinutes: number;
  maxAttempt: number;
  successMessages: string[];
  defaultMessage: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  school: string;
  teacher: string;
  teacherEmail?: string;
  timeLimit: number; // in minutes
  maxAttempts: number;
  minScoreViewAnswers: number;
  passingScore: number;
  password?: string;
  isActive: boolean;
  manualApproved?: boolean; // Teacher manual Green Tick override
  manualApprovedAt?: string;
  manualApprovedBy?: string;
  mixQ: boolean;
  mixA: boolean;
  antiCheat: AntiCheatConfig;
  rewardConfig: RewardConfig;
  googleAppsScriptUrl?: string;
  parts: ExamPart[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentSubmission {
  id: string;
  examId: string;
  studentName: string;
  studentClass: string;
  studentId?: string;
  score: number; // 0 - 10
  totalQuestions: number;
  correctCount: number;
  timeSpentSeconds: number;
  violations: number;
  attempt: number;
  timestamp: string;
  answers: Record<string, string>; // questionId -> selectedOptionId or text
  questionSnapshots?: {
    questionId: string | number;
    questionNumber: number;
    partTitle: string;
    text: string;
    imageUrl?: string;
    options: QuestionOption[];
    studentChoice: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string;
    questionType?: string;
  }[];
}

export interface AuditIssue {
  type: 'missing_key' | 'numbering_gap' | 'duplicate_id' | 'duplicate_content' | 'few_options' | 'empty_field';
  severity: 'error' | 'warning';
  partId: string;
  partTitle: string;
  questionId: number | string;
  questionNumber: number;
  message: string;
}

export interface AuditResult {
  isPassed: boolean; // 100% Green Tick (or manual approved)
  isManualApproved?: boolean;
  scorePercentage: number;
  totalQuestions: number;
  multipleChoiceCount: number;
  fillInCount: number;
  optionCounts: {
    oneOptionCount: number; // Tự luận / 1 đáp án
    twoOptionsCount: number; // 2 đáp án (True/False, A-B)
    threeOptionsCount: number; // 3 đáp án (A-B-C)
    fourOptionsCount: number; // Chuẩn 4 đáp án (A-B-C-D)
    otherCount: number;
  };
  nonStandardFourQuestions: {
    questionNumber: number;
    partTitle: string;
    optionCount: number;
    type: string;
  }[];
  errorCount: number;
  warningCount: number;
  issues: AuditIssue[];
  summary: {
    hasMissingKeys: boolean;
    missingKeyNumbers: number[];
    isContinuous: boolean;
    numberingDiscontinuities: string[];
    hasDuplicateIds: boolean;
    hasDuplicateContent: boolean;
    fewOptionQuestions: number[];
  };
}
