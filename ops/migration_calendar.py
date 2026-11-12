#!/usr/bin/env python3
"""The migration calendar, computed from on-chain values and the contract source, never typed. READ-ONLY (eth_call only; any RPC).

Usage: migration_calendar.py [rpc] [old_junior]     defaults: https://hyperliquid.drpc.org, the live old junior
Reads old.lastSettle(), SETTLE_INTERVAL(), NOTICE() from the chain and checks them against contracts/src/JuniorVault.sol, whose
requestExit formula and constructor (v2's lastSettle = block.timestamp, so v2's first settle is due A + SETTLE_INTERVAL) it reads.
Prints a markdown block: S1, S2, the holder's exit deadline (the latest request whose readyAt is priced at S2, by the contract's own
formula), the phase dates and, per candidate date for A (= B), v2's first-settle margin over S2 and whether C/D fit before S2.
"""
import re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

DAY, THREE = 86400, 3 * 86400
RPC = sys.argv[1] if len(sys.argv) > 1 else "https://hyperliquid.drpc.org"
OLD = sys.argv[2] if len(sys.argv) > 2 else "0x20D5F4f78858D257eA047EB5F47773E361697F2E"
REDEPOSIT_WINDOW = 2 * 3600  # the claim + redeposit are done within this long after S2 (a margin, not a rule)
SRC = (Path(__file__).resolve().parent.parent / "contracts" / "src" / "JuniorVault.sol").read_text()


def call(sig):
    r = subprocess.run(["cast", "call", OLD, sig, "--rpc-url", RPC], capture_output=True, text=True, check=True)
    return int(r.stdout.split()[0])


def fmt(t):
    return datetime.fromtimestamp(t, timezone.utc).strftime("%a %d %b %H:%M:%S UTC")


last, interval, notice = call("lastSettle()(uint256)"), call("SETTLE_INTERVAL()(uint256)"), call("NOTICE()(uint256)")
# the contract source must say the same as the chain, and must contain the formulas used below
assert re.search(r"SETTLE_INTERVAL = 7 days - 1 hours", SRC) and interval == 7 * DAY - 3600, "settle interval differs from the source"
assert re.search(r"NOTICE = 7 days", SRC) and notice == 7 * DAY, "notice differs from the source"
assert "uint64((block.timestamp + NOTICE + 1 days - 1) / 1 days * 1 days)" in SRC, "requestExit formula changed: recompute"
assert re.search(r"lastSettle = block\.timestamp;", SRC), "constructor no longer sets lastSettle = block.timestamp: v2's first settle rule changed"


def ready_at(ts):
    return (ts + notice + DAY - 1) // DAY * DAY


s1 = last + interval
s2 = s1 + interval
day2 = s2 // DAY * DAY
deadline = day2 - notice  # latest ts with ready_at(ts) <= day2 <= s2
assert ready_at(deadline) <= s2 < ready_at(deadline + 1), "deadline derivation is off"
a_min = s2 + REDEPOSIT_WINDOW - interval  # v2's first settle (A + interval) must fall after the redeposit
a_max = s2 - THREE  # C (>= B + 3 d) and D must be done by S2 so v2 is open for the redeposit

print("| item | when (UTC) | rule |")
print("|---|---|---|")
print(f"| old junior lastSettle (chain) | {fmt(last)} | read from chain |")
print(f"| **S1** old junior first settle | **{fmt(s1)}** | lastSettle + SETTLE_INTERVAL ({interval} s) |")
print(f"| **S2** old junior second settle | **{fmt(s2)}** | S1 + SETTLE_INTERVAL (later if S1 is late) |")
print(f"| holder `requestExit` deadline | **{fmt(deadline)}** | latest request with readyAt <= S2: `readyAt = (t + 7d + 1d - 1) / 1d * 1d`; readyAt({deadline}) = {fmt(ready_at(deadline))}, readyAt(+1 s) = {fmt(ready_at(deadline + 1))}. Safe margin: Sat {fmt(deadline - 1)[4:]} |")
print(f"| A and B | on/after S1 ({fmt(s1)}) | the scripts and plans refuse before S1 |")
print(f"| C | >= B + 3 d | permissionless once B matures |")
print(f"| v2 first settle | A + {interval} s | v2's constructor sets lastSettle = block.timestamp |")
print(f"| earliest A (redeposit within {REDEPOSIT_WINDOW // 3600} h of S2 fits) | {fmt(a_min)} | A + SETTLE_INTERVAL > S2 + {REDEPOSIT_WINDOW // 3600} h |")
print(f"| latest A = B (C and D done by S2) | {fmt(a_max)} | B + 3 d <= S2, so v2 is open for the redeposit |")
print()
print("| A = B | C earliest (D after) | v2 first settle due | margin over S2 | C and D before S2 | verdict |")
print("|---|---|---|---|---|---|")
next_mid = (s1 // DAY + 1) * DAY
cands = [s1, next_mid, next_mid + 12 * 3600, next_mid + DAY, next_mid + 2 * DAY, next_mid + 3 * DAY + 12 * 3600, next_mid + 4 * DAY]
for a in cands:
    due = a + interval
    margin = (due - s2) / 3600
    fits = a + THREE <= s2
    ok = due >= s2 + REDEPOSIT_WINDOW and fits
    print(f"| {fmt(a)} | {fmt(a + THREE)} | {fmt(due)} | {margin:+.2f} h | {'yes' if fits else 'NO'} | {'ok' if ok else 'FAILS'} |")
