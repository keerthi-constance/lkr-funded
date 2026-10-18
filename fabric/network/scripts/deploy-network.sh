#!/usr/bin/env bash
# Brings up Fabric's standard test-network (which already ships with two
# orgs — Org1 and Org2 — out of the box, so no custom crypto-config/configtx
# is needed for that part) and creates the channel FundEd's chaincode runs
# on. Run this on YOUR machine (needs Docker) — it cannot run in the
# environment that generated this repo.
#
# Usage:
#   FABRIC_SAMPLES_DIR=/path/to/fabric-samples ./deploy-network.sh
#
# Prerequisites (see fabric/network/README.md for the full walkthrough):
#   - Docker + Docker Compose
#   - fabric-samples cloned, with the Fabric binaries/images installed via
#     its own install-fabric.sh script
set -euo pipefail

: "${FABRIC_SAMPLES_DIR:?Set FABRIC_SAMPLES_DIR to your fabric-samples checkout, e.g. FABRIC_SAMPLES_DIR=~/fabric-samples ./deploy-network.sh}"
CHANNEL_NAME="${CHANNEL_NAME:-fundedchannel}"

cd "$FABRIC_SAMPLES_DIR/test-network"

echo "==> Starting test-network (Org1 + Org2 + CAs) and creating channel '$CHANNEL_NAME'..."
./network.sh up createChannel -c "$CHANNEL_NAME" -ca

echo "==> Network up. Generated connection profiles are under:"
echo "    $FABRIC_SAMPLES_DIR/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json"
echo "    $FABRIC_SAMPLES_DIR/test-network/organizations/peerOrganizations/org2.example.com/connection-org2.json"
echo "Next: ./deploy-chaincode.sh"
