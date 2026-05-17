export type FieldType =
  | "text"
  | "longText"
  | "richText"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "star"
  | "file"
  | "screenshot"
  | "video"
  | "url"
  | "email"
  | "number"
  | "date"
  | "section";

export type StorageMode = "walrus" | "local";

export interface BlobReceipt {
  blobId: string;
  objectId?: string;
  endEpoch?: number;
  storageMode: StorageMode;
  fallbackReason?: string;
}

export interface AttachmentValue extends BlobReceipt {
  name: string;
  type: string;
  size: number;
  url?: string;
  embeddedDataUrl?: string;
}

export type EncryptionProvider = "seal" | "formrus-rsa";
export type SubmitterMode = "public" | "wallet_optional" | "wallet_required";

export interface EncryptionEnvelope {
  __formrusEncrypted: true;
  version: number;
  provider: EncryptionProvider;
  keyId: string;
  ciphertext: string;
  encryptedKey?: string;
  iv?: string;
  aad?: string;
  note?: string;
}

export interface AccessControl {
  provider: EncryptionProvider;
  keyId: string;
  publicKeyJwk?: JsonWebKey;
  sealPackageId?: string;
  sealApproveTarget?: string;
  sealPolicyObjectId?: string;
  sealFormRegistered?: boolean;
  sealRegistrationDigest?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
}

export interface FormBranding {
  coverImage?: AttachmentValue;
  logoImage?: AttachmentValue;
  successImage?: AttachmentValue;
  coverPlacement?: "banner" | "background" | "hidden";
  logoPlacement?: "left" | "center" | "hidden";
  responseLayout?: "standard" | "stepper";
  successTheme?: "clean" | "blue" | "midnight" | "celebration";
  successEffect?: "none" | "confetti" | "splash";
  successTitle?: string;
  successMessage?: string;
}

export interface StoragePolicy {
  maxFileSizeMb: number;
  maxVideoSizeMb: number;
  maxFilesPerResponse: number;
  allowedMimeTypes: string[];
}

export interface ResponsePolicy {
  allowMultipleSubmissions: boolean;
  saveIncompleteResponses: boolean;
}

export interface CreatorFormRef {
  blobId: string;
  title: string;
  description?: string;
  isPrivate: boolean;
  formVersion?: number;
  publishedAt: string;
}

export interface CreatorManifest {
  kind: "formrus.creatorManifest";
  payloadVersion: number;
  ownerAddress: string;
  forms: CreatorFormRef[];
  updatedAt: string;
  previousManifestBlobId?: string;
}

export interface ResponseIndex {
  kind: "formrus.responseIndex";
  payloadVersion: number;
  formBlobId: string;
  responseIds: string[];
  updatedAt: string;
  previousIndexBlobId?: string;
}

export interface FormSchema {
  blobId: string;
  title: string;
  description: string;
  isPrivate: boolean;
  creatorAddress?: string;
  submitterMode?: SubmitterMode;
  storagePolicy?: StoragePolicy;
  responsePolicy?: ResponsePolicy;
  fields: FormField[];
  createdAt: string;
  branding?: FormBranding;
  formVersion?: number;
  draftId?: string;
  publishedFromDraftId?: string;
  publishedAt?: string;
  adminAddresses?: string[];
  accessControl?: AccessControl;
  creatorManifestBlobId?: string;
  responseIndexBlobId?: string;
  receipt?: BlobReceipt;
}

export interface FormResponse {
  id: string;
  formBlobId: string;
  submittedAt: string;
  submitterAddress?: string;
  submitterMode?: SubmitterMode;
  data: Record<string, unknown>;
  receipt?: BlobReceipt;
  responseIndexBlobId?: string;
  starred?: boolean;
  reviewed?: boolean;
  priority?: "low" | "medium" | "high" | "urgent";
  internalNote?: string;
  encrypted?: boolean;
  encryptionProvider?: EncryptionProvider;
  decryptionStatus?: "decrypted" | "locked" | "plain";
}

export interface FormDraft {
  draftId: string;
  title: string;
  description: string;
  isPrivate: boolean;
  creatorAddress?: string;
  submitterMode?: SubmitterMode;
  storagePolicy?: StoragePolicy;
  responsePolicy?: ResponsePolicy;
  fields: FormField[];
  updatedAt: string;
  formVersion: number;
  branding?: FormBranding;
  publishedBlobId?: string;
  adminAddresses?: string[];
  accessControl?: AccessControl;
  creatorManifestBlobId?: string;
  responseIndexBlobId?: string;
}

export interface AdminStats {
  total: number;
  today: number;
  completionRate: number;
  avgStar: number | null;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text Input",
  longText: "Long Text",
  richText: "Rich Text",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
  radio: "Radio",
  star: "Star Rating",
  file: "File Upload",
  screenshot: "Screenshot Upload",
  video: "Video Upload",
  url: "URL",
  email: "Email",
  number: "Number",
  date: "Date",
  section: "Section Break",
};
