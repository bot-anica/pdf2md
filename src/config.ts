export const DEFAULT_MAX_PAGES = 200;
export const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export interface ConvertOptions {
  pageBreaks?: boolean;
  language?: string;
  forcedLanguage?: string;
  maxPages?: number;
  maxFileSizeBytes?: number;
  useSystemFonts?: boolean;
  stopAtErrors?: boolean;
  isEvalSupported?: boolean;
  disableFontFace?: boolean;
}

export interface ConvertConfig {
  pageBreaks: boolean;
  forcedLanguage?: string;
  maxPages: number;
  maxFileSizeBytes: number;
  useSystemFonts: boolean;
  stopAtErrors: boolean;
  isEvalSupported: boolean;
  disableFontFace: boolean;
}

function normalizePositiveInteger(name: string, value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer.`);
  }

  return value;
}

export function normalizeConvertConfig(options: ConvertOptions = {}): ConvertConfig {
  const forcedLanguage = options.forcedLanguage?.trim() || options.language?.trim() || undefined;

  return {
    pageBreaks: options.pageBreaks ?? false,
    forcedLanguage,
    maxPages: normalizePositiveInteger('maxPages', options.maxPages, DEFAULT_MAX_PAGES),
    maxFileSizeBytes: normalizePositiveInteger(
      'maxFileSizeBytes',
      options.maxFileSizeBytes,
      DEFAULT_MAX_FILE_SIZE_BYTES
    ),
    useSystemFonts: options.useSystemFonts ?? false,
    stopAtErrors: options.stopAtErrors ?? true,
    isEvalSupported: options.isEvalSupported ?? false,
    disableFontFace: options.disableFontFace ?? true,
  };
}
