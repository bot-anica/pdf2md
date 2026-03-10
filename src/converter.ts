import { parsePdf } from './parser/pdf-parser';
import { analyzeFonts } from './classifier/font-analyzer';
import { classifyBlocks } from './classifier/block-classifier';
import { renderMarkdown } from './renderer/markdown-renderer';

export interface ConvertOptions {
  pageBreaks?: boolean;
  language?: string;
}

export async function convertPdfToMarkdown(
  buffer: Buffer,
  options: ConvertOptions = {}
): Promise<string> {
  const items = await parsePdf(buffer);

  if (items.length === 0) {
    return '';
  }

  const fontAnalysis = analyzeFonts(items);
  const blocks = classifyBlocks(items, fontAnalysis);

  // Apply manual language override to code blocks
  if (options.language) {
    for (const block of blocks) {
      if (block.type === 'code') {
        block.language = options.language;
      }
    }
  }

  return renderMarkdown(blocks, options.pageBreaks);
}
