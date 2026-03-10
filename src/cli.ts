import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { convertPdfToMarkdown } from './converter';

const program = new Command();

program
  .name('pdf-to-md')
  .description('Convert PDF files to GitHub-flavored Markdown')
  .version('1.0.0')
  .argument('<input>', 'Input PDF file path')
  .option('-o, --output <path>', 'Output markdown file path')
  .option('--page-breaks', 'Insert horizontal rules between pages', false)
  .option('--language <lang>', 'Force language for all code blocks')
  .action(async (input: string, options: { output?: string; pageBreaks: boolean; language?: string }) => {
    const inputPath = path.resolve(input);

    if (!fs.existsSync(inputPath)) {
      console.error(`Error: File not found: ${inputPath}`);
      process.exit(1);
    }

    const outputPath = options.output
      ? path.resolve(options.output)
      : inputPath.replace(/\.pdf$/i, '.md');

    try {
      const buffer = fs.readFileSync(inputPath);
      const markdown = await convertPdfToMarkdown(buffer, {
        pageBreaks: options.pageBreaks,
        language: options.language,
      });

      fs.writeFileSync(outputPath, markdown, 'utf-8');
      console.log(`Converted: ${inputPath} → ${outputPath}`);
    } catch (err) {
      console.error('Error converting PDF:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
