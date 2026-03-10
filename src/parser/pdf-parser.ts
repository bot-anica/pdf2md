import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import type { ConvertConfig } from '../config';
import { PdfLimitError } from '../errors';
import { createWarning, type ConversionWarning } from '../warnings';
import { RawTextItem, FontInfo } from './types';

const MONOSPACE_FAMILIES = [
  'courier', 'consolas', 'monaco', 'menlo',
  'lucida console', 'liberation mono', 'dejavu sans mono',
  'source code pro', 'fira code', 'fira mono',
  'sf mono', 'jetbrains mono', 'inconsolata',
  'droid sans mono', 'ubuntu mono', 'roboto mono',
  'hack', 'andale mono', 'cascadia code', 'cascadia mono',
  'monospace', // generic CSS family (pdfjs fallback)
];

function stripSubsetPrefix(fontName: string): string {
  return fontName.replace(/^[A-Z]{6}\+/, '');
}

function detectFontInfo(fontName: string): FontInfo {
  const stripped = stripSubsetPrefix(fontName);
  const lower = stripped.toLowerCase();

  const isMonospace = MONOSPACE_FAMILIES.some(f => lower.includes(f));
  const isBold = /bold/i.test(stripped) || /\bBd\b/.test(stripped);
  const isItalic = /italic|oblique/i.test(stripped) || /\bIt\b/.test(stripped);

  const family = stripped
    .replace(/[-,](Bold|Italic|Oblique|Regular|Medium|Light|Thin|Bd|It|Rg)\b/gi, '')
    .replace(/[-,]\s*$/, '')
    .trim();

  return { name: stripped, family, isMonospace, isBold, isItalic };
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item;
}

export interface ParsePdfResult {
  items: RawTextItem[];
  pageCount: number;
  warnings: ConversionWarning[];
}

export async function parsePdf(
  buffer: Buffer,
  config: Pick<ConvertConfig, 'maxPages' | 'useSystemFonts' | 'stopAtErrors' | 'isEvalSupported' | 'disableFontFace'>
): Promise<ParsePdfResult> {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: config.useSystemFonts,
    stopAtErrors: config.stopAtErrors,
    isEvalSupported: config.isEvalSupported,
    disableFontFace: config.disableFontFace,
  });
  const doc = await loadingTask.promise;
  const items: RawTextItem[] = [];
  const warnings: ConversionWarning[] = [];

  try {
    if (doc.numPages > config.maxPages) {
      throw new PdfLimitError(
        `PDF has ${doc.numPages} pages, which exceeds the configured limit of ${config.maxPages} pages.`
      );
    }

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // styles maps internal font names to { fontFamily, ascent, descent, vertical }
      const styles = textContent.styles as Record<string, { fontFamily: string }>;

      for (const item of textContent.items) {
        if (!isTextItem(item) || !item.str) continue;

        const tx = item.transform;
        const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]);
        const x = tx[4];
        const y = tx[5];

        // Use the style's fontFamily if available, fall back to item.fontName.
        const styleFontFamily = styles[item.fontName]?.fontFamily || '';
        const resolvedFontName = styleFontFamily || item.fontName;
        const fontInfo = detectFontInfo(resolvedFontName);

        items.push({
          text: item.str,
          x,
          y,
          fontSize: Math.round(fontSize * 100) / 100,
          fontName: fontInfo.name,
          fontFamily: fontInfo.family,
          isMonospace: fontInfo.isMonospace,
          isBold: fontInfo.isBold,
          isItalic: fontInfo.isItalic,
          page: pageNum,
        });
      }
    }

    if (items.length === 0) {
      warnings.push(
        createWarning('EMPTY_TEXT', 'No text content found. This may be a scanned PDF and OCR is not supported.')
      );
    }

    return {
      items,
      pageCount: doc.numPages,
      warnings,
    };
  } finally {
    await doc.destroy();
  }
}
