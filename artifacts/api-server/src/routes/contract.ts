import { Router } from "express";
import { db } from "@workspace/db";
import { contractConfigTable } from "@workspace/db";

const router = Router();

// Minimal ConfidentialERC20-style ABI for ShieldCapProperty
const SHIELDCAP_ABI = [
  {
    "type": "function",
    "name": "purchaseShares",
    "inputs": [
      { "name": "encryptedAmount", "type": "bytes32", "internalType": "einput" },
      { "name": "inputProof", "type": "bytes", "internalType": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "transferShares",
    "inputs": [
      { "name": "to", "type": "address", "internalType": "address" },
      { "name": "encryptedAmount", "type": "bytes32", "internalType": "einput" },
      { "name": "inputProof", "type": "bytes", "internalType": "bytes" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "distributeDividend",
    "inputs": [
      { "name": "totalRevenue", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      { "name": "account", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "euint64" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalShares",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_OWNERSHIP_BPS",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "SharesPurchased",
    "inputs": [
      { "name": "buyer", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ConfidentialTransfer",
    "inputs": [
      { "name": "from", "type": "address", "indexed": true },
      { "name": "to", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "DividendDistributed",
    "inputs": [
      { "name": "totalRevenue", "type": "uint256", "indexed": false },
      { "name": "round", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "OwnershipCapRejected",
    "inputs": [
      { "name": "buyer", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  }
];

router.get("/", async (req, res) => {
  const rows = await db.select().from(contractConfigTable).limit(1);
  if (!rows.length) {
    // Return mock config for demo purposes before real deployment
    return res.json({
      contractAddress: "0x0000000000000000000000000000000000000000",
      networkId: 9000,
      networkName: "Zama Devnet",
      abi: SHIELDCAP_ABI,
    });
  }
  const row = rows[0];
  return res.json({
    contractAddress: row.contractAddress,
    networkId: row.networkId,
    networkName: row.networkName,
    abi: JSON.parse(row.abi),
  });
});

export default router;
