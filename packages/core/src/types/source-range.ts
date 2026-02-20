export interface SourcePosition {
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
  file?: string;
}
