// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "./lib/SignatureValidator.sol";
import "@safe-global/safe-contracts/contracts/handler/CompatibilityFallbackHandler.sol";
import "@safe-global/safe-contracts/contracts/libraries/SignMessageLib.sol";
import {BytesLib} from "./lib/BytesLib.sol";
import "hardhat/console.sol";

interface ISafe {
    /// @dev Allows a Module to execute a Safe transaction without any further confirmations.
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    /// @param operation Operation type of module transaction.
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation
    ) external returns (bool success);

    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) external returns (bool success, bytes memory returnData);

    function signedMessages(bytes32 hash) external view returns (uint256);
}

contract ArbitrageModule is SignatureValidator {
    using BytesLib for bytes;

    string public constant NAME = "Arbitrage Module";
    string public constant VERSION = "0.1.0";
    address public immutable ownerSafeWallet;
    bytes32 private constant SAFE_MSG_TYPEHASH = 0x60b3cbf8b4a223d68d641b3b6ddf9a298e7f33710cf3d3a9d1146b5a6150fbca;

    mapping(address safeWallet => mapping(address token => Allowance)) public allowanceAssets;

    struct Allowance {
        uint256 allowanceAmount;
        bool isTokenIn;
        bool isTokenOut;
    }

    struct Order {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
    }

    event SetAllowance(address indexed safe, address token, uint256 allowanceAmount);

    error WrongCaller(address addr);
    error WrongToken(address token);
    error TokenNotAllowed(address token);
    error EmptyOrders();
    error FailedExactTransaction();
    error ZeroAmount();
    error WrongAmountOut(uint256 amountOut);
    error WrongAmountIn(uint256 amountIn);
    error WrongData();
    error WrongEndTimestamp(uint16 currentTimestamp, uint16 endTimestamp);

    function setAllowance(
        address token,
        uint256 allowanceAmount,
        bool isTokenIn,
        bool isTokenOut
    ) public {
        allowanceAssets[msg.sender][token] = Allowance(allowanceAmount, isTokenIn, isTokenOut);

        emit SetAllowance(msg.sender, token, allowanceAmount);
    }

//    function executeOrders(Order[] memory orders) public {
//        _checkOrders(orders);
//        bytes memory message = encodeOrders(orders);
////        checkSignature( signature, transferHashData, safe);
//
//        bytes memory encode = abi.encodeWithSelector(SignMessageLib.signMessage.selector, message);
//        (bool success) = ISafe(ownerSafeWallet).execTransactionFromModule(
//            0xd53cd0aB83D845Ac265BE939c57F53AD838012c9,
//            0,
//            encode,
//            Enum.Operation.DelegateCall
//        );
//        if (!success) revert FailedExactTransaction();
//    }

    function getMessageHash(Order[] memory orders) public view returns (bytes32 hash) {
        bytes memory message = encodeOrders(orders);
        bytes32 safeMessageHash = keccak256(abi.encode(SAFE_MSG_TYPEHASH, keccak256(message)));

        hash = keccak256(
            abi.encodePacked(
                bytes1(0x19),
                bytes1(0x01),
                Safe(payable(address(ownerSafeWallet))).domainSeparator(),
                safeMessageHash
            )
        );
    }

//    function checkSignature(Order[] memory orders) public view returns (bytes4) {
//        bytes32 messageHash = getMessageHash(orders);
//        bytes memory sign = abi.encode(0x0);
////        bytes32 hash = keccak256(message);
//
////        return CompatibilityFallbackHandler(0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99).isValidSignature(hash, sign);
//        return isValidSignature(messageHash, sign);
//    }


    function _checkOrders(Order[] memory orders) private view {
        if (orders.length == 0) revert EmptyOrders();

        for (uint256 i = 0; i < orders.length; i++) {
            Order memory order = orders[i];
            if (!allowanceAssets[msg.sender][order.tokenIn].isTokenIn) revert TokenNotAllowed(order.tokenIn);
            if (!allowanceAssets[msg.sender][order.tokenOut].isTokenOut) revert TokenNotAllowed(order.tokenOut);
            if (order.amountIn > allowanceAssets[msg.sender][order.tokenIn].allowanceAmount) revert WrongAmountIn(order.amountIn);
            if (order.amountIn == 0 || order.amountOut == 0) revert ZeroAmount();
            if (order.tokenIn == order.tokenOut) revert WrongToken(order.tokenOut);
            if (order.amountIn >= order.amountOut) revert WrongAmountOut(order.amountOut);
        }
    }

    function encodeOrders(Order[] memory orders) public pure returns (bytes memory orderBytes) {
        if (orders.length == 0) revert EmptyOrders();

        orderBytes = abi.encode(orders);
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) public view override returns (bytes4) {
        if (hash != keccak256(signature)) revert WrongData();

        if (signature.length != 0) {
            Order[] memory orders = getOrders(signature);
            _checkOrders(orders);

            return ERC1271.LEGACY_MAGIC_VALUE;
        }

        return bytes4(0);
    }

    function isValidSignature(bytes memory data, bytes calldata signature) public view returns (bytes4) {
        if (keccak256(data) != keccak256(abi.encode(keccak256(signature)))) revert WrongData();

        if (signature.length != 0) {
            Order[] memory orders = getOrders(signature);
            _checkOrders(orders);

            return ERC1271.LEGACY_MAGIC_VALUE;
        }

        return bytes4(0);
    }

    function getOrders(bytes calldata data) public pure returns (Order[] memory orders) {
        orders = abi.decode(data, (Order[]));
    }
}
