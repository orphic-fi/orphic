/**
 * HLP plumbing test, run by the agent wallet (not a vault): the exact path junior v1.3 will take.
 *
 *   bridge    USDC on HyperEVM -> HyperCore perps balance, through Circle's CoreDepositWallet (a new Core account
 *             pays a 1 USDC creation fee on its first deposit; deposits of 1 USDC or less to a new account fail)
 *   toperp    HyperCore spot -> perps balance (usdClassTransfer); the deposit wallet credits a new account on spot
 *   deposit   HyperCore perps balance -> HLP vault (vaultTransfer, isDeposit true)
 *   status    what the wallet holds on Core and in HLP, plus the vault's own numbers
 *   withdraw  HLP -> HyperCore perps balance (vaultTransfer, isDeposit false; HLP has a 4-day lock from the last
 *             deposit, so this fails until then, and the failure text is part of what we are measuring)
 *   toevm     HyperCore USDC -> HyperEVM (sendAsset spot to spot to the USDC system address 0x2000...0000, since spotSend is refused on unified accounts; Circle's
 *             CoreDepositWallet pays the same address on HyperEVM), then reads the EVM balance once it lands
 *
 * Every call appends one line to ops/hlp-test.log. Amounts are in whole USDC on the command line.
 * Needs AGENT_PRIVATE_KEY (the keeper's key) and sends real transactions: run only on purpose.
 */
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, createWalletClient, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as hl from "@nktkas/hyperliquid";
import { hyperEvm } from "./exec/chain.js";

const USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f" as Address;
const CORE_DEPOSIT_WALLET = "0x6b9e773128f453f5c2c60935ee2de2cbc5390a24" as Address; // Circle, HyperEVM mainnet
const HLP = "0xdfc24b077bc1425ad1dea75bcb6f8158e10df303" as Address;
const USDC_SYSTEM = "0x2000000000000000000000000000000000000000"; // Core -> EVM bridge address for token index 0
const USDC_CORE_TOKEN = "USDC:0x6d1e7cde53ba9467b783cb7c530ce054"; // spotMeta: USDC index 0, linked to the CoreDepositWallet
const PERPS = 0; // destinationDex: 0 = perps balance (vault deposits come from perps), 4294967295 = spot

const erc20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const depositWallet = parseAbi(["function deposit(uint256 amount, uint32 destinationDex)"]);

const opsDir = resolve(import.meta.dirname, "..", "ops");
function logLine(cmd: string, text: string) {
  mkdirSync(opsDir, { recursive: true });
  const line = `${new Date().toISOString()} ${cmd}: ${text}`;
  appendFileSync(resolve(opsDir, "hlp-test.log"), line + "\n");
  console.log(line);
}

async function main() {
  const [cmd, amountArg] = process.argv.slice(2);
  const raw = process.env.AGENT_PRIVATE_KEY?.trim();
  const key = raw ? ((raw.startsWith("0x") ? raw : `0x${raw}`) as Hex) : undefined;
  const rpc = process.env.HYPEREVM_RPC ?? "https://rpc.hyperliquid.xyz/evm";
  mkdirSync(opsDir, { recursive: true });
  if (!existsSync(resolve(opsDir, "hlp-test.log"))) appendFileSync(resolve(opsDir, "hlp-test.log"), "");
  const pub = createPublicClient({ chain: hyperEvm, transport: http(rpc) });
  const info = new hl.InfoClient({ transport: new hl.HttpTransport() });

  if (cmd === "status") {
    const user = (process.env.AGENT_ADDRESS ?? (key ? privateKeyToAccount(key).address : undefined)) as Address | undefined;
    if (!user) throw new Error("AGENT_ADDRESS or AGENT_PRIVATE_KEY needed for status");
    const [evmUsdc, state, equities, vault] = await Promise.all([
      pub.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [user] }),
      info.clearinghouseState({ user }),
      info.userVaultEquities({ user }),
      info.vaultDetails({ vaultAddress: HLP }),
    ]);
    const mine = equities.find((e) => e.vaultAddress.toLowerCase() === HLP);
    const apr = (vault as { apr?: number }).apr;
    logLine("status", `evm USDC ${(Number(evmUsdc) / 1e6).toFixed(2)}; core perps withdrawable ${state.withdrawable} accountValue ${state.marginSummary.accountValue}; HLP equity ${mine?.equity ?? "0"} lockedUntil ${mine?.lockedUntilTimestamp ? new Date(Number(mine.lockedUntilTimestamp)).toISOString() : "n/a"}; HLP apr ${apr ?? "n/a"} tvl ${(vault as { tvl?: string }).tvl ?? "n/a"}`);
    return;
  }

  if (!key) throw new Error("AGENT_PRIVATE_KEY required");
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: hyperEvm, transport: http(rpc) });
  const exchange = new hl.ExchangeClient({ transport: new hl.HttpTransport(), wallet: account });
  const amount = amountArg ? Number(amountArg) : NaN;

  if (cmd === "bridge") {
    if (!(amount > 1)) throw new Error("bridge <usdc>: must be more than 1 USDC (a new Core account pays 1 USDC on its first deposit)");
    const units = BigInt(Math.round(amount * 1e6));
    const bal = await pub.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [account.address] });
    if (bal < units) throw new Error(`wallet holds ${(Number(bal) / 1e6).toFixed(2)} USDC, asked to bridge ${amount}`);
    const allowance = await pub.readContract({ address: USDC, abi: erc20, functionName: "allowance", args: [account.address, CORE_DEPOSIT_WALLET] });
    const hashes: Hex[] = [];
    if (allowance < units) {
      const h = await wallet.writeContract({ address: USDC, abi: erc20, functionName: "approve", args: [CORE_DEPOSIT_WALLET, units] });
      await pub.waitForTransactionReceipt({ hash: h });
      hashes.push(h);
    }
    const h = await wallet.writeContract({ address: CORE_DEPOSIT_WALLET, abi: depositWallet, functionName: "deposit", args: [units, PERPS] });
    const r = await pub.waitForTransactionReceipt({ hash: h });
    hashes.push(h);
    logLine("bridge", `${amount} USDC HyperEVM -> Core perps, status ${r.status}, gas ${r.gasUsed}, tx ${hashes.join(",")}`);
    return;
  }

  if (cmd === "toperp" || cmd === "tospot") {
    if (!(amount > 0)) throw new Error(`${cmd} <usdc>`);
    try {
      const res = await exchange.usdClassTransfer({ amount: String(amount), toPerp: cmd === "toperp" });
      logLine(cmd, `${amount} USDC ${cmd === "toperp" ? "spot -> perps" : "perps -> spot"}: ${JSON.stringify(res)}`);
    } catch (err) {
      logLine(cmd, `${amount} USDC class transfer FAILED: ${(err as Error).message}`);
      process.exitCode = 1;
    }
    return;
  }

  if (cmd === "deposit" || cmd === "withdraw") {
    if (!(amount > 0)) throw new Error(`${cmd} <usdc>`);
    const usd = Math.round(amount * 1e6);
    try {
      const res = await exchange.vaultTransfer({ vaultAddress: HLP, isDeposit: cmd === "deposit", usd });
      logLine(cmd, `${amount} USDC ${cmd === "deposit" ? "into" : "out of"} HLP: ${JSON.stringify(res)}`);
    } catch (err) {
      logLine(cmd, `${amount} USDC ${cmd === "deposit" ? "into" : "out of"} HLP FAILED: ${(err as Error).message}`);
      process.exitCode = 1;
    }
    return;
  }
  if (cmd === "toevm") {
    if (!(amount > 0)) throw new Error("toevm <usdc>");
    const before = await pub.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [account.address] });
    try {
      // spotSend is refused on unified accounts ("Action disabled when unified account is active"); sendAsset spot to spot works in every mode
      const res = await exchange.sendAsset({ destination: USDC_SYSTEM, sourceDex: "spot", destinationDex: "spot", token: USDC_CORE_TOKEN, amount: String(amount) });
      let after = before;
      for (let i = 0; i < 30 && after === before; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        after = await pub.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [account.address] });
      }
      logLine("toevm", `${amount} USDC Core -> HyperEVM: ${JSON.stringify(res)}; evm USDC ${(Number(before) / 1e6).toFixed(6)} -> ${(Number(after) / 1e6).toFixed(6)}${after === before ? " (not landed within 60s)" : ""}`);
    } catch (err) {
      logLine("toevm", `${amount} USDC Core -> HyperEVM FAILED: ${(err as Error).message}`);
      process.exitCode = 1;
    }
    return;
  }
  throw new Error("usage: hlpTest <bridge <usdc> | toperp <usdc> | deposit <usdc> | status | withdraw <usdc> | tospot <usdc> | toevm <usdc>>");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
