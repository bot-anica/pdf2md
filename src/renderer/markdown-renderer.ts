import { ContentBlock, TextLine, RawTextItem } from '../parser/types';

function detectLanguage(codeText: string): string {
  if (/#include\s*[<"]/.test(codeText)) return 'c';
  if (/^import\s+\w+/.test(codeText) && /def\s+\w+/.test(codeText)) return 'python';
  if (/def\s+\w+.*:/.test(codeText) || /print\(/.test(codeText)) return 'python';
  if (/public\s+static\s+void\s+main/.test(codeText) || /System\.out\.print/.test(codeText)) return 'java';
  if (/function\s+\w+\s*\(/.test(codeText) || /const\s+\w+\s*=/.test(codeText)) return 'javascript';
  if (/fn\s+\w+/.test(codeText) && /let\s+mut\s/.test(codeText)) return 'rust';
  if (/func\s+\w+/.test(codeText) && /fmt\.Print/.test(codeText)) return 'go';
  if (/SELECT\s+.*FROM/i.test(codeText) || /CREATE\s+TABLE/i.test(codeText)) return 'sql';
  if (/<\w+[^>]*>/.test(codeText) && /<\/\w+>/.test(codeText)) return 'html';
  if (/^\s*\$\s/.test(codeText) || /^\s*(sudo|apt|yum|brew|npm|pnpm)\s/.test(codeText)) return 'bash';
  return '';
}

function formatInlineText(items: RawTextItem[]): string {
  let result = '';

  for (const item of items) {
    let text = item.text;

    if (item.isMonospace) {
      // Inline code
      if (text.trim()) {
        text = `\`${text}\``;
      }
    } else if (item.isBold && item.isItalic) {
      if (text.trim()) {
        text = `***${text.trim()}***`;
        // Preserve leading/trailing spaces
        if (item.text.startsWith(' ')) text = ' ' + text;
        if (item.text.endsWith(' ')) text = text + ' ';
      }
    } else if (item.isBold) {
      if (text.trim()) {
        text = `**${text.trim()}**`;
        if (item.text.startsWith(' ')) text = ' ' + text;
        if (item.text.endsWith(' ')) text = text + ' ';
      }
    } else if (item.isItalic) {
      if (text.trim()) {
        text = `*${text.trim()}*`;
        if (item.text.startsWith(' ')) text = ' ' + text;
        if (item.text.endsWith(' ')) text = text + ' ';
      }
    }

    result += text;
  }

  return result;
}

function renderCodeBlock(block: ContentBlock): string {
  // Find minimum X for indentation calculation
  const allItems = block.lines.flatMap(l => l.items);
  const minX = Math.min(...allItems.map(i => i.x));

  // Estimate character width from first monospace item
  const firstItem = allItems[0];
  const charWidth = firstItem.text.length > 0
    ? (firstItem.fontSize * 0.6) // approximate monospace char width
    : 8;

  const codeLines = block.lines.map(line => {
    const lineX = Math.min(...line.items.map(i => i.x));
    const indent = Math.max(0, Math.round((lineX - minX) / charWidth));
    const text = line.items.map(i => i.text).join('');
    return ' '.repeat(indent) + text;
  });

  const codeText = codeLines.join('\n');
  const lang = block.language || detectLanguage(codeText);

  return '```' + lang + '\n' + codeText + '\n```';
}

function renderHeading(block: ContentBlock): string {
  const level = block.headingLevel || 1;
  const text = block.lines.map(l => formatInlineText(l.items)).join(' ');
  return '#'.repeat(level) + ' ' + text.trim();
}

function renderParagraph(block: ContentBlock): string {
  const parts = block.lines.map(l => formatInlineText(l.items));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function renderList(block: ContentBlock): string {
  return block.lines.map(l => {
    const text = formatInlineText(l.items);
    return text.trim();
  }).join('\n');
}

export function renderMarkdown(blocks: ContentBlock[], pageBreaks: boolean = false): string {
  const parts: string[] = [];
  let lastPage = 0;

  for (const block of blocks) {
    const blockPage = block.lines[0]?.page || 0;

    if (pageBreaks && blockPage > lastPage && lastPage > 0) {
      parts.push('---\n');
    }
    lastPage = blockPage;

    switch (block.type) {
      case 'heading':
        parts.push(renderHeading(block));
        break;
      case 'code':
        parts.push(renderCodeBlock(block));
        break;
      case 'paragraph':
        parts.push(renderParagraph(block));
        break;
      case 'list':
        parts.push(renderList(block));
        break;
    }
  }

  return parts.join('\n\n') + '\n';
}
