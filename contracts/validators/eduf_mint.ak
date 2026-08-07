//// EDUF minting policy: mints the platform's reward token at a fixed
//// 10:1 ratio against the Rs amount a donor commits — 10 EDUF per Rs.
////
//// Nothing can be minted "for free" — the policy inspects the transaction
//// itself and only allows minting when:
////
////   1. one of this transaction's outputs pays into the escrow script
////      address, carrying an inline `EscrowDatum` (proving a real donation
////      is being locked, not just claimed),
////   2. that datum's `rs_amount` is consistent with the actual lovelace
////      locked in the same output, at the platform's fixed `ada_rate`
////      (Rs per ADA) — so a donor can't claim a huge Rs figure while
////      locking almost no real ADA,
////   3. the minted EDUF quantity exactly equals `10 * rs_amount`, and
////   4. the minted tokens are actually paid to the donor's own wallet in
////      this same transaction, and the donor's key signs.
////
//// Burning (negative mint) is always allowed with no extra conditions —
//// EDUF holders can freely destroy their own tokens.
////
//// NOTE: `EscrowDatum` is duplicated here (structurally identical to the
//// one in escrow.ak) rather than imported, because this Aiken toolchain
//// version silently fails blueprint generation when a validator's
//// datum/redeemer-adjacent types are defined in another module. It's only
//// ever used here to parse the escrow output's inline datum, never as a
//// handler's own datum/redeemer — so the two copies just need to stay in
//// sync structurally.

use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Script, VerificationKey}
use cardano/assets.{PolicyId}
use cardano/transaction.{InlineDatum, Output, Transaction}

pub type EscrowDatum {
  donor: VerificationKeyHash,
  student: VerificationKeyHash,
  project_id: ByteArray,
  amount_lovelace: Int,
  rs_amount: Int,
}

pub type MintAction {
  Mint { escrow_output_index: Int, donor: VerificationKeyHash }
  Burn
}

const eduf_per_rs: Int = 10

/// EDUF minting policy, parameterized at compile time with:
///  - `escrow_script_hash` — the escrow validator's own script hash, so
///    this policy can recognize a genuine donation-lock output.
///  - `ada_rate` — Rs per ADA (matches the app's fixed ADA_RATE constant),
///    used only to sanity-check `rs_amount` against real locked lovelace.
validator eduf_mint(escrow_script_hash: ByteArray, ada_rate: Int) {
  mint(redeemer: MintAction, policy_id: PolicyId, self: Transaction) -> Bool {
    when redeemer is {
      Mint { escrow_output_index, donor } -> {
        expect Some(escrow_output) =
          self.outputs |> list.at(escrow_output_index)

        let locks_at_escrow =
          when escrow_output.address.payment_credential is {
            Script(hash) -> hash == escrow_script_hash
            _ -> False
          }
        expect locks_at_escrow

        expect InlineDatum(raw_datum) = escrow_output.datum
        expect EscrowDatum { amount_lovelace, rs_amount, .. }: EscrowDatum =
          raw_datum

        let locked_lovelace = assets.lovelace_of(escrow_output.value)

        // Recompute what locking `rs_amount` at `ada_rate` should look like
        // in lovelace, using the same rs->lovelace direction the off-chain
        // code uses (Math.round(rs / ada_rate * 1_000_000)); tolerate the
        // single unit of rounding drift that can arise from JS's
        // round-half-up vs. this integer floor division.
        let expected_lovelace = rs_amount * 1_000_000 / ada_rate
        let lovelace_consistent =
          locked_lovelace == amount_lovelace && (
            locked_lovelace == expected_lovelace || locked_lovelace == expected_lovelace + 1
          )

        let minted_pairs =
          self.mint
            |> assets.tokens(policy_id)
            |> dict.to_pairs()

        expect [Pair(asset_name, minted_qty)] = minted_pairs

        let signed_by_donor = list.has(self.extra_signatories, donor)
        let paid_to_donor =
          pays_at_least_asset(
            self.outputs,
            donor,
            policy_id,
            asset_name,
            minted_qty,
          )

        and {
          lovelace_consistent,
          rs_amount > 0,
          minted_qty == eduf_per_rs * rs_amount,
          signed_by_donor,
          paid_to_donor,
        }
      }
      Burn -> {
        let minted_pairs =
          self.mint
            |> assets.tokens(policy_id)
            |> dict.to_pairs()

        minted_pairs |> list.all(fn(pair) {
          let Pair(_, qty) = pair
          qty < 0
        })
      }
    }
  }
}

fn pays_at_least_asset(
  outputs: List<Output>,
  key: VerificationKeyHash,
  policy_id: PolicyId,
  asset_name: ByteArray,
  min_qty: Int,
) -> Bool {
  outputs
    |> list.any(
        fn(output) {
          when output.address.payment_credential is {
            VerificationKey(vk) ->
              vk == key && assets.quantity_of(
                output.value,
                policy_id,
                asset_name,
              ) >= min_qty
            _ -> False
          }
        },
      )
}
