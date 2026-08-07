//// Escrow validator: a donation locks ADA at THIS script address instead
//// of going straight into anyone's personal wallet. Funds only leave once
//// one of two on-chain-checked conditions is met:
////
////   Release — the platform admin's key signs, and the transaction pays
////             the locked amount to the student's address (used once a
////             milestone has been verified through the platform's normal
////             admin/university review flow).
////   Refund  — the original donor's own key signs, and the transaction
////             pays the locked amount back to them (used if a project is
////             cancelled or a milestone is rejected).
////
//// `admin` is a validator parameter — baked in at compile time from the
//// platform's own verification key hash, so it must be re-compiled if that
//// key ever rotates.
////
//// NOTE: EscrowDatum is defined here (not imported from a shared module)
//// because this Aiken toolchain version silently fails blueprint
//// generation when a validator's datum/redeemer type lives in another
//// module — `eduf_mint.ak` keeps its own structurally-identical copy for
//// the same reason, since it needs to parse this same on-chain datum.

use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{VerificationKey}
use cardano/assets
use cardano/transaction.{Output, OutputReference, Transaction}

/// Locked at the escrow script address for every donation. One UTXO per
/// donation — never merged with others, so each milestone payout/refund
/// spends exactly the donation it belongs to.
pub type EscrowDatum {
  /// Key hash of the donor's own wallet — the only party who can reclaim
  /// funds via `Refund`.
  donor: VerificationKeyHash,
  /// Key hash of the student/project payout address — where `Release`
  /// sends the locked funds once a milestone is verified.
  student: VerificationKeyHash,
  /// Off-chain project identifier (its slug), carried on-chain purely so a
  /// release/refund transaction can be tied back to the right project row
  /// in the platform's database when indexing chain history.
  project_id: ByteArray,
  /// Lovelace amount locked by this donation, checked against the actual
  /// UTXO value at spend time — not trusted on its own.
  amount_lovelace: Int,
  /// The Rs amount the donor actually typed into the donation form. EDUF
  /// minting (see eduf_mint.ak) is pegged to this at 10 EDUF per Rs.
  rs_amount: Int,
}

pub type EscrowRedeemer {
  /// Milestone verified off-chain by the platform admin/university — pay
  /// the locked funds to `datum.student`. Requires the admin key's
  /// signature; the donor cannot trigger this themselves.
  Release
  /// Donor reclaims funds (e.g. project cancelled or milestone rejected).
  /// Requires the donor's own signature — nobody else can trigger this.
  Refund
}

validator escrow(admin: VerificationKeyHash) {
  spend(
    datum: Option<EscrowDatum>,
    redeemer: EscrowRedeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) -> Bool {
    expect Some(EscrowDatum { donor, student, amount_lovelace, .. }) = datum

    when redeemer is {
      Release -> {
        let signed_by_admin = list.has(self.extra_signatories, admin)
        let paid_student = pays_at_least(self.outputs, student, amount_lovelace)
        signed_by_admin && paid_student
      }
      Refund -> {
        let signed_by_donor = list.has(self.extra_signatories, donor)
        let paid_donor = pays_at_least(self.outputs, donor, amount_lovelace)
        signed_by_donor && paid_donor
      }
    }
  }
}

/// True if some output in the transaction pays at least `min_lovelace` to
/// the wallet identified by `key` (a plain verification-key-hash address —
/// no script-address payouts allowed here).
fn pays_at_least(
  outputs: List<Output>,
  key: VerificationKeyHash,
  min_lovelace: Int,
) -> Bool {
  outputs
    |> list.any(
        fn(output) {
          when output.address.payment_credential is {
            VerificationKey(vk) ->
              vk == key && assets.lovelace_of(output.value) >= min_lovelace
            _ -> False
          }
        },
      )
}
