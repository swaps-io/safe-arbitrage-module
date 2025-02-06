// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.20;

import {ERC1271} from "./ERC1271.sol";

/**
 * @title Signature Validator Base Contract
 * @dev A interface for smart contract Safe owners that supports multiple ERC-1271 `isValidSignature` versions.
 * @custom:security-contact bounty@safe.global
 */
abstract contract SignatureValidator {
    function isValidSignature(bytes32 _hash, bytes memory _signature) external view virtual returns (bytes4);
}
