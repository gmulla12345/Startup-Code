import { createHash, timingSafeEqual } from "crypto";

/**
 * Digistore24's IPN signature algorithm (confirmed against their published
 * PHP reference and the community gosuccess/digistore24-ipn library, since
 * DS24's own docs describe it imprecisely): remove sha_sign/SHASIGN, sort
 * the remaining keys with a plain case-sensitive string sort (NOT
 * uppercased — the reference implementation's own quickstart calls this
 * with default options, which use original-case keys), skip params whose
 * value is null/""/false, concatenate "key=value<passphrase>" for each in
 * sorted order, then SHA-512 the result and uppercase the hex digest.
 *
 * Getting this wrong either rejects every real IPN (safe but broken) or —
 * far worse — accepts a forged one, which would let anyone grant themselves
 * Premium by POSTing a fake "payment" with no real purchase behind it. Never
 * skip this check.
 */
function buildSignatureString(passphrase: string, params: Record<string, string>): string {
  const keys = Object.keys(params)
    .filter((k) => k !== "sha_sign" && k !== "SHASIGN")
    .filter((k) => params[k] !== "" && params[k] != null)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  return keys.map((key) => `${key}=${params[key]}${passphrase}`).join("");
}

export function computeDigistore24Signature(passphrase: string, params: Record<string, string>): string {
  const shaString = buildSignatureString(passphrase, params);
  return createHash("sha512").update(shaString, "utf8").digest("hex").toUpperCase();
}

export function verifyDigistore24Signature(passphrase: string, params: Record<string, string>): boolean {
  const received = params.sha_sign ?? params.SHASIGN;
  if (!received) return false;

  const expected = computeDigistore24Signature(passphrase, params);

  // Constant-time comparison — signatures are equal-length uppercase hex
  // (128 chars for SHA-512), but guard the length check too since
  // timingSafeEqual throws on mismatched buffer lengths rather than
  // returning false.
  const receivedBuf = Buffer.from(received.toUpperCase());
  const expectedBuf = Buffer.from(expected);
  if (receivedBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(receivedBuf, expectedBuf);
}
