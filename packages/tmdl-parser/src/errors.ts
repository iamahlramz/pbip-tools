export class TmdlParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly file?: string,
  ) {
    super(`${file ? file + ':' : ''}${line}: ${message}`);
    this.name = 'TmdlParseError';
  }
}

export interface ParseWarning {
  message: string;
  line: number;
  file?: string;
}
