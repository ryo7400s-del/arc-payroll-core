// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PayrollFactory {
    address[] public contracts;
    mapping(address => address) public ownerToContract;
    mapping(address => bool) public registered;

    event Registered(address indexed owner, address indexed contractAddr);

    function register(address contractAddr) external {
        require(!registered[contractAddr], "Already registered");
        contracts.push(contractAddr);
        ownerToContract[msg.sender] = contractAddr;
        registered[contractAddr] = true;
        emit Registered(msg.sender, contractAddr);
    }

    function getAll() external view returns (address[] memory) {
        return contracts;
    }

    function getByOwner(address owner) external view returns (address) {
        return ownerToContract[owner];
    }

    function count() external view returns (uint256) {
        return contracts.length;
    }
}
