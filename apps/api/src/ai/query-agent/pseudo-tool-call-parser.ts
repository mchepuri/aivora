const KNOWN_TOOL_NAMES = ['describe_table', 'execute_sql', 'call_api'] as const;

export interface PseudoToolCall {
  name: string;
  args: Record<string, unknown>;
}

// Some OpenRouter-hosted models (observed with google/gemma-3-27b-it) don't honor the
// OpenAI `tools`/tool_calls schema and instead write the call as text, e.g.:
//   ```tool_code
//   [execute_sql(query="SELECT ...")]
//   ```
// This recovers those calls so the agent loop can dispatch them like real tool_calls
// instead of surfacing the raw pseudo-code to the user.
export function parsePseudoToolCalls(content: string): PseudoToolCall[] {
  const cleaned = content.replace(/```[a-zA-Z_]*\n?/g, '').replace(/```/g, '');
  const calls: PseudoToolCall[] = [];

  for (const name of KNOWN_TOOL_NAMES) {
    const marker = `${name}(`;
    let searchFrom = 0;
    for (;;) {
      const start = cleaned.indexOf(marker, searchFrom);
      if (start === -1) break;
      const argsStart = start + marker.length;
      const argsEnd = findMatchingParen(cleaned, argsStart);
      if (argsEnd === -1) break;
      calls.push({ name, args: parseKwargs(cleaned.slice(argsStart, argsEnd)) });
      searchFrom = argsEnd + 1;
    }
  }

  return calls;
}

function findMatchingParen(str: string, openArgsStart: number): number {
  let depth = 1;
  let quote: string | null = null;
  for (let i = openArgsStart; i < str.length; i++) {
    const c = str[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return -1;
}

function splitTopLevel(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (quote) {
      current += c;
      if (c === '\\') current += str[++i] ?? '';
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    if (c === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseKwargs(argsStr: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const part of splitTopLevel(argsStr)) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    result[part.slice(0, eqIdx).trim()] = parseValue(part.slice(eqIdx + 1).trim());
  }
  return result;
}

function parseValue(raw: string): unknown {
  if (raw.length >= 2 && (raw[0] === '"' || raw[0] === "'") && raw[raw.length - 1] === raw[0]) {
    const quote = raw[0];
    return raw
      .slice(1, -1)
      .replace(/\\(.)/g, (_, ch: string) => (ch === quote || ch === '\\' ? ch : `\\${ch}`));
  }
  if (raw === 'True') return true;
  if (raw === 'False') return false;
  if (raw === 'None') return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      return JSON.parse(
        raw
          .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, s: string) => JSON.stringify(s.replace(/\\'/g, "'")))
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false')
          .replace(/\bNone\b/g, 'null'),
      );
    } catch {
      return raw;
    }
  }
  return raw;
}
