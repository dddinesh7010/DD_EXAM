/**
 * Utility to clean PDF text or question strings by stripping repetitive prefixes
 * like 'In the scope of JTO LICE 2022', 'Regarding JTO LICE 2022', etc.
 */

/**
 * Strips phrases like 'In the scope of JTO LICE 2022' or similar prefixes from question strings.
 * Ensures only the core question text remains.
 *
 * @param text The input question string or raw text content
 * @returns The sanitized string with the core academic question
 */
export function cleanQuestionText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();
  let prev = '';

  // Multi-pass to handle nested or consecutive prefixes
  do {
    prev = cleaned;

    // 1. Strip English prefixes (e.g., "In the scope of JTO LICE 2022,", "Regarding JTO LICE 2022,")
    cleaned = cleaned.replace(/^(?:In the scope of|Regarding|With respect to|Concerning|In relation to|In connection with|As per the syllabus of|As per|According to|Based on|In the context of|From the|In the|According to the)\s+(?:JTO\s+LICE\s*(?:20\d{2})?|syllabus|PDF|document|material|text)?\s*,?\s*/gi, '').trim();
    cleaned = cleaned.replace(/^(?:JTO\s+LICE\s*(?:20\d{2})?)\s*[:,-]?\s*/gi, '').trim();
    cleaned = cleaned.replace(/^(?:Question|Q|Qn)\s*\d*\s*[:.-]?\s*/gi, '').trim();
    cleaned = cleaned.replace(/^\d+\s*[\u0029\u002E.-]\s*/, '').trim(); // e.g. "1.", "1)", "1-"

    // 2. Strip Tamil prefixes (e.g., "JTO LICE 2022 தொடர்பாக,", "JTO LICE 2022 இன் வரம்பில்,")
    cleaned = cleaned.replace(/^(?:JTO\s+LICE\s*(?:20\d{2})?\s*(?:இன்|ஐப்|இலிருந்தான|தொடர்பாக|சார்பாக|நோக்கில்|வரம்பில்)?\s*(?:நோக்கில்|வரம்பில்|பொறுத்தவரை|தொடர்பாக|நோக்கத்தில்|என்பதன்|அடிப்படையில்|இன்படி|படி)?,?\s*)/gi, '').trim();
    cleaned = cleaned.replace(/^(?:பாடத்திட்டத்தின்படி|ஆவணத்தின்படி|பாடத்திட்டத்தின் அடிப்படையில்|ஆவணத்தின் அடிப்படையில்|பாடத்திட்டத்திலிருந்து|ஆவணத்திலிருந்து)\s*,?\s*/gi, '').trim();
    cleaned = cleaned.replace(/^(?:கேள்வி|வினா)\s*\d*\s*[:.-]?\s*/gi, '').trim();
    cleaned = cleaned.replace(/^\d+\s*[\u0029\u002E.-]\s*/, '').trim(); // duplicate check for numbers after Tamil label removal

  } while (cleaned !== prev);

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Sanitizes raw PDF/document text by cleaning known repetitive lines or headers
 * before sending to the Gemini API.
 *
 * @param rawText The raw input text from a PDF
 * @returns Sanitized raw text
 */
export function cleanRawPdfText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // Split into lines to clean line-by-line headers/prefixes
  const lines = rawText.split('\n');
  const cleanedLines = lines.map(line => {
    const cleaned = line.trim();
    // Strip exact standalone prefix lines
    const prefixRegex = /^(?:In the scope of|Regarding|With respect to|Concerning|In relation to|In connection with|As per|According to|Based on|In the context of|From the|In the|According to the)\s+(?:JTO\s+LICE\s*(?:20\d{2})?|syllabus|PDF|document|material|text)?\s*,?\s*$/gi;
    if (prefixRegex.test(cleaned)) {
      return '';
    }
    return line; // preserve formatting of non-matching lines
  });

  return cleanedLines.filter(line => line.trim().length > 0).join('\n');
}
