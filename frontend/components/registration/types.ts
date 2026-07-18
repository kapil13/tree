export type ProgramFieldType = "text" | "textarea" | "number" | "date" | "select" | "boolean";

export type ProgramField = {
  key: string;
  label: string;
  type: ProgramFieldType;
  required?: boolean;
  placeholder?: string;
  help_text?: string;
  core?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
};

export type ProgramSection = {
  id: string;
  title: string;
  description?: string;
  fields: ProgramField[];
};

export type ProgramFormSchema = {
  code: string;
  name: string;
  description: string;
  audience: string;
  min_photos: number;
  is_default: boolean;
  sections: ProgramSection[];
};

export type ProgramFormValues = Record<string, string | number | boolean>;
