// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./Base.t.sol";

/// @dev Random depositors, exits, claims, settles, donations and agent moves into real Morpho markets.
///      Invariant: the live supply valued at the frozen price never exceeds what the vault actually holds.
contract Handler is Test {
    using MorphoBalancesLib for IMorpho;
    JuniorVault public junior;
    IERC20 public usdc;
    IMorpho public morpho;
    MarketParams public mp;
    address public agent;
    address[] public actors;

    constructor(JuniorVault j, IERC20 u, IMorpho m, MarketParams memory p, address a) {
        junior = j;
        usdc = u;
        morpho = m;
        mp = p;
        agent = a;
        for (uint256 i = 0; i < 4; i++) {
            actors.push(address(uint160(0xA11CE + i)));
        }
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function deposit(uint256 seed, uint256 assets) external {
        address who = _actor(seed);
        assets = bound(assets, 1e6, 50_000e6);
        if (junior.totalAssets() + assets > junior.depositCap()) return;
        deal(address(usdc), who, assets);
        vm.startPrank(who);
        usdc.approve(address(junior), assets);
        junior.deposit(assets, who);
        vm.stopPrank();
    }

    function requestExit(uint256 seed, uint256 frac) external {
        address who = _actor(seed);
        uint256 bal = junior.balanceOf(who);
        if (bal == 0) return;
        (uint128 shares, uint64 readyAt,) = junior.exitOf(who);
        if (shares != 0 && readyAt / 1 days <= junior.lastMaturedDay()) return; // already priced, claim first
        uint256 amount = bound(frac, 1, bal);
        vm.prank(who);
        junior.requestExit(amount);
    }

    function claim(uint256 seed) external {
        address who = _actor(seed);
        vm.prank(who);
        try junior.claimExit() {} catch {}
    }

    function settle(uint256 jump) external {
        vm.warp(block.timestamp + bound(jump, 1 hours, 10 days));
        try junior.settle() {} catch {}
    }

    function donate(uint256 assets) external {
        assets = bound(assets, 1, 5_000e6);
        deal(address(usdc), address(this), assets);
        usdc.transfer(address(junior), assets);
    }

    function agentSupply(uint256 assets) external {
        uint256 idle = usdc.balanceOf(address(junior));
        uint256 free = idle > junior.reservedAssets() ? idle - junior.reservedAssets() : 0;
        if (free < 2e6) return;
        assets = bound(assets, 1e6, free);
        vm.startPrank(agent);
        junior.execute(address(usdc), abi.encodeCall(IERC20.approve, (address(morpho), assets)));
        junior.execute(address(morpho), abi.encodeCall(IMorphoBase.supply, (mp, assets, 0, address(junior), "")));
        vm.stopPrank();
    }

    function agentWithdraw(uint256 assets) external {
        uint256 pos = morpho.expectedSupplyAssets(mp, address(junior));
        if (pos < 2e6) return;
        assets = bound(assets, 1e6, pos - 1e6);
        vm.prank(agent);
        try junior.execute(
            address(morpho), abi.encodeCall(IMorphoBase.withdraw, (mp, assets, 0, address(junior), address(junior)))
        ) {} catch {}
    }
}

contract InvariantTest is Base {
    using MorphoBalancesLib for IMorpho;

    Handler handler;

    function setUp() public override {
        super.setUp();
        handler = new Handler(junior, USDC, MORPHO, mpKhype, agent);
        targetContract(address(handler));
        targetSender(makeAddr("fuzzer"));
    }

    /// supply x price <= balance: the live supply at the frozen price never exceeds assets held.
    function invariant_supplyTimesPriceLeqBalance() public view {
        uint256 liveSupply = junior.totalSupply() - junior.pricedExitShares();
        uint256 promised = liveSupply * junior.pricePerShare() / WAD / 1e12;
        // Between settles the frozen price only ever lags growth (deposits, donations, yield), never leads it.
        assertLe(promised, junior.totalAssets() + 1);
    }

    /// Reserved assets for priced exits are covered by idle USDC plus positions, independent of the live supply.
    function invariant_reservedCovered() public view {
        uint256 gross = USDC.balanceOf(address(junior)) + MORPHO.expectedSupplyAssets(mpKhype, address(junior));
        assertLe(junior.reservedAssets(), gross + 1);
    }

    /// Share accounting: locked exit shares are exactly what the contract holds of its own token.
    function invariant_lockedSharesHeld() public view {
        assertEq(junior.balanceOf(address(junior)), junior.pendingExitShares() + junior.pricedExitShares());
    }
}
