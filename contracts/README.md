# FundEd on-chain contracts (Aiken, Cardano Preprod)

Two validators implementing the core idea: **donations never touch a
personal wallet** — they lock into a smart contract until a milestone is
verified, and the donor receives an equal amount of a new `EDUF` reward
token, minted on-chain in the same transaction.

## Files

- `lib/types.ak` — shared `EscrowDatum` / `EscrowRedeemer` / `MintAction` types.
- `validators/escrow.ak` — locks a donation; releases to the student only
  with the platform admin's signature (milestone verified), or refunds to
  the donor with their own signature.
- `validators/eduf_mint.ak` — mints `EDUF` 1:1 with the lovelace locked by
  the *same transaction*, and only to the donor's own wallet.

## How a donation would work on-chain

One transaction does all of this atomically:

1. Pays `amount_lovelace` to the `escrow` script address, with datum
   `{ donor, student, project_id, amount_lovelace }`.
2. Mints `amount_lovelace` units of `EDUF` under the `eduf_mint` policy
   (parameterized with the escrow script's hash), with redeemer
   `Mint { escrow_output_index, donor }`.
3. Pays those minted `EDUF` tokens to the donor's own wallet.
4. Is signed by the donor.

The minting policy checks steps 1–3 itself by reading the transaction —
nothing is trusted from off-chain claims.

Milestone release is a *separate*, later transaction: spends the escrow
UTXO with redeemer `Release`, signed by the platform's admin key, paying
the locked lovelace to the student's address.

## What's needed before this can run for real

1. **Install the Aiken toolchain** (not present in this environment) and
   run `aiken check` / `aiken build` inside `contracts/` — this compiles
   the validators to a `plutus.json` blueprint and will surface any stdlib
   API drift (exact module names shift slightly between Aiken versions).
2. **Generate the admin key** the app already controls could be reused, or
   a dedicated admin key — its hash gets baked into `escrow` as the
   `admin` parameter, and `eduf_mint` is parameterized with `escrow`'s
   resulting script hash.
3. **Rewrite the off-chain deposit/donation building code**
   ([cardano-treasury.ts](../src/backend/server/cardano-treasury.ts)) to
   build the transaction described above via Lucid Evolution, instead of
   the current "pay the treasury wallet directly" approach — this is a
   meaningful rewrite of `buildUnsignedTreasuryPaymentTx` and the
   confirmation logic in `functions.ts`, plus a milestone-release flow
   that builds the `Release` transaction when an admin approves a
   milestone in the UI.
4. **Track EDUF balances in the UI** — reading native asset balances from
   a connected wallet via CIP-30's `getBalance()`/`getUtxos()` (already
   partly wired in `cardano-wallet.ts`) so donors can see their EDUF
   holdings.

This directory is the contract-design deliverable for the proposal/report;
wiring it into the live app is a separate, substantial next phase.
