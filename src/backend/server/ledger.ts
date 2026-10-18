// Server-only Hyperledger Fabric client. Connects via @hyperledger/fabric-gateway
// (the modern gRPC-based client — not the older fabric-network Wallet SDK) to
// the 2-org network described in fabric/network/README.md. Same `server/`
// import-protection boundary as payhere.ts: identity private keys must never
// reach the client bundle.
//
// This backend process submits transactions as EITHER org (Org1 = platform
// admin actions, Org2 = university verifier actions) — a prototype
// simplification; a real deployment would give the university its own
// backend and identity. Every exported function here matches the chaincode
// surface in fabric/chaincode/funded/lib/fundedContract.js exactly.
//
// Graceful degradation: if the network isn't configured/reachable (e.g. you
// haven't run fabric/network/scripts/deploy-network.sh yet, or you're
// running the deployed Vercel build which can't reach a Fabric network on
// your laptop), every function here logs a warning and returns a
// "unavailable" result instead of throwing — so donations/approvals/etc.
// keep working against MongoDB even with no ledger connected.
import { promises as fs } from "node:fs";
import path from "node:path";
import { createPrivateKey } from "node:crypto";
import * as grpc from "@grpc/grpc-js";
import {
  connect,
  signers,
  type Contract,
  type Gateway,
  type Identity,
  type Network,
  type Signer,
} from "@hyperledger/fabric-gateway";
import { common, peer } from "@hyperledger/fabric-protos";

export type Org = "Org1" | "Org2";

type OrgEnv = {
  mspId: string;
  peerEndpoint: string;
  peerHostAlias: string;
  tlsCertPath: string;
  certPath: string;
  keyPath: string;
};

function readOrgEnv(org: Org): OrgEnv | null {
  const prefix = org === "Org1" ? "FABRIC_ORG1_" : "FABRIC_ORG2_";
  const get = (suffix: string) => process.env[`${prefix}${suffix}`];
  const mspId = get("MSP_ID");
  const peerEndpoint = get("PEER_ENDPOINT");
  const peerHostAlias = get("PEER_HOST_ALIAS");
  const tlsCertPath = get("TLS_CERT_PATH");
  const certPath = get("CERT_PATH");
  const keyPath = get("KEY_PATH");
  if (!mspId || !peerEndpoint || !peerHostAlias || !tlsCertPath || !certPath || !keyPath)
    return null;
  return { mspId, peerEndpoint, peerHostAlias, tlsCertPath, certPath, keyPath };
}

// The keystore directory Fabric's CA tooling generates contains a single
// file with a hash-based name, not a fixed one — accept either that
// directory or the exact file, so users don't have to hunt for the filename.
async function readKeyMaterial(keyPath: string): Promise<Buffer> {
  const stat = await fs.stat(keyPath);
  if (stat.isDirectory()) {
    const files = await fs.readdir(keyPath);
    if (files.length !== 1)
      throw new Error(
        `Expected exactly one file in keystore directory ${keyPath}, found ${files.length}.`,
      );
    return fs.readFile(path.join(keyPath, files[0]));
  }
  return fs.readFile(keyPath);
}

async function newGrpcConnection(env: OrgEnv): Promise<grpc.Client> {
  const tlsRootCert = await fs.readFile(env.tlsCertPath);
  const credentials = grpc.credentials.createSsl(tlsRootCert);
  return new grpc.Client(env.peerEndpoint, credentials, {
    "grpc.ssl_target_name_override": env.peerHostAlias,
  });
}

async function newIdentity(env: OrgEnv): Promise<Identity> {
  const credentials = await fs.readFile(env.certPath);
  return { mspId: env.mspId, credentials };
}

async function newSigner(env: OrgEnv): Promise<Signer> {
  const privateKeyPem = await readKeyMaterial(env.keyPath);
  const privateKey = createPrivateKey(privateKeyPem);
  return signers.newPrivateKeySigner(privateKey);
}

type OrgConnection = {
  gateway: Gateway;
  grpcClient: grpc.Client;
  network: Network;
  contract: Contract;
};

const connections = new Map<Org, Promise<OrgConnection>>();

async function connectOrg(org: Org): Promise<OrgConnection> {
  const env = readOrgEnv(org);
  if (!env) throw new Error(`Fabric env vars for ${org} are not fully set — see .env.example.`);

  const channelName = process.env.FABRIC_CHANNEL_NAME;
  const chaincodeName = process.env.FABRIC_CHAINCODE_NAME;
  if (!channelName || !chaincodeName)
    throw new Error("FABRIC_CHANNEL_NAME / FABRIC_CHAINCODE_NAME are not set.");

  const grpcClient = await newGrpcConnection(env);
  const identity = await newIdentity(env);
  const signer = await newSigner(env);

  const gateway = connect({ client: grpcClient, identity, signer });
  const network = gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);
  return { gateway, grpcClient, network, contract };
}

// Exposed for scripts/fabric-event-listener.ts, which needs the Network
// object itself (chaincode event subscription is a Network-level API, not
// a Contract-level one) — reuses the exact same connection/identity setup
// as every other function in this file rather than duplicating it.
export function getNetwork(org: Org): Promise<Network> {
  let promise = connections.get(org);
  if (!promise) {
    promise = connectOrg(org).catch((err) => {
      connections.delete(org);
      throw err;
    });
    connections.set(org, promise);
  }
  return promise.then((c) => c.network);
}

// Memoized per org, but never caches a rejection — a transient connection
// failure (network not up yet, wrong path) would otherwise permanently
// poison every subsequent call in this process (the exact bug fixed in
// cardano-treasury.ts earlier in this project's history; same fix applies
// here on principle even though this is a fresh implementation).
function getOrgConnection(org: Org): Promise<OrgConnection> {
  let promise = connections.get(org);
  if (!promise) {
    promise = connectOrg(org).catch((err) => {
      connections.delete(org);
      throw err;
    });
    connections.set(org, promise);
  }
  return promise;
}

function getContract(org: Org): Promise<Contract> {
  return getOrgConnection(org).then((c) => c.contract);
}

type LedgerResult<T> = { available: true; data: T } | { available: false; reason: string };

async function submit(org: Org, fn: string, ...args: string[]): Promise<LedgerResult<string>> {
  try {
    const contract = await getContract(org);
    const resultBytes = await contract.submitTransaction(fn, ...args);
    return { available: true, data: Buffer.from(resultBytes).toString("utf8") };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[ledger] ${fn} unavailable (${org}): ${reason}`);
    return { available: false, reason };
  }
}

async function evaluate(org: Org, fn: string, ...args: string[]): Promise<LedgerResult<string>> {
  try {
    const contract = await getContract(org);
    const resultBytes = await contract.evaluateTransaction(fn, ...args);
    return { available: true, data: Buffer.from(resultBytes).toString("utf8") };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[ledger] ${fn} unavailable (${org}): ${reason}`);
    return { available: false, reason };
  }
}

function fakeTxId(prefix: string): string {
  return `${prefix}_unavailable_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// -- public API (mirrors fabric/chaincode/funded/lib/fundedContract.js) -----

export type MilestoneSpec = { milestoneId: string; title: string; targetPercent: number };

export async function createCampaign(
  campaignId: string,
  title: string,
  targetAmountLKR: number,
  milestones: MilestoneSpec[],
  beneficiaryReference?: string,
): Promise<{ ledgerTxId: string }> {
  const result = await submit(
    "Org1",
    "createCampaign",
    campaignId,
    title,
    String(targetAmountLKR),
    JSON.stringify(milestones),
    beneficiaryReference ?? "",
  );
  if (!result.available) return { ledgerTxId: fakeTxId("campaign") };
  return { ledgerTxId: campaignId }; // createCampaign's own tx has no separate id surfaced by the chaincode return value
}

// Creates the campaign on the ledger the first time it's needed (e.g. right
// before a project's first contribution/disbursement) — idempotent, since
// the chaincode itself rejects a duplicate createCampaign, which we treat
// as success here.
export async function ensureCampaign(
  campaignId: string,
  title: string,
  targetAmountLKR: number,
  milestones: MilestoneSpec[],
  beneficiaryReference?: string,
): Promise<void> {
  const existing = await evaluate("Org1", "queryCampaign", campaignId);
  if (existing.available) return;
  await createCampaign(campaignId, title, targetAmountLKR, milestones, beneficiaryReference);
}

export async function recordContribution(
  campaignId: string,
  contributionId: string,
  amountLKR: number,
  payhereOrderId: string,
  payherePaymentId: string | undefined,
  timestamp: string,
): Promise<{ ledgerTxId: string; available: boolean }> {
  const result = await submit(
    "Org1",
    "recordContribution",
    campaignId,
    contributionId,
    String(amountLKR),
    payhereOrderId,
    payherePaymentId ?? "",
    timestamp,
  );
  if (!result.available) return { ledgerTxId: fakeTxId("contrib"), available: false };
  const parsed = JSON.parse(result.data) as { ledgerTxId: string };
  return { ledgerTxId: parsed.ledgerTxId, available: true };
}

export async function submitMilestoneEvidence(
  campaignId: string,
  milestoneId: string,
  evidenceHash: string,
): Promise<{ ledgerTxId: string; available: boolean }> {
  const result = await submit(
    "Org1",
    "submitMilestoneEvidence",
    campaignId,
    milestoneId,
    evidenceHash,
  );
  return {
    ledgerTxId: result.available ? campaignId : fakeTxId("evidence"),
    available: result.available,
  };
}

export type ApproverOrg = Org;
export type ApprovalDecision = "approve" | "reject";

export async function approveMilestone(
  campaignId: string,
  milestoneId: string,
  approverOrg: ApproverOrg,
  decision: ApprovalDecision,
): Promise<{ ledgerTxId: string; fullyApproved: boolean; available: boolean }> {
  const result = await submit(
    approverOrg,
    "approveMilestone",
    campaignId,
    milestoneId,
    approverOrg,
    decision,
  );
  if (!result.available)
    return { ledgerTxId: fakeTxId("approval"), fullyApproved: false, available: false };
  const parsed = JSON.parse(result.data) as { fullyApproved: boolean };
  return { ledgerTxId: campaignId, fullyApproved: parsed.fullyApproved, available: true };
}

export async function authoriseDisbursement(
  campaignId: string,
  milestoneId: string,
): Promise<{ ledgerTxId: string; amountLKR?: number; available: boolean }> {
  const result = await submit("Org1", "authoriseDisbursement", campaignId, milestoneId);
  if (!result.available) return { ledgerTxId: fakeTxId("disbursement"), available: false };
  const parsed = JSON.parse(result.data) as { ledgerTxId: string; amountLKR: number };
  return { ledgerTxId: parsed.ledgerTxId, amountLKR: parsed.amountLKR, available: true };
}

export async function queryCampaign(campaignId: string): Promise<unknown | null> {
  const result = await evaluate("Org1", "queryCampaign", campaignId);
  return result.available ? JSON.parse(result.data) : null;
}

export async function queryContributions(campaignId: string): Promise<unknown[]> {
  const result = await evaluate("Org1", "queryContributions", campaignId);
  return result.available ? (JSON.parse(result.data) as unknown[]) : [];
}

export async function queryDisbursements(campaignId: string): Promise<unknown[]> {
  const result = await evaluate("Org1", "queryDisbursements", campaignId);
  return result.available ? (JSON.parse(result.data) as unknown[]) : [];
}

// peer.TxValidationCode enum values (fabric-protos ships this as plain
// numbers, not a lookup table) — see fabric-protos-go/peer/transaction.pb.go.
const VALIDATION_CODE_NAMES: Record<number, string> = {
  0: "VALID",
  1: "NIL_ENVELOPE",
  2: "BAD_PAYLOAD",
  3: "BAD_COMMON_HEADER",
  4: "BAD_CREATOR_SIGNATURE",
  5: "INVALID_ENDORSER_TRANSACTION",
  6: "INVALID_CONFIG_TRANSACTION",
  7: "UNSUPPORTED_TX_PAYLOAD",
  8: "BAD_PROPOSAL_TXID",
  9: "DUPLICATE_TXID",
  10: "ENDORSEMENT_POLICY_FAILURE",
  11: "MVCC_READ_CONFLICT",
  12: "PHANTOM_READ_CONFLICT",
  13: "UNKNOWN_TX_TYPE",
  14: "TARGET_CHAIN_NOT_FOUND",
  15: "MARSHAL_TX_ERROR",
  16: "NIL_TXACTION",
  17: "EXPIRED_CHAINCODE",
  18: "CHAINCODE_VERSION_CONFLICT",
  19: "BAD_HEADER_EXTENSION",
  20: "BAD_CHANNEL_HEADER",
  21: "BAD_RESPONSE_PAYLOAD",
  22: "BAD_RWSET",
  23: "ILLEGAL_WRITESET",
  24: "INVALID_WRITESET",
  25: "INVALID_CHAINCODE",
  254: "NOT_VALIDATED",
  255: "INVALID_OTHER_REASON",
};

export type LedgerTransactionDetails = {
  txId: string;
  channelName: string;
  blockNumber: string;
  blockDataHash: string;
  previousBlockHash: string;
  validationCode: string;
};

// Raw ledger proof for a single transaction, read straight off the chain via
// Fabric's built-in qscc (query system chaincode) rather than our own
// chaincode's state — this is what actually shows a donor "the original
// blockchain side" (block number, block hash, validation status), on top of
// the app-formatted campaign/contribution view queryCampaign/
// queryContributions already provide.
export async function getTransactionDetails(
  txId: string,
): Promise<LedgerResult<LedgerTransactionDetails>> {
  try {
    const channelName = process.env.FABRIC_CHANNEL_NAME;
    if (!channelName) throw new Error("FABRIC_CHANNEL_NAME is not set.");

    const conn = await getOrgConnection("Org1");
    const qscc = conn.network.getContract("qscc");

    const [blockBytes, txBytes] = await Promise.all([
      qscc.evaluateTransaction("GetBlockByTxID", channelName, txId),
      qscc.evaluateTransaction("GetTransactionByID", channelName, txId),
    ]);

    // fabric-protos ships the google-protobuf JS runtime (getter methods,
    // deserializeBinary), not protobufjs plain objects.
    const header = common.Block.deserializeBinary(blockBytes).getHeader();
    const processedTx = peer.ProcessedTransaction.deserializeBinary(txBytes);
    const validationCode = processedTx.getValidationcode();

    const data: LedgerTransactionDetails = {
      txId,
      channelName,
      blockNumber: header ? header.getNumber().toString() : "0",
      blockDataHash: Buffer.from(header?.getDataHash_asU8() ?? []).toString("hex"),
      previousBlockHash: Buffer.from(header?.getPreviousHash_asU8() ?? []).toString("hex"),
      validationCode: VALIDATION_CODE_NAMES[validationCode] ?? `UNKNOWN(${validationCode})`,
    };
    return { available: true, data };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[ledger] getTransactionDetails unavailable: ${reason}`);
    return { available: false, reason };
  }
}
