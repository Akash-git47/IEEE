
import React from 'react';

export const IEEE_STYLE_MAP = {
  title: { font: "Times New Roman", size: 24, weight: "bold", alignment: "center" },
  author: { font: "Times New Roman", size: 10, weight: "regular", alignment: "center" },
  body: { font: "Times New Roman", size: 10 },
  abstract: { font: "Times New Roman", size: 9, style: "italic", alignment: "justify" },
  references: { font: "Times New Roman", size: 8 }
};

export const ERROR_MESSAGES: Record<string, string> = {
  DOCX_TRACKED_CHANGES: "The uploaded document contains tracked changes or comments. Please accept changes and remove comments, then re-upload.",
  DOCX_PROTECTED: "The uploaded document is password-protected. Remove protection and re-upload.",
  DOCX_MIN_STRUCTURE: "Document lacks necessary structure (Title or Abstract missing). Please ensure Title and Abstract are present.",
  TRANSFORM_CONTENT_MISMATCH: "Post-transformation content mismatch detected. Transformation aborted. See manifest for diagnostics.",
  DOCX_CORRUPT: "Uploaded .docx appears corrupted or unreadable."
};

export const PIPELINE_STEPS = [
  { id: 'VALIDATING', label: 'Validating', icon: <i className="fa-solid fa-shield-check"></i> },
  { id: 'PARSING', label: 'Parsing', icon: <i className="fa-solid fa-file-code"></i> },
  { id: 'MAPPING', label: 'Mapping', icon: <i className="fa-solid fa-diagram-project"></i> },
  { id: 'FORMATTING', label: 'Formatting', icon: <i className="fa-solid fa-paintbrush"></i> },
  { id: 'VERIFYING', label: 'Verifying', icon: <i className="fa-solid fa-check-double"></i> },
  { id: 'PACKAGING', label: 'Packaging', icon: <i className="fa-solid fa-box-archive"></i> },
];
