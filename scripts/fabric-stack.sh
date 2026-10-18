#!/usr/bin/env bash
# Starts the FundEd Hyperledger Fabric network + Hyperledger Explorer inside
# WSL, then stays alive forever.
#
# Why the "stay alive" part matters: WSL2 terminates the Ubuntu instance
# shortly after the last session/process exits (it calls `systemctl poweroff`
# under the hood). The `vmIdleTimeout=-1` setting in %USERPROFILE%\.wslconfig
# only stops the *VM* from shutting down — it does not stop the *instance*
# from being terminated. If every process exits, docker (and therefore every
# Fabric peer, the orderer, and Explorer) is killed. Holding this script open
# as a running process keeps the instance — and the whole stack — alive.
#
# Run via: wsl -d Ubuntu -u root -- bash /mnt/c/.../scripts/fabric-stack.sh
set -u

LOG=/root/funded-fabric/start-stack.log
mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "==================================================================="
echo "=== fabric-stack starting $(date) ==="

# --- Wait for the Docker daemon (it starts with the instance) --------------
for _ in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then break; fi
  sleep 2
done
if ! docker info >/dev/null 2>&1; then
  echo "!!! Docker daemon not available after 120s; holding anyway."
else
  echo "--- Docker is up $(date) ---"

  # --- Fabric network (peers + orderer; crypto already generated) ---------
  if [ -d /root/fabric-samples/test-network ]; then
    echo "--- bringing up Fabric test-network (fundedchannel) ---"
    (cd /root/fabric-samples/test-network && ./network.sh up -ca) || \
      echo "!!! network.sh up returned non-zero"

    # --- Hyperledger Explorer (UI on http://localhost:8090) --------------
    if [ -f /root/funded-fabric/explorer/docker-compose.yaml ]; then
      echo "--- starting Hyperledger Explorer ---"
      (cd /root/funded-fabric/explorer && docker compose up -d) || \
        echo "!!! explorer compose up returned non-zero"
    else
      echo "!!! /root/funded-fabric/explorer/docker-compose.yaml not found"
    fi
  else
    echo "!!! /root/fabric-samples/test-network not found"
  fi

  echo "--- stack up $(date) ---"
  docker ps --format 'table {{.Names}}\t{{.Status}}'
fi

echo "=== holding WSL instance open; do not kill this process ==="
# Keep this process (and thus the WSL instance) alive indefinitely. Do NOT use
# `exec` here: the process name must stay "fabric-stack.sh" so the Windows
# launcher can detect an already-running keep-alive with pgrep.
while true; do sleep 3600; done