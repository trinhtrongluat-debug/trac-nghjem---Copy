import { Exam, ExamPart, Question, QuestionOption } from '../types/exam';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffles questions and options according to global, part-level, and question-level settings.
 * Preserves correct answer mapping so grading remains 100% accurate!
 */
export function prepareShuffledExam(originalExam: Exam): {
  shuffledExam: Exam;
  answerMapping: Record<string | number, string>; // questionId -> originalCorrectAnswer
} {
  const answerMapping: Record<string | number, string> = {};

  const processedParts: ExamPart[] = originalExam.parts.map((part) => {
    // 1. Process questions inside part
    const processedQuestions: Question[] = part.questions.map((q) => {
      // Record original correct answer for grading
      answerMapping[q.id] = q.correctAnswer;

      const shouldShuffleOptions = originalExam.mixA && part.mixA && q.mixA !== false;

      if (!shouldShuffleOptions || !q.options || q.options.length <= 1) {
        return { ...q };
      }

      // Shuffling options: remember the text of the correct option
      const correctOptionObj = q.options.find((o) => o.id === q.correctAnswer);
      const correctText = correctOptionObj ? correctOptionObj.text : '';

      // Shuffle the option text/objects
      const randomizedOptions = shuffleArray(q.options);

      // Re-assign labels A, B, C, D to the shuffled options
      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
      let newCorrectKey = q.correctAnswer;

      const mappedOptions: QuestionOption[] = randomizedOptions.map((opt, idx) => {
        const newLabel = labels[idx] || `Opt${idx + 1}`;
        if (opt.text === correctText) {
          newCorrectKey = newLabel;
        }
        return {
          id: newLabel,
          text: opt.text,
        };
      });

      return {
        ...q,
        options: mappedOptions,
        correctAnswer: newCorrectKey,
      };
    });

    // 2. Shuffle question order if enabled and respecting locked questions
    const shouldShuffleQuestions = originalExam.mixQ && part.mixQ;

    if (!shouldShuffleQuestions) {
      return {
        ...part,
        questions: processedQuestions,
      };
    }

    // Separate locked questions (keep at their exact index) from shuffleable ones
    const finalQuestions: (Question | null)[] = new Array(processedQuestions.length).fill(null);
    const floaters: Question[] = [];

    processedQuestions.forEach((q, idx) => {
      if (q.isLocked) {
        finalQuestions[idx] = q;
      } else {
        floaters.push(q);
      }
    });

    const shuffledFloaters = shuffleArray(floaters);
    let floaterIdx = 0;

    for (let i = 0; i < finalQuestions.length; i++) {
      if (finalQuestions[i] === null) {
        finalQuestions[i] = shuffledFloaters[floaterIdx++];
      }
    }

    return {
      ...part,
      questions: finalQuestions as Question[],
    };
  });

  // Re-number all questions in sequential presentation order (1, 2, 3, 4... N)
  // so questions are never out of sequence (e.g. Câu 2 before Câu 1) when shuffled!
  let sequentialNumber = 1;
  const renumberedParts: ExamPart[] = processedParts.map((part) => ({
    ...part,
    questions: part.questions.map((q) => {
      const originalNum = q.originalQuestionNumber || q.questionNumber;
      return {
        ...q,
        originalQuestionNumber: originalNum,
        questionNumber: sequentialNumber++,
      };
    }),
  }));

  return {
    shuffledExam: {
      ...originalExam,
      parts: renumberedParts,
    },
    answerMapping,
  };
}
