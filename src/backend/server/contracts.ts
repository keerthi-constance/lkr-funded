// Server-only: compiles the FundEd Aiken contracts (contracts/plutus.json,
// built via `aiken build` in contracts/) into concrete, parameter-applied
// scripts usable by Lucid Evolution. Never imported from client code — same
// import-protection boundary as cardano-treasury.ts.
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applyParamsToScript,
  validatorToAddress,
  validatorToScriptHash,
  mintingPolicyToId,
  getAddressDetails,
  Data,
  type Script,
} from "@lucid-evolution/lucid";
import { getTreasuryLucid } from "./cardano-treasury";

// Rs per ADA — mirrors src/lib/mock-data.ts's ADA_RATE and functions.ts's
// own copy. Baked into the eduf_mint validator as a compile-time parameter,
// so all three must be kept in sync if this ever changes.
export const ADA_RATE = 172;
export const EDUF_PER_RS = 10;

export const EDUF_ASSET_NAME_HEX = Buffer.from("EDUF", "utf8").toString("hex");

const EscrowDatumSchema = Data.Object({
  donor: Data.Bytes(),
  student: Data.Bytes(),
  project_id: Data.Bytes(),
  amount_lovelace: Data.Integer(),
  rs_amount: Data.Integer(),
});
export type EscrowDatumT = Data.Static<typeof EscrowDatumSchema>;
// Data.to()/Data.from() are generic over the *data* shape and require the
// schema argument to be typed as that same shape to satisfy TS — this cast
// is a no-op at runtime (the real TypeBox schema object is what's actually
// used), it only exists to make the compiler happy.
export const EscrowDatumShape = EscrowDatumSchema as unknown as EscrowDatumT;

const EscrowRedeemerSchema = Data.Enum([Data.Literal("Release"), Data.Literal("Refund")]);
export type EscrowRedeemerT = Data.Static<typeof EscrowRedeemerSchema>;
export const EscrowRedeemerShape = EscrowRedeemerSchema as unknown as EscrowRedeemerT;

const MintActionSchema = Data.Enum([
  Data.Object({
    Mint: Data.Object({ escrow_output_index: Data.Integer(), donor: Data.Bytes() }),
  }),
  Data.Literal("Burn"),
]);
export type MintActionT = Data.Static<typeof MintActionSchema>;
export const MintActionShape = MintActionSchema as unknown as MintActionT;

type Blueprint = {
  preamble: {
    plutusVersion: string;
    compiler: { name: string; version: string };
  };
  validators: { title: string; compiledCode: string }[];
};

function loadBlueprint(): Blueprint {
  const blueprintPath = path.join(process.cwd(), "contracts", "plutus.json");
  return JSON.parse(readFileSync(blueprintPath, "utf8"));
}

function findValidator(blueprint: Blueprint, title: string) {
  const validator = blueprint.validators.find((v) => v.title === title);
  if (!validator) {
    throw new Error(`Validator "${title}" not found in contracts/plutus.json — run \`aiken build\` inside contracts/.`);
  }
  return validator;
}

export type CompiledContracts = {
  escrowScript: Script;
  escrowAddress: string;
  escrowScriptHash: string;
  edufMintScript: Script;
  edufPolicyId: string;
  edufUnit: string;
  adminKeyHash: string;
};

let cached: Promise<CompiledContracts> | undefined;

// Applies the treasury's own key hash as the escrow's `admin` parameter (the
// same key that already signs withdrawals acts as the milestone-release
// authority), then applies escrow's resulting script hash + ADA_RATE to the
// eduf_mint policy. Memoized — both scripts are deterministic given the same
// admin key and blueprint, so this only needs to run once per process.
export function getContracts(): Promise<CompiledContracts> {
  if (!cached) {
    cached = (async () => {
      const blueprint = loadBlueprint();
      const treasuryLucid = await getTreasuryLucid();
      const treasuryAddress = await treasuryLucid.wallet().address();
      const adminKeyHash = getAddressDetails(treasuryAddress).paymentCredential?.hash;
      if (!adminKeyHash) throw new Error("Could not derive a payment key hash from the treasury address for the escrow admin parameter.");

      const escrowValidator = findValidator(blueprint, "escrow.escrow.spend");
      const escrowCompiled = applyParamsToScript(escrowValidator.compiledCode, [adminKeyHash]);
      const escrowScript: Script = { type: "PlutusV3", script: escrowCompiled };
      const escrowScriptHash = validatorToScriptHash(escrowScript);
      const escrowAddress = validatorToAddress("Preprod", escrowScript);

      const edufValidator = findValidator(blueprint, "eduf_mint.eduf_mint.mint");
      const edufCompiled = applyParamsToScript(edufValidator.compiledCode, [escrowScriptHash, BigInt(ADA_RATE)]);
      const edufMintScript: Script = { type: "PlutusV3", script: edufCompiled };
      const edufPolicyId = mintingPolicyToId(edufMintScript);
      const edufUnit = edufPolicyId + EDUF_ASSET_NAME_HEX;

      return { escrowScript, escrowAddress, escrowScriptHash, edufMintScript, edufPolicyId, edufUnit, adminKeyHash };
    })();
  }
  return cached;
}

// Public, non-secret identity of the deployed contracts — safe to hand to any
// visitor. Deliberately omits adminKeyHash and the compiled scripts: donors
// only need to be able to look the escrow and policy up on an explorer.
export type ContractSummary = {
  network: string;
  plutusVersion: string;
  compiler: string;
  adaRate: number;
  edufPerRs: number;
  edufAssetName: string;
  escrowAddress: string | null;
  escrowScriptHash: string | null;
  edufPolicyId: string | null;
  /// Set when the on-chain addresses couldn't be derived (treasury key or
  /// Blockfrost unreachable). The contract's *rules* are still shown, so the
  /// viewer degrades to the blueprint-only view instead of failing outright.
  unavailableReason: string | null;
};

export async function getContractSummary(): Promise<ContractSummary> {
  const { preamble } = loadBlueprint();
  const blueprintOnly = {
    network: "Cardano Preprod",
    plutusVersion: preamble.plutusVersion,
    compiler: `${preamble.compiler.name} ${preamble.compiler.version}`,
    adaRate: ADA_RATE,
    edufPerRs: EDUF_PER_RS,
    edufAssetName: "EDUF",
  };

  try {
    const contracts = await getContracts();
    return {
      ...blueprintOnly,
      escrowAddress: contracts.escrowAddress,
      escrowScriptHash: contracts.escrowScriptHash,
      edufPolicyId: contracts.edufPolicyId,
      unavailableReason: null,
    };
  } catch (err) {
    // Keep the real cause server-side — it names env vars — and hand the
    // client a generic message.
    console.error("Could not derive contract addresses for the public summary:", err);
    return {
      ...blueprintOnly,
      escrowAddress: null,
      escrowScriptHash: null,
      edufPolicyId: null,
      unavailableReason: "On-chain addresses are temporarily unavailable.",
    };
  }
}
