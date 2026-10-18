#!/usr/bin/env bash
# Packages, installs, approves (by both orgs), and commits the FundEd
# chaincode onto the channel created by deploy-network.sh — with an
# endorsement policy requiring BOTH Org1 and Org2 to endorse every
# transaction. This is the actual "two organisations must agree" guarantee;
# without -ccep set explicitly, test-network defaults to a majority policy
# that a single extra org wouldn't enforce as strictly.
#
# Usage:
#   FABRIC_SAMPLES_DIR=/path/to/fabric-samples ./deploy-chaincode.sh
set -euo pipefail

: "${FABRIC_SAMPLES_DIR:?Set FABRIC_SAMPLES_DIR to your fabric-samples checkout}"
CHANNEL_NAME="${CHANNEL_NAME:-fundedchannel}"
CC_NAME="${CC_NAME:-funded}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CC_PATH="$(cd "$SCRIPT_DIR/../../chaincode/funded" && pwd)"

if [ ! -d "$CC_PATH/node_modules" ]; then
  echo "==> Installing chaincode dependencies..."
  (cd "$CC_PATH" && npm install)
fi

cd "$FABRIC_SAMPLES_DIR/test-network"

echo "==> Deploying chaincode '$CC_NAME' from $CC_PATH onto channel '$CHANNEL_NAME'..."
# If your fabric-samples version doesn't recognise -ccep, run
# `./network.sh deployCC -h` to check the current flag name — it has moved
# once before across Fabric releases.
./network.sh deployCC \
  -ccn "$CC_NAME" \
  -ccp "$CC_PATH" \
  -ccl javascript \
  -c "$CHANNEL_NAME" \
  -ccep "AND('Org1MSP.peer','Org2MSP.peer')"

echo "==> Chaincode '$CC_NAME' committed to '$CHANNEL_NAME' with a dual-org endorsement policy."
