import path from 'path';

export interface LineCountResult {
  codeLines: number;
  blankLines: number;
  commentLines: number;
  totalLines: number;
  language: string;
}

interface LanguageRule {
  name: string;
  lineComments: string[];
  blockCommentStart?: string;
  blockCommentEnd?: string;
}

const EXTENSION_RULES: Record<string, LanguageRule> = {
  // TypeScript & JavaScript
  '.ts': { name: 'TypeScript', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.tsx': { name: 'TypeScript (TSX)', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.js': { name: 'JavaScript', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.jsx': { name: 'JavaScript (JSX)', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.mjs': { name: 'JavaScript', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.cjs': { name: 'JavaScript', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },

  // Web & Styles
  '.json': { name: 'JSON', lineComments: [] },
  '.html': { name: 'HTML', lineComments: [], blockCommentStart: '<!--', blockCommentEnd: '-->' },
  '.css': { name: 'CSS', lineComments: [], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.scss': { name: 'SCSS', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.less': { name: 'LESS', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.md': { name: 'Markdown', lineComments: [], blockCommentStart: '<!--', blockCommentEnd: '-->' },
  '.yaml': { name: 'YAML', lineComments: ['#'] },
  '.yml': { name: 'YAML', lineComments: ['#'] },

  // Backend & Systems
  '.py': { name: 'Python', lineComments: ['#'], blockCommentStart: '"""', blockCommentEnd: '"""' },
  '.go': { name: 'Go', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.rs': { name: 'Rust', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.java': { name: 'Java', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.c': { name: 'C', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.h': { name: 'C Header', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.cpp': { name: 'C++', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.hpp': { name: 'C++ Header', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.cs': { name: 'C#', lineComments: ['//'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.php': { name: 'PHP', lineComments: ['//', '#'], blockCommentStart: '/*', blockCommentEnd: '*/' },
  '.rb': { name: 'Ruby', lineComments: ['#'], blockCommentStart: '=begin', blockCommentEnd: '=end' },
  '.sh': { name: 'Shell', lineComments: ['#'] },
  '.bash': { name: 'Bash', lineComments: ['#'] },
  '.sql': { name: 'SQL', lineComments: ['--'], blockCommentStart: '/*', blockCommentEnd: '*/' },
};

export function detectLanguageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (EXTENSION_RULES[ext]) {
    return EXTENSION_RULES[ext].name;
  }
  const basename = path.basename(filePath).toLowerCase();
  if (basename === 'dockerfile') return 'Dockerfile';
  if (basename === 'makefile') return 'Makefile';
  return 'Plain Text';
}

export function countLinesOfCode(content: string, filePath: string): LineCountResult {
  const ext = path.extname(filePath).toLowerCase();
  const rule = EXTENSION_RULES[ext] || { name: detectLanguageFromPath(filePath), lineComments: ['//', '#'] };

  const lines = content.split(/\r?\n/);
  let codeLines = 0;
  let blankLines = 0;
  let commentLines = 0;
  let inBlockComment = false;

  const { lineComments, blockCommentStart, blockCommentEnd } = rule;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.length === 0) {
      blankLines++;
      continue;
    }

    if (inBlockComment) {
      commentLines++;
      if (blockCommentEnd && trimmed.includes(blockCommentEnd)) {
        inBlockComment = false;
      }
      continue;
    }

    // Check single-line comments
    const isSingleLineComment = lineComments.some((prefix) => trimmed.startsWith(prefix));
    if (isSingleLineComment) {
      commentLines++;
      continue;
    }

    // Check start of block comment
    if (blockCommentStart && trimmed.startsWith(blockCommentStart)) {
      commentLines++;
      if (blockCommentEnd && trimmed.includes(blockCommentEnd) && trimmed.indexOf(blockCommentEnd) > trimmed.indexOf(blockCommentStart)) {
        inBlockComment = false;
      } else {
        inBlockComment = true;
      }
      continue;
    }

    // Otherwise, it counts as code line
    codeLines++;
  }

  return {
    codeLines,
    blankLines,
    commentLines,
    totalLines: lines.length,
    language: rule.name,
  };
}
