import { normalizeConvertConfig, type ConvertOptions } from './config';
import { PdfLimitError } from './errors';
import { parsePdf } from './parser/pdf-parser';
import { analyzeFonts } from './classifier/font-analyzer';
import { classifyBlocks } from './classifier/block-classifier';
import { renderMarkdown } from './renderer/markdown-renderer';
import type { ContentBlock } from './parser/types';
import type { ConversionWarning } from './warnings';

export interface ConvertStats {
  pages: number;
  textItems: number;
  blocks: number;
}

export interface ConvertResult {
  markdown: string;
  warnings: ConversionWarning[];
  stats: ConvertStats;
}

function applyForcedLanguage(blocks: ContentBlock[], forcedLanguage: string | undefined): ContentBlock[] {
  if (!forcedLanguage) {
    return blocks;
  }

  return blocks.map(block => {
    if (block.type !== 'code') {
      return block;
    }

    return {
      ...block,
      language: forcedLanguage,
    };
  });
}

export async function convertPdf(buffer: Buffer, options: ConvertOptions = {}): Promise<ConvertResult> {
  const config = normalizeConvertConfig(options);

  if (buffer.byteLength > config.maxFileSizeBytes) {
    throw new PdfLimitError(
      `PDF data is ${buffer.byteLength} bytes, which exceeds the configured limit of ${config.maxFileSizeBytes} bytes.`
    );
  }

  const parsed = await parsePdf(buffer, config);

  if (parsed.items.length === 0) {
    return {
      markdown: '',
      warnings: parsed.warnings,
      stats: {
        pages: parsed.pageCount,
        textItems: 0,
        blocks: 0,
      },
    };
  }

  const items = parsed.items;
  const fontAnalysis = analyzeFonts(items);
  const blocks = applyForcedLanguage(classifyBlocks(items, fontAnalysis), config.forcedLanguage);

  return {
    markdown: renderMarkdown(blocks, config.pageBreaks),
    warnings: parsed.warnings,
    stats: {
      pages: parsed.pageCount,
      textItems: items.length,
      blocks: blocks.length,
    },
  };
}

export async function convertPdfToMarkdown(buffer: Buffer, options: ConvertOptions = {}): Promise<string> {
  const result = await convertPdf(buffer, options);
  return result.markdown;
}
