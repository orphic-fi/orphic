import type { RunFunction } from "circuit:sdk";
import { tick, type Address, type Hex, type TxSigner } from "./rotator-core.mjs";

const HYPEREVM = "ethereum:999" as const;

/**
 * Orphic Rotator on Circuit. The decision logic is the Orphic keeper, bundled unchanged into rotator-core.mjs
 * (github.com/orphic-fi/orphic, keeper/). This file only supplies two things: who signs, and where logs go.
 *
 * What the agent can do onchain is bounded by the vault contracts, not by this code: on senior it can only move
 * USDC between the curator's allowlisted adapters within their caps; on junior it can only call allowlisted venues
 * with junior pinned as receiver, call syncSenior and settle. It cannot withdraw, transfer or approve anything else.
 */
export const run: RunFunction = async (agent) => {
  const log = (line: string) => {
    if (line.trim().length) void agent.log(line);
  };
  const dryRun = agent.settings.dryRun;
  const rpcUrl = agent.settings.rpcUrl;

  const signer: TxSigner = {
    address: agent.walletAddress as Address,
    async send(tx, label) {
      await agent.log(`sending ${label} -> ${tx.to}`);
      const op = await agent.wallet.transactions.create({
        network: HYPEREVM,
        request: { toAddress: tx.to, valueWei: "0", data: tx.data },
      });
      // Circuit reports the operation, not the hash. The keeper verifies effect by reading state back, so the id is enough.
      return `0x${op.operationId.replace(/[^0-9a-fA-F]/g, "").padEnd(8, "0").slice(0, 8)}` as Hex;
    },
  };

  await agent.log(`Rotator tick (${dryRun ? "shadow: decisions only, nothing sent" : "live"}) as ${agent.walletAddress}`);
  const report = await tick({ signer, rpcUrl, dryRun, log });
  const sent = report.execution.filter((e) => e.status === "sent").length;
  const failed = report.execution.filter((e) => e.status === "failed").length;
  await agent.log(
    `decision ${report.decision.move ? "MOVE" : "HOLD"}: ${report.decision.reason}; senior steps sent ${sent}, failed ${failed}; junior idle ${report.juniorIdle?.action ?? "n/a"}; accrue ${report.juniorAccrue?.called ? "sent" : "skipped"}`,
  );
  if (report.alerts.length) await agent.log(`ALERT senior config drift: ${report.alerts.join("; ")}`, { error: true });
  if (report.error) await agent.log(`ERROR ${report.error}`, { error: true });
};
