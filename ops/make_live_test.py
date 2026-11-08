#!/usr/bin/env python3
"""Plan 4: Cashout's own live test, signed from the junior owner wallet.
Usage: make_live_test.py <out.json> SENIOR=0x.. JUNIOR=0x.. DEPLOYER=0x.. SENIOR_USDC=1000 JUNIOR_USDC=1000 [EXIT_SHARES=1000000]
Unpauses junior, deposits USDC in senior and junior, requests a tiny exit, re-pauses nothing (deposits stay open).
Read-backs: share balances non-zero, senior totalAssets covers the deposit, the exit is queued.
"""
import json, subprocess, sys

out = sys.argv[1]
env = dict(kv.split("=", 1) for kv in sys.argv[2:])
S, J, D = env["SENIOR"], env["JUNIOR"], env["DEPLOYER"]
USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f"
sen = int(float(env.get("SENIOR_USDC", "1000")) * 1e6)
jun = int(float(env.get("JUNIOR_USDC", "1000")) * 1e6)
exit_shares = int(env.get("EXIT_SHARES", str(10**6)))  # junior shares are 18 decimals; 1e6 is dust


def call(sig, *a):
    return subprocess.run(["cast", "calldata", sig, *map(str, a)], capture_output=True, text=True, check=True).stdout.strip()


def word(v):
    return "0x" + hex(v)[2:].rjust(64, "0")


def addr(a):
    return "0x" + a.lower()[2:].rjust(64, "0")


steps = [
    {"title": "junior.setDepositsPaused(false)", "what": "Open junior deposits for the live test (owner only).", "to": J,
     "data": call("setDepositsPaused(bool)", "false"), "value": "0x0", "gas": hex(80_000),
     "readbacks": [{"label": "depositsPaused == false", "to": J, "data": call("depositsPaused()"), "expect": word(0)}]},
    {"title": f"USDC.approve(senior, {sen/1e6:g})", "what": "Allow senior to pull the deposit.", "to": USDC,
     "data": call("approve(address,uint256)", S, sen), "value": "0x0", "gas": hex(80_000),
     "readbacks": [{"label": "allowance", "to": USDC, "data": call("allowance(address,address)", D, S), "expect": word(sen)}]},
    {"title": f"senior.deposit({sen/1e6:g} USDC)", "what": "First senior deposit. Lands in Felix via the liquidity adapter.", "to": S,
     "data": call("deposit(uint256,address)", sen, D), "value": "0x0", "gas": hex(1_500_000),
     "readbacks": [{"label": "senior.totalAssets >= deposit (lower bound check is done by Claude)", "to": S, "data": call("totalAssets()"), "expect": None}]},
    {"title": f"USDC.approve(junior, {jun/1e6:g})", "what": "Allow junior to pull the deposit.", "to": USDC,
     "data": call("approve(address,uint256)", J, jun), "value": "0x0", "gas": hex(80_000),
     "readbacks": [{"label": "allowance", "to": USDC, "data": call("allowance(address,address)", D, J), "expect": word(jun)}]},
    {"title": f"junior.deposit({jun/1e6:g} USDC)", "what": "First junior deposit. No ORPH stake needed yet (stake token not set).", "to": J,
     "data": call("deposit(uint256,address)", jun, D), "value": "0x0", "gas": hex(1_500_000),
     "readbacks": [{"label": "junior shares > 0", "to": J, "data": call("balanceOf(address)", D), "expect": None}]},
    {"title": f"junior.requestExit({exit_shares} share units)", "what": "Queue a dust exit so the exit path is exercised; it matures at the next settle.", "to": J,
     "data": call("requestExit(uint256)", exit_shares), "value": "0x0", "gas": hex(400_000),
     "readbacks": [{"label": "exit queued", "to": J, "data": call("exitOf(address)", D), "expect": None}]},
]
plan = {"name": "step 4: live test with own capital", "deployer": D, "chainId": 999, "steps": steps,
        "verify": [
            {"label": "senior shares held by deployer (non-zero)", "to": S, "data": call("balanceOf(address)", D), "expect": None},
            {"label": "junior shares held by deployer (non-zero)", "to": J, "data": call("balanceOf(address)", D), "expect": None},
            {"label": "senior.liquidityAdapter unchanged", "to": S, "data": call("liquidityAdapter()"), "expect": addr(env["FELIX_ADAPTER"])} if env.get("FELIX_ADAPTER") else None,
        ]}
plan["verify"] = [v for v in plan["verify"] if v]
json.dump(plan, open(out, "w"), indent=2)
print(f"{len(steps)} steps -> {out}")
