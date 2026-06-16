// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Registry {
    struct Company {
        address owner;
        address scheduler;
        string  name;
        uint256 registeredAt;
    }

    mapping(address => address) public schedulerOf;
    address[] private _owners;

    event Registered(address indexed owner, address indexed scheduler, string name);
    event Updated(address indexed owner, address indexed scheduler);

    function register(address scheduler, string calldata name) external {
        require(scheduler != address(0), "Invalid scheduler");
        if (schedulerOf[msg.sender] == address(0)) {
            _owners.push(msg.sender);
        }
        schedulerOf[msg.sender] = scheduler;
        emit Registered(msg.sender, scheduler, name);
    }

    function getAll() external view returns (Company[] memory) {
        Company[] memory list = new Company[](_owners.length);
        for (uint i = 0; i < _owners.length; i++) {
            list[i] = Company({
                owner:        _owners[i],
                scheduler:    schedulerOf[_owners[i]],
                name:         "",
                registeredAt: 0
            });
        }
        return list;
    }

    function getCount() external view returns (uint256) {
        return _owners.length;
    }
}
