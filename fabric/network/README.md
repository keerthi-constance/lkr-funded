# FundEd Hyperledger Fabric network

A 2-organisation network (`Org1` = platform, `Org2` = university/verifier)
running FundEd's chaincode with an endorsement policy requiring both orgs to
sign off on every transaction — so no single party can unilaterally record a
contribution, approve a milestone, or authorise a disbursement.

**This cannot be built or run in the environment that generated this
repo — it needs Docker, which isn't available there.** Everything under
`fabric/` is real, deployable config and chaincode; you run it yourself.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose) running
- Node.js 18+
- [fabric-samples](https://github.com/hyperledger/fabric-samples) cloned
  somewhere, with its own `install-fabric.sh` run to pull the Fabric
  binaries/Docker images:
  ```bash
  git clone https://github.com/hyperledger/fabric-samples.git
  cd fabric-samples
  curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- docker samples binary
  ```

We reuse `fabric-samples/test-network` as-is for network topology — it
already ships with Org1 + Org2, so nothing needs to be hand-written there.
Only the endorsement policy (set at chaincode deploy time) and the
chaincode itself are FundEd-specific.

## Bring it up

```bash
export FABRIC_SAMPLES_DIR=/path/to/fabric-samples
cd fabric/network/scripts
chmod +x *.sh          # first time only
./deploy-network.sh    # starts Org1 + Org2 + CAs, creates the channel
./deploy-chaincode.sh  # installs the funded chaincode, AND(Org1,Org2) endorsement
```

To reset:

```bash
./teardown.sh
```

## Wiring the backend to it

`src/backend/server/ledger.ts` connects via `@hyperledger/fabric-gateway`
(the modern gRPC-based client, not the older `fabric-network` Wallet SDK).
It needs a client identity + a peer to submit through per organisation —
this one backend process plays **both** the platform (Org1, admin actions)
and the university (Org2, verifier actions) in this prototype, submitting
each transaction under whichever org's identity actually performed the
action. Point these env vars (see `.env.example`) at files
`deploy-network.sh` already generated for you:

| Env var | Points at (relative to `$FABRIC_SAMPLES_DIR/test-network`) |
|---|---|
| `FABRIC_ORG1_MSP_ID` | `Org1MSP` |
| `FABRIC_ORG1_CERT_PATH` | `organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/cert.pem` |
| `FABRIC_ORG1_KEY_PATH` | `organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/<the one file in this dir>` |
| `FABRIC_ORG1_TLS_CERT_PATH` | `organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt` |
| `FABRIC_ORG1_PEER_ENDPOINT` | `localhost:7051` |
| `FABRIC_ORG1_PEER_HOST_ALIAS` | `peer0.org1.example.com` |
| `FABRIC_ORG2_MSP_ID` | `Org2MSP` |
| `FABRIC_ORG2_CERT_PATH` | `organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp/signcerts/cert.pem` |
| `FABRIC_ORG2_KEY_PATH` | `organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp/keystore/<the one file in this dir>` |
| `FABRIC_ORG2_TLS_CERT_PATH` | `organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt` |
| `FABRIC_ORG2_PEER_ENDPOINT` | `localhost:9051` |
| `FABRIC_ORG2_PEER_HOST_ALIAS` | `peer0.org2.example.com` |
| `FABRIC_CHANNEL_NAME` | `fundedchannel` |
| `FABRIC_CHAINCODE_NAME` | `funded` |

The keystore filename is a generated hash, not a fixed name — check the
directory after `deploy-network.sh` runs. A real deployment would give the
university their own backend and identity instead of sharing one process;
one process holding both orgs' keys here is a prototype simplification.

## Important: local network, local backend

The Fabric network only listens on `localhost` on whatever machine runs it.
Run the app with `npm run dev` on that **same machine** to reach it — the
deployed Vercel app cannot connect to a network on your laptop. Until this
is deployed somewhere network-reachable from Vercel (or the Fabric network
is hosted somewhere public), the donor-facing ledger explorer and real
ledger writes only work in local dev with the network running alongside it.
