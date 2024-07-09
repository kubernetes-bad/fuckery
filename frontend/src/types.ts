export interface Highlight {
  start: number;
  end: number;
  message: string;
  type: 'INFO' | 'WARN' | 'ERR';
}
