import { useState, useEffect } from "react";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EncryptedValueProps {
  value: string | number;
  label?: string;
  isDecrypted?: boolean;
  onDecrypt?: () => void;
  isDecrypting?: boolean;
}

export function EncryptedValue({ value, label, isDecrypted, onDecrypt, isDecrypting }: EncryptedValueProps) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-card border border-border rounded-md">
      {label && <span className="text-sm font-mono text-muted-foreground">{label}</span>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isDecrypted ? (
            <Unlock className="w-5 h-5 text-primary" />
          ) : (
            <Lock className="w-5 h-5 text-muted-foreground" />
          )}
          
          <div className="relative">
            <span className={`text-2xl font-mono font-bold transition-all duration-1000 ${isDecrypted ? "fhe-reveal text-foreground" : "fhe-blur text-muted-foreground select-none"}`}>
              {isDecrypted ? value : "000,000,000"}
            </span>
          </div>
        </div>

        {!isDecrypted && onDecrypt && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDecrypt} 
            disabled={isDecrypting}
            className="font-mono text-xs"
          >
            {isDecrypting ? "Decrypting..." : "Decrypt"}
          </Button>
        )}
      </div>
      {!isDecrypted && (
        <div className="text-[10px] font-mono text-muted-foreground/70 uppercase">
          Encrypted via FHE Zama Protocol
        </div>
      )}
    </div>
  );
}
