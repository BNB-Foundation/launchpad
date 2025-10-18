// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1967Proxy as OZProxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ERC1967Proxy
 * @notice Wrapper to expose ERC1967Proxy for Hardhat Ignition deployment
 */
contract ERC1967Proxy is OZProxy {
    constructor(address implementation, bytes memory _data) OZProxy(implementation, _data) {}
}
