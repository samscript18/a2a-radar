const VARA_DECIMALS = 12n;
const VARA_UNIT = 10n ** VARA_DECIMALS;

export function shortenAddress(address: string, head = 6, tail = 5): string {
  if (!address) return "not indexed";
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function formatRawVara(raw: string | number | bigint | undefined): string {
  if (raw === undefined || raw === null || raw === "") return "0 VARA";
  const value = BigInt(raw);
  const whole = value / VARA_UNIT;
  const fraction = value % VARA_UNIT;
  const fractionText = fraction.toString().padStart(Number(VARA_DECIMALS), "0").slice(0, 4).replace(/0+$/, "");
  return `${whole.toString()}${fractionText ? `.${fractionText}` : ""} VARA`;
}

export function formatDateTime(value: string | number | undefined): string {
  if (!value) return "not indexed yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "not indexed yet";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
