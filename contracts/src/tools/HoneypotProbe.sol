// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Never deployed. Its runtime bytecode is placed at a scratch address with an eth_call state override and
/// funded with native gas token; `probe` then buys the token and sells it straight back inside the same call.
/// The round trip never lands onchain. Its numbers say whether a fresh wallet can sell what it just bought,
/// how much of it (some tokens cap sells), and what a buy plus sell loses to transfer taxes.
interface IV2Router {
    function WETH() external view returns (address);
    function getAmountsOut(uint256, address[] calldata) external view returns (uint256[] memory);
    function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256, address[] calldata, address, uint256) external payable;
    function swapExactTokensForETHSupportingFeeOnTransferTokens(uint256, uint256, address[] calldata, address, uint256) external;
}

interface IV3Router02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function WETH9() external view returns (address);
    function exactInputSingle(ExactInputSingleParams calldata) external payable returns (uint256);
    function unwrapWETH9(uint256 amountMinimum, address recipient) external payable;
}

/// Montra's LaunchRouter on Elysium: every launch is a Uniswap v4 pool of native HYPE against the token.
interface ILaunchRouter {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }
    struct SwapExactIn {
        PoolKey key;
        bool zeroForOne;
        uint128 amountIn;
        uint128 minAmountOut;
        address recipient;
        uint256 deadline;
    }
    function swapExactIn(SwapExactIn calldata) external payable returns (uint256 amountOut);
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
}

contract HoneypotProbe {
    receive() external payable {}

    struct Report {
        uint256 gotTokens; // tokens the buy delivered
        uint256 quotedTokens; // v2 only: router quote before transfer tax; 0 on v3
        uint256 soldTokens; // largest amount a single sell accepted, tried at 100%, 50%, 25%, 10% of gotTokens
        uint256 gotBack; // native returned by that sell
    }

    /// Uniswap v2 style: buy `spend` of native through `router`, then sell.
    function probeV2(address router, address token, uint256 spend) external returns (Report memory r) {
        IV2Router rt = IV2Router(router);
        address[] memory path = new address[](2);
        path[0] = rt.WETH();
        path[1] = token;
        r.quotedTokens = rt.getAmountsOut(spend, path)[1];
        rt.swapExactETHForTokensSupportingFeeOnTransferTokens{value: spend}(0, path, address(this), block.timestamp);
        r.gotTokens = IERC20(token).balanceOf(address(this));
        if (r.gotTokens == 0) return r;
        IERC20(token).approve(router, type(uint256).max);
        path[0] = token;
        path[1] = rt.WETH();
        uint256[4] memory parts = [uint256(1), 2, 4, 10];
        for (uint256 i = 0; i < 4; i++) {
            uint256 amt = r.gotTokens / parts[i];
            uint256 before = address(this).balance;
            try rt.swapExactTokensForETHSupportingFeeOnTransferTokens(amt, 0, path, address(this), block.timestamp) {
                r.soldTokens = amt;
                r.gotBack = address(this).balance - before;
                return r;
            } catch {}
        }
    }

    /// Uniswap v3 style through a SwapRouter02: wrap, buy, then sell and unwrap.
    function probeV3(address router, address token, uint24 fee, uint256 spend) external returns (Report memory r) {
        IV3Router02 rt = IV3Router02(router);
        address weth = rt.WETH9();
        IWETH(weth).deposit{value: spend}();
        IERC20(weth).approve(router, type(uint256).max);
        rt.exactInputSingle(IV3Router02.ExactInputSingleParams(weth, token, fee, address(this), spend, 0, 0));
        r.gotTokens = IERC20(token).balanceOf(address(this));
        if (r.gotTokens == 0) return r;
        IERC20(token).approve(router, type(uint256).max);
        uint256[4] memory parts = [uint256(1), 2, 4, 10];
        for (uint256 i = 0; i < 4; i++) {
            uint256 amt = r.gotTokens / parts[i];
            uint256 before = IERC20(weth).balanceOf(address(this));
            try rt.exactInputSingle(IV3Router02.ExactInputSingleParams(token, weth, fee, address(this), amt, 0, 0)) {
                r.soldTokens = amt;
                r.gotBack = IERC20(weth).balanceOf(address(this)) - before;
                return r;
            } catch {}
        }
    }

    /// Montra launch (Uniswap v4 behind LaunchRouter): buy `spend` of native HYPE, then sell.
    function probeV4(address router, address token, uint24 fee, int24 tickSpacing, address hooks, uint256 spend)
        external
        returns (Report memory r)
    {
        ILaunchRouter rt = ILaunchRouter(router);
        ILaunchRouter.PoolKey memory key = ILaunchRouter.PoolKey(address(0), token, fee, tickSpacing, hooks);
        rt.swapExactIn{value: spend}(ILaunchRouter.SwapExactIn(key, true, uint128(spend), 0, address(this), block.timestamp));
        r.gotTokens = IERC20(token).balanceOf(address(this));
        if (r.gotTokens == 0) return r;
        IERC20(token).approve(router, type(uint256).max);
        uint256[4] memory parts = [uint256(1), 2, 4, 10];
        for (uint256 i = 0; i < 4; i++) {
            uint256 amt = r.gotTokens / parts[i];
            uint256 before = address(this).balance;
            try rt.swapExactIn(ILaunchRouter.SwapExactIn(key, false, uint128(amt), 0, address(this), block.timestamp)) {
                r.soldTokens = amt;
                r.gotBack = address(this).balance - before;
                return r;
            } catch {}
        }
    }
}
