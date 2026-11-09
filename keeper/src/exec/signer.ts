/**
 * One interface for "who signs the agent's transactions". The GitHub keeper signs with AGENT_PRIVATE_KEY; the
 * Circuit agent hands the same calldata to Circuit's wallet. Every send site simulates against the chain with the
 * signer's address first, so a revert is caught before anything is signed, whoever the signer is.
 */
import { createWalletClient, http, type Address, type Hex, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hyperEvm } from "./chain.js";

export interface TxRequest {
  to: Address;
  data: Hex;
}

export interface TxSigner {
  address: Address;
  /** Sign and broadcast; resolve with the hash once the transaction is mined (one confirmation). */
  send(tx: TxRequest, label: string): Promise<Hex>;
}

export function localSigner(privateKey: Hex, rpcUrl: string, client: PublicClient): TxSigner {
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ account, chain: hyperEvm, transport: http(rpcUrl) });
  return {
    address: account.address,
    async send(tx) {
      const gas = await client.estimateGas({ account, to: tx.to, data: tx.data });
      const hash = await wallet.sendTransaction({ account, to: tx.to, data: tx.data, gas, chain: hyperEvm });
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 });
      if (receipt.status !== "success") throw new Error(`tx ${hash} reverted`);
      return hash;
    },
  };
}

/** Simulate `data` against `to` from the signer's address; throws with the revert reason on failure. */
export async function simulate(client: PublicClient, signer: TxSigner, tx: TxRequest): Promise<void> {
  await client.call({ account: signer.address, to: tx.to, data: tx.data });
}
