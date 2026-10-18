"use strict";

// FundEd audit-trail chaincode. Deterministic by design: every function
// only reads/writes world state and its own arguments — never calls an
// external API, reads the wall clock, or generates a random value. Callers
// (the app backend) pass in every ID and timestamp explicitly so all peers
// executing this chaincode compute identical results.
//
// Endorsement: this chaincode is deployed with a channel-level endorsement
// policy of AND('Org1MSP.peer','Org2MSP.peer') — see
// fabric/network/scripts/deploy-chaincode.sh — so no single organisation
// (platform or university) can unilaterally commit a transaction. That
// policy covers every transaction here EXCEPT the two explicit signature
// checks inside approveMilestone/authoriseDisbursement below, which exist
// on top of it to also identify *which* org is calling, not just that both
// endorsed.

const { Contract } = require("fabric-contract-api");

const DOC_TYPE = {
  CAMPAIGN: "campaign",
  CONTRIBUTION: "contribution",
  DISBURSEMENT: "disbursement",
};

const MILESTONE_STATUS = {
  PENDING: "PENDING",
  EVIDENCE_SUBMITTED: "EVIDENCE_SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  DISBURSED: "DISBURSED",
};

const ORGS = ["Org1", "Org2"];

class FundedContract extends Contract {
  constructor() {
    super("funded.FundedContract");
  }

  // -- helpers ---------------------------------------------------------

  _campaignKey(ctx, campaignId) {
    return ctx.stub.createCompositeKey("campaign", [campaignId]);
  }

  _contributionKey(ctx, campaignId, contributionId) {
    return ctx.stub.createCompositeKey("contribution", [campaignId, contributionId]);
  }

  _disbursementKey(ctx, campaignId, milestoneId) {
    return ctx.stub.createCompositeKey("disbursement", [campaignId, milestoneId]);
  }

  async _getCampaign(ctx, campaignId) {
    const bytes = await ctx.stub.getState(this._campaignKey(ctx, campaignId));
    if (!bytes || bytes.length === 0) {
      throw new Error(`Campaign ${campaignId} does not exist.`);
    }
    return JSON.parse(bytes.toString("utf8"));
  }

  async _putCampaign(ctx, campaign) {
    await ctx.stub.putState(
      this._campaignKey(ctx, campaign.campaignId),
      Buffer.from(JSON.stringify(campaign))
    );
  }

  // The org identity making this call, derived from the invoking client's
  // MSP ID (set by the peer from its TLS/enrollment cert) — never trusted
  // from a plain argument, since arguments are caller-supplied.
  _callerOrg(ctx) {
    const mspId = ctx.clientIdentity.getMSPID();
    const org = ORGS.find((o) => `${o}MSP` === mspId);
    if (!org) throw new Error(`Unrecognised calling organisation MSP: ${mspId}`);
    return org;
  }

  // -- campaign lifecycle -----------------------------------------------

  // milestonesJson: JSON string of [{ milestoneId, title, targetPercent }],
  // targetPercent values across all milestones should sum to 100.
  async createCampaign(ctx, campaignId, title, targetAmountLKR, milestonesJson, beneficiaryReference) {
    const existing = await ctx.stub.getState(this._campaignKey(ctx, campaignId));
    if (existing && existing.length > 0) {
      throw new Error(`Campaign ${campaignId} already exists.`);
    }

    const targetAmount = Number(targetAmountLKR);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      throw new Error("targetAmountLKR must be a positive number.");
    }

    let milestoneSpecs;
    try {
      milestoneSpecs = JSON.parse(milestonesJson);
    } catch {
      throw new Error("milestonesJson must be valid JSON.");
    }
    if (!Array.isArray(milestoneSpecs) || milestoneSpecs.length === 0) {
      throw new Error("At least one milestone is required.");
    }

    const milestones = milestoneSpecs.map((m) => {
      if (!m.milestoneId || !m.title || typeof m.targetPercent !== "number") {
        throw new Error("Each milestone requires milestoneId, title, and a numeric targetPercent.");
      }
      return {
        milestoneId: m.milestoneId,
        title: m.title,
        targetPercent: m.targetPercent,
        status: MILESTONE_STATUS.PENDING,
        evidenceHash: null,
        approvals: {},
      };
    });

    const campaign = {
      docType: DOC_TYPE.CAMPAIGN,
      campaignId,
      title,
      targetAmountLKR: targetAmount,
      beneficiaryReference: beneficiaryReference || null,
      milestones,
    };

    await this._putCampaign(ctx, campaign);
    return JSON.stringify(campaign);
  }

  // -- contributions ------------------------------------------------------

  // timestamp is caller-supplied (ISO 8601 string) — chaincode never reads
  // the clock itself, so all endorsing peers agree on the same value.
  async recordContribution(ctx, campaignId, contributionId, amountLKR, payhereOrderId, payherePaymentId, timestamp) {
    await this._getCampaign(ctx, campaignId); // throws if campaign missing

    const key = this._contributionKey(ctx, campaignId, contributionId);
    const existing = await ctx.stub.getState(key);
    if (existing && existing.length > 0) {
      throw new Error(`Contribution ${contributionId} already recorded for campaign ${campaignId}.`);
    }

    const amount = Number(amountLKR);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("amountLKR must be a positive number.");
    }

    const contribution = {
      docType: DOC_TYPE.CONTRIBUTION,
      campaignId,
      contributionId,
      amountLKR: amount,
      payhereOrderId,
      payherePaymentId: payherePaymentId || null,
      timestamp,
      ledgerTxId: ctx.stub.getTxID(),
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(contribution)));
    ctx.stub.setEvent("ContributionRecorded", Buffer.from(JSON.stringify(contribution)));
    return JSON.stringify(contribution);
  }

  async queryContributions(ctx, campaignId) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey("contribution", [campaignId]);
    return JSON.stringify(await this._drain(iterator));
  }

  // -- milestone evidence & approval ---------------------------------------

  async submitMilestoneEvidence(ctx, campaignId, milestoneId, evidenceHash) {
    const campaign = await this._getCampaign(ctx, campaignId);
    const milestone = campaign.milestones.find((m) => m.milestoneId === milestoneId);
    if (!milestone) throw new Error(`Milestone ${milestoneId} not found on campaign ${campaignId}.`);
    if (milestone.status === MILESTONE_STATUS.APPROVED || milestone.status === MILESTONE_STATUS.DISBURSED) {
      throw new Error(`Cannot submit evidence for a milestone already ${milestone.status}.`);
    }

    milestone.evidenceHash = evidenceHash;
    milestone.status = MILESTONE_STATUS.EVIDENCE_SUBMITTED;
    milestone.approvals = {}; // new evidence resets any prior approvals

    await this._putCampaign(ctx, campaign);
    return JSON.stringify(milestone);
  }

  // approverOrg must match the calling client's own MSP identity — one org
  // cannot record an approval on behalf of the other. decision is
  // "approve" or "reject". A milestone only reaches APPROVED once both
  // Org1 and Org2 have independently approved it.
  async approveMilestone(ctx, campaignId, milestoneId, approverOrg, decision) {
    const actualCaller = this._callerOrg(ctx);
    if (approverOrg !== actualCaller) {
      throw new Error(`Calling identity belongs to ${actualCaller}, cannot approve as ${approverOrg}.`);
    }
    if (!ORGS.includes(approverOrg)) throw new Error(`Unknown organisation: ${approverOrg}.`);
    if (decision !== "approve" && decision !== "reject") {
      throw new Error('decision must be "approve" or "reject".');
    }

    const campaign = await this._getCampaign(ctx, campaignId);
    const milestone = campaign.milestones.find((m) => m.milestoneId === milestoneId);
    if (!milestone) throw new Error(`Milestone ${milestoneId} not found on campaign ${campaignId}.`);
    if (milestone.status === MILESTONE_STATUS.DISBURSED) {
      throw new Error("Cannot approve a milestone that has already been disbursed.");
    }
    if (milestone.status !== MILESTONE_STATUS.EVIDENCE_SUBMITTED && milestone.status !== MILESTONE_STATUS.APPROVED) {
      throw new Error(`Milestone must have evidence submitted before it can be approved (current status: ${milestone.status}).`);
    }

    milestone.approvals[approverOrg] = decision;

    if (decision === "reject") {
      milestone.status = MILESTONE_STATUS.REJECTED;
    } else if (ORGS.every((org) => milestone.approvals[org] === "approve")) {
      milestone.status = MILESTONE_STATUS.APPROVED;
    } else {
      milestone.status = MILESTONE_STATUS.EVIDENCE_SUBMITTED;
    }

    await this._putCampaign(ctx, campaign);
    return JSON.stringify({
      milestone,
      fullyApproved: milestone.status === MILESTONE_STATUS.APPROVED,
    });
  }

  // -- disbursement ---------------------------------------------------------

  // Rejects unless the milestone is APPROVED and no disbursement has
  // already been recorded for it. The amount is derived on-ledger — the
  // sum of all recorded contributions for the campaign times the
  // milestone's own targetPercent — never trusted from an off-chain
  // caller. Emits DisbursementAuthorised so the backend's event listener
  // can send the bank instruction email.
  async authoriseDisbursement(ctx, campaignId, milestoneId) {
    const campaign = await this._getCampaign(ctx, campaignId);
    const milestone = campaign.milestones.find((m) => m.milestoneId === milestoneId);
    if (!milestone) throw new Error(`Milestone ${milestoneId} not found on campaign ${campaignId}.`);
    if (milestone.status !== MILESTONE_STATUS.APPROVED) {
      throw new Error(`Milestone must be APPROVED before disbursement can be authorised (current status: ${milestone.status}).`);
    }

    const disbursementKey = this._disbursementKey(ctx, campaignId, milestoneId);
    const existing = await ctx.stub.getState(disbursementKey);
    if (existing && existing.length > 0) {
      throw new Error(`A disbursement has already been authorised for milestone ${milestoneId}.`);
    }

    const contributionsIterator = await ctx.stub.getStateByPartialCompositeKey("contribution", [campaignId]);
    const contributions = await this._drain(contributionsIterator);
    const totalRaisedLKR = contributions.reduce((sum, c) => sum + c.amountLKR, 0);
    const amountLKR = Math.round((totalRaisedLKR * milestone.targetPercent) / 100);

    const ledgerTxId = ctx.stub.getTxID();
    const disbursement = {
      docType: DOC_TYPE.DISBURSEMENT,
      campaignId,
      milestoneId,
      amountLKR,
      beneficiaryReference: campaign.beneficiaryReference,
      ledgerTxId,
    };

    await ctx.stub.putState(disbursementKey, Buffer.from(JSON.stringify(disbursement)));

    milestone.status = MILESTONE_STATUS.DISBURSED;
    await this._putCampaign(ctx, campaign);

    ctx.stub.setEvent("DisbursementAuthorised", Buffer.from(JSON.stringify(disbursement)));
    return JSON.stringify(disbursement);
  }

  async queryDisbursements(ctx, campaignId) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey("disbursement", [campaignId]);
    return JSON.stringify(await this._drain(iterator));
  }

  // -- reads ----------------------------------------------------------------

  async queryCampaign(ctx, campaignId) {
    const campaign = await this._getCampaign(ctx, campaignId);
    return JSON.stringify(campaign);
  }

  async _drain(iterator) {
    const results = [];
    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value) {
        results.push(JSON.parse(result.value.value.toString("utf8")));
      }
      result = await iterator.next();
    }
    await iterator.close();
    return results;
  }
}

module.exports = FundedContract;
