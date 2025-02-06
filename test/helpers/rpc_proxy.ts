const EVMRPC_PROXY_TOKEN = process.env.EVMRPC_PROXY_TOKEN;
const EVMRPC_PROXY_URL = process.env.EVMRPC_PROXY_URL || 'https://erp.dev.swaps.io/api/v1/evmrpc/';

export const getRpcProxy = (networkName: string): string => {
    return `${EVMRPC_PROXY_URL}${networkName}?x_requester=rswrepo&token=${EVMRPC_PROXY_TOKEN}`;
}
