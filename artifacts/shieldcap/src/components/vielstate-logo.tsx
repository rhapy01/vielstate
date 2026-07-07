import { cn } from "@/lib/utils";

type VielstateLogoProps = {
  className?: string;
  alt?: string;
};

export function VielstateLogo({ className, alt = "Vielstate" }: VielstateLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={cn("object-contain", className)}
    />
  );
}
