import { FIELD_TYPE_LABELS } from "@/types";
import type { FormField, FormSchema } from "@/types";

export type ValidationSeverity = "error" | "warning";

export type ValidationCode =
  | "title_required"
  | "title_too_long"
  | "description_too_long"
  | "fields_required"
  | "too_many_fields"
  | "field_id_duplicate"
  | "field_type_invalid"
  | "field_label_required"
  | "field_label_too_long"
  | "field_options_required"
  | "field_options_duplicate"
  | "required_value_missing"
  | "value_type_invalid"
  | "value_out_of_range"
  | "value_not_allowed"
  | "attachment_limit_exceeded";

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
  severity: ValidationSeverity;
  fieldId?: string;
  fieldLabel?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

type FormDefinitionInput = {
  title: string;
  description: string;
  fields: FormField[];
};

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1200;
const MAX_FIELD_LABEL_LENGTH = 120;
const MAX_FIELDS = 80;
const OPTION_FIELD_TYPES = new Set<FormField["type"]>(["dropdown", "radio", "checkbox"]);
const MIN_OPTIONS_BY_TYPE: Partial<Record<FormField["type"], number>> = {
  dropdown: 1,
  radio: 1,
  checkbox: 1,
};
const ATTACHMENT_FIELD_TYPES = new Set<FormField["type"]>(["file", "screenshot", "video"]);

function createIssue(
  issue: Omit<ValidationIssue, "severity"> & { severity?: ValidationSeverity },
): ValidationIssue {
  return { severity: "error", ...issue };
}

function createResult(issues: ValidationIssue[]): ValidationResult {
  return { ok: issues.every((issue) => issue.severity !== "error"), issues };
}

function isSupportedFieldType(type: string): type is FormField["type"] {
  return Object.prototype.hasOwnProperty.call(FIELD_TYPE_LABELS, type);
}

export function isFilledValue(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    (!Array.isArray(value) || value.length > 0)
  );
}

function validateFormDefinition(
  input: FormDefinitionInput,
  mode: "draft" | "publish",
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const title = input.title.trim();

  if (!title) {
    issues.push(
      createIssue({
        code: "title_required",
        message: "Add a form title before publishing.",
        severity: mode === "publish" ? "error" : "warning",
      }),
    );
  }
  if (title.length > MAX_TITLE_LENGTH) {
    issues.push(
      createIssue({
        code: "title_too_long",
        message: `Keep the form title under ${MAX_TITLE_LENGTH} characters.`,
      }),
    );
  }
  if (input.description.length > MAX_DESCRIPTION_LENGTH) {
    issues.push(
      createIssue({
        code: "description_too_long",
        message: `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`,
      }),
    );
  }
  if (input.fields.length > MAX_FIELDS) {
    issues.push(
      createIssue({
        code: "too_many_fields",
        message: `Forms support up to ${MAX_FIELDS} fields.`,
      }),
    );
  }

  const contentFields = input.fields.filter((field) => field.type !== "section");
  if (mode === "publish" && contentFields.length === 0) {
    issues.push(
      createIssue({
        code: "fields_required",
        message: "Add at least one response field before publishing.",
      }),
    );
  }

  const fieldIds = new Set<string>();
  input.fields.forEach((field, index) => {
    const fieldName = field.label || `Field ${index + 1}`;

    if (fieldIds.has(field.id)) {
      issues.push(
        createIssue({
          code: "field_id_duplicate",
          message: `"${fieldName}" has a duplicate internal field ID.`,
          fieldId: field.id,
          fieldLabel: fieldName,
        }),
      );
    }
    fieldIds.add(field.id);

    if (!isSupportedFieldType(field.type)) {
      issues.push(
        createIssue({
          code: "field_type_invalid",
          message: `"${fieldName}" uses an unsupported field type.`,
          fieldId: field.id,
          fieldLabel: fieldName,
        }),
      );
    }
    if (!field.label.trim()) {
      issues.push(
        createIssue({
          code: "field_label_required",
          message: `Field ${index + 1} needs a label.`,
          fieldId: field.id,
          fieldLabel: fieldName,
        }),
      );
    }
    if (field.label.length > MAX_FIELD_LABEL_LENGTH) {
      issues.push(
        createIssue({
          code: "field_label_too_long",
          message: `"${fieldName}" needs a shorter label.`,
          fieldId: field.id,
          fieldLabel: fieldName,
        }),
      );
    }
    if (OPTION_FIELD_TYPES.has(field.type)) {
      const options = field.options?.map((option) => option.trim()).filter(Boolean) || [];
      const uniqueOptions = new Set(options.map((option) => option.toLowerCase()));
      const minOptions = MIN_OPTIONS_BY_TYPE[field.type] || 1;
      if (options.length < minOptions) {
        issues.push(
          createIssue({
            code: "field_options_required",
            message: `"${fieldName}" needs at least ${minOptions} option${minOptions === 1 ? "" : "s"}.`,
            fieldId: field.id,
            fieldLabel: fieldName,
          }),
        );
      }
      if (uniqueOptions.size !== options.length) {
        issues.push(
          createIssue({
            code: "field_options_duplicate",
            message: `"${fieldName}" has duplicate options.`,
            fieldId: field.id,
            fieldLabel: fieldName,
          }),
        );
      }
    }
  });

  return createResult(issues);
}

/** Validates an unpublished draft without blocking normal partial draft saves. */
export function validateDraftForSave(input: FormDefinitionInput): ValidationResult {
  return validateFormDefinition(input, "draft");
}

/** Validates a form schema before it is published as a shareable Walrus blob. */
export function validateFormForPublish(input: FormDefinitionInput): ValidationResult {
  return validateFormDefinition(input, "publish");
}

/** Validates submitted values against a published form schema before storage. */
export function validateResponseValues(
  form: FormSchema,
  values: Record<string, unknown>,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const maxAttachments = form.storagePolicy?.maxFilesPerResponse;
  if (maxAttachments) {
    const attachmentCount = form.fields
      .filter((field) => ATTACHMENT_FIELD_TYPES.has(field.type))
      .filter((field) => {
        const value = values[field.id];
        return typeof value === "object" && value !== null && "blobId" in value;
      }).length;
    if (attachmentCount > maxAttachments) {
      issues.push(
        createIssue({
          code: "attachment_limit_exceeded",
          message: `This form accepts up to ${maxAttachments} uploaded file${maxAttachments === 1 ? "" : "s"} per response.`,
        }),
      );
    }
  }

  form.fields.forEach((field) => {
    if (field.type === "section") return;

    const value = values[field.id];
    const label = field.label || FIELD_TYPE_LABELS[field.type];
    if (field.required && !isFilledValue(value)) {
      issues.push(
        createIssue({
          code: "required_value_missing",
          message: `"${label}" is required.`,
          fieldId: field.id,
          fieldLabel: label,
        }),
      );
      return;
    }
    if (!isFilledValue(value)) return;

    if (
      field.type === "email" &&
      (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    ) {
      issues.push(
        createIssue({
          code: "value_type_invalid",
          message: `"${label}" must be a valid email address.`,
          fieldId: field.id,
          fieldLabel: label,
        }),
      );
    }
    if (field.type === "url") {
      try {
        const url = new URL(String(value));
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid URL protocol");
      } catch {
        issues.push(
          createIssue({
            code: "value_type_invalid",
            message: `"${label}" must be a valid http or https URL.`,
            fieldId: field.id,
            fieldLabel: label,
          }),
        );
      }
    }
    if (field.type === "number" && !Number.isFinite(Number(value))) {
      issues.push(
        createIssue({
          code: "value_type_invalid",
          message: `"${label}" must be a valid number.`,
          fieldId: field.id,
          fieldLabel: label,
        }),
      );
    }
    if (field.type === "date" && Number.isNaN(Date.parse(String(value)))) {
      issues.push(
        createIssue({
          code: "value_type_invalid",
          message: `"${label}" must be a valid date.`,
          fieldId: field.id,
          fieldLabel: label,
        }),
      );
    }
    if (field.type === "star") {
      const rating = Number(value);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        issues.push(
          createIssue({
            code: "value_out_of_range",
            message: `"${label}" must be between 1 and 5 stars.`,
            fieldId: field.id,
            fieldLabel: label,
          }),
        );
      }
    }
    if (
      (field.type === "dropdown" || field.type === "radio") &&
      field.options?.length &&
      !field.options.includes(String(value))
    ) {
      issues.push(
        createIssue({
          code: "value_not_allowed",
          message: `"${label}" contains an option that is not allowed.`,
          fieldId: field.id,
          fieldLabel: label,
        }),
      );
    }
    if (field.type === "checkbox") {
      const selected = Array.isArray(value) ? value.map(String) : [];
      if (
        !Array.isArray(value) ||
        selected.some((option) => !(field.options || []).includes(option))
      ) {
        issues.push(
          createIssue({
            code: "value_not_allowed",
            message: `"${label}" contains an option that is not allowed.`,
            fieldId: field.id,
            fieldLabel: label,
          }),
        );
      }
    }
    if (
      ATTACHMENT_FIELD_TYPES.has(field.type) &&
      (typeof value !== "object" || value === null || !("blobId" in value))
    ) {
      issues.push(
        createIssue({
          code: "value_type_invalid",
          message: `"${label}" must finish uploading before submission.`,
          fieldId: field.id,
          fieldLabel: label,
        }),
      );
    }
  });

  return createResult(issues);
}

export function firstValidationMessage(result: ValidationResult): string | null {
  return (
    result.issues.find((issue) => issue.severity === "error")?.message ||
    result.issues[0]?.message ||
    null
  );
}
