import mammoth from 'mammoth';
import { Exam, ExamPart, Question, QuestionOption } from '../types/exam';

/**
 * Extracts HTML from a Word .docx file while preserving:
 * - Underlined text (u => u)
 * - Bold (b => b)
 * - Embedded images as base64 data URLs
 * - Tables and highlights
 */
export async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "u => u",
        "b => strong",
        "i => em",
        "strike => del",
        "highlight => mark",
      ],
      convertImage: mammoth.images.imgElement((image) => {
        return image.read('base64').then((imageBuffer) => {
          return {
            src: `data:${image.contentType};base64,${imageBuffer}`,
          };
        });
      }),
    }
  );

  return result.value;
}

/**
 * Checks if the HTML is a standalone test app (like index_369853d9.html or V156 format)
 * with base64 encoded Q_ENC and configuration.
 */
export function isStandaloneAppHtml(htmlString: string): boolean {
  return /const\s+Q_ENC\s*=|var\s+Q_ENC\s*=|let\s+Q_ENC\s*=/i.test(htmlString);
}

/**
 * Decodes base64 string safely supporting UTF-8
 */
function decodeBase64Utf8(base64: string): string {
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch (e) {
    try {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e2) {
      return atob(base64);
    }
  }
}

function extractJsObject(src: string, varName: string): any {
  const p = src.indexOf(varName + '=');
  if (p === -1) {
    const p2 = src.indexOf(varName + ' =');
    if (p2 === -1) return {};
  }
  const pos = src.indexOf(varName);
  const start = src.indexOf('{', pos);
  if (start === -1) return {};
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        const jsonStr = src.substring(start, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          return {};
        }
      }
    }
  }
  return {};
}

/**
 * Parses a standalone offline test HTML (the teacher's original app format with Q_ENC & CFG)
 */
export function parseStandaloneAppHtml(htmlString: string): Partial<Exam> | null {
  const qEncMatch = htmlString.match(/(?:const|var|let)\s+Q_ENC\s*=\s*["']([^"']+)["']/);
  if (!qEncMatch) return null;

  const cfg = extractJsObject(htmlString, 'CFG');
  const db = extractJsObject(htmlString, 'DB');

  // Decode the Q_ENC content
  let decodedText = decodeBase64Utf8(qEncMatch[1]);

  // Replace [IMG: filename] and [AUDIO: filename] with DB resources
  decodedText = decodedText.replace(/\[IMG:\s*(.*?)\]/g, (match, filename) => {
    const key = filename.trim();
    if (db[key]) {
      const src = typeof db[key] === 'string' ? db[key] : db[key].data || '';
      return `<img src="${src}" style="max-width:100%" />`;
    }
    return match;
  });

  decodedText = decodedText.replace(/\[AUDIO:\s*(.*?)\]/g, (match, filename) => {
    const key = filename.trim();
    if (db[key]) {
      const src = typeof db[key] === 'string' ? db[key] : db[key].data || '';
      return `<audio controls src="${src}"></audio>`;
    }
    return match;
  });

  // Extract the global answer key from the bottom of decodedText
  const { keyMap, cleanedText } = extractAnswerKeyFromText(decodedText);

  // Parse parts and questions from cleanedText
  const partRegex = /^\s*(?:##[BUI\/]+##|<[^>]+>|[#\-*]|\s)*(?:Part|Phần|Bài|Section)\s+\d+[:\.\)]?/i;
  const qRegex = /^\s*(?:##[BUI\/]+##|<[^>]+>|\s)*(?:Câu|Question|Bài|Tasks?)?\s*\d+[:\.\)]/i;
  const singleOptRegex = /^([A-Da-d])[\.\:\)\-]\s*(.*)$/;
  const singleLineOptsRegex = /^A[\.\:\)\-]\s*(.*?)\s+B[\.\:\)\-]\s*(.*?)\s+C[\.\:\)\-]\s*(.*?)\s+D[\.\:\)\-]\s*(.*)$/i;

  const lines = cleanedText.split('\n');
  const parts: ExamPart[] = [];
  let currentPart: ExamPart | null = null;
  let currentQ: Partial<Question> | null = null;
  let qCounter = 1;

  function commitQuestion() {
    if (!currentQ || !currentPart) return;

    // Fill in default options if none provided
    if (!currentQ.options || currentQ.options.length < 2) {
      currentQ.options = [
        { id: 'A', text: 'Phương án A' },
        { id: 'B', text: 'Phương án B' },
        { id: 'C', text: 'Phương án C' },
        { id: 'D', text: 'Phương án D' },
      ];
    }

    const qNum = currentQ.questionNumber || qCounter;
    const resolvedKey = keyMap[qNum.toString()] || currentQ.correctAnswer || 'A';

    const { options: finalizedOptions, isPronun: autoIsPronun } = autoUnderlinePronunciationOptions(
      currentQ.options,
      currentQ.text || '',
      currentPart.title || ''
    );

    const isPronun = autoIsPronun || currentQ.questionType === 'pronunciation';

    currentPart.questions.push({
      id: `q-${qNum}`,
      questionNumber: qNum,
      text: currentQ.text || `Câu ${qNum}`,
      options: finalizedOptions,
      correctAnswer: resolvedKey,
      explanation: currentQ.explanation || `Chọn đáp án ${resolvedKey} theo đề bài.`,
      imageUrl: currentQ.imageUrl || '',
      audioUrl: currentQ.audioUrl || '',
      isLocked: false,
      mixA: currentQ.mixA ?? true,
      questionType: isPronun ? 'pronunciation' : (currentQ.questionType || 'multiple_choice'),
    });

    qCounter++;
    currentQ = null;
  }

  function commitPart() {
    commitQuestion();
    if (currentPart && (currentPart.questions.length > 0 || currentPart.passageText || currentPart.audioUrl || currentPart.imageUrl)) {
      parts.push(currentPart);
    }
  }

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // New Part detected
    if (partRegex.test(line)) {
      commitPart();
      const lockQ = line.includes('[LOCK_Q]');
      const lockA = line.includes('[LOCK_A]');
      const cleanTitle = line.replace(/\[LOCK_[QA]\]/g, '').replace(/^[#\-\s]*/, '').trim();

      currentPart = {
        id: `part-${parts.length + 1}`,
        title: cleanTitle,
        description: '',
        passageText: '',
        audioScript: '',
        audioUrl: '',
        imageUrl: '',
        mixQ: !lockQ,
        mixA: !lockA,
        questions: [],
      };
      continue;
    }

    if (!currentPart) {
      currentPart = {
        id: 'part-1',
        title: 'Phần 1',
        description: '',
        passageText: '',
        audioScript: '',
        audioUrl: '',
        imageUrl: '',
        mixQ: true,
        mixA: true,
        questions: [],
      };
    }
    const activePart = currentPart;

    // Check for audio element in part
    const audioMatch = line.match(/<audio[^>]*src=["']([^"']+)["']/i);
    if (audioMatch) {
      activePart.audioUrl = audioMatch[1];
      continue;
    }

    // Check for image element in line
    const imgMatch = line.match(/<img[^>]*src=["']([^"']+)["']/i);
    let lineImg = '';
    if (imgMatch) {
      lineImg = imgMatch[1];
    }

    if (lineImg && !currentQ) {
      activePart.imageUrl = lineImg;
      continue;
    }

    // Question header detected
    if (qRegex.test(line)) {
      commitQuestion();
      const numMatch = line.match(/\d+/);
      const qNum = numMatch ? parseInt(numMatch[0]) : qCounter;
      let cleanQText = line.replace(/^\s*(?:##[BUI\/]+##|<[^>]+>|\s)*(?:Câu|Question|Bài|Tasks?)?\s*\d+[:\.\)]\s*/i, '');
      
      const isPronun = isPronunciationPart(activePart.title, cleanQText);

      currentQ = {
        id: `q-${qNum}`,
        questionNumber: qNum,
        text: cleanQText || `Câu ${qNum}`,
        options: [],
        correctAnswer: keyMap[qNum.toString()] || '',
        imageUrl: lineImg || '',
        isLocked: false,
        mixA: !line.includes('[LOCK_A]'),
        questionType: isPronun ? 'pronunciation' : (lineImg ? 'look_and_choose' : 'multiple_choice'),
      };
      continue;
    }

    // Single-line options: A. ... B. ... C. ... D. ...
    const singleLineMatch = line.match(singleLineOptsRegex);
    if (singleLineMatch && currentQ) {
      currentQ.options = [
        { id: 'A', text: singleLineMatch[1].trim() },
        { id: 'B', text: singleLineMatch[2].trim() },
        { id: 'C', text: singleLineMatch[3].trim() },
        { id: 'D', text: singleLineMatch[4].trim() },
      ];
      continue;
    }

    // Single option: A. ...
    const optMatch = line.match(singleOptRegex);
    if (optMatch && currentQ) {
      currentQ.options = currentQ.options || [];
      currentQ.options.push({
        id: optMatch[1].toUpperCase(),
        text: optMatch[2].trim(),
      });
      continue;
    }

    // Text content
    if (currentQ) {
      currentQ.text += (currentQ.text ? '\n' : '') + line;
      if (lineImg) currentQ.imageUrl = lineImg;
    } else {
      activePart.passageText += (activePart.passageText ? '\n' : '') + line;
    }
  }

  commitPart();

  return sanitizeExamPronunciation({
    id: cfg.id || 'exam-' + Date.now(),
    title: (cfg.school ? `${cfg.school} - ` : '') + (cfg.id || 'Bài Kiểm Tra'),
    school: cfg.school || 'Trường Tiểu Học',
    teacher: cfg.teacher || 'Thầy Trịnh Trọng Luật',
    timeLimit: cfg.time || 60,
    maxAttempts: cfg.maxTry || 10,
    minScoreViewAnswers: cfg.minScore !== undefined ? cfg.minScore : 5,
    passingScore: 5,
    isActive: true,
    mixQ: true,
    mixA: true,
    antiCheat: {
      blockRightClick: !!cfg.antiCheat,
      blockCopyPaste: !!cfg.antiCheat,
      maxViolations: 3,
      autoSubmitOnViolation: true,
      enforceFullscreen: false,
    },
    rewardConfig: {
      enabled: !!cfg.giftEnable,
      minScore: cfg.giftScore || 10,
      maxTimeMinutes: cfg.giftTime || 25,
      maxAttempt: cfg.giftTry || 1,
      successMessages: [cfg.giftMsg || 'Xuất sắc em nhận quà!'],
      defaultMessage: cfg.giftFailMsg || 'Cố gắng lần sau nhé!',
    },
    parts,
  });
}

/**
 * Robust Answer Key Extractor:
 * Finds answer key sections at the bottom or throughout text/html.
 * Handles:
 * - 1. A, 1.A, 1: A, 1-A, 1 | A, 1 | A !
 * - 1A 2B 3C
 * - "Câu 1: A", "Câu 1 - B"
 * - Returns clean keyMap: { [questionNum]: 'A' | 'B' | 'C' | 'D' }
 * - Cuts off answer key block from question body so it is not parsed as questions!
 */
/**
 * Checks if HTML or text contains a non-black color, highlight, or marked answer
 * (Cách 1: gv tô màu highlight hoặc đổi phông chữ sang màu khác màu đen đó là đáp án)
 */
export function hasHighlightOrCustomColor(html: string): boolean {
  if (!html) return false;

  // 1. Mark tag or highlight attribute
  if (/<mark\b/i.test(html) || /class=["'][^"']*highlight[^"']*["']/i.test(html)) {
    return true;
  }

  // 2. Background color highlight (yellow, cyan, red, green, etc.)
  if (/background(?:-color)?\s*:\s*(?!none|transparent|rgba?\(0,\s*0,\s*0)[^;"]+/i.test(html)) {
    return true;
  }

  // 3. Font color tag (e.g. <font color="red">, <font color="#ff0000">)
  const fontColorMatch = html.match(/<font\b[^>]*color=["']([^"']+)["']/i);
  if (fontColorMatch) {
    const c = fontColorMatch[1].trim().toLowerCase();
    if (c !== '#000' && c !== '#000000' && c !== 'black' && c !== 'rgb(0,0,0)') {
      return true;
    }
  }

  // 4. Style color property (Word / HTML color: #c00000, color: red, color: blue...)
  const styleColorMatch = html.match(/color\s*:\s*([^;"]+)/i);
  if (styleColorMatch) {
    const c = styleColorMatch[1].trim().toLowerCase();
    const isBlack =
      c === '#000' ||
      c === '#000000' ||
      c === 'black' ||
      c === '#0f172a' ||
      c === '#1e293b' ||
      c === 'rgb(0,0,0)' ||
      c === 'rgb(0, 0, 0)' ||
      c === 'windowtext' ||
      c === 'inherit';
    if (!isBlack) {
      return true;
    }
  }

  // 5. Explicit checkmarks or asterisks [x], (*), <u>A</u>
  if (/\[[xXvV]\]|\(\*\)|\*([A-Ea-e])\*/.test(html)) {
    return true;
  }

  return false;
}

/**
 * Robust Answer Key Extractor (Cách 2: nhận diện đáp án qua chữ đáp ở cuối đề):
 * Finds answer key sections at the bottom or throughout text/html.
 * Handles:
 * - 1. A   2. B   3. E
 * - 1.A 2.B 3.C
 * - 1 - A, 2 - B, 3 - E
 * - 1: A, 2: B, 3: E
 * - 1/ A, 2/ B
 * - 1 | A ! 2 | D !
 * - 1A 2B 3C
 * - "Câu 1: A", "Câu 1 - B"
 * - Dạng tự luận: "1. an", "2. went", "3. biggest"
 * - Returns clean keyMap: { [questionNum]: answerKeyOrWord }
 * - Cuts off answer key block from question body so it is not parsed as questions!
 */
export function extractAnswerKeyFromText(text: string): {
  keyMap: Record<string, string>;
  cleanedText: string;
} {
  const keyMap: Record<string, string> = {};

  // Header regex: looks for "BẢNG ĐÁP ÁN", "ĐÁP ÁN", "KEY", "HƯỚNG DẪN CHẤM", "ANSWER KEY", "PHẦN ĐÁP ÁN"
  // Negative lookahead avoids "chọn đáp án đúng", "khoanh tròn đáp án", etc.
  const headerRegex = /(?:^|\n|\<[^\>]+\>)(?:[-=_*]{2,}\s*)?(?:BẢNG\s+ĐÁP\s+ÁN|BẢNG\s+KEY|ĐÁP\s+ÁN(?!\s+(?:đúng|sai|chính\s*xác|thích\s*hợp|cho\s*câu|nào|dưới\s*đây))|HƯỚNG\s+DẪN\s+CHẤM|ANSWER\s+KEY|KẾT\s+QUẢ|KEY\s*[:\n]|PHẦN\s+ĐÁP\s+ÁN)\s*[:\n\r<]/i;

  const match = text.match(headerRegex);
  if (!match) {
    return { keyMap, cleanedText: text };
  }

  const keySection = text.substring(match.index! + match[0].length);
  const cleanedText = text.substring(0, match.index!);

  // Pattern 1: Standard multiple choice letters:
  // "1. A   2. B   3. E" or "1 - A" or "1: A" or "1.A" or "1 | A !" or "Câu 1: A"
  const letterRegex = /(?:^|[\s\n\.,;\|\>\<\/\(\[])(?:câu\s*)?(\d+)\s*(?:[\.\:\)\|\-\!\/]\s*|\s+)([A-Ea-e])(?=[\s\!\|\,\.\n\<\/\)\]]|$)/gi;
  let m;
  while ((m = letterRegex.exec(keySection)) !== null) {
    keyMap[m[1]] = m[2].toUpperCase();
  }

  // Pattern 2: Dạng tự luận điền từ (ví dụ: "1. an", "2. biggest", "3. went")
  // Lines or items formatted as: "1. an" or "Câu 1: an"
  const fillInRegex = /(?:^|\n|\<[^\>]+\>)(?:câu\s*)?(\d+)[\.\:\)\-]\s*([a-zA-Z0-9_\-\s]{1,40})(?=\n|\<|$|;)/gi;
  let f;
  while ((f = fillInRegex.exec(keySection)) !== null) {
    const qNum = f[1];
    const val = f[2].trim();
    // Only set if not already matched as single letter or if val is more specific word
    if (!keyMap[qNum] || (val.length > 1 && !/^[A-E]$/i.test(val))) {
      keyMap[qNum] = val;
    }
  }

  // Pattern 3: "1A 2B 3C 4D 5E"
  if (Object.keys(keyMap).length === 0) {
    const compactRegex = /\b(\d+)([A-Ea-e])\b/g;
    while ((m = compactRegex.exec(keySection)) !== null) {
      keyMap[m[1]] = m[2].toUpperCase();
    }
  }

  return { keyMap, cleanedText };
}

/**
 * Extracts answer keys from HTML tables (common in Word .docx documents)
 * Supports multi-row grids, column pairs, and fill-in word tables
 */
function extractKeysFromHtmlTables(doc: Document): Record<string, string> {
  const keyMap: Record<string, string> = {};
  const tables = Array.from(doc.querySelectorAll('table'));

  for (const table of tables) {
    const tableText = table.textContent || '';
    const prevText = table.previousElementSibling?.textContent || '';
    const isAnswerTable = /đáp án|answer|key|kết quả|hướng dẫn chấm/i.test(prevText + ' ' + tableText);

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) continue;

    // Check if this table has answer key data
    // Case 1: Row 1 = question numbers (1, 2, 3...), Row 2 = answers (A, B, E... or words)
    if (rows.length >= 2) {
      for (let r = 0; r < rows.length - 1; r++) {
        const rowNums = Array.from(rows[r].querySelectorAll('td, th')).map((c) => (c.textContent || '').trim());
        const rowAnswers = Array.from(rows[r + 1].querySelectorAll('td, th')).map((c) => (c.textContent || '').trim());

        if (rowNums.length >= 2 && rowNums.length === rowAnswers.length) {
          const allNums = rowNums.every((c) => /^(?:câu\s*)?\d+$/i.test(c));
          if (allNums) {
            rowNums.forEach((n, idx) => {
              const numOnly = n.replace(/\D/g, '');
              const ansVal = rowAnswers[idx].trim();
              if (ansVal) {
                keyMap[numOnly] = /^[A-Ea-e]$/.test(ansVal) ? ansVal.toUpperCase() : ansVal;
              }
            });
            table.remove(); // remove table so it's not processed as questions
            continue;
          }
        }
      }
    }

    // Case 2: Grid cells with "1. A" or "1. an" or paired cells [1, A, 2, B...]
    const cells = Array.from(table.querySelectorAll('td, th')).map((c) => (c.textContent || '').trim());
    let pairsFound = 0;
    const tempPairs: Record<string, string> = {};

    for (let i = 0; i < cells.length; i++) {
      // Single cell "1. A" or "1: A" or "1. an"
      const single = cells[i].match(/^(?:câu\s*)?(\d+)\s*[\.\:\)\|\-]\s*([a-zA-Z0-9_\-\s]{1,30})$/i);
      if (single) {
        const qNum = single[1];
        const val = single[2].trim();
        tempPairs[qNum] = /^[A-Ea-e]$/.test(val) ? val.toUpperCase() : val;
        pairsFound++;
      } else {
        // Paired cells: cell i is question number, cell i+1 is answer
        const numMatch = cells[i].match(/^(?:câu\s*)?(\d+)$/i);
        if (numMatch && i + 1 < cells.length) {
          const nextVal = cells[i + 1].trim();
          if (nextVal && nextVal.length <= 30) {
            tempPairs[numMatch[1]] = /^[A-Ea-e]$/.test(nextVal) ? nextVal.toUpperCase() : nextVal;
            pairsFound++;
            i++;
          }
        }
      }
    }

    // If this table had multiple question-answer pairs or was labeled as an answer table
    if (pairsFound >= 2 || (isAnswerTable && pairsFound > 0)) {
      Object.assign(keyMap, tempPairs);
      table.remove();
    }
  }

  return keyMap;
}

/**
 * Parses structured HTML content (from .html file or converted from Word .docx or pasted HTML)
 */
export function parseHtmlFileContent(htmlString: string): Partial<Exam> {
  // First, check if this is a standalone test app (e.g. index_369853d9.html)
  if (isStandaloneAppHtml(htmlString)) {
    const standaloneResult = parseStandaloneAppHtml(htmlString);
    if (standaloneResult && standaloneResult.parts && standaloneResult.parts.length > 0) {
      return standaloneResult;
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const title =
    doc.querySelector('title, h1, .exam-title, .school-name')?.textContent?.trim() || 'Đề Thi Mới Nhập';

  // Extract keys from any answer tables first
  const tableKeys = extractKeysFromHtmlTables(doc);

  // Extract answer keys from any trailing answer text
  const bodyText = doc.body.innerHTML || '';
  const { keyMap: textKeys, cleanedText } = extractAnswerKeyFromText(bodyText);

  // Merge table keys and text keys
  const masterKeyMap = { ...textKeys, ...tableKeys };

  // Parse remaining cleaned HTML elements
  const cleanDoc = parser.parseFromString(cleanedText, 'text/html');
  const rawElements = Array.from(cleanDoc.body.querySelectorAll('p, div, h1, h2, h3, h4, h5, li, tr'));

  const lines: { text: string; html: string; hasImage?: string; isColored?: string }[] = [];

  if (rawElements.length > 0) {
    rawElements.forEach((el) => {
      // Find embedded image if any
      const img = el.querySelector('img');
      const imgSrc = img?.getAttribute('src') || '';

      // Check if text or span is colored/highlighted (indicates correct key)
      let coloredText = '';
      const coloredSpan = el.querySelector('[style*="color"], [style*="background"], mark, font[color], strong');
      if (coloredSpan) {
        coloredText = coloredSpan.textContent?.trim() || '';
      }

      const text = el.textContent?.trim() || '';
      const innerHtml = el.innerHTML || '';
      if (text || imgSrc) {
        lines.push({ text, html: innerHtml, hasImage: imgSrc, isColored: coloredText });
      }
    });
  } else {
    // Fallback if no block elements
    const plain = cleanDoc.body.innerHTML || '';
    plain.split(/<br\s*[\/]?>/gi).forEach((chunk) => {
      lines.push({ text: chunk.replace(/<[^>]+>/g, '').trim(), html: chunk.trim() });
    });
  }

  return parseLinesIntoExam(lines, title, masterKeyMap);
}

/**
 * Parses raw plain text or clipboard text
 */
export function parseRawExamText(rawText: string, defaultTitle?: string): Partial<Exam> {
  // If text looks like HTML (from clipboard or file)
  if (/<[a-z][\s\S]*>/i.test(rawText)) {
    return parseHtmlFileContent(rawText);
  }

  // Extract answer key from text first
  const { keyMap, cleanedText } = extractAnswerKeyFromText(rawText);

  const rawLines = cleanedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lines = rawLines.map((l) => ({ text: l, html: l }));
  return parseLinesIntoExam(lines, defaultTitle || 'Đề Thi Mới Nhập', keyMap);
}

/**
 * Determines whether a part or question is EXPLICITLY a pronunciation task
 * ("bài tìm từ có cách phát âm khác / gạch chân phát âm").
 * Normal parts (Đại từ quan hệ, Ngữ pháp, Chia động từ, Reading, Vocabulary, Trọng âm...) MUST return false!
 */
export function isPronunciationPart(partTitle = '', extraText = ''): boolean {
  const combined = (partTitle + ' ' + extraText).toLowerCase();

  // Explicit non-pronunciation indicators (Grammar, relative pronouns, verb tense, etc.)
  if (
    combined.includes('đại từ') ||
    combined.includes('relative pronoun') ||
    combined.includes('chia động từ') ||
    combined.includes('tenses') ||
    combined.includes('ngữ pháp') ||
    combined.includes('grammar') ||
    combined.includes('đọc hiểu') ||
    combined.includes('reading') ||
    combined.includes('tự luận') ||
    combined.includes('fill in') ||
    combined.includes('điền từ')
  ) {
    // Unless the part explicitly is titled with "phát âm"
    if (!combined.includes('phát âm') && !combined.includes('pronunciation')) {
      return false;
    }
  }

  // Stress-only parts ("trọng âm" or "primary stress") without pronunciation keywords
  if (
    (combined.includes('trọng âm') || combined.includes('primary stress') || combined.includes('stress')) &&
    !combined.includes('phát âm') &&
    !combined.includes('pronunciation')
  ) {
    return false;
  }

  // Must explicitly have pronunciation keywords
  return (
    combined.includes('phát âm') ||
    combined.includes('pronunciation') ||
    (combined.includes('ngữ âm') && !combined.includes('ngữ pháp')) ||
    (combined.includes('underlined') && (combined.includes('pronounced') || combined.includes('differ') || combined.includes('sound')))
  );
}

/**
 * Sanitizes an entire Exam:
 * - Only parts that are truly pronunciation parts retain/gain questionType = 'pronunciation' and underlined options.
 * - All other parts (Đại từ quan hệ, Ngữ pháp, Chia động từ, Trọng âm, Reading...) have questionType forced to 'multiple_choice'
 *   and ANY accidental <u>...</u> tags stripped from option texts so they are 100% normal ("bình thường").
 */
export function sanitizeExamPronunciation(exam: Exam | Partial<Exam>): Exam {
  if (!exam || !exam.parts) return exam as Exam;

  const sanitizedParts: ExamPart[] = (exam.parts as ExamPart[]).map((part) => {
    const isPronunPart = isPronunciationPart(part.title, part.description);

    const sanitizedQuestions = part.questions.map((q) => {
      if (!isPronunPart) {
        // NON-PRONUNCIATION PART:
        // Strip any accidental <u> or ##U## tags from options
        const cleanOptions = (q.options || []).map((opt) => ({
          ...opt,
          text: opt.text
            .replace(/<\/?u\b[^>]*>/gi, '')
            .replace(/<\/?ins\b[^>]*>/gi, '')
            .replace(/##\/?U##/gi, ''),
        }));

        const cleanType =
          q.questionType === 'pronunciation'
            ? 'multiple_choice'
            : q.questionType || (cleanOptions.length === 0 ? 'fill_in' : 'multiple_choice');

        return {
          ...q,
          questionType: cleanType,
          options: cleanOptions,
        };
      } else {
        // PRONUNCIATION PART:
        // Ensure questionType is 'pronunciation'
        // Auto-underline target phoneme if missing
        const { options: pronunOptions } = autoUnderlinePronunciationOptions(
          q.options || [],
          q.text || '',
          part.title
        );

        return {
          ...q,
          questionType: 'pronunciation' as const,
          options: pronunOptions,
        };
      }
    });

    return {
      ...part,
      questions: sanitizedQuestions,
    };
  });

  return {
    ...(exam as Exam),
    parts: sanitizedParts,
  };
}

/**
 * Automatically detects and underlines target phonemes in pronunciation questions
 * (e.g. -ed in stopped/cleaned/laughed/watched, -s/-es, ch, th, ea, oo, etc.)
 * For normal parts, it strips any accidental underlines and returns isPronun = false!
 */
export function autoUnderlinePronunciationOptions(
  options: QuestionOption[],
  qText = '',
  partTitle = ''
): { options: QuestionOption[]; isPronun: boolean } {
  if (!options || options.length === 0) return { options, isPronun: false };

  const isExplicitPronun = isPronunciationPart(partTitle, qText);

  // CRITICAL RULE: If the Part or Question statement is NOT explicitly a pronunciation question,
  // DO NOT auto-underline anything! Strip any accidental <u> tags and mark isPronun = false!
  if (!isExplicitPronun) {
    const cleanedOptions = options.map((o) => ({
      ...o,
      text: o.text
        .replace(/<\/?u\b[^>]*>/gi, '')
        .replace(/<\/?ins\b[^>]*>/gi, '')
        .replace(/##\/?U##/gi, ''),
    }));
    return { options: cleanedOptions, isPronun: false };
  }

  // If already has underline tag in any option from teacher's original input, preserve as is
  const alreadyHasUnderline = options.some((o) =>
    /<u\b|##U##|_([^_]+)_/i.test(o.text)
  );

  if (alreadyHasUnderline) {
    return { options, isPronun: true };
  }

  // 1. Past tense -ed suffix: stopped, cleaned, laughed, watched
  const endsWithEdCount = options.filter((o) => /ed$/i.test(o.text.trim())).length;
  if (endsWithEdCount >= 3) {
    const updated = options.map((o) => ({
      ...o,
      text: o.text.replace(/(ed)$/i, '<u>$1</u>'),
    }));
    return { options: updated, isPronun: true };
  }

  // 2. Plural / 3rd person -s or -es suffix: books, stops, cleans, laughs, watches
  const endsWithSCount = options.filter((o) => /[se]s$/i.test(o.text.trim()) || /s$/i.test(o.text.trim())).length;
  if (endsWithSCount >= 3) {
    const updated = options.map((o) => {
      const trimmed = o.text.trim();
      if (/es$/i.test(trimmed)) {
        return { ...o, text: o.text.replace(/(es)$/i, '<u>$1</u>') };
      }
      return { ...o, text: o.text.replace(/(s)$/i, '<u>$1</u>') };
    });
    return { options: updated, isPronun: true };
  }

  // 3. Common digraphs & vowel clusters: ch, th, sh, ph, wh, gh, ea, oo, ou, ai, ay, ei, ey, oa, oi, oy, ee
  const clusters = ['ch', 'th', 'sh', 'ph', 'wh', 'gh', 'ea', 'oo', 'ou', 'ai', 'ay', 'ei', 'ey', 'oa', 'oi', 'oy', 'ee'];
  for (const cl of clusters) {
    const count = options.filter((o) => new RegExp(cl, 'i').test(o.text)).length;
    if (count >= 3) {
      const updated = options.map((o) => ({
        ...o,
        text: o.text.replace(new RegExp(`(${cl})`, 'i'), '<u>$1</u>'),
      }));
      return { options: updated, isPronun: true };
    }
  }

  return { options, isPronun: true };
}

/**
 * Unified line processor that matches questions with pre-extracted masterKeyMap
 */
function parseLinesIntoExam(
  lines: { text: string; html: string; hasImage?: string; isColored?: string }[],
  examTitle: string,
  masterKeyMap: Record<string, string> = {}
): Partial<Exam> {
  const parts: ExamPart[] = [];
  let currentPart: ExamPart = {
    id: 'part-1',
    title: 'Phần 1: Trắc Nghiệm',
    description: '',
    passageText: '',
    audioScript: '',
    mixQ: true,
    mixA: true,
    questions: [],
  };

  let currentQuestion: Partial<Question> | null = null;
  let questionCounter = 1;

  function commitCurrentQuestion() {
    if (currentQuestion && (currentQuestion.text || currentQuestion.imageUrl)) {
      const qNum = currentQuestion.questionNumber || questionCounter;
      const textLower = (currentQuestion.text || '').toLowerCase();
      const partLower = currentPart.title.toLowerCase();

      // Check if this is a fill-in-the-blank / tự luận question:
      // - Text has blanks (e.g. _____, [...], (...))
      // - Part title indicates "điền từ", "tự luận", "fill in", "complete"
      // - No options were found, or key in masterKeyMap is a multi-letter word
      const hasBlanks = /_{3,}|\[\s*\]|\(\s*\.\.\.\s*\)|\.{3,}/.test(currentQuestion.text || '');
      const isPartFillIn = /điền\s*từ|tự\s*luận|fill|complete|gap|write/i.test(partLower);
      const isWordAnswer = masterKeyMap[qNum.toString()] && masterKeyMap[qNum.toString()].length > 1 && !/^[A-E]$/i.test(masterKeyMap[qNum.toString()]);
      const hasNoOptions = !currentQuestion.options || currentQuestion.options.length === 0;

      const isFillIn = (hasBlanks && hasNoOptions) || (isPartFillIn && hasNoOptions) || (isWordAnswer && hasNoOptions);

      if (isFillIn) {
        // Tự luận (Fill in the blank): no dummy options!
        const fillKey = masterKeyMap[qNum.toString()] || currentQuestion.correctAnswer || '';
        currentPart.questions.push({
          id: `q-${qNum}`,
          questionNumber: qNum,
          text: currentQuestion.text || `Câu ${qNum}`,
          options: [],
          correctAnswer: fillKey,
          acceptableAnswers: fillKey ? [fillKey] : [],
          explanation: currentQuestion.explanation || (fillKey ? `Từ cần điền chính xác là: "${fillKey}".` : ''),
          imageUrl: currentQuestion.imageUrl || '',
          isLocked: false,
          mixA: false,
          questionType: 'fill_in',
        });
        questionCounter = Math.max(questionCounter + 1, qNum + 1);
        currentQuestion = null;
        return;
      }

      // Multiple choice questions:
      // If fewer than 2 options were provided, add standard placeholders
      if (!currentQuestion.options || currentQuestion.options.length < 2) {
        currentQuestion.options = [
          { id: 'A', text: 'Phương án A' },
          { id: 'B', text: 'Phương án B' },
          { id: 'C', text: 'Phương án C' },
          { id: 'D', text: 'Phương án D' },
        ];
      }

      // Answer Priority:
      // 1) Master Key Map from bottom table/grid
      // 2) Colored / Highlighted Option (Cách 1)
      // 3) Inline "Đáp án: X"
      // 4) Default to A
      let finalKey = masterKeyMap[qNum.toString()] || currentQuestion.correctAnswer || '';

      // Check if any option text has highlight or custom color (Cách 1)
      if (!finalKey) {
        for (const opt of currentQuestion.options) {
          if (hasHighlightOrCustomColor(opt.text)) {
            finalKey = opt.id;
            break;
          }
        }
      }

      if (!finalKey) {
        finalKey = 'A';
      }

      // Automatically underline phonetic parts (e.g. -ed, -s/-es, ch, th, etc.)
      const { options: finalizedOptions, isPronun: autoIsPronun } = autoUnderlinePronunciationOptions(
        currentQuestion.options,
        currentQuestion.text,
        currentPart.title
      );

      const isPronun = autoIsPronun;

      currentPart.questions.push({
        id: `q-${qNum}`,
        questionNumber: qNum,
        text: currentQuestion.text || `Câu ${qNum}`,
        options: finalizedOptions,
        correctAnswer: finalKey,
        explanation: currentQuestion.explanation || `Chọn đáp án ${finalKey} theo đề bài.`,
        imageUrl: currentQuestion.imageUrl || '',
        isLocked: false,
        mixA: true,
        questionType: isPronun
          ? 'pronunciation'
          : currentQuestion.imageUrl
          ? 'look_and_choose'
          : 'multiple_choice',
      });

      questionCounter = Math.max(questionCounter + 1, qNum + 1);
      currentQuestion = null;
    }
  }

  function commitCurrentPart() {
    commitCurrentQuestion();
    if (currentPart.questions.length > 0 || currentPart.audioScript || currentPart.passageText || currentPart.audioUrl || currentPart.imageUrl) {
      parts.push(currentPart);
    }
  }

  // Regex patterns
  const partHeaderRegex = /^(part\s*\d+|phần\s*\d+|bài\s*\d+|section\s*\d+)/i;
  const audioScriptRegex = /^(audio\s*script|kịch\s*bản\s*nghe|listening\s*script)[\:\.\s]*/i;

  // Single-line multi-option regex: "23. A. my B. fly C. sky D. study" or "A. ... B. ... C. ... D. ..."
  const singleLineQuestionAndOptionsRegex = /^(\d+[\.\:\)]|\bCâu\s*\d+[\.\:\)])?\s*(.*?)\s+A[\.\:\)\-]\s*(.*?)\s+B[\.\:\)\-]\s*(.*?)\s+C[\.\:\)\-]\s*(.*?)\s+D[\.\:\)\-]\s*(.*)$/i;
  const singleLineOnlyOptionsRegex = /^A[\.\:\)\-]\s*(.*?)\s+B[\.\:\)\-]\s*(.*?)\s+C[\.\:\)\-]\s*(.*?)\s+D[\.\:\)\-]\s*(.*)$/i;

  const questionHeaderRegex = /^(\d+[\.\:\)]|\bCâu\s*\d+[\.\:\)]|\bQuestion\s*\d+[\.\:\)])\s*(.*)$/i;
  const singleOptionRegex = /^([A-D])[\.\:\)\-]\s*(.*)$/i;
  const keyRegex = /^(đáp\s*án|key|đ\/a|answer)[\:\s]+([A-D])/i;
  const explanationRegex = /^(lời\s*giải|giải\s*thích|explanation|hướng\s*dẫn)[\:\s]+(.*)$/i;

  let isInAudioScriptMode = false;

  for (let i = 0; i < lines.length; i++) {
    const item = lines[i];
    const lineText = item.text.trim();
    const lineHtml = item.html.trim();

    if (!lineText && !item.hasImage) continue;

    // 1. Detect Audio Script header - store in audioScript, NOT passageText!
    if (audioScriptRegex.test(lineText)) {
      isInAudioScriptMode = true;
      const scriptBody = lineText.replace(audioScriptRegex, '').trim();
      currentPart.audioScript = (currentPart.audioScript ? currentPart.audioScript + '\n' : '') + scriptBody;
      continue;
    }

    // 2. Detect Part header
    if (partHeaderRegex.test(lineText)) {
      commitCurrentPart();
      isInAudioScriptMode = false;
      const isListening = /listen|nghe/i.test(lineText);
      currentPart = {
        id: `part-${parts.length + 1}`,
        title: lineText,
        description: isListening ? 'Nghe đoạn băng và chọn đáp án chính xác.' : '',
        passageText: '',
        audioScript: '',
        audioUrl: '',
        imageUrl: item.hasImage || '',
        mixQ: true,
        mixA: true,
        questions: [],
      };
      continue;
    }

    // If currently accumulating audio script lines (before questions start)
    if (isInAudioScriptMode && !questionHeaderRegex.test(lineText) && !singleLineQuestionAndOptionsRegex.test(lineText)) {
      currentPart.audioScript = (currentPart.audioScript ? currentPart.audioScript + '\n' : '') + lineText;
      continue;
    }

    // 3. Detect Single-Line format: "23. A. my B. fly C. sky D. study" (VERY COMMON IN PRONUNCIATION TESTS)
    const multiMatch = lineHtml.match(singleLineQuestionAndOptionsRegex);
    if (multiMatch) {
      commitCurrentQuestion();
      isInAudioScriptMode = false;

      const qNumMatch = (multiMatch[1] || '').match(/\d+/);
      const qNum = qNumMatch ? parseInt(qNumMatch[0]) : questionCounter;
      const qText = multiMatch[2].trim() || `Câu ${qNum}`;
      const optA = multiMatch[3].trim();
      const optB = multiMatch[4].trim();
      const optC = multiMatch[5].trim();
      const optD = multiMatch[6].trim();

      // Check if masterKeyMap has this answer (Cách 2) or highlighted/colored option (Cách 1)
      let detectedKey = masterKeyMap[qNum.toString()] || '';
      if (!detectedKey) {
        if (hasHighlightOrCustomColor(optB)) detectedKey = 'B';
        else if (hasHighlightOrCustomColor(optC)) detectedKey = 'C';
        else if (hasHighlightOrCustomColor(optD)) detectedKey = 'D';
        else if (hasHighlightOrCustomColor(optA)) detectedKey = 'A';
        else detectedKey = 'A';
      }

      const rawOps = [
        { id: 'A', text: optA },
        { id: 'B', text: optB },
        { id: 'C', text: optC },
        { id: 'D', text: optD },
      ];

      const { options: finalizedOptions, isPronun: autoIsPronun } = autoUnderlinePronunciationOptions(
        rawOps,
        qText,
        currentPart.title
      );

      const isPronun = autoIsPronun;

      currentPart.questions.push({
        id: `q-${qNum}`,
        questionNumber: qNum,
        text: qText || `Câu ${qNum}`,
        options: finalizedOptions,
        correctAnswer: detectedKey,
        explanation: `Chọn đáp án ${detectedKey} theo đề bài.`,
        imageUrl: item.hasImage || '',
        isLocked: false,
        mixA: true,
        questionType: isPronun ? 'pronunciation' : 'multiple_choice',
      });

      questionCounter = Math.max(questionCounter + 1, qNum + 1);
    }

    // 4. Detect Single-Line options only: "A. book B. pen C. bag D. bed" for current question
    const optOnlyMatch = lineHtml.match(singleLineOnlyOptionsRegex);
    if (optOnlyMatch && currentQuestion) {
      currentQuestion.options = [
        { id: 'A', text: optOnlyMatch[1].trim() },
        { id: 'B', text: optOnlyMatch[2].trim() },
        { id: 'C', text: optOnlyMatch[3].trim() },
        { id: 'D', text: optOnlyMatch[4].trim() },
      ];
      continue;
    }

    // 5. Detect regular Question header: "Câu 1: ...", "1. ..."
    const qMatch = lineText.match(questionHeaderRegex);
    if (qMatch) {
      commitCurrentQuestion();
      isInAudioScriptMode = false;
      const numMatch = qMatch[1].match(/\d+/);
      const qNum = numMatch ? parseInt(numMatch[0]) : questionCounter;
      const qText = qMatch[2].trim() || `Câu ${qNum}`;
      
      currentQuestion = {
        id: `q-${qNum}`,
        questionNumber: qNum,
        text: qText,
        options: [],
        correctAnswer: masterKeyMap[qNum.toString()] || '',
        explanation: '',
        imageUrl: item.hasImage || '',
      };
      continue;
    }

    // 6. Detect Single Option: "A. ...", "B. ..."
    const singleOptMatch = lineHtml.match(singleOptionRegex);
    if (singleOptMatch && currentQuestion) {
      const optLetter = singleOptMatch[1].toUpperCase();
      const optContent = singleOptMatch[2].trim();
      if (!currentQuestion.options) currentQuestion.options = [];

      // Check if highlighted or colored (Cách 1)
      if (hasHighlightOrCustomColor(lineHtml)) {
        currentQuestion.correctAnswer = optLetter;
      }

      currentQuestion.options.push({
        id: optLetter,
        text: optContent,
        imageUrl: item.hasImage || undefined,
      });
      continue;
    }

    // 7. Detect Key
    const keyMatch = lineText.match(keyRegex);
    if (keyMatch && currentQuestion) {
      currentQuestion.correctAnswer = keyMatch[2].toUpperCase();
      continue;
    }

    // 8. Detect Explanation
    const expMatch = lineText.match(explanationRegex);
    if (expMatch && currentQuestion) {
      currentQuestion.explanation = expMatch[2].trim();
      continue;
    }

    // 9. If image is found
    if (item.hasImage) {
      if (currentQuestion) {
        currentQuestion.imageUrl = item.hasImage;
      } else {
        currentPart.imageUrl = item.hasImage;
      }
    }

    // 10. Continuation line
    if (currentQuestion) {
      if (currentQuestion.options && currentQuestion.options.length > 0) {
        const lastOpt = currentQuestion.options[currentQuestion.options.length - 1];
        lastOpt.text += ' ' + lineHtml;
      } else {
        currentQuestion.text += ' ' + lineHtml;
      }
    } else {
      if (!isInAudioScriptMode && lineText.length > 20) {
        currentPart.passageText = (currentPart.passageText ? currentPart.passageText + '\n\n' : '') + lineText;
      }
    }
  }

  commitCurrentPart();

  if (parts.length === 0) {
    parts.push({
      id: 'part-1',
      title: 'Phần 1: Trắc Nghiệm',
      description: '',
      passageText: '',
      audioScript: '',
      mixQ: true,
      mixA: true,
      questions: [],
    });
  }

  return sanitizeExamPronunciation({
    title: examTitle || 'Đề Thi Mới Nhập',
    parts,
  });
}

/**
 * Exports an Exam object into a standalone offline self-grading HTML file
 * compatible with the teacher's original test app format.
 */
export function exportToStandaloneHtml(exam: Exam): string {
  // Build raw text representation of parts and questions
  let rawContent = '';
  const db: Record<string, string> = {};

  exam.parts.forEach((part, pIdx) => {
    let partHeader = `${part.title}`;
    if (!part.mixQ) partHeader += ' [LOCK_Q]';
    if (!part.mixA) partHeader += ' [LOCK_A]';
    rawContent += `${partHeader}\n`;

    if (part.audioUrl) {
      rawContent += `<audio controls src="${part.audioUrl}"></audio>\n`;
    }
    if (part.imageUrl) {
      rawContent += `<img src="${part.imageUrl}" style="max-width:100%" />\n`;
    }
    if (part.passageText) {
      rawContent += `${part.passageText}\n\n`;
    }

    part.questions.forEach((q) => {
      rawContent += `Câu ${q.questionNumber}: ${q.text}\n`;
      if (q.imageUrl) {
        rawContent += `<img src="${q.imageUrl}" style="max-width:100%" />\n`;
      }
      q.options.forEach((opt) => {
        rawContent += `${opt.id}. ${opt.text}\n`;
      });
      rawContent += '\n';
    });
    rawContent += '\n';
  });

  // Append answer key table at the bottom
  rawContent += '-----------------\nBẢNG ĐÁP ÁN:\n';
  exam.parts.forEach((part) => {
    part.questions.forEach((q) => {
      rawContent += `${q.questionNumber} | ${q.correctAnswer || 'A'} !\n`;
    });
  });

  const encodedQ = btoa(unescape(encodeURIComponent(rawContent)));

  const cfg = {
    school: exam.school || 'Trường Học',
    teacher: exam.teacher || 'Giáo viên',
    id: exam.id,
    time: exam.timeLimit || 45,
    maxTry: exam.maxAttempts || 5,
    minScore: exam.minScoreViewAnswers || 5,
    giftEnable: exam.rewardConfig?.enabled || false,
    giftScore: exam.rewardConfig?.minScore || 10,
    giftTime: exam.rewardConfig?.maxTimeMinutes || 25,
    giftTry: exam.rewardConfig?.maxAttempt || 1,
    giftMsg: exam.rewardConfig?.defaultMessage || 'Chúc mừng em đã hoàn thành bài thi!',
    giftFailMsg: 'Cố gắng lần sau nhé!',
    antiCheat: exam.antiCheat?.blockCopyPaste || false,
  };

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${exam.title || 'Bài Kiểm Tra Trực Tuyến'}</title>
  <style>
    :root{--p:#4f46e5;--bg:#0f172a;--card:#1e293b;--text:#f8fafc;--ok:#10b981;--bad:#ef4444;--ok-bg:rgba(16,185,129,0.15);--bad-bg:rgba(239,68,68,0.15)}
    body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);margin:0;padding:20px;line-height:1.6}
    .wrap{max-width:850px;margin:0 auto}
    .brand-box{text-align:center;margin-bottom:24px;background:var(--card);padding:20px;border-radius:16px;border:1px solid #334155}
    .school-name{font-size:1.4rem;font-weight:bold;color:#818cf8;text-transform:uppercase}
    .test-name{font-size:1.1rem;color:#94a3b8;margin-top:4px}
    .scr{display:none;background:var(--card);padding:24px;border-radius:16px;border:1px solid #334155;margin-bottom:24px}
    .scr.active{display:block}
    input[type=text]{width:100%;padding:14px;margin:10px 0;background:#0f172a;border:1px solid #475569;border-radius:10px;color:white;font-size:1rem;box-sizing:border-box}
    button{width:100%;padding:14px;background:var(--p);color:#fff;border:none;border-radius:10px;font-weight:bold;cursor:pointer;margin-top:12px;font-size:1rem;transition:all 0.2s}
    button:hover{filter:brightness(1.1)}
    button.sub{background:#475569}
    .sec{border:1px solid #334155;border-radius:12px;margin-bottom:24px;overflow:hidden;background:#1e293b}
    .sec-h{background:linear-gradient(135deg,#3730a3,#4f46e5);color:#fff;padding:14px 18px;font-weight:bold;font-size:1.1rem}
    .sec-b{padding:18px}
    .q-row{margin-bottom:24px;border-bottom:1px solid #334155;padding-bottom:18px}
    .q-tit{font-size:1.05rem;font-weight:bold;color:#e2e8f0;margin-bottom:12px;display:block}
    .opts{display:grid;grid-template-columns:1fr;gap:10px}
    @media(min-width:640px){.opts{grid-template-columns:1fr 1fr}}
    .lbl{padding:12px 16px;border:1px solid #475569;border-radius:10px;cursor:pointer;display:flex;align-items:center;background:#0f172a;transition:all 0.15s;font-size:0.95rem}
    .lbl:hover{border-color:#818cf8;background:#1e293b}
    .lbl input{margin-right:10px;transform:scale(1.2)}
    .lbl.correct{background-color:var(--ok-bg);border:2px solid var(--ok);color:#34d399}
    .lbl.wrong{background-color:var(--bad-bg);border:2px solid var(--bad);color:#f87171}
    .timer-badge{position:fixed;top:16px;right:16px;background:#4f46e5;color:white;padding:8px 16px;border-radius:999px;font-weight:bold;font-family:monospace;font-size:1.1rem;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:99}
    .pronun-u{font-weight:900;text-decoration:underline;text-decoration-thickness:3px;color:#38bdf8}
    img{max-width:100%;border-radius:8px;margin:10px 0}
    audio{width:100%;margin:10px 0}
  </style>
</head>
<body>
<div class="wrap">
  <div id="timer-box" class="timer-badge" style="display:none">00:00</div>
  <div class="brand-box">
    <div class="school-name">${cfg.school}</div>
    <div class="test-name">${cfg.id} - GV: ${cfg.teacher}</div>
  </div>

  <div id="scr-login" class="scr active">
    <h3 style="margin-top:0">Thông Tin Thí Sinh</h3>
    <input type="text" id="sname" placeholder="Họ và tên học sinh..." required>
    <input type="text" id="sclass" placeholder="Lớp học (Ví dụ: 3A1)..." required>
    <button onclick="app.start()">VÀO LÀM BÀI THI</button>
  </div>

  <div id="scr-test" class="scr">
    <div id="test-body"></div>
    <button id="btn-submit" onclick="app.submit()">NỘP BÀI THI</button>
  </div>

  <div id="scr-res" class="scr" style="text-align:center">
    <h2>KẾT QUẢ BÀI THI</h2>
    <div style="font-size:4rem;font-weight:900;color:#38bdf8;margin:10px 0" id="final-score">0.0</div>
    <p id="final-detail" style="font-size:1.1rem;color:#94a3b8"></p>
    <button onclick="app.review()">XEM LẠI ĐÁP ÁN & LỜI GIẢI</button>
    <button class="sub" onclick="location.reload()">LÀM LẠI</button>
  </div>
</div>

<script>
const Q_ENC = "${encodedQ}";
const DB = ${JSON.stringify(db)};
const CFG = ${JSON.stringify(cfg)};

function decodeRaw(enc) {
  try { return decodeURIComponent(escape(atob(enc))); } catch(e) { return atob(enc); }
}

const app = {
  data: [],
  answers: {},
  timeLeft: (CFG.time || 45) * 60,
  timerInterval: null,

  init: function() {
    this.parseContent();
  },

  parseContent: function() {
    let raw = decodeRaw(Q_ENC);
    let keyMap = {};
    let keyMatch = raw.match(/(?:----------|===|_ _ _)?\\s*(?:BẢNG\\s+ĐÁP\\s+ÁN|ĐÁP\\s+ÁN|KEY|ANSWERS)[:\\s]([\\s\\S]*)$/i);
    if (keyMatch) {
      let keyStr = keyMatch[1];
      raw = raw.substring(0, keyMatch.index);
      let reg = /(\\d+)\\s*\\|\\s*([A-Za-z])/g;
      let m;
      while ((m = reg.exec(keyStr)) !== null) {
        keyMap[m[1]] = m[2].toUpperCase();
      }
    }

    let lines = raw.split('\\n');
    let parts = [], curPart = null, curQ = null;
    let partRegex = /^(?:Part|Phần|Bài|Section)\\s+\\d+/i;
    let qRegex = /^(?:Câu|Question|Bài)?\\s*(\\d+)[:\\.]/i;

    lines.forEach(l => {
      let line = l.trim();
      if (!line) return;
      if (partRegex.test(line)) {
        if (curQ && curPart) curPart.qs.push(curQ);
        curQ = null;
        if (curPart) parts.push(curPart);
        curPart = { title: line, media: '', qs: [] };
        return;
      }
      if (!curPart) curPart = { title: "Phần 1", media: '', qs: [] };

      if (line.startsWith('<audio') || line.startsWith('<img')) {
        curPart.media += line;
        return;
      }

      let qm = line.match(qRegex);
      if (qm) {
        if (curQ) curPart.qs.push(curQ);
        let qNum = qm[1];
        curQ = { num: qNum, text: line.replace(qRegex, '').trim(), ops: [], key: keyMap[qNum] || 'A' };
        return;
      }

      let optM = line.match(/^([A-D])[\\.\\:\\)-]\\s*(.*)$/);
      if (optM && curQ) {
        curQ.ops.push({ id: optM[1].toUpperCase(), text: optM[2].trim() });
        return;
      }
    });
    if (curQ && curPart) curPart.qs.push(curQ);
    if (curPart) parts.push(curPart);
    this.data = parts;
  },

  start: function() {
    let name = document.getElementById('sname').value.trim();
    let cls = document.getElementById('sclass').value.trim();
    if (!name || !cls) { alert('Vui lòng nhập họ tên và lớp!'); return; }
    document.getElementById('scr-login').classList.remove('active');
    document.getElementById('scr-test').classList.add('active');
    document.getElementById('timer-box').style.display = 'block';
    this.renderTest();
    this.startTimer();
  },

  renderTest: function() {
    let html = '';
    this.data.forEach((p, pi) => {
      html += '<div class="sec"><div class="sec-h">' + p.title + '</div><div class="sec-b">';
      if (p.media) html += '<div style="margin-bottom:15px">' + p.media + '</div>';
      p.qs.forEach((q, qi) => {
        let isPronun = q.text.toLowerCase().includes('phát âm') || q.ops.some(o => o.text.includes('<u'));
        let qClass = isPronun ? 'q-tit pronun-h3' : 'q-tit';
        html += '<div class="q-row"><span class="' + qClass + '"><b>Câu ' + q.num + ':</b> ' + q.text + '</span>';
        
        if (!q.ops || q.ops.length === 0) {
          html += '<div style="margin:10px 0"><input type="text" id="ans_' + q.num + '" placeholder="Gõ câu trả lời vào đây..." style="padding:10px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#fff;width:100%;box-sizing:border-box" oninput="app.answers[' + q.num + ']=this.value.trim()" /></div>';
        } else {
          html += '<div class="opts">';
          q.ops.forEach(opt => {
            let optText = opt.text.replace(/<u>/g, '<span class="pronun-u">').replace(/<\\/u>/g, '</span>');
            html += '<label class="lbl" id="lbl_' + q.num + '_' + opt.id + '"><input type="radio" name="q_' + q.num + '" value="' + opt.id + '" onchange="app.answers[' + q.num + ']=\\'' + opt.id + '\\'"> <b>' + opt.id + '.</b>&nbsp;' + optText + '</label>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    });
    document.getElementById('test-body').innerHTML = html;
  },

  startTimer: function() {
    let tBox = document.getElementById('timer-box');
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      let m = Math.floor(this.timeLeft / 60);
      let s = this.timeLeft % 60;
      tBox.innerText = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        alert('Hết giờ làm bài!');
        this.submit();
      }
    }, 1000);
  },

  submit: function() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    document.getElementById('timer-box').style.display = 'none';

    let total = 0, correct = 0;
    this.data.forEach(p => {
      p.qs.forEach(q => {
        total++;
        let isFillIn = !q.ops || q.ops.length === 0;
        let given = (this.answers[q.num] || '').trim().toLowerCase();
        let target = (q.key || '').trim().toLowerCase();
        if (isFillIn) {
          if (given !== '' && given === target) correct++;
        } else {
          if (this.answers[q.num] === q.key) correct++;
        }
      });
    });

    let score = total > 0 ? ((correct / total) * 10).toFixed(1) : 0;
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-detail').innerText = 'Đúng: ' + correct + '/' + total + ' câu';
    document.getElementById('scr-test').classList.remove('active');
    document.getElementById('scr-res').classList.add('active');
  },

  review: function() {
    this.data.forEach(p => {
      p.qs.forEach(q => {
        let chosen = this.answers[q.num];
        let correct = q.key;
        if (chosen) {
          let chosenEl = document.getElementById('lbl_' + q.num + '_' + chosen);
          if (chosen === correct) {
            chosenEl?.classList.add('correct');
          } else {
            chosenEl?.classList.add('wrong');
            let correctEl = document.getElementById('lbl_' + q.num + '_' + correct);
            correctEl?.classList.add('correct');
          }
        } else {
          let correctEl = document.getElementById('lbl_' + q.num + '_' + correct);
          correctEl?.classList.add('correct');
        }
      });
    });
    document.getElementById('scr-res').classList.remove('active');
    document.getElementById('scr-test').classList.add('active');
    document.getElementById('btn-submit').style.display = 'none';
  }
};

window.onload = function() { app.init(); };
</script>
</body>
</html>`;
}
