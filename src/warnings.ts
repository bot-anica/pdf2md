export type WarningCode = 'EMPTY_TEXT';

export interface ConversionWarning {
  code: WarningCode;
  message: string;
}

export function createWarning(code: WarningCode, message: string): ConversionWarning {
  return { code, message };
}

export function formatWarning(warning: ConversionWarning): string {
  return `Warning [${warning.code}]: ${warning.message}`;
}
