import { useEffect, useState } from "react";
import { parseUnits } from "ethers";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/wallet-context";
import { useShieldCapContract } from "@/hooks/use-shieldcap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { sepoliaTxUrl } from "@/lib/explorer";

export function CreatePropertyPanel() {
  const { address } = useWallet();
  const { isConfigured, readContractOwner, createProperty, paymentTokenDecimals } = useShieldCapContract();
  const queryClient = useQueryClient();

  const [isOwner, setIsOwner] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [description, setDescription] = useState("");
  const [valueUsd, setValueUsd] = useState("");
  const [totalShares, setTotalShares] = useState("");
  const [pricePerShare, setPricePerShare] = useState("1");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!address || !isConfigured) {
      setIsOwner(false);
      return;
    }
    readContractOwner()
      .then((owner) => setIsOwner(owner?.toLowerCase() === address.toLowerCase()))
      .catch(() => setIsOwner(false));
  }, [address, isConfigured, readContractOwner]);

  if (!isOwner) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTxHash(null);

    const value = parseFloat(valueUsd);
    const shares = parseInt(totalShares, 10);
    const price = parseFloat(pricePerShare);
    if (!name || !location || !imageUri || !description) {
      setError("Fill in all fields");
      return;
    }
    if (isNaN(value) || value <= 0 || isNaN(shares) || shares <= 0 || isNaN(price) || price <= 0) {
      setError("Enter valid numeric values");
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = await createProperty({
        name,
        location,
        imageUri,
        description,
        valueUsd: value,
        totalShares: shares,
        pricePerShareUnits: parseUnits(price.toFixed(paymentTokenDecimals), paymentTokenDecimals),
      });
      setTxHash(receipt.hash);
      void queryClient.invalidateQueries({ queryKey: ["on-chain-properties"] });
      setName("");
      setLocation("");
      setImageUri("");
      setDescription("");
      setValueUsd("");
      setTotalShares("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list property");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 font-bold text-sm">
        <Building2 className="w-4 h-4 text-primary" />
        Owner: List property on-chain
      </div>
      <p className="text-xs font-mono text-muted-foreground">
        Creates a primary listing on Sepolia via createProperty. Explore reads it directly from the contract.
      </p>

      {txHash ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <CheckCircle2 className="w-8 h-8 text-primary" />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-md">
            <a
              href={sepoliaTxUrl(txHash)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center px-4 py-2 rounded-md border border-primary/30 bg-primary/5 text-xs font-mono text-primary hover:underline break-all"
            >
              View on Etherscan →
            </a>
            <Button variant="outline" size="sm" onClick={() => setTxHash(null)} className="font-mono text-xs shrink-0">
              List another
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-mono">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono">Image URL</Label>
            <Input value={imageUri} onChange={(e) => setImageUri(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-mono">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono">Value (USD)</Label>
            <Input type="number" value={valueUsd} onChange={(e) => setValueUsd(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono">Total shares</Label>
            <Input type="number" value={totalShares} onChange={(e) => setTotalShares(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-mono">Price per share (tUSDC)</Label>
            <Input type="number" step="0.01" value={pricePerShare} onChange={(e) => setPricePerShare(e.target.value)} className="font-mono text-xs" />
          </div>
          {error && (
            <p className="sm:col-span-2 text-xs font-mono text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {error}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSubmitting} className="font-mono text-xs">
              {isSubmitting ? "Listing on-chain..." : "Create on-chain property"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
