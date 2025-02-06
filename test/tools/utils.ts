import {ethers} from "ethers";

export const EIP712_SAFE_TX_TYPE = {
    // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
    SafeTx: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "data" },
        { type: "uint8", name: "operation" },
        { type: "uint256", name: "safeTxGas" },
        { type: "uint256", name: "baseGas" },
        { type: "uint256", name: "gasPrice" },
        { type: "address", name: "gasToken" },
        { type: "address", name: "refundReceiver" },
        { type: "uint256", name: "nonce" },
    ],
};

export const EIP712_SAFE_MESSAGE_TYPE = {
    // "SafeMessage(bytes message)"
    SafeMessage: [{ type: "bytes", name: "message" }],
};

export const calculateSafeMessageHash = (safeAddress: string, message: string, chainId: bigint): string => {
    return ethers.TypedDataEncoder.hash({ verifyingContract: safeAddress, chainId }, EIP712_SAFE_MESSAGE_TYPE, { message });
};
