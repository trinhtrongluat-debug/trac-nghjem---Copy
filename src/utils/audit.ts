import { Exam, AuditResult, AuditIssue } from '../types/exam';

export function auditExam(exam: Exam): AuditResult {
  const issues: AuditIssue[] = [];
  const missingKeyNumbers: number[] = [];
  const numberingDiscontinuities: string[] = [];
  const fewOptionQuestions: number[] = [];
  let hasDuplicateIds = false;
  let hasDuplicateContent = false;

  const seenIds = new Set<string | number>();
  const seenTexts = new Map<string, number>();

  let allQuestionsCount = 0;
  let multipleChoiceCount = 0;
  let fillInCount = 0;
  let oneOptionCount = 0;
  let twoOptionsCount = 0;
  let threeOptionsCount = 0;
  let fourOptionsCount = 0;
  let otherCount = 0;
  const nonStandardFourQuestions: {
    questionNumber: number;
    partTitle: string;
    optionCount: number;
    type: string;
  }[] = [];

  let expectedNumber = 1;
  let isContinuous = true;

  if (!exam.parts || exam.parts.length === 0) {
    issues.push({
      type: 'empty_field',
      severity: 'error',
      partId: 'root',
      partTitle: 'Cấu trúc đề',
      questionId: '0',
      questionNumber: 0,
      message: 'Đề thi chưa có phần thi (Part) nào. Vui lòng thêm ít nhất một Part.',
    });
  }

  for (const part of exam.parts || []) {
    for (const q of part.questions || []) {
      allQuestionsCount++;
      const isFillIn = q.questionType === 'fill_in' || q.questionType === 'essay';

      if (isFillIn) {
        fillInCount++;
        oneOptionCount++;
      } else {
        multipleChoiceCount++;
        const numOpts = (q.options || []).length;
        if (numOpts === 1) oneOptionCount++;
        else if (numOpts === 2) twoOptionsCount++;
        else if (numOpts === 3) threeOptionsCount++;
        else if (numOpts === 4) fourOptionsCount++;
        else otherCount++;

        if (numOpts !== 4) {
          nonStandardFourQuestions.push({
            questionNumber: q.questionNumber,
            partTitle: part.title,
            optionCount: numOpts,
            type: q.questionType || 'trắc nghiệm',
          });
        }
      }

      // Check ID uniqueness
      if (seenIds.has(q.id)) {
        hasDuplicateIds = true;
        issues.push({
          type: 'duplicate_id',
          severity: 'error',
          partId: part.id,
          partTitle: part.title,
          questionId: q.id,
          questionNumber: q.questionNumber,
          message: `Trùng lặp ID câu hỏi (${q.id}) tại ${part.title} - Câu ${q.questionNumber}`,
        });
      } else {
        seenIds.add(q.id);
      }

      // Check continuous numbering
      if (q.questionNumber !== expectedNumber) {
        isContinuous = false;
        const msg = `Số thứ tự không liên tục: Đang là Câu ${q.questionNumber} (Kỳ vọng: Câu ${expectedNumber})`;
        numberingDiscontinuities.push(msg);
        issues.push({
          type: 'numbering_gap',
          severity: 'error',
          partId: part.id,
          partTitle: part.title,
          questionId: q.id,
          questionNumber: q.questionNumber,
          message: msg,
        });
      }
      expectedNumber++;

      // Check missing answer key
      if (isFillIn) {
        if (!q.correctAnswer || q.correctAnswer.trim() === '') {
          missingKeyNumbers.push(q.questionNumber);
          issues.push({
            type: 'missing_key',
            severity: 'error',
            partId: part.id,
            partTitle: part.title,
            questionId: q.id,
            questionNumber: q.questionNumber,
            message: `Thiếu từ cần điền (Key) tại Câu tự luận ${q.questionNumber} ("${q.text.substring(0, 40)}...")`,
          });
        }
      } else {
        const validOptionIds = (q.options || []).map((o) => o.id);
        if (!q.correctAnswer || !validOptionIds.includes(q.correctAnswer)) {
          missingKeyNumbers.push(q.questionNumber);
          issues.push({
            type: 'missing_key',
            severity: 'error',
            partId: part.id,
            partTitle: part.title,
            questionId: q.id,
            questionNumber: q.questionNumber,
            message: `Thiếu đáp án đúng (Key) tại Câu ${q.questionNumber} ("${q.text.substring(0, 40)}...")`,
          });
        }

        // Check option count for multiple choice questions
        if (!q.options || q.options.length < 2) {
          fewOptionQuestions.push(q.questionNumber);
          issues.push({
            type: 'few_options',
            severity: 'error',
            partId: part.id,
            partTitle: part.title,
            questionId: q.id,
            questionNumber: q.questionNumber,
            message: `Câu ${q.questionNumber} có ít hơn 2 phương án lựa chọn`,
          });
        }

        // Check empty option text
        for (const opt of q.options || []) {
          if (!opt.text || opt.text.trim() === '') {
            issues.push({
              type: 'empty_field',
              severity: 'error',
              partId: part.id,
              partTitle: part.title,
              questionId: q.id,
              questionNumber: q.questionNumber,
              message: `Câu ${q.questionNumber} có phương án [${opt.id}] bị bỏ trống nội dung`,
            });
          }
        }
      }

      // Check empty question text
      if (!q.text || q.text.trim() === '') {
        issues.push({
          type: 'empty_field',
          severity: 'error',
          partId: part.id,
          partTitle: part.title,
          questionId: q.id,
          questionNumber: q.questionNumber,
          message: `Câu ${q.questionNumber} chưa có nội dung câu hỏi`,
        });
      }

      // Check duplicate content
      const normalizedText = (q.text || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (normalizedText.length > 10) {
        if (seenTexts.has(normalizedText)) {
          hasDuplicateContent = true;
          const prevNum = seenTexts.get(normalizedText);
          issues.push({
            type: 'duplicate_content',
            severity: 'warning',
            partId: part.id,
            partTitle: part.title,
            questionId: q.id,
            questionNumber: q.questionNumber,
            message: `Nội dung Câu ${q.questionNumber} trùng lặp với Câu ${prevNum}`,
          });
        } else {
          seenTexts.set(normalizedText, q.questionNumber);
        }
      }
    }
  }

  if (allQuestionsCount === 0) {
    issues.push({
      type: 'empty_field',
      severity: 'error',
      partId: 'root',
      partTitle: 'Câu hỏi',
      questionId: '0',
      questionNumber: 0,
      message: 'Đề thi chưa có câu hỏi nào.',
    });
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  const errorPenalty = errors.length * 15;
  const warningPenalty = warnings.length * 5;
  let score = Math.max(0, 100 - errorPenalty - warningPenalty);

  if (errors.length === 0 && allQuestionsCount > 0) {
    score = 100;
  }

  // If teacher has explicitly manual-approved the exam
  const isManualApproved = !!exam.manualApproved;
  const isPassed = (errors.length === 0 && allQuestionsCount > 0) || isManualApproved;
  if (isManualApproved) {
    score = 100;
  }

  return {
    isPassed,
    isManualApproved,
    scorePercentage: score,
    totalQuestions: allQuestionsCount,
    multipleChoiceCount,
    fillInCount,
    optionCounts: {
      oneOptionCount,
      twoOptionsCount,
      threeOptionsCount,
      fourOptionsCount,
      otherCount,
    },
    nonStandardFourQuestions,
    errorCount: isManualApproved ? 0 : errors.length,
    warningCount: warnings.length,
    issues,
    summary: {
      hasMissingKeys: missingKeyNumbers.length > 0,
      missingKeyNumbers,
      isContinuous,
      numberingDiscontinuities,
      hasDuplicateIds,
      hasDuplicateContent,
      fewOptionQuestions,
    },
  };
}

export function autoRenumberExam(exam: Exam): Exam {
  let counter = 1;
  const newParts = exam.parts.map((p) => {
    return {
      ...p,
      questions: p.questions.map((q) => {
        const updated = {
          ...q,
          id: `q-${counter}`,
          questionNumber: counter,
        };
        counter++;
        return updated;
      }),
    };
  });

  return {
    ...exam,
    parts: newParts,
  };
}
