import hre, {ethers} from "hardhat";
import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {expect} from "chai";

import createFork from "./tools/fork";
import execSafeTransaction from "./tools/execSafeTransaction";
import deploySafeWallet from "./tools/deploySafeWallet";
import type {OrderStruct} from "../typechain-types/contracts/ArbitrageModule.sol/ArbitrageModule/ArbitrageModule";
import {getRpcProxy} from "./helpers/rpc_proxy";

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://1rpc.io/eth';

describe("IsValidSignature case", function () {
    async function deploySafeAndModule() {
        await createFork(ETHEREUM_RPC_URL);

        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await hre.ethers.getSigners();

        // Deploy Safe Wallet
        const safeAddress = await deploySafeWallet(owner, hre.config.networks.hardhat.accounts[0].privateKey, )
        const safe = await ethers.getContractAt("Safe", safeAddress);

        // Deploy Module
        const moduleFactory = await hre.ethers.getContractFactory("ArbitrageModule");
        const module = await moduleFactory.deploy();

        const compatibilityFallbackHandlerAddress = "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99"
        // const compatibilityFallbackHandlerAddress = "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4"
        const compatibilityFallbackHandler =
            await ethers.getContractAt("CompatibilityFallbackHandler", compatibilityFallbackHandlerAddress);

        // Enable module
        // const enablePop = await safe.enableModule.populateTransaction(module.target)
        // await execSafeTransaction(safe, enablePop, owner, 0);

        return { module, safe, compatibilityFallbackHandler, owner, otherAccount };
    }

    describe("isValidSignature", function () {

        it("should allow order if module is owner", async function () {
            const {module, safe, owner, otherAccount} = await loadFixture(deploySafeAndModule);
            const abiCoder = ethers.AbiCoder.defaultAbiCoder();

            // Crate and encode orders
            const token1 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
            const token2 = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
            let orders: OrderStruct[] = [
                {tokenIn: token1, tokenOut: token2, amountIn: 1n, amountOut: 2n},
                {tokenIn: token2, tokenOut: token1, amountIn: 3n, amountOut: 4n}
            ];
            const orderBytes = await module.encodeOrders(orders);
            const orderBytesLen = abiCoder.encode(["uint256"], [orderBytes.slice(2).length / 2]);

            // Allowance tokens
            const allowanceToken1Pop =
                await module.setAllowance.populateTransaction(token1, 10, true, true);
            await execSafeTransaction(safe, allowanceToken1Pop, owner, 0);
            const allowanceToken2Pop =
                await module.setAllowance.populateTransaction(token2, 10, true, true);
            await execSafeTransaction(safe, allowanceToken2Pop, owner, 0);

            // Assigning a module as an owner
            const addOwnerPop = await safe.addOwnerWithThreshold.populateTransaction(module.target, 1)
            await execSafeTransaction(safe, addOwnerPop, owner, 0);

            /*
             signature type == 0
             Constant part:
             {32-bytes signature verifier}{32-bytes data position}{1-byte signature type}
             Dynamic part (solidity bytes):
             {32-bytes signature length}{bytes signature data}
            */
            const sigs =
                abiCoder.encode(["address"], [await module.getAddress()]) + // 32-bytes signature verifier
                "0000000000000000000000000000000000000000000000000000000000000041" + // 32-bytes data position
                "00" + // 1-byte signature type, v = 0 if contract signature
                orderBytesLen.slice(2) + // 32-bytes signature length
                orderBytes.slice(2); // data

            const encodeFunctionData = module.interface.encodeFunctionData("isValidSignature(bytes,bytes)", [ethers.keccak256(orderBytes), sigs]);
            expect(await hre.ethers.provider.call({
                from: otherAccount.address,
                to: safe.target,
                data: encodeFunctionData
            })).to.equal("0x20c13b0b00000000000000000000000000000000000000000000000000000000") // MAGIC_LEGACY_VALUE
        });

        it("should revert if call execTransaction with module is owner (legacy)", async function () {
            const {module, safe, owner, otherAccount} = await loadFixture(deploySafeAndModule);
            const abiCoder = ethers.AbiCoder.defaultAbiCoder();

            const AddressZero = ethers.ZeroAddress;
            const operation = 0;
            const to = otherAccount.address;
            const value = ethers.parseEther("1");
            const data = "0x";

            // Crate and encode orders
            const token1 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
            const token2 = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
            let orders: OrderStruct[] = [
                {tokenIn: token1, tokenOut: token2, amountIn: 1n, amountOut: 2n},
                {tokenIn: token2, tokenOut: token1, amountIn: 3n, amountOut: 4n}
            ];
            const orderBytes = await module.encodeOrders(orders);
            const orderBytesLen = abiCoder.encode(["uint256"], [orderBytes.slice(2).length / 2]);

            // Send ETH to safe wallet
            await owner.sendTransaction({ to: await safe.getAddress(), value: ethers.parseEther("1") });
            await expect(await hre.ethers.provider.getBalance(await safe.getAddress())).to.eq(ethers.parseEther("1"));

            // Assigning a module as an owner
            const addOwnerPop = await safe.addOwnerWithThreshold.populateTransaction(module.target, 1)
            await execSafeTransaction(safe, addOwnerPop, owner, 0);

            const sigs =
                abiCoder.encode(["address"], [await module.getAddress()]) + // 32-bytes signature verifier
                "0000000000000000000000000000000000000000000000000000000000000041" + // 32-bytes data position
                "00" + // 1-byte signature type, v = 0 if contract signature
                orderBytesLen.slice(2) + // 32-bytes signature length
                orderBytes.slice(2); // data

            await expect(
                safe.connect(otherAccount)
                    .execTransaction(to, value, data, operation, 0, 0, 0, AddressZero, AddressZero, sigs)
            ).to.be.revertedWithCustomError(module, "WrongData");
        });
    });
});
