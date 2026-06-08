import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/wallet-context";
import { useShieldCapContract } from "@/hooks/use-shieldcap";

export function useIsContractOwner() {
  const { address } = useWallet();
  const { isConfigured, readContractOwner } = useShieldCapContract();
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address || !isConfigured) {
      setIsOwner(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    readContractOwner()
      .then((owner) => setIsOwner(owner?.toLowerCase() === address.toLowerCase()))
      .catch(() => setIsOwner(false))
      .finally(() => setIsLoading(false));
  }, [address, isConfigured, readContractOwner]);

  return { isOwner, isLoading };
}
