export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

export class PdfLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfLimitError';
  }
}
