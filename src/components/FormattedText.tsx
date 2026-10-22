import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
  isPronunciation?: boolean;
}

/**
 * Decodes and renders formatted text:
 * - Underlined text <u>...</u> or ##U##...##/U##
 * - Bold text <b>...</b>, <strong>...</strong>, ##B##...##/B##
 * - Italic text <i>...</i>, <em>...</em>, ##I##...##/I##
 * - Highlighted text <mark>...</mark>, color/background spans
 * For pronunciation questions, renders underlined letters with prominent, large h3-style typography.
 */
export const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  className = '',
  isPronunciation = false,
}) => {
  if (!text) return null;

  // Pre-process custom markup tags like ##U##, ##B##, ##I##
  let processed = text
    .replace(/##U##/gi, '<u>')
    .replace(/##\/U##/gi, '</u>')
    .replace(/##B##/gi, '<b>')
    .replace(/##\/B##/gi, '</b>')
    .replace(/##I##/gi, '<i>')
    .replace(/##\/I##/gi, '</i>');

  // Check if string contains markdown underline _word_ or _letter_
  if (!/<[a-z][\s\S]*>/i.test(processed) && /_([^_]+)_/.test(processed)) {
    processed = processed.replace(/_([^_]+)_/g, '<u>$1</u>');
  }

  // Check if string contains HTML tags
  const containsHtml = /<[a-z][\s\S]*>/i.test(processed);

  if (!containsHtml) {
    return <span className={className}>{processed}</span>;
  }

  // Sanitize and enhance <u> tags with proper prominent CSS classes for pronunciation
  const enhancedHtml = processed
    .replace(
      /<u\b[^>]*>(.*?)<\/u>/gi,
      `<u class="font-extrabold underline decoration-2 decoration-amber-400 text-amber-300 px-0.5 inline-block ${
        isPronunciation ? 'text-lg sm:text-xl font-black text-amber-300 decoration-amber-400 decoration-[3px] underline-offset-4' : ''
      }">$1</u>`
    )
    .replace(/<b\b[^>]*>(.*?)<\/b>/gi, '<strong class="font-bold text-white">$1</strong>')
    .replace(/<strong\b[^>]*>(.*?)<\/strong>/gi, '<strong class="font-bold text-white">$1</strong>')
    .replace(
      /<mark\b[^>]*>(.*?)<\/mark>/gi,
      '<span class="bg-amber-500/30 text-amber-200 px-1 py-0.5 rounded font-semibold">$1</span>'
    );

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: enhancedHtml }}
    />
  );
};
