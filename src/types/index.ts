export type FieldType =
  | 'text' | 'longText' | 'dropdown' | 'checkbox' | 'radio'
  | 'star' | 'file' | 'url' | 'email' | 'number' | 'date' | 'section';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
}

export interface FormSchema {
  blobId: string;
  title: string;
  description: string;
  isPrivate: boolean;
  fields: FormField[];
  createdAt: string;
}

export interface FormResponse {
  id: string;
  formBlobId: string;
  submittedAt: string;
  data: Record<string, unknown>;
  starred?: boolean;
  reviewed?: boolean;
}

export interface AdminStats {
  total: number;
  today: number;
  completionRate: number;
  avgStar: number | null;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text Input',
  longText: 'Long Text',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  radio: 'Radio',
  star: 'Star Rating',
  file: 'File Upload',
  url: 'URL',
  email: 'Email',
  number: 'Number',
  date: 'Date',
  section: 'Section Break',
};
