#!/usr/bin/env python3
"""Turn a forge dry run into a signer plan.

Usage: make_plan.py <script-name> <plan-name> <out.json> [--env KEY=VAL ...]
Runs `forge script script/<script-name> --rpc-url $FORK_RPC --sender $DEPLOYER` (no broadcast) against an
anvil fork where the deployer has been given gas, then converts broadcast/<script>/999/dry-run/run-latest.json
into {name, deployer, steps:[{title, what, to, data, value, gas, readbacks:[...]}]}.

Transactions are what the wallet signs, one by one, in order. Read-backs are eth_call checks the signer page
runs after each receipt; "$created" means the address the transaction created.
"""
import json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "contracts"

WHAT = {
    "createVaultV2": "Create the senior Vault V2 from Morpho's factory (owner = deployer for now).",
    "setCurator": "Set the curator role.",
    "setName": "Name the vault Orphic Senior USDC.",
    "setSymbol": "Symbol osUSDC.",
    "createMorphoMarketV1AdapterV2": "Create the adapter that lets senior supply Morpho Blue markets.",
    "createMorphoVaultV1Adapter": "Create the adapter that lets senior hold Felix USDC (the liquidity leg).",
    "submit": "Submit a timelocked change (timelock is 0 during setup, so it executes in the next call).",
    "setIsAllocator": "Grant or revoke the allocator role.",
    "addAdapter": "Register an adapter on senior.",
    "increaseAbsoluteCap": "Set an absolute cap for one allocation id.",
    "increaseRelativeCap": "Set a relative cap (100% at launch) for one allocation id.",
    "setManagementFeeRecipient": "Management fee goes to junior.",
    "setManagementFee": "Management fee 0.5% a year (the give-up).",
    "setMaxRate": "Max recognised rate 200% a year (a fresh vault starts at 0).",
    "setLiquidityAdapterAndData": "Felix adapter is where deposits land and withdrawals come from first.",
    "increaseTimelock": "Put one curator function behind the 3-day timelock.",
    "setOwner": "Hand senior ownership to the senior admin account.",
    "approve": "Approve a token spend.",
    "seed": "Fund 1 USDC of dead shares in junior (first-depositor protection).",
    "setDepositsPaused": "Junior deposits paused until the checklist is done.",
    "setWalletCap": "Week-one per-wallet cap on junior.",
    "setAgent": "Set the Rotator key as junior's agent.",
    "addMarket": "Register a Morpho market junior may use and value.",
    "addVault": "Register an ERC-4626 vault junior may use and value.",
    "setRule": "Allow one (target, selector) for the agent, with the receiver word that must equal junior.",
    "setApprovalRule": "Allow the agent to approve USDC to one venue.",
    "setKeeper": "Set the Rotator key as router keeper.",
    "transfer": "Transfer tokens.",
}


def sel(sig: str) -> str:
    out = subprocess.run(["cast", "sig", sig], capture_output=True, text=True, check=True).stdout.strip()
    return out


MULTICALL_SEL = "0xac9650d8"  # multicall(bytes[])
CHUNK_GAS = 1_500_000  # fits a HyperEVM small block (2M) with margin


def enc_multicall(datas):
    out = subprocess.run(["cast", "calldata", "multicall(bytes[])", "[" + ",".join(datas) + "]"],
                         capture_output=True, text=True, check=True).stdout.strip()
    return out


def collapse(steps):
    """Consecutive calls to the same VaultV2 (which has multicall) become one multicall per ~1.5M gas chunk.
    Creations and calls to factories or junior stay as they are."""
    vaults = {s["predictedAddress"].lower() for s in steps if s.get("predictedAddress") and s["title"].startswith("call") and "createVaultV2" in s["title"]}
    out, buf = [], []
    def flush():
        if not buf: return
        if len(buf) == 1: out.append(buf[0]); buf.clear(); return
        gas = sum(int(b["gas"], 16) for b in buf)
        out.append({"title": f"multicall x{len(buf)} on senior", "what": f"One transaction that runs the {len(buf)} vault calls below in order (VaultV2.multicall).",
                    "to": buf[0]["to"], "data": enc_multicall([b["data"] for b in buf]), "value": "0x0",
                    "gas": hex(min(int(gas*1.1), 1_900_000)), "readbacks": [], "calls": [b["title"] for b in buf]})
        buf.clear()
    for s in steps:
        if s["to"] and s["to"].lower() in vaults and s["value"] in ("0x0", None):
            if buf and (buf[0]["to"] != s["to"] or sum(int(b["gas"],16) for b in buf) + int(s["gas"],16) > CHUNK_GAS): flush()
            buf.append(s)
        else:
            flush(); out.append(s)
    flush()
    return out


def call(sig, *args):
    return subprocess.run(["cast", "calldata", sig, *map(str, args)], capture_output=True, text=True, check=True).stdout.strip()


def word(v):
    return subprocess.run(["cast", "abi-encode", "f(uint256)", str(v)], capture_output=True, text=True, check=True).stdout.strip()


def addr_word(a):
    return "0x" + a.lower()[2:].rjust(64, "0")


def verify(script, env, steps):
    """eth_call checks the signer page runs after the last step. Values come from the scripts' own constants."""
    v = []
    if script.startswith("01"):
        senior = next(s["predictedAddress"] for s in steps if "createVaultV2" in s["title"])
        mkt = next(s["predictedAddress"] for s in steps if "createMorphoMarketV1AdapterV2" in s["title"])
        felix = next(s["predictedAddress"] for s in steps if "createMorphoVaultV1Adapter(" in s["title"])
        v += [{"label": "senior.owner == deployer", "to": senior, "data": call("owner()"), "expect": addr_word(env["DEPLOYER"])},
              {"label": "senior.curator == deployer", "to": senior, "data": call("curator()"), "expect": addr_word(env["DEPLOYER"])},
              {"label": "agent is allocator", "to": senior, "data": call("isAllocator(address)", env["AGENT"]), "expect": word(1)},
              {"label": "adapters(0) == market adapter", "to": senior, "data": call("adapters(uint256)", 0), "expect": addr_word(mkt)},
              {"label": "adapters(1) == felix adapter", "to": senior, "data": call("adapters(uint256)", 1), "expect": addr_word(felix)},
              {"label": "asset == USDC", "to": senior, "data": call("asset()"), "expect": addr_word("0xb88339CB7199b77E23DB6E890353E22632Ba630f")}]
    if script.startswith("03"):
        senior = env["SENIOR"]
        v += [{"label": "owner == senior admin", "to": senior, "data": call("owner()"), "expect": addr_word(env["SENIOR_ADMIN"])},
              {"label": "curator == senior admin", "to": senior, "data": call("curator()"), "expect": addr_word(env["SENIOR_ADMIN"])},
              {"label": "fee recipient == junior", "to": senior, "data": call("managementFeeRecipient()"), "expect": addr_word(env["JUNIOR"])},
              {"label": "liquidity adapter == felix", "to": senior, "data": call("liquidityAdapter()"), "expect": addr_word(env["FELIX_ADAPTER"])},
              {"label": "timelock(addAdapter) == 3 days", "to": senior, "data": call("timelock(bytes4)", "0x" + subprocess.run(["cast","sig","addAdapter(address)"],capture_output=True,text=True).stdout.strip()[2:]), "expect": word(259200)},
              {"label": "timelock(setIsAllocator) == 0", "to": senior, "data": call("timelock(bytes4)", subprocess.run(["cast","sig","setIsAllocator(address,bool)"],capture_output=True,text=True).stdout.strip()), "expect": word(0)}]
    return v


def main():
    script, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
    env = dict(os.environ)
    for kv in sys.argv[5:] if len(sys.argv) > 4 and sys.argv[4] == "--env" else []:
        k, v = kv.split("=", 1)
        env[k] = v
    deployer = env["DEPLOYER"]
    rpc = env.get("FORK_RPC", "http://127.0.0.1:8545")
    r = subprocess.run(
        ["forge", "script", f"script/{script}", "--rpc-url", rpc, "--sender", deployer, "-vv"],
        cwd=ROOT, env=env, capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(r.stdout[-4000:], r.stderr[-4000:], file=sys.stderr)
        sys.exit("forge script failed")
    run = json.load(open(ROOT / "broadcast" / script / "999" / "dry-run" / "run-latest.json"))
    steps = []
    for tx in run["transactions"]:
        t = tx["transaction"]
        fn = (tx.get("function") or "").split("(")[0]
        kind = tx["transactionType"]
        title = f"{kind.lower()} {tx.get('contractName') or ''} {tx.get('function') or ''}".strip()
        what = WHAT.get(fn, "")
        if kind == "CREATE":
            what = f"Deploy {tx.get('contractName')}."
        step = {
            "title": title,
            "what": what,
            "to": t.get("to"),
            "data": t["input"],
            "value": t.get("value", "0x0"),
            "gas": hex(int(int(t["gas"], 16) * 1.2)) if t.get("gas") else None,
            "readbacks": [],
            "contractName": tx.get("contractName"),
            "predictedAddress": ((tx.get("additionalContracts") or [{}])[0].get("address") if kind != "CREATE" else tx.get("contractAddress")),
            "arguments": tx.get("arguments"),
        }
        steps.append(step)
    steps = collapse(steps)
    plan = {"name": name, "deployer": deployer, "chainId": 999, "script": script, "steps": steps,
            "verify": verify(script, env, steps),
            "logs": [l for l in r.stdout.splitlines() if "==" in l or "verify" in l or ":" in l and len(l) < 120][-40:]}
    Path(out).write_text(json.dumps(plan, indent=2))
    print(f"{len(steps)} steps -> {out}")
    for i, s in enumerate(steps):
        print(f"{i+1:2d}. {s['title'][:90]}")


if __name__ == "__main__":
    main()
