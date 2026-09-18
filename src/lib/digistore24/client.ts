export function isDigistore24Configured(): boolean {
  return Boolean(process.env.DIGISTORE24_IPN_PASSPHRASE);
}
