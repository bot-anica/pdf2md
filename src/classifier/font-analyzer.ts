import { RawTextItem } from '../parser/types';

export interface FontAnalysis {
  bodyFontSize: number;
  headingMap: Map<number, number>; // fontSize → heading level (1-6)
  monospaceFonts: Set<string>;
}

export function analyzeFonts(items: RawTextItem[]): FontAnalysis {
  // Build character-count histogram by font size
  const sizeHistogram = new Map<number, number>();
  const monospaceFonts = new Set<string>();

  for (const item of items) {
    const count = sizeHistogram.get(item.fontSize) || 0;
    sizeHistogram.set(item.fontSize, count + item.text.length);

    if (item.isMonospace) {
      monospaceFonts.add(item.fontName);
    }
  }

  // Most common font size = body text
  let bodyFontSize = 0;
  let maxCount = 0;
  for (const [size, count] of sizeHistogram) {
    if (count > maxCount) {
      maxCount = count;
      bodyFontSize = size;
    }
  }

  // Sizes larger than body → heading levels (sorted descending)
  const largerSizes = Array.from(sizeHistogram.keys())
    .filter(s => s > bodyFontSize)
    .sort((a, b) => b - a);

  const headingMap = new Map<number, number>();
  for (let i = 0; i < Math.min(largerSizes.length, 6); i++) {
    headingMap.set(largerSizes[i], i + 1);
  }

  return { bodyFontSize, headingMap, monospaceFonts };
}
