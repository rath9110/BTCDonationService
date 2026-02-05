// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SocialRecoveryWallet {
    address public owner;
    address[] public guardians;
    uint256 public threshold;
    
    struct RecoveryRequest {
        address proposedNewOwner;
        uint256 voteCount;
        bool active;
        mapping(address => bool) hasVoted;
    }

    RecoveryRequest public currentRequest;

    event RecoveryStarted(address indexed proposedOwner);
    event RecoverySuccessful(address indexed newOwner);
    event VoteCast(address indexed guardian, address indexed proposedOwner);

    constructor(address _owner, address[] memory _guardians, uint256 _threshold) {
        require(_guardians.length >= _threshold, "Threshold too high");
        owner = _owner;
        guardians = _guardians;
        threshold = _threshold;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyGuardian() {
        bool isGuardian = false;
        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardians[i] == msg.sender) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "Not a guardian");
        _;
    }

    function initiateRecovery(address _newOwner) external onlyGuardian {
        if (currentRequest.proposedNewOwner != _newOwner) {
            currentRequest.proposedNewOwner = _newOwner;
            currentRequest.voteCount = 0;
            currentRequest.active = true;
            // Clear previous votes (not ideal in loops but small guardian sets make it okay)
            for (uint256 i = 0; i < guardians.length; i++) {
                currentRequest.hasVoted[guardians[i]] = false;
            }
        }
        
        require(!currentRequest.hasVoted[msg.sender], "Already voted");
        
        currentRequest.hasVoted[msg.sender] = true;
        currentRequest.voteCount++;
        
        emit VoteCast(msg.sender, _newOwner);

        if (currentRequest.voteCount >= threshold) {
            owner = _newOwner;
            currentRequest.active = false;
            emit RecoverySuccessful(_newOwner);
        }
    }

    // Example function to show wallet utility
    function execute(address target, uint256 value, bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Transaction failed");
        return result;
    }

    receive() external payable {}
}
