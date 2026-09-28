/**
 * Action Tag Parser for BakaSur Assistant Replies
 *
 * Extracts structured `[action:tool_name {...}]` tags embedded in conversational
 * responses, allowing the UI to render interactive action execution cards.
 * Uses a balanced-brace scanner to correctly parse nested JSON and multiple action tags.
 */

export interface ParsedAction {
  toolName: string;
  input: Record<string, unknown>;
}

export interface ParsedMessageContent {
  cleanText: string;
  action?: ParsedAction;
  actions: ParsedAction[];
}

export function parseActionTag(content: string): ParsedMessageContent {
  if (!content) {
    return { cleanText: '', actions: [] };
  }

  const actions: ParsedAction[] = [];
  let cleanText = content;

  // Regex to find start of action tags: [action:tool_name {
  const startRegex = /\[action:([a-zA-Z0-9_-]+)\s*\{/g;
  let match: RegExpExecArray | null;

  // Store ranges to remove from content: [start, end]
  const removalRanges: Array<{ start: number; end: number }> = [];

  while ((match = startRegex.exec(content)) !== null) {
    const fullTagStart = match.index;
    const toolName = match[1];
    // Index of opening brace '{'
    const braceStartIndex = match.index + match[0].length - 1;

    let depth = 0;
    let inString = false;
    let isEscaped = false;
    let braceEndIndex = -1;

    for (let i = braceStartIndex; i < content.length; i++) {
      const char = content[i];

      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\' && inString) {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            braceEndIndex = i;
            break;
          }
        }
      }
    }

    if (braceEndIndex !== -1) {
      // Look for closing ']' after braceEndIndex, skipping whitespace
      let closeBracketIndex = -1;
      for (let j = braceEndIndex + 1; j < content.length; j++) {
        if (content[j] === ']') {
          closeBracketIndex = j;
          break;
        } else if (!/\s/.test(content[j])) {
          break;
        }
      }

      if (closeBracketIndex !== -1) {
        const jsonStr = content.slice(braceStartIndex, braceEndIndex + 1);
        try {
          const input = JSON.parse(jsonStr);
          if (input && typeof input === 'object' && !Array.isArray(input)) {
            actions.push({ toolName, input });
            removalRanges.push({ start: fullTagStart, end: closeBracketIndex + 1 });
            // Advance regex index past the parsed tag
            startRegex.lastIndex = closeBracketIndex + 1;
          }
        } catch {
          // If JSON parsing fails, skip this tag and let regex continue
        }
      }
    }
  }

  // Remove parsed tags in reverse order to preserve string offsets
  for (let k = removalRanges.length - 1; k >= 0; k--) {
    const range = removalRanges[k];
    cleanText = cleanText.slice(0, range.start) + cleanText.slice(range.end);
  }

  cleanText = cleanText.trim();

  return {
    cleanText,
    action: actions[0],
    actions,
  };
}
