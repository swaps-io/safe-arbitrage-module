import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {ethers, Signer, TransactionRequest, ZeroAddress} from 'ethers'

import {Safe as SafeContract} from '../../typechain-types'

export default async function execSafeTransaction(safe: SafeContract, { to, data, value = 0 }: TransactionRequest, signer: Signer, operation: number) {
    const address = await safe.getAddress()
    const chainId = await safe.getChainId()
    const nonce = await safe.nonce()

    const { domain, types, message } = paramsToSign(address, chainId, { to, data, value }, nonce, operation)

    const signature = await signer.signTypedData(domain, types, message)

    return safe.execTransaction(
        to as string,
        value as number | bigint,
        data as string,
        operation, // operation
        0,
        0,
        0,
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        signature,
    )
}

function paramsToSign(address: string, chainId: bigint, { to, data, value }: TransactionRequest, nonce: bigint | number, operation: number) {
    const domain = { verifyingContract: address, chainId }
    const primaryType = 'SafeTx' as const
    const types = {
        SafeTx: [
            { type: 'address', name: 'to' },
            { type: 'uint256', name: 'value' },
            { type: 'bytes', name: 'data' },
            { type: 'uint8', name: 'operation' },
            { type: 'uint256', name: 'safeTxGas' },
            { type: 'uint256', name: 'baseGas' },
            { type: 'uint256', name: 'gasPrice' },
            { type: 'address', name: 'gasToken' },
            { type: 'address', name: 'refundReceiver' },
            { type: 'uint256', name: 'nonce' },
        ],
    }
    const message = {
        to,
        value,
        data,
        operation: operation,
        safeTxGas: 0,
        baseGas: 0,
        gasPrice: 0,
        gasToken: ethers.ZeroAddress,
        refundReceiver: ethers.ZeroAddress,
        nonce,
    }

    return { domain, primaryType, types, message }
}
