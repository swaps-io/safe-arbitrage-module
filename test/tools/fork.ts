import { network } from "hardhat";

export async function createFork(
    rpcUrl: string,
    blockNumber?: number
): Promise<void> {
    const forkingConfig: any = {
        jsonRpcUrl: rpcUrl,
    };

    if (blockNumber) {
        forkingConfig.blockNumber = blockNumber;
    }

    await network.provider.request({
        method: "hardhat_reset",
        params: [
            {
                forking: forkingConfig,
            },
        ],
    });

    console.log(`Fork created at block ${blockNumber ?? 'latest'}`);
}

export async function resetHardhat(
): Promise<void> {

    await network.provider.request({
        method: "hardhat_reset",
        params: [
            {
            },
        ],
    });
}

export default createFork;
