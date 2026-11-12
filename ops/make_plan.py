#!/usr/bin/env python3
"""Turn a forge dry run into a signer plan.

Usage: make_plan.py <script-name> <plan-name> <out.json> [--env KEY=VAL ...]
Runs `forge script script/<script-name> --rpc-url $FORK_RPC --sender $DEPLOYER` (no broadcast) against an
anvil fork where the deployer has been given gas, then converts broadcast/<script>/999/dry-run/run-latest.json
into {name, deployer, steps:[{title, what, to, data, value, gas, readbacks:[...]}]}.

Migration phases (06a-06d, audit fixes 7/8) add to each plan: signer role, the signer's nonce at generation (CREATE addresses
depend on it: replay_plan refuses a different nonce), bigBlocks, the DECLARED waits (waitBeforeSeconds, notBeforeCall: only the
replay tool warps, on its fork), `precheck` (read-backs that must hold before the first step) and per-step needsBigBlock.
The driver ops/make_migration.py generates all phases in order on a loopback anvil fork.

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
    "setRecipients": "Repoint the old fee router's recipients (senior, v2 junior, treasury).",
    "setRouter": "Allow one swap router on the fee router.",
    "setFloor": "Set the sweep floor oracle and slippage for one token.",
    "seedPrice": "Seed the sweep price band for one token.",
    "setReceiveSharesGate": "Wire the senior receive-shares gate (timelocked on senior).",
    "snapFelixExposure": "Take the Felix exposure snapshot on the v2 junior.",
    "settle": "Weekly settle (permissionless; the keeper sends it).",
}
CREATE2_DEPLOYER = "0x4e59b44847b379578588920ca78fbf26c0b4956c"


def sel(sig: str) -> str:
    out = subprocess.run(["cast", "sig", sig], capture_output=True, text=True, check=True).stdout.strip()
    return out


MULTICALL_SEL = "0xac9650d8"  # multicall(bytes[])
CHUNK_GAS = 1_500_000  # fits a HyperEVM small block (2M) with margin


def enc_multicall(datas):
    out = subprocess.run(["cast", "calldata", "multicall(bytes[])", "[" + ",".join(datas) + "]"],
                         capture_output=True, text=True, check=True).stdout.strip()
    return out


def collapse(steps, extra_multicall_targets=()):
    """Consecutive calls to the same VaultV2 (which has multicall) become one multicall per ~1.5M gas chunk.
    Creations and calls to factories or junior stay as they are."""
    # contracts with a multicall(bytes[]) entry point: Morpho VaultV2 and JuniorVault (OZ Multicall)
    vaults = {s["predictedAddress"].lower() for s in steps if s.get("predictedAddress") and ("createVaultV2" in s["title"] or s.get("contractName") == "JuniorVault")} | {a.lower() for a in extra_multicall_targets if a}
    out, buf = [], []
    def flush():
        if not buf: return
        if len(buf) == 1: out.append(buf[0]); buf.clear(); return
        gas = sum(int(b["gas"], 16) for b in buf)
        out.append({"title": f"multicall x{len(buf)} on {'junior' if any(b.get('contractName')=='JuniorVault' for b in buf) else 'senior'}", "what": f"One transaction that runs the {len(buf)} calls below in order (multicall).",
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


def fix_create_addresses(steps, deployer, rpc):
    """Batching changes how many transactions the deployer sends, so CREATE addresses (deployer, nonce) move.
    Recompute them from the live nonce and rewrite every reference (to, calldata, predictedAddress)."""
    nonce = int(subprocess.run(["cast", "nonce", deployer, "--rpc-url", rpc], capture_output=True, text=True, check=True).stdout.strip())
    renames = {}
    for i, st in enumerate(steps):
        if st["to"] is None:
            new = subprocess.run(["cast", "compute-address", deployer, "--nonce", str(nonce + i)], capture_output=True, text=True, check=True).stdout.strip().split()[-1]
            old = st.get("predictedAddress")
            if old and old.lower() != new.lower():
                renames[old.lower()[2:]] = new.lower()[2:]
            st["predictedAddress"] = new
    if renames:
        print("rewrote CREATE addresses after batching:", renames)
    for st in steps:
        for old, new in renames.items():
            if st["to"] and st["to"].lower()[2:] == old:
                st["to"] = "0x" + new
            st["data"] = st["data"].lower().replace(old, new)
    return steps


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
    if script.startswith("02"):
        junior = next(s["predictedAddress"] for s in steps if s.get("contractName") == "JuniorVault")
        router = next(s["predictedAddress"] for s in steps if s.get("contractName") == "FeeRouter")
        v += [{"label": "junior.owner == deployer", "to": junior, "data": call("owner()"), "expect": addr_word(env["DEPLOYER"])},
              {"label": "junior.agent == rotator", "to": junior, "data": call("agent()"), "expect": addr_word(env["AGENT"])},
              {"label": "junior.senior == senior", "to": junior, "data": call("senior()"), "expect": addr_word(env["SENIOR"])},
              {"label": "junior.seeded", "to": junior, "data": call("seeded()"), "expect": word(1)},
              {"label": "junior.depositsPaused", "to": junior, "data": call("depositsPaused()"), "expect": word(1)},
              {"label": "junior.depositCap == 75k", "to": junior, "data": call("depositCap()"), "expect": word(75_000_000_000)},
              {"label": "junior.walletCap == 10k", "to": junior, "data": call("walletCap()"), "expect": word(10_000_000_000)},
              {"label": "junior.marketsLength == 4", "to": junior, "data": call("marketsLength()"), "expect": word(4)},
              {"label": "junior.vaultsLength == 2", "to": junior, "data": call("vaultsLength()"), "expect": word(2)},
              {"label": "router.owner == deployer", "to": router, "data": call("owner()"), "expect": addr_word(env["DEPLOYER"])},
              {"label": "router.keeper == rotator", "to": router, "data": call("keeper()"), "expect": addr_word(env["AGENT"])},
              {"label": "router.treasury", "to": router, "data": call("treasury()"), "expect": addr_word(env["TREASURY"])},
              {"label": "router.junior", "to": router, "data": call("junior()"), "expect": addr_word(junior)}]
    if script.startswith("03"):
        senior = env["SENIOR"]
        v += [{"label": "owner == senior admin", "to": senior, "data": call("owner()"), "expect": addr_word(env["SENIOR_ADMIN"])},
              {"label": "curator == senior admin", "to": senior, "data": call("curator()"), "expect": addr_word(env["SENIOR_ADMIN"])},
              {"label": "fee recipient == junior", "to": senior, "data": call("managementFeeRecipient()"), "expect": addr_word(env["JUNIOR"])},
              {"label": "liquidity adapter == felix", "to": senior, "data": call("liquidityAdapter()"), "expect": addr_word(env["FELIX_ADAPTER"])},
              {"label": "timelock(addAdapter) == 3 days", "to": senior, "data": call("timelock(bytes4)", "0x" + subprocess.run(["cast","sig","addAdapter(address)"],capture_output=True,text=True).stdout.strip()[2:]), "expect": word(259200)},
              {"label": "timelock(setIsAllocator) == 0", "to": senior, "data": call("timelock(bytes4)", subprocess.run(["cast","sig","setIsAllocator(address,bool)"],capture_output=True,text=True).stdout.strip()), "expect": word(0)}]
    return v


ZERO = "0x" + "0" * 64
FELIX = "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27"
USDC_ADDR = "0xb88339CB7199b77E23DB6E890353E22632Ba630f"
MORPHO_ADDR = "0x68e37dE8d93d3496ae143F2E900490f6280C57cD"
JUNIOR_OWNER = "0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC"
SENIOR_SAFE = "0x9EDfDc92A46adbfa7b6189295376bEF4599c5F29"
FRESH = "0x000000000000000000000000000000000000bEEF"
TIMELOCK = 259200

# migration phases: role, whether junior calls may be batched, declared wait before the phase
PHASES = {
    "06a": {"role": "JUNIOR_OWNER", "collapse": True, "bigBlocks": True},
    "06b": {"role": "SENIOR_SAFE", "collapse": False, "bigBlocks": False},
    "06c": {"role": "SENIOR_SAFE (anyone may execute)", "collapse": False, "bigBlocks": False, "wait": TIMELOCK},
    "06d": {"role": "JUNIOR_OWNER", "collapse": False, "bigBlocks": False},
}


def chk(label, to, sig, args=(), expect=None, gte=None, word_i=None):
    c = {"label": label, "to": to, "data": call(sig, *args)}
    if expect is not None:
        c["expect"] = expect
    if gte is not None:
        c["gte"] = gte
    if word_i is not None:
        c["word"] = word_i
    return c


def sig4(sig):
    return subprocess.run(["cast", "sig", sig], capture_output=True, text=True, check=True).stdout.strip()


def lib_runtime_hash(addr):
    """keccak of VenueAdmin's runtime code as deployed at addr: the artifact's runtime has the library's own address (PUSH20
    self-guard) as an immutable at bytes 1..21; fill it in, hash."""
    art = json.load(open(ROOT / "out" / "VenueAdmin.sol" / "VenueAdmin.json"))
    obj = art["deployedBytecode"]["object"]
    assert obj.startswith("0x73" + "00" * 20), "VenueAdmin runtime no longer starts with the PUSH20 self guard"
    full = "0x73" + addr.lower()[2:] + obj[2 + 42:]
    return subprocess.run(["cast", "keccak", full], capture_output=True, text=True, check=True).stdout.strip()


def lib_create2_address():
    art = json.load(open(ROOT / "out" / "VenueAdmin.sol" / "VenueAdmin.json"))
    out = subprocess.run(["cast", "create2", "--deployer", CREATE2_DEPLOYER, "--salt", "0x" + "00" * 32, "--init-code",
                          art["bytecode"]["object"]], capture_output=True, text=True, check=True).stdout
    return next(w for w in out.split() if w.startswith("0x") and len(w) == 42)


def find(steps, name):
    return next(s["predictedAddress"] for s in steps if s.get("contractName") == name)


def rule_word_checks(junior, target, sel, offset, allowed):
    return chk(f"rules({target[:8]}.., {sel}) allowed == {allowed}", junior, "rules(address,bytes4)", (target, sel),
               expect=word(1 if allowed else 0), word_i=0)


def phase_checks(script, env, steps, rpc):
    """(precheck, verify) for a migration phase, from the scripts' own constants and the env."""
    S, OLDJ = env.get("SENIOR"), env.get("OLD_JUNIOR")
    pre, v = [], []
    if script.startswith("06a"):
        dep = env["DEPLOYER"]
        j, r, g = find(steps, "JuniorVault"), find(steps, "FeeRouter"), find(steps, "SeniorReceiveGate")
        la = lib_create2_address()
        lib_step = next((s for s in steps if s["to"] and s["to"].lower() == CREATE2_DEPLOYER), None)
        if lib_step and lib_step.get("predictedAddress") and lib_step["predictedAddress"].lower() != la.lower():
            sys.exit(f"library CREATE2 address mismatch: forge {lib_step['predictedAddress']} vs computed {la}")
        pre += [chk("old junior has settled (S1: lastSettle >= due second): REFUSE otherwise", OLDJ, "lastSettle()", gte=int(env["OLD_SETTLE_DUE"])),
                {"label": "USDC.balanceOf(signer) >= 1 USDC (the seed)", "to": USDC_ADDR, "data": call("balanceOf(address)", dep), "gte": 1_000_000},
                chk("senior receive gate not wired yet", S, "receiveSharesGate()", expect=ZERO)]
        if OLDJ:
            pre.append(chk("senior fee recipient is still the old junior", S, "managementFeeRecipient()", expect=addr_word(OLDJ)))
        cap = int(env.get("JUNIOR_CAP", 5_000_000_000)); wcap = int(env.get("WALLET_CAP", 10_000_000_000))
        # step-level read-backs: the library hash right after it is created (before v2 is), and v2's code embeds the library address
        if lib_step is not None:
            lib_step["readbacks"].append({"label": "VenueAdmin runtime code hash equals the build's (CREATE2 library)", "codehash": la, "expect": lib_runtime_hash(la)})
        j_step = next(st for st in steps if st.get("contractName") == "JuniorVault" and st["to"] is None)
        j_step["readbacks"].append({"label": "v2 runtime code embeds the VenueAdmin address", "codeof": "$created", "contains": la.lower()})
        v += [{"label": "VenueAdmin runtime code hash (CREATE2 library, linked into v2)", "codehash": la, "expect": lib_runtime_hash(la)},
              chk("v2.owner == junior owner", j, "owner()", expect=addr_word(dep)),
              chk("v2.senior == live senior", j, "senior()", expect=addr_word(S)),
              chk("v2.agent == rotator", j, "agent()", expect=addr_word(env["AGENT"])),
              chk("v2.seeded", j, "seeded()", expect=word(1)),
              chk("v2.depositsPaused (open only in phase D)", j, "depositsPaused()", expect=word(1)),
              chk("v2.depositCap", j, "depositCap()", expect=word(cap)),
              chk("v2.walletCap", j, "walletCap()", expect=word(wcap)),
              chk("v2.marketsLength == 0 (Felix + senior only)", j, "marketsLength()", expect=word(0)),
              chk("v2.vaultsLength == 2", j, "vaultsLength()", expect=word(2)),
              chk("v2.vaults(0) == Felix", j, "vaults(uint256)", (0,), expect=addr_word(FELIX)),
              chk("v2.vaults(1) == senior", j, "vaults(uint256)", (1,), expect=addr_word(S)),
              chk("v2.felixExp(0) is Felix (constructor snapshot)", j, "felixExp(uint256)", (0,), expect=addr_word(FELIX), word_i=0),
              chk("v2 has no Morpho supply rule", j, "rules(address,bytes4)", (MORPHO_ADDR, sig4("supply((address,address,address,address,uint256),uint256,uint256,address,bytes)")), expect=word(0), word_i=0),
              chk("v2 Felix deposit rule allowed", j, "rules(address,bytes4)", (FELIX, sig4("deposit(uint256,address)")), expect=word(1), word_i=0),
              chk("v2 USDC->Felix approval rule", j, "approvals(address,address)", (USDC_ADDR, FELIX), expect=word(1)),
              chk("v2 USDC->Morpho approval rule absent", j, "approvals(address,address)", (USDC_ADDR, MORPHO_ADDR), expect=word(0)),
              chk("router.owner", r, "owner()", expect=addr_word(dep)),
              chk("router.senior", r, "senior()", expect=addr_word(S)),
              chk("router.junior == v2", r, "junior()", expect=addr_word(j)),
              chk("router.treasury", r, "treasury()", expect=addr_word(env["TREASURY"])),
              chk("router.keeper == rotator", r, "keeper()", expect=addr_word(env["AGENT"])),
              chk("gate.senior", g, "senior()", expect=addr_word(S)),
              chk("gate.junior == v2", g, "junior()", expect=addr_word(j)),
              chk("gate.owner == senior curator", g, "owner()", expect=addr_word(SENIOR_SAFE)),
              chk("gate.maxUnrecognised == 10 USDC", g, "maxUnrecognised()", expect=word(10_000_000)),
              chk("gate.canReceiveShares(v2)", g, "canReceiveShares(address)", (j,), expect=word(1)),
              chk("senior gate still unwired", S, "receiveSharesGate()", expect=ZERO)]
        if OLDJ:
            v.append(chk("senior fee recipient still the old junior", S, "managementFeeRecipient()", expect=addr_word(OLDJ)))
    elif script.startswith("06b"):
        j, g = env["JUNIOR"], env["GATE"]
        rec = call("setManagementFeeRecipient(address)", j); gat = call("setReceiveSharesGate(address)", g)
        pre += [chk("old junior has settled (S1): REFUSE otherwise; C is permissionless once B matures", OLDJ, "lastSettle()", gte=int(env["OLD_SETTLE_DUE"])),
                chk("signer is the senior curator", S, "curator()", expect=addr_word(env["DEPLOYER"])),
                chk("v2 junior has code", j, "senior()", expect=addr_word(S)),
                chk("gate.junior == v2 (a codeless or wrong gate would brick senior)", g, "junior()", expect=addr_word(j)),
                chk("gate.senior == senior", g, "senior()", expect=addr_word(S)),
                chk("senior gate unwired", S, "receiveSharesGate()", expect=ZERO)]
        v += [chk("recipient change submitted (executableAt != 0)", S, "executableAt(bytes)", (rec,), gte=1),
              chk("gate change submitted (executableAt != 0)", S, "executableAt(bytes)", (gat,), gte=1),
              chk("recipient still not v2 (nothing wired in phase B)", S, "managementFeeRecipient()", expect=addr_word(OLDJ)),
              chk("gate still unwired", S, "receiveSharesGate()", expect=ZERO)]
    elif script.startswith("06c"):
        j, g = env["JUNIOR"], env["GATE"]
        rec = call("setManagementFeeRecipient(address)", j); gat = call("setReceiveSharesGate(address)", g)
        pre += [chk("old junior has settled (lastSettle >= due second): REFUSE otherwise", OLDJ, "lastSettle()", gte=int(env["OLD_SETTLE_DUE"])),
                chk("gate.junior == v2", g, "junior()", expect=addr_word(j)),
                chk("gate.senior == senior", g, "senior()", expect=addr_word(S)),
                chk("recipient change was submitted", S, "executableAt(bytes)", (rec,), gte=1),
                chk("gate change was submitted", S, "executableAt(bytes)", (gat,), gte=1)]
        v += [chk("senior fee recipient == v2", S, "managementFeeRecipient()", expect=addr_word(j)),
              chk("senior receive gate == new gate", S, "receiveSharesGate()", expect=addr_word(g)),
              chk("fresh account can receive shares (normal times)", g, "canReceiveShares(address)", (FRESH,), expect=word(1)),
              chk("pending recipient change consumed", S, "executableAt(bytes)", (rec,), expect=word(0)),
              chk("pending gate change consumed", S, "executableAt(bytes)", (gat,), expect=word(0))]
    elif script.startswith("06d"):
        j, g, oj, orr = env["JUNIOR"], env["GATE"], env["OLD_JUNIOR"], env["OLD_ROUTER"]
        n = int(subprocess.run(["cast", "call", oj, "marketsLength()(uint256)", "--rpc-url", rpc], capture_output=True, text=True, check=True).stdout.split()[0])
        pre += [chk("senior fee recipient == v2 (phase C done)", S, "managementFeeRecipient()", expect=addr_word(j)),
                chk("senior receive gate == new gate", S, "receiveSharesGate()", expect=addr_word(g)),
                chk("gate lets a fresh account in", g, "canReceiveShares(address)", (FRESH,), expect=word(1)),
                chk("v2 deposits still paused", j, "depositsPaused()", expect=word(1))]
        pre += [chk(f"old junior market {i} position is 0 (RUNBOOK 8a)", oj, "marketAssets(uint256)", (i,), expect=word(0)) for i in range(n)]
        sup = sig4("supply((address,address,address,address,uint256),uint256,uint256,address,bytes)")
        wd = sig4("withdraw((address,address,address,address,uint256),uint256,uint256,address,address)")
        fes = int(subprocess.run(["cast", "call", j, "felixExpSupply()(uint256)", "--rpc-url", rpc], capture_output=True, text=True, check=True).stdout.split()[0])
        v += [chk("old router.senior", orr, "senior()", expect=addr_word(S)),
              chk("old router.junior == v2", orr, "junior()", expect=addr_word(j)),
              chk("old router.treasury", orr, "treasury()", expect=addr_word(env["TREASURY"])),
              chk("old junior deposits paused", oj, "depositsPaused()", expect=word(1)),
              chk("old junior Morpho supply rule off", oj, "rules(address,bytes4)", (MORPHO_ADDR, sup), expect=word(0), word_i=0),
              chk("old junior Morpho withdraw rule off", oj, "rules(address,bytes4)", (MORPHO_ADDR, wd), expect=word(0), word_i=0),
              chk("v2 Felix exposure snapshot present", j, "felixExp(uint256)", (0,), expect=addr_word(FELIX), word_i=0),
              # felixExpSupply is senior's supply at the last snapshot; it was fixed at phase A and senior's supply has grown since (the fee
              # shares minted at phase C), so a value above the pre-D one proves snapFelixExposure RAN in D (the constructor's snapshot alone cannot)
              chk("v2.snapFelixExposure ran in D (felixExpSupply moved past its phase-A value)", j, "felixExpSupply()", gte=fes + 1),
              chk("v2 deposits OPEN (last step)", j, "depositsPaused()", expect=word(0))]
    return pre, v


def main():
    script, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
    env = dict(os.environ)
    for kv in sys.argv[5:] if len(sys.argv) > 4 and sys.argv[4] == "--env" else []:
        k, v = kv.split("=", 1)
        env[k] = v
    deployer = env["DEPLOYER"]
    rpc = env.get("FORK_RPC", "http://127.0.0.1:8545")
    phase = PHASES.get(script[:3])
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
        if t.get("to") and t["to"].lower() == CREATE2_DEPLOYER:
            title = "call create2-deployer VenueAdmin (library)"
            what = "Deploy the external library VenueAdmin through the deterministic CREATE2 deployer; its address is fixed by this exact build."
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
    if phase is None:
        steps = collapse(steps, [env.get("SENIOR"), env.get("JUNIOR")])
    elif phase["collapse"]:
        steps = collapse(steps, [])
    nonce = int(subprocess.run(["cast", "nonce", deployer, "--rpc-url", rpc], capture_output=True, text=True, check=True).stdout.strip())
    steps = fix_create_addresses(steps, deployer, rpc)
    for st in steps:
        st["needsBigBlock"] = bool(st.get("gas") and int(st["gas"], 16) > 2_000_000)
    plan = {"name": name, "deployer": deployer, "chainId": 999, "script": script, "steps": steps}
    if phase is None:
        plan["verify"] = verify(script, env, steps)
    else:
        pre, ver = phase_checks(script, env, steps, rpc)
        plan.update({"signer": deployer, "role": phase["role"], "nonce": nonce, "bigBlocks": any(s["needsBigBlock"] for s in steps),
                     "precheck": pre, "verify": ver})
        if phase.get("wait"):
            plan["waitBeforeSeconds"] = phase["wait"]
    plan["logs"] = [l for l in r.stdout.splitlines() if "==" in l or "verify" in l or ":" in l and len(l) < 120][-40:]
    Path(out).write_text(json.dumps(plan, indent=2))
    print(f"{len(steps)} steps -> {out}")
    for i, s in enumerate(steps):
        print(f"{i+1:2d}. {s['title'][:90]}  gas={int(s['gas'],16) if s.get('gas') else '-'}{' BIG' if s['needsBigBlock'] else ''}")


if __name__ == "__main__":
    main()
