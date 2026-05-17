import { createDAppKit } from "@mysten/dapp-kit-react";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

const network = (env.VITE_SUI_NETWORK || "mainnet") as
  | "mainnet"
  | "testnet"
  | "devnet"
  | "localnet";

function fullnodeUrlForNetwork(selectedNetwork: typeof network) {
  if (env.VITE_SUI_FULLNODE_URL) return env.VITE_SUI_FULLNODE_URL;
  if (selectedNetwork === "mainnet") return "https://fullnode.mainnet.sui.io:443";
  if (selectedNetwork === "testnet") return "https://fullnode.testnet.sui.io:443";
  if (selectedNetwork === "devnet") return "https://fullnode.devnet.sui.io:443";
  return "http://127.0.0.1:9000";
}

export const suiDAppKit = createDAppKit({
  networks: [network],
  defaultNetwork: network,
  autoConnect: true,
  createClient: (selectedNetwork) =>
    new SuiJsonRpcClient({
      network: selectedNetwork,
      url: fullnodeUrlForNetwork(selectedNetwork),
    }),
});
