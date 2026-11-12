#!/usr/bin/env python3
"""Generate and replay the whole migration (audit fixes 7/8) phase by phase on a LOOPBACK ANVIL FORK.

Usage: make_migration.py <out-dir> [rpc] [--fresh]
  --fresh  first builds the "old system" on the fork with scripts 01-03 (plans made by make_plan.py, replayed by replay_plan.py),
           removes the VenueAdmin library code (the live old junior is a pre-fix build and the library does not exist on chain),
           then runs the migration phases. The fork must be at a block BEFORE the live senior (the audit's fresh mode:
           --fork-block-number 50747000) and the signers need no balance (the replay tool funds them on the fork).
  without --fresh the fork must already hold the old system (a live-state fork): set SENIOR, OLD_JUNIOR, OLD_ROUTER in the env.

Phases, in order (each plan is one signer; waits are declared in the plan JSON, only this tool / replay_plan warps the fork):
  06a deploy (JUNIOR_OWNER) -> 06b submit (SENIOR_SAFE) -> old settle (keeper, permissionless; not signed by the partner)
  -> 06c execute (+3 days, only after the old settle) -> 06d cut-over (JUNIOR_OWNER)
  --holder   live-state mode: also rehearses phase E for the only junior holder 0x2DBE (requestExit now; at the old junior's next
           settle: recall Felix + redeem the senior fee shares as the agent would, settle, claimExit, deposit into v2) and prints the
           numbers. Fork-only cheats (impersonation, funding, warps) live in this tool, never in a plan JSON.
  --demo-refusal <a-deploy.json,b-submit.json>  before S1, tries to replay those earlier-generated plans and shows the replay REFUSING each
           (precheck: the old junior has not settled), then carries on with the normal order.
Writes <out-dir>/{a-deploy,b-submit,s-old-settle,c-execute,d-cutover}.json and manifest.json. Refuses any rpc that is not a loopback anvil.
"""
import json, os, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import replay_plan as rp  # noqa: E402

OPS = Path(__file__).resolve().parent
AGENT = "0xC772F0ea992236dA71Fa30b8899D71B680866956"
TREASURY = "0xba08A51bb1BB49E9840Eb55511E8880F95306A40"
JUNIOR_OWNER = "0x2DBE1Ba83084dAF698Acea79CBAfe0493f42FecC"
SENIOR_SAFE = "0x9EDfDc92A46adbfa7b6189295376bEF4599c5F29"
MORPHO = "0x68e37dE8d93d3496ae143F2E900490f6280C57cD"
USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f"
SETTLE_INTERVAL = 7 * 86400 - 3600


def sh(*a, env=None):
    r = subprocess.run(a, capture_output=True, text=True, env=env)
    if r.returncode != 0:
        sys.exit(f"{' '.join(a)[:120]} failed: {r.stderr.strip()[:600]}")
    return r.stdout.strip()


def fsend(rpc, frm, to, sig, *args):
    """FORK-ONLY: an impersonated send (the loopback guard ran at start). Used for funding and phase E, never for a plan."""
    sh("cast", "rpc", "anvil_impersonateAccount", frm, "--rpc-url", rpc)
    sh("cast", "rpc", "anvil_setBalance", frm, "0x56BC75E2D63100000", "--rpc-url", rpc)
    r = json.loads(sh("cast", "send", "--unlocked", "--from", frm, "--gas-limit", "6000000", "--json", "--rpc-url", rpc, to, sig, *map(str, args)))
    if r["status"] not in ("0x1", 1, "1"):
        sys.exit(f"fork send {sig} failed")
    return int(r["gasUsed"], 16) if isinstance(r["gasUsed"], str) else r["gasUsed"]


def fcall(rpc, to, sig, *args):
    return sh("cast", "call", "--rpc-url", rpc, to, sig, *map(str, args)).split()[0]


FELIX = "0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27"


def e_holder(rpc, senior, old_j, v2):
    """Phase E on the fork for 0x2DBE: recall like the agent, settle at the due second, claim, redeposit into v2. Prints the numbers."""
    h = JUNIOR_OWNER
    usdc_bal = lambda a: int(fcall(rpc, USDC, "balanceOf(address)(uint256)", a))
    due = int(fcall(rpc, old_j, "lastSettle()(uint256)")) + SETTLE_INTERVAL
    print(f"== E: next old settle due {due}; the exit's readyAt", sh("cast", "call", "--rpc-url", rpc, old_j, "exitOf(address)(uint128,uint64,uint32)", h).replace("\n", " "))
    # recall just before the due second (the keeper's settle tick: touch, recall every position, then settle at the due second)
    rp.warp_to(rpc, due - 600)
    fsend(rpc, AGENT, senior, "accrueInterest()")
    fshares = int(fcall(rpc, FELIX, "balanceOf(address)(uint256)", old_j))
    assets = int(fcall(rpc, FELIX, "convertToAssets(uint256)(uint256)", fshares))
    wd = sh("cast", "calldata", "withdraw(uint256,address,address)", str(assets), old_j, old_j)
    g1 = fsend(rpc, AGENT, old_j, "execute(address,bytes)", FELIX, wd)
    sshares = int(fcall(rpc, senior, "balanceOf(address)(uint256)", old_j))
    rd = sh("cast", "calldata", "redeem(uint256,address,address)", str(sshares), old_j, old_j)
    g2 = fsend(rpc, AGENT, old_j, "execute(address,bytes)", senior, rd)
    print(f"== E recall: Felix {fshares} shares -> {assets} USDC (gas {g1}); senior fee shares {sshares} redeemed (gas {g2}); old junior idle {usdc_bal(old_j)}")
    rp.warp_to(rpc, due)
    fsend(rpc, AGENT, senior, "accrueInterest()")
    gs = fsend(rpc, AGENT, old_j, "settle()")
    price = int(fcall(rpc, old_j, "pricePerShare()(uint256)"))
    print(f"== E old settle at the due second: gas {gs}; pricePerShare {price}; pricedExitShares {fcall(rpc, old_j, 'pricedExitShares()(uint256)')}; reservedAssets {fcall(rpc, old_j, 'reservedAssets()(uint256)')}")
    ex = sh("cast", "call", "--rpc-url", rpc, old_j, "exitOf(address)(uint128,uint64,uint32)", h).replace("\n", " ")
    shares = int(ex.split()[0])
    b0 = usdc_bal(h)
    gc = fsend(rpc, h, old_j, "claimExit()")
    got = usdc_bal(h) - b0
    print(f"== E claimExit: {shares} shares at price {price} -> expected {shares * price // 10**18 // 10**12} units, received {got} (gas {gc}), i.e. {got/1e6:.6f} USDC")
    print(f"== E left in the old junior: USDC {usdc_bal(old_j)}, totalSupply {fcall(rpc, old_j, 'totalSupply()(uint256)')}, dead seed {fcall(rpc, old_j, 'balanceOf(address)(uint256)', '0x000000000000000000000000000000000000dEaD')}, 2DBE shares {fcall(rpc, old_j, 'balanceOf(address)(uint256)', h)}, totalAssets {fcall(rpc, old_j, 'totalAssets()(uint256)')}")
    amt = usdc_bal(h)
    fsend(rpc, h, USDC, "approve(address,uint256)", v2, amt)
    gd = fsend(rpc, h, v2, "deposit(uint256,address)", amt, h)
    print(f"== E deposit into v2: {amt} units (gas {gd}); v2 shares {fcall(rpc, v2, 'balanceOf(address)(uint256)', h)}; v2 totalAssets {fcall(rpc, v2, 'totalAssets()(uint256)')}; v2 pricePerShare {fcall(rpc, v2, 'pricePerShare()(uint256)')}")
    s2 = int(fcall(rpc, old_j, "lastSettle()(uint256)")); v2_due = int(fcall(rpc, v2, "lastSettle()(uint256)")) + SETTLE_INTERVAL
    print(f"== E calendar check: S2 (old settle) at {s2}; v2's first settle is due {v2_due}; the redeposit (right after S2) landed {v2_due - s2} s = {(v2_due - s2)/3600:.2f} h BEFORE it")
    if v2_due <= s2:
        sys.exit("v2's first settle would come before the redeposit: the calendar is broken (A too early)")
    rp.warp_to(rpc, v2_due)
    fsend(rpc, AGENT, senior, "accrueInterest()")
    g3 = fsend(rpc, AGENT, v2, "settle()")
    print(f"== E v2's first settle AFTER funding: gas {g3}; pricePerShare {fcall(rpc, v2, 'pricePerShare()(uint256)')}; totalAssets {fcall(rpc, v2, 'totalAssets()(uint256)')}; settlesLength {fcall(rpc, v2, 'settlesLength()(uint256)')}")


def gen(script, name, out, env, rpc):
    e = dict(os.environ, FORK_RPC=rpc, **env)
    args = [sys.executable, str(OPS / "make_plan.py"), script, name, str(out), "--env"] + [f"{k}={v}" for k, v in env.items()]
    r = subprocess.run(args, capture_output=True, text=True, env=e)
    print(r.stdout.strip())
    if r.returncode != 0:
        sys.exit(f"make_plan {script} failed: {r.stdout[-1500:]} {r.stderr[-1500:]}")
    return json.load(open(out))


def addr_of(plan, name):
    return next(s["predictedAddress"] for s in plan["steps"] if s.get("contractName") == name)


def main():
    # one RPC for the whole run (snapshot, revert and every call): the first http argument, default the loopback anvil
    rpc = next((a for a in sys.argv[2:] if a.startswith("http")), "http://127.0.0.1:8945")
    rp.require_local_anvil(rpc)
    # snapshot first, revert if anything fails, so a rerun on a long-lived fork starts from the same state
    snap = sh("cast", "rpc", "evm_snapshot", "--rpc-url", rpc).strip('"')
    try:
        run(rpc)
    except BaseException:
        sh("cast", "rpc", "evm_revert", snap, "--rpc-url", rpc)
        print("fork reverted to the pre-run snapshot")
        raise


def run(rpc):
    demo = None
    if "--demo-refusal" in sys.argv:
        i = sys.argv.index("--demo-refusal"); demo = sys.argv[i + 1].split(","); del sys.argv[i:i + 2]
    holder = "--holder" in sys.argv
    if holder:
        sys.argv.remove("--holder")
    args = [a for a in sys.argv[1:] if not a.startswith("--") and not a.startswith("http")]
    fresh = "--fresh" in sys.argv
    out = Path(args[0]); out.mkdir(parents=True, exist_ok=True)
    prev_end = None
    base = {"AGENT": AGENT, "TREASURY": TREASURY}
    if fresh:
        # fund the signer on the fork with the USDC the seed needs (storage-free: transfer from Morpho, which holds plenty)
        for a in (JUNIOR_OWNER, MORPHO):
            sh("cast", "rpc", "anvil_setBalance", a, "0x56BC75E2D63100000", "--rpc-url", rpc)
        sh("cast", "rpc", "anvil_impersonateAccount", MORPHO, "--rpc-url", rpc)
        sh("cast", "send", USDC, "transfer(address,uint256)", JUNIOR_OWNER, "10000000", "--from", MORPHO, "--unlocked", "--rpc-url", rpc)
        p1 = gen("01_DeploySenior.s.sol", "old step 1", out / "old-01.json", dict(base, DEPLOYER=JUNIOR_OWNER), rpc)
        prev_end = rp.run_plan(p1, rpc, prev_end)
        senior = p1["steps"][0]["predictedAddress"]
        felix_adapter = next(s["predictedAddress"] for s in p1["steps"] if "createMorphoVaultV1Adapter(" in s["title"])
        p2 = gen("02_DeployJuniorRouter.s.sol", "old step 2", out / "old-02.json", dict(base, DEPLOYER=JUNIOR_OWNER, SENIOR=senior), rpc)
        prev_end = rp.run_plan(p2, rpc, prev_end)
        old_j, old_r = addr_of(p2, "JuniorVault"), addr_of(p2, "FeeRouter")
        p3 = gen("03_WireSenior.s.sol", "old step 3", out / "old-03.json",
                 dict(base, DEPLOYER=JUNIOR_OWNER, SENIOR=senior, JUNIOR=old_j, FELIX_ADAPTER=felix_adapter, SENIOR_ADMIN=SENIOR_SAFE), rpc)
        prev_end = rp.run_plan(p3, rpc, prev_end)
        lib = "0x4Ec02Cfb29E387F6BbCBACF266C7213646DE94dC"
        sh("cast", "rpc", "anvil_setCode", lib, "0x", "--rpc-url", rpc)
        sh("cast", "rpc", "anvil_setNonce", lib, "0x0", "--rpc-url", rpc)  # a contract account has nonce 1; forge treats nonce > 0 as "already deployed"
        print(f"== old system built; VenueAdmin code removed to model the live chain (no library at {lib})")
        base.update(SENIOR=senior, OLD_JUNIOR=old_j, OLD_ROUTER=old_r)
    else:
        for k in ("SENIOR", "OLD_JUNIOR", "OLD_ROUTER"):
            base[k] = os.environ[k]
        # prerequisite 0 (fork only): the partner funds 0x2DBE with >= 1 USDC (the v2 seed) and HYPE; here the fork does it
        sh("cast", "rpc", "anvil_setBalance", JUNIOR_OWNER, "0x56BC75E2D63100000", "--rpc-url", rpc)
        sh("cast", "rpc", "anvil_setBalance", MORPHO, "0x56BC75E2D63100000", "--rpc-url", rpc)
        sh("cast", "rpc", "anvil_impersonateAccount", MORPHO, "--rpc-url", rpc)
        sh("cast", "send", USDC, "transfer(address,uint256)", JUNIOR_OWNER, "5000000", "--from", MORPHO, "--unlocked", "--rpc-url", rpc)
        print("== prerequisite 0 (fork cheat): 0x2DBE funded with 5 USDC; USDC now", fcall(rpc, USDC, "balanceOf(address)(uint256)", JUNIOR_OWNER))
    senior, old_j = base["SENIOR"], base["OLD_JUNIOR"]
    phases = []
    # S1: the old junior's first settle, due lastSettle + SETTLE_INTERVAL. A and B (and so C) only run after it.
    due1 = int(fcall(rpc, old_j, "lastSettle()(uint256)")) + SETTLE_INTERVAL
    base["OLD_SETTLE_DUE"] = str(due1)
    print(f"== S1 (old junior's first settle) is due {due1}")
    if holder:
        # E1: the only holder (0x2DBE) asks to exit ALL its shares now (before Sun 15 Nov 00:00 UTC) so the exit is priced at S2. Merges with its dust exit.
        sh_bal = int(fcall(rpc, old_j, "balanceOf(address)(uint256)", JUNIOR_OWNER))
        e = fsend(rpc, JUNIOR_OWNER, old_j, "requestExit(uint256)", sh_bal)
        print(f"== E1 requestExit({sh_bal}) gas {e}; exitOf =", sh("cast", "call", "--rpc-url", rpc, old_j, "exitOf(address)(uint128,uint64,uint32)", JUNIOR_OWNER).replace("\n", " "))
    for d in demo or []:
        refused = None
        try:
            rp.run_plan(json.load(open(d)), rpc, None)
        except SystemExit as e:
            refused = str(e)
        print(f"DEMO: replaying {Path(d).name} BEFORE the old settle S1 ->", refused)
        if not (refused or "").startswith("PRECHECK FAILED"):
            sys.exit(f"the replay did not refuse {d} before S1")

    # S1: permissionless (the keeper sends it). Declared wait: lastSettle + SETTLE_INTERVAL.
    rp.warp_to(rpc, due1)  # generation needs the clock at the due second
    ps = {"name": "S1: old junior settle (keeper; permissionless, not a partner signature)", "signer": AGENT, "role": "keeper / anyone", "chainId": 999,
          "notBeforeCall": {"to": old_j, "data": sh("cast", "calldata", "lastSettle()"), "plus": SETTLE_INTERVAL},
          "steps": [{"title": "senior.accrueInterest", "what": "Mints the fee shares up to now to the OLD junior (it is still the recipient).", "to": senior,
                     "data": sh("cast", "calldata", "accrueInterest()"), "value": "0x0", "gas": hex(1_000_000), "readbacks": []},
                    {"title": "oldJunior.settle", "what": "Weekly settle of the old junior (pre-fix build live; fixed build in the fresh rehearsal).", "to": old_j,
                     "data": sh("cast", "calldata", "settle()"), "value": "0x0", "gas": hex(1_500_000), "readbacks": []}],
          "verify": [{"label": "old junior lastSettle >= due second", "to": old_j, "data": sh("cast", "calldata", "lastSettle()"), "gte": due1}]}
    (out / "s-old-settle.json").write_text(json.dumps(ps, indent=2))
    prev_end = rp.run_plan(ps, rpc, prev_end)
    phases.append({"plan": "s-old-settle.json", "role": ps["role"]})

    # A = B = the first UTC midnight after S1 (Mon 16 Nov 00:00 UTC for the live dates): v2's first settle is then due 3.55 h after S2
    rp.warp_to(rpc, (due1 // 86400 + 1) * 86400)

    # A: deploy (after S1)
    pa = gen("06a_DeployJuniorV2.s.sol", "phase A: deploy v2 junior, router v2, gate", out / "a-deploy.json", dict(base, DEPLOYER=JUNIOR_OWNER), rpc)
    prev_end = rp.run_plan(pa, rpc, prev_end)
    v2, router2, gate = addr_of(pa, "JuniorVault"), addr_of(pa, "FeeRouter"), addr_of(pa, "SeniorReceiveGate")
    base.update(JUNIOR=v2, ROUTER=router2, GATE=gate)
    phases.append({"plan": "a-deploy.json", "role": pa["role"]})

    # B: submit (after S1; C is permissionless once it matures, so this is what keeps C after S1)
    pb = gen("06b_SubmitSenior.s.sol", "phase B: submit fee recipient and gate", out / "b-submit.json", dict(base, DEPLOYER=SENIOR_SAFE), rpc)
    prev_end = rp.run_plan(pb, rpc, prev_end)
    phases.append({"plan": "b-submit.json", "role": pb["role"]})
    b_end = prev_end

    # C: execute, 3 days after B
    rp.warp_to(rpc, b_end + 259200)
    pc = gen("06c_ExecuteSenior.s.sol", "phase C: execute fee recipient and gate", out / "c-execute.json", dict(base, DEPLOYER=SENIOR_SAFE), rpc)
    pc["waitFromPlan"] = "b-submit.json"  # the 3 days run from the end of phase B
    Path(out / "c-execute.json").write_text(json.dumps(pc, indent=2))
    prev_end = rp.run_plan(pc, rpc, b_end)
    phases.append({"plan": "c-execute.json", "role": pc["role"]})

    # D: cut-over
    ta0, ps0 = fcall(rpc, senior, "totalAssets()(uint256)"), fcall(rpc, senior, "convertToAssets(uint256)(uint256)", 10**18)
    pd = gen("06d_CutOver.s.sol", "phase D: cut-over", out / "d-cutover.json", dict(base, DEPLOYER=JUNIOR_OWNER), rpc)
    prev_end = rp.run_plan(pd, rpc, prev_end)
    phases.append({"plan": "d-cutover.json", "role": pd["role"]})
    ta1, ps1 = fcall(rpc, senior, "totalAssets()(uint256)"), fcall(rpc, senior, "convertToAssets(uint256)(uint256)", 10**18)
    print(f"== senior across the cut-over (phase D): totalAssets {ta0} -> {ta1}; convertToAssets(1e18) {ps0} -> {ps1}")
    if holder:
        e_holder(rpc, senior, old_j, v2)

    (out / "manifest.json").write_text(json.dumps({"name": "orphic migration (fresh-fork rehearsal)" if fresh else "orphic migration", "phases": phases,
                                                   "addresses": {"senior": senior, "oldJunior": old_j, "oldRouter": base["OLD_ROUTER"], "junior": v2, "router": router2, "gate": gate}}, indent=2))
    print("migration replay complete; plans in", out)


if __name__ == "__main__":
    main()
