import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { suiDAppKit } from "@/lib/sui-dapp-kit";

export function ClientDAppKitProvider({ children }: { children: React.ReactNode }) {
  return <DAppKitProvider dAppKit={suiDAppKit}>{children}</DAppKitProvider>;
}
