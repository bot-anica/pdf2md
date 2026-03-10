import { Command } from 'commander';
import * as fs from 'fs';
import { DEFAULT_MAX_FILE_SIZE_BYTES } from './config';
import {
  megabytesToBytes,
  parsePositiveIntegerOption,
  parsePositiveNumberOption,
  prepareCliPaths,
} from './cli-support';
import { convertPdf } from './converter';
import { formatWarning } from './warnings';

const program = new Command();

interface CliOptions {
  output?: string;
  pageBreaks: boolean;
  language?: string;
  stdout: boolean;
  force: boolean;
  maxPages?: number;
  maxFileSizeMb?: number;
  allowNonPdf: boolean;
}

program
  .name('pdf-to-md')
  .description('Convert PDF files to GitHub-flavored Markdown')
  .version('1.0.0')
  .argument('<input>', 'Input PDF file path')
  .option('-o, --output <path>', 'Output markdown file path')
  .option('--page-breaks', 'Insert horizontal rules between pages', false)
  .option('--language <lang>', 'Force language for all code blocks')
  .option('--stdout', 'Write Markdown to stdout instead of a file', false)
  .option('--force', 'Allow overwriting the input or an existing output file', false)
  .option(
    '--max-pages <count>',
    'Maximum number of pages to parse before failing',
    (value: string) => parsePositiveIntegerOption('maxPages', value)
  )
  .option(
    '--max-file-size-mb <size>',
    'Maximum input size in megabytes before failing',
    (value: string) => parsePositiveNumberOption('maxFileSizeMb', value)
  )
  .option('--allow-non-pdf', 'Allow inputs without a .pdf extension', false)
  .action(async (input: string, options: CliOptions) => {
    try {
      const maxFileSizeBytes = megabytesToBytes(options.maxFileSizeMb) ?? DEFAULT_MAX_FILE_SIZE_BYTES;
      const preparedPaths = prepareCliPaths(input, {
        output: options.output,
        stdout: options.stdout,
        force: options.force,
        allowNonPdf: options.allowNonPdf,
        maxFileSizeBytes,
      });
      const buffer = fs.readFileSync(preparedPaths.inputPath);
      const result = await convertPdf(buffer, {
        pageBreaks: options.pageBreaks,
        language: options.language,
        maxPages: options.maxPages,
        maxFileSizeBytes,
      });

      for (const warning of result.warnings) {
        console.error(formatWarning(warning));
      }

      if (options.stdout) {
        process.stdout.write(result.markdown);
        return;
      }

      fs.writeFileSync(preparedPaths.outputPath!, result.markdown, {
        encoding: 'utf-8',
        flag: options.force ? 'w' : 'wx',
      });
      console.log(`Converted: ${preparedPaths.inputPath} -> ${preparedPaths.outputPath}`);
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  });

void program.parseAsync();
