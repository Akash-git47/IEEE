
export enum PipelineState {
  IDLE = 'IDLE',
  VALIDATING = 'VALIDATING',
  PARSING = 'PARSING',
  MAPPING = 'MAPPING',
  FORMATTING = 'FORMATTING',
  VERIFYING = 'VERIFYING',
  PACKAGING = 'PACKAGING',
  DONE = 'DONE',
  ERROR = 'ERROR'
}

export interface Manifest {
  original_file_md5: string;
  output_file_md5: string;
  styles_mapped: Array<{ original_style: string; mapped_style: string }>;
  citation_map: Array<{ original_citation_text: string; assigned_numeric_index: number }>;
  errors: string[];
  timestamp_utc: string;
}

export interface PaperMetadata {
  title: string;
  abstract: string;
  wordCount: number;
  filename: string;
}

export enum ErrorCode {
  DOCX_TRACKED_CHANGES = 'DOCX_TRACKED_CHANGES',
  DOCX_PROTECTED = 'DOCX_PROTECTED',
  DOCX_MIN_STRUCTURE = 'DOCX_MIN_STRUCTURE',
  TRANSFORM_CONTENT_MISMATCH = 'TRANSFORM_CONTENT_MISMATCH',
  DOCX_CORRUPT = 'DOCX_CORRUPT'
}
