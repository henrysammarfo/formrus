import type { AccessControl, EncryptionEnvelope, FormSchema } from "@/types";
import type { Signer } from "@mysten/sui/cryptography";
import type { SealCompatibleClient } from "@mysten/seal";
import type { DAppKit } from "@mysten/dapp-kit-react";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const PRIVATE_KEY_PREFIX = "formrus.privateKey.";
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

type SealKeyServerConfig = {
  objectId: string;
  weight: number;
  apiKeyName?: string;
  apiKey?: string;
  aggregatorUrl?: string;
};

export type SealDecryptContext = {
  address: string;
  signer: Signer;
  suiClient: SealCompatibleClient;
};

export type SealRegisterContext = {
  address: string;
  dAppKit: DAppKit;
};

function isBrowser() {
  return typeof window !== "undefined" && Boolean(window.crypto?.subtle);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function makeAccessKeyId(): string {
  const bytes = new Uint8Array(32);
  if (isBrowser()) window.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isEncryptionEnvelope(value: unknown): value is EncryptionEnvelope {
  return Boolean(
    value && typeof value === "object" && (value as EncryptionEnvelope).__formrusEncrypted,
  );
}

export function isSealConfigured(): boolean {
  return Boolean(env.VITE_SEAL_PACKAGE_ID && parseSealKeyServers().length > 0);
}

export function getSealConfigurationStatus() {
  const packageId = env.VITE_SEAL_PACKAGE_ID;
  const keyServers = parseSealKeyServers();
  const approveTarget = getSealApproveTarget(packageId);
  return {
    configured: Boolean(packageId && keyServers.length > 0),
    packageId,
    keyServerCount: keyServers.length,
    approveTarget,
    policyObjectId: env.VITE_SEAL_APPROVE_POLICY_OBJECT_ID,
    canAttemptDecrypt: Boolean(packageId && keyServers.length > 0 && approveTarget),
  };
}

function privateKeyStorageKey(keyId: string) {
  return `${PRIVATE_KEY_PREFIX}${keyId}`;
}

async function exportPublicKey(key: CryptoKey) {
  return window.crypto.subtle.exportKey("jwk", key);
}

async function exportPrivateKey(key: CryptoKey) {
  return window.crypto.subtle.exportKey("jwk", key);
}

async function importPublicKey(jwk: JsonWebKey) {
  return window.crypto.subtle.importKey("jwk", jwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, [
    "encrypt",
  ]);
}

async function importPrivateKey(jwk: JsonWebKey) {
  return window.crypto.subtle.importKey("jwk", jwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, [
    "decrypt",
  ]);
}

export async function ensurePrivateAccessControl(existing?: AccessControl): Promise<AccessControl> {
  if (!isBrowser()) throw new Error("Encryption requires a browser crypto context");
  if (isSealConfigured()) {
    const packageId = env.VITE_SEAL_PACKAGE_ID;
    return {
      provider: "seal",
      keyId: existing?.keyId || makeAccessKeyId(),
      sealPackageId: packageId,
      sealApproveTarget: getSealApproveTarget(packageId),
      sealPolicyObjectId: env.VITE_SEAL_APPROVE_POLICY_OBJECT_ID,
      sealFormRegistered: existing?.sealFormRegistered,
      sealRegistrationDigest: existing?.sealRegistrationDigest,
    };
  }

  if (existing?.publicKeyJwk && existing.keyId) return existing;

  const keyId = existing?.keyId || makeAccessKeyId();
  const pair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const publicKeyJwk = await exportPublicKey(pair.publicKey);
  const privateKeyJwk = await exportPrivateKey(pair.privateKey);
  localStorage.setItem(privateKeyStorageKey(keyId), JSON.stringify(privateKeyJwk));

  return {
    provider: "formrus-rsa",
    keyId,
    publicKeyJwk,
    sealPackageId: env.VITE_SEAL_PACKAGE_ID,
  };
}

export function hasPrivateDecryptKey(accessControl?: AccessControl): boolean {
  if (!isBrowser() || !accessControl?.keyId) return false;
  return Boolean(localStorage.getItem(privateKeyStorageKey(accessControl.keyId)));
}

function parseSealKeyServers(): SealKeyServerConfig[] {
  const raw = env.VITE_SEAL_KEY_SERVERS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SealKeyServerConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw
      .split(",")
      .map((objectId) => ({ objectId: objectId.trim(), weight: 1 }))
      .filter((s) => s.objectId);
  }
}

function getSealApproveTarget(packageId = env.VITE_SEAL_PACKAGE_ID): string | undefined {
  if (!packageId) return undefined;
  const explicitTarget = env.VITE_SEAL_APPROVE_TARGET?.trim();
  if (explicitTarget) return explicitTarget;

  const moduleName = env.VITE_SEAL_APPROVE_MODULE?.trim();
  const functionName = env.VITE_SEAL_APPROVE_FUNCTION?.trim();
  if (!moduleName || !functionName) return undefined;
  return `${packageId}::${moduleName}::${functionName}`;
}

function hexToBytes(value: string): Uint8Array<ArrayBuffer> {
  const clean = value.startsWith("0x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error("Seal identity must be an even-length hex string");
  }

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function uniqueAddresses(addresses: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const address of addresses) {
    const normalized = address.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function sealRegisterTarget(packageId = env.VITE_SEAL_PACKAGE_ID): string | undefined {
  if (!packageId) return undefined;
  return env.VITE_SEAL_REGISTER_TARGET?.trim() || `${packageId}::formrus_policy::register_form`;
}

function sealAddAdminTarget(packageId = env.VITE_SEAL_PACKAGE_ID): string | undefined {
  if (!packageId) return undefined;
  return env.VITE_SEAL_ADD_ADMIN_TARGET?.trim() || `${packageId}::formrus_policy::add_form_admin`;
}

async function buildSealApprovalTxBytes(
  form: FormSchema,
  envelope: EncryptionEnvelope,
  address: string,
  suiClient: SealCompatibleClient,
): Promise<Uint8Array<ArrayBuffer>> {
  const packageId = form.accessControl?.sealPackageId || env.VITE_SEAL_PACKAGE_ID;
  const target = form.accessControl?.sealApproveTarget || getSealApproveTarget(packageId);
  if (!target) {
    throw new Error(
      "Seal approval target is not configured. Set VITE_SEAL_APPROVE_TARGET or VITE_SEAL_APPROVE_MODULE/VITE_SEAL_APPROVE_FUNCTION.",
    );
  }

  const [{ Transaction }] = await Promise.all([import("@mysten/sui/transactions")]);
  const tx = new Transaction();
  tx.setSender(address);

  const policyObjectId =
    form.accessControl?.sealPolicyObjectId || env.VITE_SEAL_APPROVE_POLICY_OBJECT_ID;
  const layout = (env.VITE_SEAL_APPROVE_ARGUMENTS || (policyObjectId ? "id,policy" : "id"))
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const args = layout.map((part) => {
    if (part === "policy") {
      if (!policyObjectId)
        throw new Error("Seal approval layout requires VITE_SEAL_APPROVE_POLICY_OBJECT_ID.");
      return tx.object(policyObjectId);
    }
    if (part === "id") return tx.pure.vector("u8", hexToBytes(envelope.keyId));
    if (part === "sender") return tx.pure.address(address);
    if (part === "form") return tx.pure.string(form.blobId);
    if (part === "response") return tx.pure.string(envelope.keyId);
    throw new Error(`Unsupported Seal approval argument "${part}".`);
  });

  tx.moveCall({ target, arguments: args });
  return tx.build({ client: suiClient, onlyTransactionKind: true });
}

async function trySealEncrypt(
  accessControl: AccessControl,
  data: Uint8Array,
): Promise<EncryptionEnvelope | null> {
  const packageId = env.VITE_SEAL_PACKAGE_ID;
  const fullnodeUrl = env.VITE_SUI_FULLNODE_URL || env.VITE_SEAL_FULLNODE_URL;
  const serverConfigs = parseSealKeyServers();
  if (!packageId || !fullnodeUrl || serverConfigs.length === 0) return null;

  try {
    const [{ SealClient }, { SuiJsonRpcClient }] = await Promise.all([
      import("@mysten/seal"),
      import("@mysten/sui/jsonRpc"),
    ]);
    const network = (env.VITE_SUI_NETWORK || "testnet") as
      | "mainnet"
      | "testnet"
      | "devnet"
      | "localnet";
    const sealClient = new SealClient({
      suiClient: new SuiJsonRpcClient({ url: fullnodeUrl, network }),
      serverConfigs,
      verifyKeyServers: env.VITE_SEAL_VERIFY_KEY_SERVERS !== "false",
    });
    const encrypted = await sealClient.encrypt({
      packageId,
      id: accessControl.keyId,
      threshold: Number(env.VITE_SEAL_THRESHOLD || 1),
      data,
    });

    return {
      __formrusEncrypted: true,
      version: 1,
      provider: "seal",
      keyId: accessControl.keyId,
      ciphertext: bytesToBase64(encrypted.encryptedObject),
      aad: undefined,
      note: "Encrypted with Mysten Seal SDK. Decryption requires an authorized Seal session key.",
    };
  } catch (error) {
    console.warn("Seal encryption unavailable, using browser public-key fallback", error);
    return null;
  }
}

async function encryptWithBrowserKey(
  accessControl: AccessControl,
  data: Uint8Array<ArrayBuffer>,
): Promise<EncryptionEnvelope> {
  if (!isBrowser() || !accessControl.publicKeyJwk) {
    throw new Error("Private form is missing a public encryption key");
  }

  const aesKey = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
  ]);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = new Uint8Array(
    await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, data),
  );
  const rawAesKey = new Uint8Array(await window.crypto.subtle.exportKey("raw", aesKey));
  const publicKey = await importPublicKey(accessControl.publicKeyJwk);
  const encryptedKey = new Uint8Array(
    await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAesKey),
  );

  return {
    __formrusEncrypted: true,
    version: 1,
    provider: "formrus-rsa",
    keyId: accessControl.keyId,
    ciphertext: bytesToBase64(encryptedData),
    encryptedKey: bytesToBase64(encryptedKey),
    iv: bytesToBase64(iv),
    note: "Client-side encrypted fallback for local demos when Seal key-server config is unavailable.",
  };
}

export async function encryptResponseData(
  form: FormSchema,
  data: Record<string, unknown>,
): Promise<EncryptionEnvelope> {
  const accessControl = form.accessControl || (await ensurePrivateAccessControl());
  const bytes = textEncoder.encode(JSON.stringify(data)) as Uint8Array<ArrayBuffer>;
  if (accessControl.provider === "seal") {
    const sealEnvelope = await trySealEncrypt(accessControl, bytes);
    if (!sealEnvelope) {
      throw new Error(
        "Seal encryption is configured for this form, but encryption failed. Check Seal package ID and key servers.",
      );
    }
    return sealEnvelope;
  }

  return encryptWithBrowserKey(accessControl, bytes);
}

export async function registerSealFormAccess(
  accessControl: AccessControl,
  adminAddresses: string[],
  context: SealRegisterContext,
): Promise<AccessControl> {
  if (accessControl.provider !== "seal") return accessControl;
  if (accessControl.sealFormRegistered) return accessControl;

  const packageId = accessControl.sealPackageId || env.VITE_SEAL_PACKAGE_ID;
  const policyObjectId = accessControl.sealPolicyObjectId || env.VITE_SEAL_APPROVE_POLICY_OBJECT_ID;
  const target = sealRegisterTarget(packageId);
  if (!packageId || !policyObjectId || !target) {
    throw new Error(
      "Seal form registration requires package ID, policy object ID, and register target.",
    );
  }

  const [{ Transaction }] = await Promise.all([import("@mysten/sui/transactions")]);
  const tx = new Transaction();
  tx.moveCall({
    target,
    arguments: [
      tx.object(policyObjectId),
      tx.pure.vector("u8", hexToBytes(accessControl.keyId)),
      tx.pure.vector("address", uniqueAddresses([context.address, ...adminAddresses])),
    ],
  });

  const result = await context.dAppKit.signAndExecuteTransaction({ transaction: tx });
  const digest =
    result.$kind === "Transaction" ? result.Transaction.digest : result.FailedTransaction.digest;
  return {
    ...accessControl,
    sealFormRegistered: true,
    sealRegistrationDigest: digest,
  };
}

export async function addSealFormAdmin(
  form: FormSchema,
  adminAddress: string,
  context: SealRegisterContext,
): Promise<string> {
  const accessControl = form.accessControl;
  if (accessControl?.provider !== "seal") {
    throw new Error("This form is not using Seal access control.");
  }

  const packageId = accessControl.sealPackageId || env.VITE_SEAL_PACKAGE_ID;
  const policyObjectId = accessControl.sealPolicyObjectId || env.VITE_SEAL_APPROVE_POLICY_OBJECT_ID;
  const target = sealAddAdminTarget(packageId);
  if (!packageId || !policyObjectId || !target) {
    throw new Error(
      "Seal admin update requires package ID, policy object ID, and add-admin target.",
    );
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(adminAddress.trim())) {
    throw new Error("Enter a valid Sui address for the new admin.");
  }

  const [{ Transaction }] = await Promise.all([import("@mysten/sui/transactions")]);
  const tx = new Transaction();
  tx.moveCall({
    target,
    arguments: [
      tx.object(policyObjectId),
      tx.pure.vector("u8", hexToBytes(accessControl.keyId)),
      tx.pure.address(adminAddress.trim()),
    ],
  });

  const result = await context.dAppKit.signAndExecuteTransaction({ transaction: tx });
  return result.$kind === "Transaction"
    ? result.Transaction.digest
    : result.FailedTransaction.digest;
}

export async function decryptResponseEnvelope(
  form: FormSchema,
  envelope: EncryptionEnvelope,
): Promise<Record<string, unknown> | null> {
  if (envelope.provider === "seal") return null;
  if (!isBrowser() || !form.accessControl?.keyId || !envelope.encryptedKey || !envelope.iv)
    return null;

  const rawPrivateKey = localStorage.getItem(privateKeyStorageKey(form.accessControl.keyId));
  if (!rawPrivateKey) return null;

  try {
    const privateKey = await importPrivateKey(JSON.parse(rawPrivateKey) as JsonWebKey);
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      base64ToBytes(envelope.encryptedKey),
    );
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const plain = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
      aesKey,
      base64ToBytes(envelope.ciphertext),
    );
    return JSON.parse(textDecoder.decode(plain)) as Record<string, unknown>;
  } catch (error) {
    console.warn("Could not decrypt response", error);
    return null;
  }
}

export async function decryptSealResponseEnvelope(
  form: FormSchema,
  envelope: EncryptionEnvelope,
  context: SealDecryptContext,
): Promise<Record<string, unknown>> {
  if (envelope.provider !== "seal") {
    throw new Error("Response is not encrypted with Seal");
  }

  const packageId = form.accessControl?.sealPackageId || env.VITE_SEAL_PACKAGE_ID;
  const serverConfigs = parseSealKeyServers();
  if (!packageId || serverConfigs.length === 0) {
    throw new Error("Seal package ID and key servers are required to decrypt this response.");
  }

  const [{ SealClient, SessionKey }] = await Promise.all([import("@mysten/seal")]);
  const sealClient = new SealClient({
    suiClient: context.suiClient,
    serverConfigs,
    verifyKeyServers: env.VITE_SEAL_VERIFY_KEY_SERVERS !== "false",
  });
  const sessionKey = await SessionKey.create({
    address: context.address,
    packageId,
    ttlMin: Number(env.VITE_SEAL_SESSION_TTL_MIN || 10),
    signer: context.signer,
    suiClient: context.suiClient,
  });
  const txBytes = await buildSealApprovalTxBytes(
    form,
    envelope,
    context.address,
    context.suiClient,
  );
  const plain = await sealClient.decrypt({
    data: base64ToBytes(envelope.ciphertext),
    sessionKey,
    txBytes,
  });
  return JSON.parse(textDecoder.decode(plain)) as Record<string, unknown>;
}
