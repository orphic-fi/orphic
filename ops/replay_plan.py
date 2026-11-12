#!/usr/bin/env python3
"""Replay a signer plan (or an ordered manifest of phase plans) on a LOOPBACK ANVIL FORK, impersonating each plan's signer,
then run every read-back. Proves the exact calldata the partner will sign works end to end before they sign it.

Usage: replay_plan.py <plan.json | manifest.json> [rpc]      (rpc default http://127.0.0.1:8545)

HARD GUARD (runs before anything else, before any `cast send` or impersonation): the RPC must be exactly
http://127.0.0.1:<port> AND `web3_clientVersion` must start with `anvil`. Anything else is refused, so this tool can never
send to a real chain (it uses `--unlocked` sends and anvil_* cheats, which only exist on a fork).

Plan JSON (written by make_plan.py; ONLY real transactions and read-backs, no vm.*, no impersonation, no warps):
  {name, signer|deployer, role, chainId, nonce, bigBlocks, waitBeforeSeconds, notBeforeCall, precheck, steps, verify}
  steps[]:    {title, what, to, data, value, gas, needsBigBlock, readbacks[]}
  a check (precheck / readbacks / verify) is one of
     {label, to, data, expect}             eth_call result equals expect
     {label, to, data, gte}                eth_call result as an integer is >= gte (a 0x hex or decimal string)
     {label, to, data}                     eth_call result is non-zero
     {label, to, data, word:i, expect}     32-byte word i of the eth_call result equals expect (multi-word returns)
     {label, codehash: addr, expect}       keccak256 of the code at addr equals expect (cast codehash)
  precheck:   checks run BEFORE the first step; one failing aborts the phase (nothing is sent).
  waitBeforeSeconds / waitFromPlan / notBeforeCall {to,data,plus}: the DECLARED waits. The replay (and only the replay) warps the
     fork's clock so the phase starts no earlier than end-of-(waitFromPlan, a manifest plan file; default: the previous phase)
     + waitBeforeSeconds and no earlier than call(to,data) + plus.
Manifest: {name, phases:[{plan:<file relative to the manifest>, role}]}, replayed in order.
"""
import json, re, subprocess, sys
from pathlib import Path

LOOPBACK = re.compile(r"^http://127\.0\.0\.1:[0-9]{1,5}/?$")


def refuse(msg):
    sys.exit(f"REFUSED: {msg}")


def require_local_anvil(rpc):
    """The loopback guard. Called first; raises SystemExit (nothing sent) unless rpc is http://127.0.0.1:<port> on an anvil."""
    if not LOOPBACK.match(rpc):
        refuse(f"rpc {rpc!r} is not http://127.0.0.1:<port>; this tool only replays on a loopback anvil fork")
    r = subprocess.run(["cast", "rpc", "web3_clientVersion", "--rpc-url", rpc], capture_output=True, text=True)
    ver = r.stdout.strip().strip('"')
    if r.returncode != 0 or not ver.lower().startswith("anvil"):
        refuse(f"web3_clientVersion is {ver or r.stderr.strip()[:120]!r}, not anvil; this tool only replays on an anvil fork")
    return ver


def cast(rpc, *a):
    r = subprocess.run(["cast", a[0], "--rpc-url", rpc, *a[1:]], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"cast {a[0]} failed: {r.stderr.strip()[:800]}")
    return r.stdout.strip()


def head_ts(rpc):
    return int(cast(rpc, "block", "latest", "-f", "timestamp"))


def warp_to(rpc, target):
    now = head_ts(rpc)
    if target > now:
        cast(rpc, "rpc", "evm_increaseTime", str(target - now))
        cast(rpc, "rpc", "evm_mine")
        print(f"   warp (fork clock only): +{target - now}s -> {head_ts(rpc)}")


def _int(s):
    s = s.strip().split()[0]
    return int(s, 16) if s.startswith("0x") else int(s)


def run_check(rpc, c):
    """True when the check holds. Prints one line."""
    if c.get("codehash"):
        got = cast(rpc, "codehash", c["codehash"])
        ok = got.lower() == c["expect"].lower()
    else:
        got = cast(rpc, "call", c["to"], c["data"])
        if c.get("word") is not None:
            body = got[2:]
            w = "0x" + body[c["word"] * 64:(c["word"] + 1) * 64]
            ok = w.lower() == c["expect"].lower()
        elif c.get("gte") is not None:
            ok = _int(got) >= _int(str(c["gte"]))
        elif c.get("expect"):
            ok = got.lower() == c["expect"].lower()
        else:
            ok = len(got) > 2 and int(got, 16) != 0
    print(f"    {'ok      ' if ok else 'MISMATCH'} {c['label']}  {got[:66]}")
    return ok


def run_plan(plan, rpc, prev_end=None):
    """Replay one phase. Returns the head timestamp after it. Exits on any failure."""
    signer = plan.get("signer") or plan["deployer"]
    print(f"== {plan['name']}  signer {signer} ({plan.get('role', '')})")
    # declared waits (the only place time is touched)
    target = 0
    if plan.get("waitBeforeSeconds") and prev_end is not None:
        target = prev_end + int(plan["waitBeforeSeconds"])
    nb = plan.get("notBeforeCall")
    if nb:
        target = max(target, _int(cast(rpc, "call", nb["to"], nb["data"])) + int(nb.get("plus", 0)))
    if target:
        warp_to(rpc, target)
    if plan.get("nonce") is not None:
        n = int(cast(rpc, "nonce", signer))
        if n != int(plan["nonce"]):
            sys.exit(f"nonce mismatch: plan was generated at nonce {plan['nonce']}, the signer is at {n} (CREATE addresses would differ)")
    for c in plan.get("precheck", []):
        if not run_check(rpc, c):
            sys.exit(f"PRECHECK FAILED: {c['label']}; nothing sent for this phase")
    cast(rpc, "rpc", "anvil_impersonateAccount", signer)
    cast(rpc, "rpc", "anvil_setBalance", signer, "0x56BC75E2D63100000")
    for i, s in enumerate(plan["steps"]):
        args = ["send", "--unlocked", "--from", signer, "--gas-limit", str(int(s["gas"], 16)), "--json"]
        if s["to"]:
            args += [s["to"], s["data"]]
        else:
            args += ["--create", s["data"]]
        if s.get("value") and s["value"] != "0x0":
            args += ["--value", str(int(s["value"], 16))]
        out = json.loads(cast(rpc, *args))
        ok = out["status"] in ("0x1", "1", 1, "true", True)
        gu = int(out["gasUsed"], 16) if isinstance(out["gasUsed"], str) else out["gasUsed"]
        big = " BIG-BLOCK" if gu > 2_000_000 else ""
        print(f"{i+1:2d}. {s['title'][:56]:56s} status={out['status']} gas={gu}{big} created={out.get('contractAddress')}")
        if not ok:
            sys.exit("step failed")
        for rb in s.get("readbacks", []):
            if not run_check(rpc, rb):
                sys.exit(f"READBACK FAILED: {rb['label']}")
    for v in plan.get("verify", []):
        if not run_check(rpc, v):
            sys.exit(f"VERIFY FAILED: {v['label']}")
    return head_ts(rpc)


def main():
    path = Path(sys.argv[1])
    rpc = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8545"
    require_local_anvil(rpc)  # before anything else
    doc = json.load(open(path))
    plans = [json.load(open(path.parent / p["plan"])) for p in doc["phases"]] if "phases" in doc else [doc]
    prev_end, ends = None, {}
    for ph, plan in zip(doc.get("phases", [{}]), plans):
        ref = ends.get(plan.get("waitFromPlan"), prev_end)
        prev_end = run_plan(plan, rpc, ref)
        ends[ph.get("plan", "")] = prev_end
    print("replay complete")


if __name__ == "__main__":
    main()
