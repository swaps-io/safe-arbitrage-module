import Safe, {PredictedSafeProps, SafeAccountConfig} from "@safe-global/protocol-kit";
import {mainnet} from "viem/chains";
import type {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

export default async function deploySafeWallet(owner: HardhatEthersSigner, privateKey: string): Promise<string> {
    const safeAccountConfig: SafeAccountConfig = {
        owners: [owner.address],
        threshold: 1
    }
    const predictedSafe: PredictedSafeProps = {
        safeAccountConfig
    }
    const protocolKit = await Safe.init({
        provider: mainnet.rpcUrls.default.http[0],
        signer: privateKey,
        predictedSafe
    })

    const safeAddress = await protocolKit.getAddress()
    const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction()
    await owner.sendTransaction({
        to: deploymentTransaction.to,
        value: BigInt(deploymentTransaction.value),
        data: deploymentTransaction.data as `0x${string}`,
    });

    return safeAddress;
}
