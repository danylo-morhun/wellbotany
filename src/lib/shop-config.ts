// Shop details that the owner fills in via env. Missing values render a
// visible placeholder so they are easy to spot before launch.
function envOrPlaceholder(name: string, placeholder: string): string {
  return process.env[name]?.trim() || `[UZUPEŁNIJ: ${placeholder}]`;
}

export const BANK_TRANSFER_DETAILS = {
  recipient: envOrPlaceholder("SHOP_BANK_RECIPIENT", "odbiorca przelewu"),
  account: envOrPlaceholder("SHOP_BANK_ACCOUNT", "numer rachunku"),
};
