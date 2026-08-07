// Client-only, dependency-free CIP-30 connector for the real Eternl
// Cardano browser wallet. No SDK — just the raw window.cardano API,
// a minimal CBOR-uint decoder for getBalance(), and a bech32 encoder for
// turning the raw address bytes CIP-30 returns into a normal "addr1..."
// string. Kept dependency-free so it never leaks into the SSR/server bundle.

export const SUPPORTED_WALLETS = ["eternl"] as const;
export type WalletKey = (typeof SUPPORTED_WALLETS)[number];

export const WALLET_LABELS: Record<WalletKey, { name: string; desc: string }> = {
  eternl: { name: "Eternl", desc: "Feature-rich multi-account wallet" },
};

export type Cip30Api = {
  getChangeAddress: () => Promise<string>;
  getUsedAddresses: () => Promise<string[]>;
  getBalance: () => Promise<string>;
  getUtxos: () => Promise<string[] | undefined>;
  signTx: (txCbor: string, partialSign?: boolean) => Promise<string>;
  submitTx: (signedTxCbor: string) => Promise<string>;
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
  // Raw CIP-30 api, only present for a real (non-mock) connection. Used to
  // sign/submit deposit transactions built server-side — never leaves the browser.
  api?: Cip30Api;
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

function describeWalletError(err: unknown, walletName: string): string {
  const raw = err instanceof Error ? err.message : "";
  if (raw && /timed?\s*out/i.test(raw)) {
    return `${walletName} didn't respond in time. Open the ${walletName} extension icon, make sure it's unlocked, then click ${walletName} here again.`;
  }
  if (raw) return raw;
  if (err && typeof err === "object") {
    const e = err as { code?: number; info?: string; message?: string };
    if (e.code === -3) return `Connection to ${walletName} was refused. Approve the connection request in the wallet popup.`;
    if (e.info) return e.info;
    if (e.message) return e.message;
  }
  return `Could not connect to ${walletName}. Make sure the extension is unlocked and try again.`;
}

// Toggle this to switch between a real CIP-30 connection and a simulated
// one. Mock mode needs no browser extension installed at all — useful for
// demos/thesis defenses where installing a wallet isn't practical. Flip to
// false once a real Eternl wallet is available to connect to.
const MOCK_MODE = false;

function randomHex(bytes: number): string {
  let out = "";
  for (let i = 0; i < bytes; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

async function connectWalletMock(key: WalletKey): Promise<ConnectedWallet> {
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const address = "addr1" + randomHex(58);
  const balanceAda = Math.round((500 + Math.random() * 5000) * 100) / 100;
  return { key, address, balanceAda };
}

async function connectWalletReal(key: WalletKey): Promise<ConnectedWallet> {
  const cardano = (window as unknown as { cardano?: Record<string, Cip30Wallet> }).cardano;
  const provider = cardano?.[key];
  const walletName = WALLET_LABELS[key].name;
  if (!provider) {
    throw new Error(
      `${walletName} extension not found in this browser. Install it from the ${walletName} website, then reload this page.`
    );
  }

  let api: Cip30Api;
  try {
    api = await provider.enable();
  } catch (err) {
    throw new Error(describeWalletError(err, walletName));
  }

  try {
    const addresses = await api.getUsedAddresses();
    const changeAddress = addresses[0] ?? (await api.getChangeAddress());
    const balanceHex = await api.getBalance();

    const lovelace = parseLovelaceFromBalanceCbor(balanceHex);
    const address = bytesToBech32Address(hexToBytes(changeAddress));

    return { key, address, balanceAda: Number(lovelace) / 1_000_000, api };
  } catch (err) {
    throw new Error(`Connected to ${walletName}, but couldn't read the wallet address/balance: ${describeWalletError(err, walletName)}`);
  }
}

export async function connectWallet(key: WalletKey): Promise<ConnectedWallet> {
  return MOCK_MODE ? connectWalletMock(key) : connectWalletReal(key);
}

// CIP-30's signTx always returns just a witness set (per spec), never a fully
// assembled tx — it must be combined with the original tx body before
// submission. We hand that witness back to the server (which already built
// the unsigned tx and holds a provider connection) to assemble + submit,
// rather than reassembling a Cardano tx client-side.
export async function signTxWitness(api: Cip30Api, unsignedTxCbor: string): Promise<string> {
  return api.signTx(unsignedTxCbor, true);
}
