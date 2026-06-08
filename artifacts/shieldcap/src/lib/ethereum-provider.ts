export type EthereumRequestProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isPhantom?: boolean;
  providers?: EthereumRequestProvider[];
};

type Eip6963ProviderDetail = {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: EthereumRequestProvider;
};

const discovered: Eip6963ProviderDetail[] = [];
let discoveryStarted = false;

const BLOCKED_NAME_KEYWORDS = ["phantom", "welldone", "solflare"];
const BLOCKED_RDNS_KEYWORDS = ["phantom", "welldone", "solflare"];

function isBlockedWalletName(name: string, rdns = ""): boolean {
  const lowerName = name.toLowerCase();
  const lowerRdns = rdns.toLowerCase();
  return (
    BLOCKED_NAME_KEYWORDS.some((k) => lowerName.includes(k)) ||
    BLOCKED_RDNS_KEYWORDS.some((k) => lowerRdns.includes(k))
  );
}

function isMetaMaskProvider(provider: EthereumRequestProvider): boolean {
  return Boolean(provider.isMetaMask && !provider.isPhantom);
}

function isUsableInjectedProvider(provider: EthereumRequestProvider): boolean {
  if (provider.isPhantom) return false;
  return true;
}

function pushDiscovered(detail: Eip6963ProviderDetail) {
  if (isBlockedWalletName(detail.info.name, detail.info.rdns)) return;
  if (discovered.some((d) => d.info.uuid === detail.info.uuid)) return;
  discovered.push(detail);
}

export function startWalletDiscovery(): void {
  if (discoveryStarted || typeof window === "undefined") return;
  discoveryStarted = true;

  window.addEventListener("eip6963:announceProvider", ((event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
    if (detail?.provider && detail?.info) pushDiscovered(detail);
  }) as EventListener);

  window.dispatchEvent(new Event("eip6963:requestProvider"));
  // MetaMask and others may announce after first paint.
  window.setTimeout(() => window.dispatchEvent(new Event("eip6963:requestProvider")), 400);
  window.setTimeout(() => window.dispatchEvent(new Event("eip6963:requestProvider")), 1200);
}

export function listDiscoveredWallets(): Eip6963ProviderDetail[] {
  return [...discovered];
}

function pickDiscoveredProvider(): EthereumRequestProvider | null {
  const metamask = discovered.find(
    (d) => d.info.rdns === "io.metamask" || d.info.name.toLowerCase().includes("metamask"),
  );
  if (metamask) return metamask.provider;

  const firstAllowed = discovered[0];
  return firstAllowed?.provider ?? null;
}

/** Prefer MetaMask; never use Phantom's evmAsk proxy on window.ethereum. */
export function getEthereumProvider(): EthereumRequestProvider | null {
  startWalletDiscovery();

  const fromDiscovery = pickDiscoveredProvider();
  if (fromDiscovery) return fromDiscovery;

  const eth = window.ethereum as EthereumRequestProvider | undefined;
  if (!eth) return null;

  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    const metamask = eth.providers.find(isMetaMaskProvider);
    if (metamask) return metamask;

    const nonPhantom = eth.providers.find(isUsableInjectedProvider);
    if (nonPhantom) return nonPhantom;

    return null;
  }

  if (isMetaMaskProvider(eth)) return eth;
  if (eth.isPhantom) return null;

  return isUsableInjectedProvider(eth) ? eth : null;
}

export function getWalletProviderLabel(): string {
  const mm = discovered.find(
    (d) => d.info.rdns === "io.metamask" || d.info.name.toLowerCase().includes("metamask"),
  );
  if (mm) return mm.info.name;
  const allowed = discovered.find((d) => !isBlockedWalletName(d.info.name, d.info.rdns));
  if (allowed) return allowed.info.name;
  const eth = window.ethereum as EthereumRequestProvider | undefined;
  if (eth?.isMetaMask && !eth?.isPhantom) return "MetaMask";
  return "Wallet";
}

declare global {
  interface Window {
    ethereum?: EthereumRequestProvider;
  }
}
