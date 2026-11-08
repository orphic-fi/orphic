#!/usr/bin/env python3
"""Replay a signer plan on an anvil fork as the deployer (impersonated), then run its verify read-backs.
Usage: replay_plan.py <plan.json> [rpc]
Proves the exact calldata Cashout will sign works end to end before he signs it."""
import json, subprocess, sys

plan = json.load(open(sys.argv[1]))
rpc = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8545"
dep = plan["deployer"]


def cast(*a):
    r = subprocess.run(["cast", *a, "--rpc-url", rpc], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"cast {a[0]} failed: {r.stderr.strip()[:800]}")
    return r.stdout.strip()


cast("rpc", "anvil_impersonateAccount", dep)
cast("rpc", "anvil_setBalance", dep, "0x56BC75E2D63100000")
created = []
for i, s in enumerate(plan["steps"]):
    args = ["send", "--unlocked", "--from", dep, "--gas-limit", str(int(s["gas"], 16)), "--json"]
    if s["to"]:
        args += [s["to"], s["data"]]
    else:
        args += ["--create", s["data"]]
    if s.get("value") and s["value"] != "0x0":
        args += ["--value", str(int(s["value"], 16))]
    out = json.loads(cast(*args))
    ok = out["status"] in ("0x1", "1", 1, "true", True)
    print(f"{i+1:2d}. {s['title'][:50]:50s} status={out['status']} gas={int(out['gasUsed'],16) if isinstance(out['gasUsed'],str) else out['gasUsed']} created={out.get('contractAddress')}")
    if out.get("contractAddress"):
        created.append(out["contractAddress"])
    if not ok:
        sys.exit("step failed")
for v in plan.get("verify", []):
    got = cast("call", v["to"], v["data"])
    status = "ok" if got.lower() == v["expect"].lower() else f"MISMATCH got {got}"
    print(f"verify {v['label']}: {status}")
print("replay complete")
