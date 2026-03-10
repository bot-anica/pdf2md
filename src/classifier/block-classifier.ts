import { RawTextItem, TextLine, ContentBlock, BlockType } from '../parser/types';
import { FontAnalysis } from './font-analyzer';

function groupIntoLines(items: RawTextItem[]): TextLine[] {
  if (items.length === 0) return [];

  // Sort by page, then Y descending (PDF coords: origin bottom-left), then X ascending
  // Use a generous Y-threshold for sort grouping so items on the same visual line
  // don't get separated by slight Y differences
  const sorted = [...items].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const yThreshold = Math.min(a.fontSize, b.fontSize) * 0.5;
    if (Math.abs(a.y - b.y) > yThreshold) return b.y - a.y; // higher Y = earlier in page
    return a.x - b.x;
  });

  const lines: TextLine[] = [];
  let currentLine: RawTextItem[] = [sorted[0]];
  let currentY = sorted[0].y;
  let currentPage = sorted[0].page;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const threshold = Math.max(item.fontSize, currentLine[0].fontSize) * 0.5;

    if (item.page === currentPage && Math.abs(item.y - currentY) <= threshold) {
      currentLine.push(item);
    } else {
      lines.push({ items: currentLine, y: currentY, page: currentPage });
      currentLine = [item];
      currentY = item.y;
      currentPage = item.page;
    }
  }
  lines.push({ items: currentLine, y: currentY, page: currentPage });

  return lines;
}

function getLineText(line: TextLine): string {
  return line.items.map(i => i.text).join('');
}

function isAllMonospace(line: TextLine): boolean {
  return line.items.every(i => i.isMonospace);
}

function hasMixedMonospace(line: TextLine): boolean {
  const hasMono = line.items.some(i => i.isMonospace);
  const hasNonMono = line.items.some(i => !i.isMonospace);
  return hasMono && hasNonMono;
}

const LIST_PATTERN = /^(\s*[-*•]\s|(\s*\d+[.)]\s))/;

function classifyLine(line: TextLine, analysis: FontAnalysis): { type: BlockType; headingLevel?: number } {
  const text = getLineText(line).trim();

  // Heading: larger font size + short text
  const primarySize = line.items[0].fontSize;
  if (analysis.headingMap.has(primarySize) && text.length < 100) {
    return { type: 'heading', headingLevel: analysis.headingMap.get(primarySize) };
  }

  // Code: all monospace items
  if (isAllMonospace(line)) {
    return { type: 'code' };
  }

  // List: starts with bullet or number
  if (LIST_PATTERN.test(text)) {
    return { type: 'list' };
  }

  return { type: 'paragraph' };
}

export function classifyBlocks(items: RawTextItem[], analysis: FontAnalysis): ContentBlock[] {
  const lines = groupIntoLines(items);
  const blocks: ContentBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const { type, headingLevel } = classifyLine(line, analysis);

    if (type === 'code') {
      // Merge consecutive code lines into one code block, split on large gaps
      const codeLines: TextLine[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const nextClass = classifyLine(lines[j], analysis);
        if (nextClass.type !== 'code' || lines[j].page !== lines[j - 1].page) break;

        // Split code blocks on large vertical gaps (> 2.5x font size)
        const prevLine = lines[j - 1];
        const currLine = lines[j];
        const fontSize = prevLine.items[0].fontSize;
        const gap = Math.abs(prevLine.y - currLine.y);
        if (gap > fontSize * 2.5) break;

        codeLines.push(lines[j]);
        j++;
      }
      blocks.push({ type: 'code', lines: codeLines });
      i = j;
    } else if (type === 'heading') {
      blocks.push({ type: 'heading', lines: [line], headingLevel });
      i++;
    } else if (type === 'list') {
      // Merge consecutive list lines
      const listLines: TextLine[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const nextText = getLineText(lines[j]).trim();
        const nextClass = classifyLine(lines[j], analysis);
        // Continue list if next line is also a list item or is indented continuation
        if (nextClass.type === 'list') {
          listLines.push(lines[j]);
          j++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'list', lines: listLines });
      i = j;
    } else {
      // Paragraph: merge consecutive paragraph lines, but split on large vertical gaps
      const paraLines: TextLine[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const nextClass = classifyLine(lines[j], analysis);
        if (nextClass.type !== 'paragraph' || lines[j].page !== lines[j - 1].page) break;

        // Check vertical gap: if much larger than normal line spacing, start new paragraph
        const prevLine = lines[j - 1];
        const currLine = lines[j];
        const fontSize = prevLine.items[0].fontSize;
        const gap = Math.abs(prevLine.y - currLine.y);
        if (gap > fontSize * 1.8) {
          // Large gap — split into separate paragraph
          break;
        }

        paraLines.push(currLine);
        j++;
      }
      blocks.push({ type: 'paragraph', lines: paraLines });
      i = j;
    }
  }

  return blocks;
}
