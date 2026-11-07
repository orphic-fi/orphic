// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IMorpho, IMorphoBase, MarketParams, Id} from "morpho-blue/interfaces/IMorpho.sol";
import {MorphoBalancesLib} from "morpho-blue/libraries/periphery/MorphoBalancesLib.sol";
import {IVaultV2} from "vault-v2/interfaces/IVaultV2.sol";
import {IVaultV2Factory} from "vault-v2/interfaces/IVaultV2Factory.sol";
import {IMorphoMarketV1AdapterV2Factory} from "vault-v2/adapters/interfaces/IMorphoMarketV1AdapterV2Factory.sol";
import {IMorphoMarketV1AdapterV2} from "vault-v2/adapters/interfaces/IMorphoMarketV1AdapterV2.sol";
import {IMorphoVaultV1AdapterFactory} from "vault-v2/adapters/interfaces/IMorphoVaultV1AdapterFactory.sol";
import {JuniorVault} from "../src/JuniorVault.sol";
import {FeeRouter} from "../src/FeeRouter.sol";

contract MockORPH is ERC20 {
    constructor() ERC20("Orphic", "ORPH") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice HyperEVM fork. Builds a real Morpho Vault V2 senior exactly the way Sunday's deploy script will, then the
///         junior and the router on top of it. Addresses are the verified ones from FACTS.md.
abstract contract Base is Test {
    // HyperEVM, verified 7 Nov 2026
    IERC20 constant USDC = IERC20(0xb88339CB7199b77E23DB6E890353E22632Ba630f);
    IMorpho constant MORPHO = IMorpho(0x68e37dE8d93d3496ae143F2E900490f6280C57cD);
    IVaultV2Factory constant V2_FACTORY = IVaultV2Factory(0xD7217E5687FF1071356C780b5fe4803D9D967da7);
    IMorphoMarketV1AdapterV2Factory constant MARKET_ADAPTER_FACTORY =
        IMorphoMarketV1AdapterV2Factory(0xaEff6Ef4B7bbfbAadB18b634A8F11392CBeB72Be);
    IMorphoVaultV1AdapterFactory constant VAULT_ADAPTER_FACTORY =
        IMorphoVaultV1AdapterFactory(0xdf5202e29654e02011611A086f15477880580CAc);
    address constant FELIX_USDC_V1 = 0x8A862fD6c12f9ad34C9c2ff45AB2b6712e8CEa27;
    address constant IRM = 0xD4a426F010986dCad727e8dd6eed44cA4A9b7483;
    // kHYPE / USDC 62.5% (largest target), WHYPE / USDC 77%
    Id constant MKT_KHYPE_625 = Id.wrap(0xe7aa046832007a975d4619260d221229e99cc27da2e6ef162881202b4cd2349b);
    Id constant MKT_WHYPE_77 = Id.wrap(0xd7d38220652d19c87099c3b23de9a70a1893620a050c635d1a94bd947c9c59a8);

    uint256 constant WAD = 1e18;
    uint256 constant MGMT_FEE_PER_SEC = uint256(0.005e18) / uint256(365 days); // 0.5% a year
    uint256 constant MAX_RATE_PER_SEC = uint256(2e18) / uint256(365 days); // 200% a year, same as Felix

    address owner = makeAddr("owner");
    address agent = makeAddr("agent");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    IVaultV2 senior;
    address marketAdapter;
    address felixAdapter;
    JuniorVault junior;
    FeeRouter router;
    MockORPH orph;
    MarketParams mpKhype;
    MarketParams mpWhype;

    function setUp() public virtual {
        vm.createSelectFork(vm.envOr("HYPEREVM_RPC", string("https://rpc.hyperliquid.xyz/evm")), vm.envOr("FORK_BLOCK", uint256(50666000)));
        mpKhype = MORPHO.idToMarketParams(MKT_KHYPE_625);
        mpWhype = MORPHO.idToMarketParams(MKT_WHYPE_77);

        // 1. senior: Vault V2 from the canonical factory
        vm.startPrank(owner);
        senior = IVaultV2(V2_FACTORY.createVaultV2(owner, address(USDC), bytes32("orphic-senior-test")));
        senior.setCurator(owner);
        senior.setName("Orphic Senior USDC");
        senior.setSymbol("osUSDC");
        marketAdapter = MARKET_ADAPTER_FACTORY.createMorphoMarketV1AdapterV2(address(senior));
        felixAdapter = VAULT_ADAPTER_FACTORY.createMorphoVaultV1Adapter(address(senior), FELIX_USDC_V1);
        _curate(abi.encodeCall(IVaultV2.setIsAllocator, (owner, true)));
        _curate(abi.encodeCall(IVaultV2.addAdapter, (marketAdapter)));
        _curate(abi.encodeCall(IVaultV2.addAdapter, (felixAdapter)));
        // caps: every id an allocation touches needs absolute > 0 and relative set (default 0 blocks everything)
        _cap(abi.encode("this", marketAdapter), 10_000_000e6, WAD);
        _cap(abi.encode("this", felixAdapter), 10_000_000e6, WAD); // liquidity adapter: relative must be 100%
        _cap(abi.encode("collateralToken", mpKhype.collateralToken), 10_000_000e6, WAD);
        _cap(abi.encode("collateralToken", mpWhype.collateralToken), 10_000_000e6, WAD);
        _cap(abi.encode("this/marketParams", marketAdapter, mpKhype), 10_000_000e6, 0.6e18);
        _cap(abi.encode("this/marketParams", marketAdapter, mpWhype), 10_000_000e6, 0.6e18);
        senior.setLiquidityAdapterAndData(felixAdapter, "");
        vm.stopPrank();

        // 2. junior, seeded with 1 USDC by the deployer (owner)
        deal(address(USDC), owner, 1e6);
        vm.startPrank(owner);
        junior = new JuniorVault(USDC, senior, MORPHO, owner, 500_000e6);
        USDC.approve(address(junior), 1e6);
        junior.seed();
        junior.setAgent(agent);
        junior.addMarket(mpKhype);
        junior.addMarket(mpWhype);
        junior.addVault(FELIX_USDC_V1);
        junior.addVault(address(senior)); // management-fee shares land here and count in NAV
        // agent rules: Morpho supply (onBehalf word at offset 224) and withdraw (receiver word at offset 256)
        junior.setRule(address(MORPHO), IMorphoBase.supply.selector, true, 224);
        junior.setRule(address(MORPHO), IMorphoBase.withdraw.selector, true, 256);
        junior.setRule(FELIX_USDC_V1, bytes4(keccak256("deposit(uint256,address)")), true, 32);
        junior.setRule(FELIX_USDC_V1, bytes4(keccak256("redeem(uint256,address,address)")), true, 32);
        junior.setRule(address(senior), bytes4(keccak256("redeem(uint256,address,address)")), true, 32);
        junior.setApprovalRule(address(USDC), address(MORPHO), true);
        junior.setApprovalRule(address(USDC), FELIX_USDC_V1, true);
        vm.stopPrank();

        // 3. senior's give-up: 0.5% a year management fee paid in senior shares to junior
        vm.startPrank(owner);
        _curate(abi.encodeCall(IVaultV2.setManagementFeeRecipient, (address(junior))));
        _curate(abi.encodeCall(IVaultV2.setManagementFee, (MGMT_FEE_PER_SEC)));
        _curate(abi.encodeCall(IVaultV2.setMaxRate, (MAX_RATE_PER_SEC))); // a new V2 vault starts at 0: no interest
        vm.stopPrank();

        // 4. router
        vm.prank(owner);
        router = new FeeRouter(USDC, owner, address(senior), address(junior), treasury);
        orph = new MockORPH();

        deal(address(USDC), alice, 1_000_000e6);
        deal(address(USDC), bob, 1_000_000e6);
    }

    function _curate(bytes memory data) internal {
        senior.submit(data);
        (bool ok, bytes memory ret) = address(senior).call(data);
        if (!ok) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }
    }

    function _cap(bytes memory idData, uint256 absCap, uint256 relCap) internal {
        _curate(abi.encodeCall(IVaultV2.increaseAbsoluteCap, (idData, absCap)));
        _curate(abi.encodeCall(IVaultV2.increaseRelativeCap, (idData, relCap)));
    }

    function _seniorDeposit(address who, uint256 assets) internal {
        vm.startPrank(who);
        USDC.approve(address(senior), assets);
        senior.deposit(assets, who);
        vm.stopPrank();
    }

    function _juniorDeposit(address who, uint256 assets) internal returns (uint256 shares) {
        vm.startPrank(who);
        USDC.approve(address(junior), assets);
        if (address(junior.stakeToken()) != address(0)) {
            uint256 stake = assets * junior.stakePerAsset() / 1e6;
            orph.mint(who, stake);
            orph.approve(address(junior), stake);
        }
        shares = junior.deposit(assets, who);
        vm.stopPrank();
    }

    function _agentSupply(MarketParams memory mp, uint256 assets) internal {
        vm.startPrank(agent);
        junior.execute(address(USDC), abi.encodeCall(IERC20.approve, (address(MORPHO), assets)));
        junior.execute(address(MORPHO), abi.encodeCall(IMorphoBase.supply, (mp, assets, 0, address(junior), "")));
        vm.stopPrank();
    }
}
