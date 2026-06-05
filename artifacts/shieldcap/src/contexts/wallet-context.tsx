import React, { createContext, useContext, useState } from "react";

interface WalletContextType {
  address: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  const connect = () => {
    // Simulate MetaMask connection with a dummy address
    setAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
  };

  const disconnect = () => setAddress(null);

  return (
    <WalletContext.Provider value={{ address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
