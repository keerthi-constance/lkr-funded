// Client-only, dependency-free CIP-30 connector for real Cardano browser
// wallets (Nami, Eternl, Lace). No SDK — just the raw window.cardano API,
// a minimal CBOR-uint decoder for getBalance(), and a bech32 encoder for
// turning the raw address bytes CIP-30 returns into a normal "addr1..."
// string. Kept dependency-free so it never leaks into the SSR/server bundle.

export const SUPPORTED_WALLETS = ["nami", "eternl", "lace"] as const;
export type WalletKey = (typeof SUPPORTED_WALLETS)[number];

export const WALLET_LABELS: Record<WalletKey, { name: string; desc: string }> = {
  nami: { name: "Nami", desc: "Popular Cardano browser wallet" },
  eternl: { name: "Eternl", desc: "Feature-rich multi-account wallet" },
  lace: { name: "Lace", desc: "Official IOG wallet" },
};

type Cip30Api = {
  getChangeAddress: () => Promise<string>;
  getUsedAddresses: () => Promise<string[]>;
  getBalance: () => Promise<string>;
};

type Cip30Wallet = { enable: () => Promise<Cip30Api> };

export function getInstalledWalletKeys(): WalletKey[] {
  if (typeof window === "undefined") return [];
  const cardano = (window as unknown as { cardano?: Record<string, Cip30Wallet> }).cardano;
  if (!cardano) return [];
  return SUPPORTED_WALLETS.filter((key) => key in cardano);
}

export type ConnectedWallet = {
  key: WalletKey;
  address: string;
  balanceAda: number;
};

// --- hex helpers ---
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

// --- minimal CBOR unsigned-int decoder (RFC 8949 major type 0), plus
// enough of major type 4 (array) to unwrap CIP-30's `[coin, multiasset]` ---
function readCborUint(bytes: Uint8Array, offset: number): { value: bigint; offset: number } {
  const first = bytes[offset];
  const additionalInfo = first & 0x1f;
  offset++;
  if (additionalInfo < 24) return { value: BigInt(additionalInfo), offset };
  let len = 0;
  if (additionalInfo === 24) len = 1;
  else if (additionalInfo === 25) len = 2;
  else if (additionalInfo === 26) len = 4;
  else if (additionalInfo === 27) len = 8;
  let value = 0n;
  for (let i = 0; i < len; i++) value = (value << 8n) | BigInt(bytes[offset + i]);
  return { value, offset: offset + len };
}

function parseLovelaceFromBalanceCbor(hex: string): bigint {
  const bytes = hexToBytes(hex);
  const majorType = bytes[0] >> 5;
  if (majorType === 4) {
    // array [coin, multiasset<uint>] — coin is the first element, right after the array header byte
    return readCborUint(bytes, 1).value;
  }
  return readCborUint(bytes, 0).value;
}

// --- bech32 (BIP-173) encoder, used to turn CIP-30's raw address bytes
// into the human-readable "addr1..." / "addr_test1..." form ---
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = [...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const mod = bech32Polymod(values) ^ 1;
  const ret: number[] = [];
  for (let p = 0; p < 6; p++) ret.push((mod >> (5 * (5 - p))) & 31);
  return ret;
}

function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) ret.push((acc << (toBits - bits)) & maxv);
  return ret;
}

function bytesToBech32Address(bytes: Uint8Array): string {
  const networkId = bytes[0] & 0x0f;
  const hrp = networkId === 1 ? "addr" : "addr_test";
  const data = convertBits(bytes, 8, 5, true);
  return hrp + "1" + [...data, ...bech32CreateChecksum(hrp, data)].map((d) => BECH32_CHARSET[d]).join("");
}

export async function connectWallet(key: WalletKey): Promise<ConnectedWallet> {
  const cardano = (window as unknown as { cardano?: Record<string, Cip30Wallet> }).cardano;
  const provider = cardano?.[key];
  if (!provider) throw new Error(`${WALLET_LABELS[key].name} extension not found.`);

  const api = await provider.enable();
  const addresses = await api.getUsedAddresses();
  const changeAddress = addresses[0] ?? (await api.getChangeAddress());
  const balanceHex = await api.getBalance();

  const lovelace = parseLovelaceFromBalanceCbor(balanceHex);
  const address = bytesToBech32Address(hexToBytes(changeAddress));

  return { key, address, balanceAda: Number(lovelace) / 1_000_000 };
}
