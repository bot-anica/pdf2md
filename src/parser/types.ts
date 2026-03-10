export interface RawTextItem {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontName: string;
  fontFamily: string;
  isMonospace: boolean;
  isBold: boolean;
  isItalic: boolean;
  page: number;
}

export interface FontInfo {
  name: string;
  family: string;
  isMonospace: boolean;
  isBold: boolean;
  isItalic: boolean;
}

export type BlockType = 'heading' | 'code' | 'paragraph' | 'list';

export interface TextLine {
  items: RawTextItem[];
  y: number;
  page: number;
}

export interface ContentBlock {
  type: BlockType;
  lines: TextLine[];
  headingLevel?: number;
  language?: string;
}
