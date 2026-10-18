# FundEd chaincode

Node.js chaincode (`fabric-contract-api`) implementing FundEd's audit trail:
campaigns, donor contributions, milestone evidence + dual-org approval, and
disbursement authorisation.

## Functions

| Function | Called by | Notes |
|---|---|---|
| `createCampaign(campaignId, title, targetAmountLKR, milestonesJson, beneficiaryReference)` | platform backend, once per project | `milestonesJson` is a JSON string: `[{ milestoneId, title, targetPercent }]` |
| `recordContribution(campaignId, contributionId, amountLKR, payhereOrderId, payherePaymentId, timestamp)` | backend, from the PayHere `notify_url` webhook | `timestamp` is caller-supplied — chaincode never reads the clock |
| `submitMilestoneEvidence(campaignId, milestoneId, evidenceHash)` | student dashboard | resets any prior approvals |
| `approveMilestone(campaignId, milestoneId, approverOrg, decision)` | admin (`Org1`) and university (`Org2`) dashboards, separately | `decision` is `"approve"` \| `"reject"`; the calling identity's own MSP must match `approverOrg` |
| `authoriseDisbursement(campaignId, milestoneId)` | admin dashboard, once a milestone is `APPROVED` | amount is derived on-ledger from recorded contributions, never trusted from the caller; emits `DisbursementAuthorised` |
| `queryCampaign` / `queryContributions` / `queryDisbursements` | backend reads (explorer UI, dashboards) | |

## Milestone status machine

```
PENDING → EVIDENCE_SUBMITTED → APPROVED → DISBURSED
                ↑        ↓
                └── REJECTED (either org rejects; new evidence resets to EVIDENCE_SUBMITTED)
```

`APPROVED` requires **both** `Org1` and `Org2` to have independently called
`approveMilestone` with `decision: "approve"` for the current evidence — this
is enforced in chaincode, not just by the channel's endorsement policy, so
`approveMilestone` itself checks the caller's MSP matches the org it claims
to approve as.

## Determinism

No function calls an external API, reads `Date.now()`/`new Date()`, or
generates a random value. IDs and timestamps are always passed in as
arguments by the caller, so every endorsing peer computes an identical
result from identical input — required for all peers to agree on the same
world-state write.

## Install

```bash
cd fabric/chaincode/funded
npm install
```

Deployment (packaging, install, approve, commit) is handled by
`fabric/network/scripts/deploy-chaincode.sh` — see `fabric/network/README.md`.
