// Server-only Cardano treasury integration (preprod testnet). Builds, signs,
// and submits real transactions via Lucid Evolution + Blockfrost. Never
// imported from client code — the project's import-protection plugin blocks
// any `**/server/**` module from reaching the client bundle at build time.
import { Lucid, Blockfrost, CML, coreToUtxo, getAddressDetails, Data, type LucidEvolution, type UTxO } from "@lucid-evolution/lucid";

// Mirrors Lucid Evolution's internal (unexported) TransactionMetadata type —
// booleans aren't valid Cardano metadata values, only string/number/bytes/nested.
export type TreasuryMetadata = string | number | ReadonlyArray<TreasuryMetadata> | { [key: string]: TreasuryMetadata };
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { TreasuryLockModel } from "../models";
import { getContracts, EscrowDatumShape, EscrowRedeemerShape, MintActionShape, EDUF_PER_RS, type EscrowDatumT, type MintActionT } from "./contracts";

const TREASURY_PAYMENT_METADATA_LABEL = 674;
const NETWORK_URL = "https://cardano-preprod.blockfrost.io/api/v0";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set.`);
  return value;
}

function getBlockfrostProjectId() {
  return requireEnv("BLOCKFROST_PROJECT_ID");
}

let blockfrostApi: BlockFrostAPI | undefined;
function getBlockfrostApi(): BlockFrostAPI {
  if (!blockfrostApi) blockfrostApi = new BlockFrostAPI({ projectId: getBlockfrostProjectId() });
  return blockfrostApi;
}

let treasuryLucid: Promise<LucidEvolution> | undefined;
export function getTreasuryLucid(): Promise<LucidEvolution> {
  if (!treasuryLucid) {
    treasuryLucid = (async () => {
      const provider = new Blockfrost(NETWORK_URL, getBlockfrostProjectId());
      const lucid = await Lucid(provider, "Preprod");
      lucid.selectWallet.fromSeed(requireEnv("TREASURY_MNEMONIC"));
      return lucid;
    })();
  }
  return treasuryLucid;
}

export async function getTreasuryAddress(): Promise<string> {
  const lucid = await getTreasuryLucid();
  return lucid.wallet().address();
}

function utxosCborToLucidUtxos(utxosCbor: string[]): UTxO[] {
  return utxosCbor.map((hex) => coreToUtxo(CML.TransactionUnspentOutput.from_cbor_hex(hex)));
}

function requirePaymentKeyHash(address: string, label: string): string {
  const hash = getAddressDetails(address).paymentCredential?.hash;
  if (!hash) throw new Error(`Could not derive a payment key hash from the ${label} address.`);
  return hash;
}

// Builds an unsigned tx paying the treasury address from the caller's own
// wallet (identified only by its own UTXOs/change address — no key material
// touches the server). The caller signs+submits it themselves via CIP-30.
// `metadata` is attached under label 674 and is what confirmTx-style callers
// re-derive truth from later — never trust a client's own claims about it.
export async function buildUnsignedTreasuryPaymentTx(params: {
  changeAddress: string;
  utxosCbor: string[];
  amountLovelace: number;
  metadata: Record<string, TreasuryMetadata>;
}): Promise<string> {
  const treasuryAddress = await getTreasuryAddress();
  // Fresh instance per call: selectWallet.fromAddress mutates instance state,
  // and this must never share state with the treasury's own signing instance.
  const provider = new Blockfrost(NETWORK_URL, getBlockfrostProjectId());
  const lucid = await Lucid(provider, "Preprod");
  const utxos = utxosCborToLucidUtxos(params.utxosCbor);
  lucid.selectWallet.fromAddress(params.changeAddress, utxos);

  const tx = await lucid
    .newTx()
    .pay.ToAddress(treasuryAddress, { lovelace: BigInt(params.amountLovelace) })
    .attachMetadata(TREASURY_PAYMENT_METADATA_LABEL, params.metadata)
    .complete();

  return tx.toCBOR();
}

// Assembles an unsigned tx (built above) with the wallet's witness set and
// submits it via Blockfrost. Runs entirely server-side — the client never
// needs its own submission path, keeping every kind of submission consistent.
export async function assembleAndSubmitTx(params: {
  unsignedTxCbor: string;
  witnessCbor: string;
}): Promise<string> {
  // Lucid Evolution's tx completion/submit path requires *some* wallet
  // selected on the instance (for its submitTx capability) even though the
  // donor's own signature is already attached below via .assemble() — an
  // instance with no wallet at all throws MISSING_WALLET here. Reusing the
  // treasury's instance doesn't add an extra signature; only .assemble()'s
  // explicit witness ends up on the finished tx.
  const lucid = await getTreasuryLucid();
  const signed = await lucid.fromTx(params.unsignedTxCbor).assemble([params.witnessCbor]).complete();
  return signed.submit();
}

export async function buildAndSubmitWithdrawalTx(params: {
  toAddress: string;
  amountLovelace: number;
}): Promise<string> {
  const lucid = await getTreasuryLucid();
  const tx = await lucid
    .newTx()
    .pay.ToAddress(params.toAddress, { lovelace: BigInt(params.amountLovelace) })
    .complete();
  const signed = await tx.sign.withWallet().complete();
  return signed.submit();
}

// Builds an unsigned tx that locks a donation into the escrow contract (not
// a plain wallet) and mints EDUF 1:10 against the Rs amount, in one atomic
// transaction — both enforced on-chain by the validators in contracts/, not
// just by this off-chain code. The donor signs+submits it themselves.
export async function buildUnsignedDonationLockTx(params: {
  changeAddress: string;
  utxosCbor: string[];
  amountLovelace: number;
  rsAmount: number;
  projectSlug: string;
  studentWalletAddress: string;
}): Promise<{ unsignedTxCbor: string; edufQty: number }> {
  const { escrowAddress, edufMintScript, edufUnit } = await getContracts();

  const donorKeyHash = requirePaymentKeyHash(params.changeAddress, "donor");
  const studentKeyHash = requirePaymentKeyHash(params.studentWalletAddress, "student");
  const projectIdHex = Buffer.from(params.projectSlug, "utf8").toString("hex");
  const edufQty = BigInt(EDUF_PER_RS) * BigInt(params.rsAmount);

  const datum: EscrowDatumT = {
    donor: donorKeyHash,
    student: studentKeyHash,
    project_id: projectIdHex,
    amount_lovelace: BigInt(params.amountLovelace),
    rs_amount: BigInt(params.rsAmount),
  };
  const datumCbor = Data.to(datum, EscrowDatumShape);

  // escrow_output_index: 0n — the escrow-locking .pay.ToContract() call below
  // is the first output added, so it lands at index 0 before Lucid appends
  // the EDUF payout output and any change output.
  const mintRedeemer: MintActionT = { Mint: { escrow_output_index: 0n, donor: donorKeyHash } };
  const mintRedeemerCbor = Data.to(mintRedeemer, MintActionShape);

  const provider = new Blockfrost(NETWORK_URL, getBlockfrostProjectId());
  const lucid = await Lucid(provider, "Preprod");
  const utxos = utxosCborToLucidUtxos(params.utxosCbor);
  lucid.selectWallet.fromAddress(params.changeAddress, utxos);

  const tx = await lucid
    .newTx()
    .pay.ToContract(escrowAddress, { kind: "inline", value: datumCbor }, { lovelace: BigInt(params.amountLovelace) })
    .mintAssets({ [edufUnit]: edufQty }, mintRedeemerCbor)
    .attach.MintingPolicy(edufMintScript)
    .pay.ToAddress(params.changeAddress, { [edufUnit]: edufQty })
    .addSignerKey(donorKeyHash)
    .complete();

  return { unsignedTxCbor: tx.toCBOR(), edufQty: Number(edufQty) };
}

// Spends every escrow UTXO currently locked for a project (identified by its
// slug, read back out of each UTXO's own on-chain datum — never trusted from
// off-chain input) to the student's wallet, signed by the treasury/admin key.
// Simplification: releases the project's *entire* current escrow balance in
// one transaction rather than an exact per-milestone fraction — appropriate
// for a final/whole-project release; splitting a specific milestone's share
// across many donor-locked UTXOs would need real coin-selection logic.
export async function buildAndSubmitMilestoneReleaseTx(params: {
  projectSlug: string;
  studentWalletAddress: string;
}): Promise<{ txHash: string; releasedLovelace: number }> {
  const { escrowAddress, escrowScript, adminKeyHash } = await getContracts();
  const lucid = await getTreasuryLucid();

  const projectIdHex = Buffer.from(params.projectSlug, "utf8").toString("hex");
  const allEscrowUtxos = await lucid.utxosAt(escrowAddress);

  const matching = allEscrowUtxos.filter((utxo) => {
    if (!utxo.datum) return false;
    try {
      const parsed = Data.from(utxo.datum, EscrowDatumShape);
      return parsed.project_id === projectIdHex;
    } catch {
      return false;
    }
  });

  if (matching.length === 0) throw new Error("No escrow funds are currently locked for this project.");

  const totalLovelace = matching.reduce((sum, utxo) => sum + (utxo.assets.lovelace ?? 0n), 0n);
  const releaseRedeemerCbor = Data.to("Release" as const, EscrowRedeemerShape);

  const tx = await lucid
    .newTx()
    .collectFrom(matching, releaseRedeemerCbor)
    .attach.SpendingValidator(escrowScript)
    .pay.ToAddress(params.studentWalletAddress, { lovelace: totalLovelace })
    .addSignerKey(adminKeyHash)
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();
  return { txHash, releasedLovelace: Number(totalLovelace) };
}

export type EscrowLockInfo = { projectIdHex: string; lovelace: bigint } | "pending" | null;

// Reads back the escrow output actually created by a donation tx — the
// output's own inline datum, not any off-chain claim — and returns the
// project it locked for plus the real lovelace amount. Returns "pending"
// while Blockfrost hasn't indexed the tx yet, distinct from `null` (tx
// exists but never paid the escrow contract at all).
export async function queryEscrowLockOnChain(txHash: string, escrowAddress: string): Promise<EscrowLockInfo> {
  const api = getBlockfrostApi();
  let utxos: Awaited<ReturnType<typeof api.txsUtxos>>;
  try {
    utxos = await api.txsUtxos(txHash);
  } catch {
    // Blockfrost 404s for unconfirmed/unknown txs.
    return "pending";
  }

  const escrowOutput = utxos.outputs.find((o) => o.address === escrowAddress && o.inline_datum);
  if (!escrowOutput?.inline_datum) return null;

  let parsed: EscrowDatumT;
  try {
    parsed = Data.from(escrowOutput.inline_datum, EscrowDatumShape);
  } catch {
    return null;
  }

  const lovelace = BigInt(escrowOutput.amount.find((a) => a.unit === "lovelace")?.quantity ?? "0");
  return { projectIdHex: parsed.project_id, lovelace };
}

export type OnChainTxInfo = {
  outputs: { address: string; lovelace: bigint }[];
  metadata: Record<string, unknown> | undefined;
};

// Independently verifies a submitted tx against chain data — never trust a
// client's claimed metadata/amount, only what's actually on-chain.
export async function queryTxOnChain(txHash: string): Promise<OnChainTxInfo | null> {
  const api = getBlockfrostApi();
  try {
    const utxos = await api.txsUtxos(txHash);
    const outputs = utxos.outputs.map((o) => ({
      address: o.address,
      lovelace: BigInt(o.amount.find((a) => a.unit === "lovelace")?.quantity ?? "0"),
    }));

    let metadata: Record<string, unknown> | undefined;
    try {
      const metadataEntries = await api.txsMetadata(txHash);
      const entry = metadataEntries.find((m) => Number(m.label) === TREASURY_PAYMENT_METADATA_LABEL);
      if (entry?.json_metadata && typeof entry.json_metadata === "object") {
        metadata = entry.json_metadata as Record<string, unknown>;
      }
    } catch {
      // no metadata attached — metadata stays undefined, caller rejects.
    }

    return { outputs, metadata };
  } catch {
    // Blockfrost 404s for unconfirmed/unknown txs — caller treats as "not yet confirmed".
    return null;
  }
}

const LOCK_ID = "treasury";
const LOCK_STALE_MS = 60_000;

export async function acquireTreasuryLock(): Promise<boolean> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOCK_STALE_MS);

  const acquired = await TreasuryLockModel.findOneAndUpdate(
    { _id: LOCK_ID, $or: [{ locked: false }, { locked: { $exists: false } }, { lockedAt: { $lt: staleBefore } }] },
    { _id: LOCK_ID, locked: true, lockedAt: now },
    { upsert: true, new: true }
  ).catch(() => null);

  return Boolean(acquired);
}

export async function releaseTreasuryLock(): Promise<void> {
  await TreasuryLockModel.updateOne({ _id: LOCK_ID }, { locked: false });
}
