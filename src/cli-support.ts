import * as fs from 'fs';
import * as path from 'path';
import { CliUsageError, PdfLimitError } from './errors';

export interface CliPathOptions {
  output?: string;
  stdout?: boolean;
  force?: boolean;
  allowNonPdf?: boolean;
  maxFileSizeBytes: number;
}

export interface PreparedCliPaths {
  inputPath: string;
  outputPath?: string;
}

export function parsePositiveIntegerOption(name: string, value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

export function parsePositiveNumberOption(name: string, value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return parsed;
}

export function megabytesToBytes(megabytes: number | undefined): number | undefined {
  if (megabytes === undefined) {
    return undefined;
  }

  return Math.floor(megabytes * 1024 * 1024);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = -1;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function defaultOutputPathFor(inputPath: string): string {
  return inputPath.toLowerCase().endsWith('.pdf')
    ? inputPath.replace(/\.pdf$/i, '.md')
    : `${inputPath}.md`;
}

export function prepareCliPaths(input: string, options: CliPathOptions): PreparedCliPaths {
  const inputPath = path.resolve(input);

  if (options.stdout && options.output) {
    throw new CliUsageError('Cannot use --stdout together with --output.');
  }

  if (!fs.existsSync(inputPath)) {
    throw new CliUsageError(`File not found: ${inputPath}`);
  }

  const inputStats = fs.statSync(inputPath);
  if (!inputStats.isFile()) {
    throw new CliUsageError(`Input path is not a file: ${inputPath}`);
  }

  if (!options.allowNonPdf && path.extname(inputPath).toLowerCase() !== '.pdf') {
    throw new CliUsageError('Input must have a .pdf extension. Use --allow-non-pdf to override.');
  }

  if (inputStats.size > options.maxFileSizeBytes) {
    throw new PdfLimitError(
      `Input file size ${formatBytes(inputStats.size)} exceeds the configured limit of ${formatBytes(options.maxFileSizeBytes)}.`
    );
  }

  if (options.stdout) {
    return {
      inputPath,
    };
  }

  const outputPath = options.output ? path.resolve(options.output) : defaultOutputPathFor(inputPath);

  if (outputPath === inputPath && !options.force) {
    throw new CliUsageError('Refusing to overwrite the input file. Use --force or choose a different output path.');
  }

  if (fs.existsSync(outputPath) && !options.force) {
    throw new CliUsageError(`Refusing to overwrite existing output file: ${outputPath}. Use --force to replace it.`);
  }

  return {
    inputPath,
    outputPath,
  };
}
