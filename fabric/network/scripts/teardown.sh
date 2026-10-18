#!/usr/bin/env bash
# Tears down the test-network (containers, volumes, generated crypto
# material). Run this to reset to a clean slate.
set -euo pipefail

: "${FABRIC_SAMPLES_DIR:?Set FABRIC_SAMPLES_DIR to your fabric-samples checkout}"

cd "$FABRIC_SAMPLES_DIR/test-network"
./network.sh down
