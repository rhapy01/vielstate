export const SEPOLIA_CHAIN_ID = 11155111;

/** Params for wallet_addEthereumChain (MetaMask / EIP-3085). */
export const SEPOLIA_CHAIN = {
  chainId: "0xaa36a7",
  chainName: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://rpc.sepolia.org",
    "https://1rpc.io/sepolia",
  ],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
} as const;
