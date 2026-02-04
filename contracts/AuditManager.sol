// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ReputationToken.sol";

contract AuditManager is Ownable {
    ReputationToken public reputationToken;

    struct Receipt {
        uint256 id;
        bytes32 contentHash; // Hash of the receipt data
        address submitter;
        bool isTrapdoor;
        bool active;
        uint256 approvals;
        uint256 rejections;
    }

    struct Validator {
        bool isActive;
        uint256 stakedReputation;
    }

    uint256 public nextReceiptId;
    mapping(uint256 => Receipt) public receipts;
    mapping(address => Validator) public validators;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ReceiptSubmitted(uint256 indexed id, bytes32 contentHash);
    event VoteCast(uint256 indexed id, address indexed validator, bool approve);
    event ValidatorSlashed(address indexed validator, uint256 amount);
    event ValidatorRewarded(address indexed validator, uint256 amount);
    event TrapdoorTriggered(uint256 indexed id, address indexed validator);

    constructor(address _reputationToken) Ownable(msg.sender) {
        reputationToken = ReputationToken(_reputationToken);
    }

    // --- Validator Management ---
    function registerValidator(uint256 stakeAmount) external {
        require(reputationToken.balanceOf(msg.sender) >= stakeAmount, "Insufficient REP");
        require(!validators[msg.sender].isActive, "Already registered");
        
        // Lock REP
        reputationToken.transferFrom(msg.sender, address(this), stakeAmount);
        
        validators[msg.sender] = Validator({
            isActive: true,
            stakedReputation: stakeAmount
        });
    }

    // --- Core Logic ---

    // 1. Submit Receipt (Normal user or Trapdoor Agent)
    function submitReceipt(bytes32 _hash, bool _isTrapdoor) external {
         // In prod, _isTrapdoor would be hidden/hashed or only settable by admin agent
         // For prototype, we allow the caller to set it if they are the owner (Agent)
         if (_isTrapdoor) {
             require(msg.sender == owner(), "Only admin can set trapdoors");
         }

         uint256 id = nextReceiptId++;
         receipts[id] = Receipt({
             id: id,
             contentHash: _hash,
             submitter: msg.sender,
             isTrapdoor: _isTrapdoor,
             active: true,
             approvals: 0,
             rejections: 0
         });

         emit ReceiptSubmitted(id, _hash);
    }

    // 2. Vote
    function vote(uint256 _receiptId, bool _isValid) external {
        require(validators[msg.sender].isActive, "Not a validator");
        require(!hasVoted[_receiptId][msg.sender], "Already voted");
        require(receipts[_receiptId].active, "Audit closed");

        hasVoted[_receiptId][msg.sender] = true;
        Receipt storage r = receipts[_receiptId];

        // LOGIC: Trapdoor Check
        // If it IS a trapdoor, and you vote VALID (True), you are slashed.
        if (r.isTrapdoor && _isValid) {
            slashValidator(msg.sender);
            emit TrapdoorTriggered(_receiptId, msg.sender);
            return; 
        }

        if (_isValid) {
            r.approvals++;
        } else {
            r.rejections++;
        }

        emit VoteCast(_receiptId, msg.sender, _isValid);
        
        // Simple Consensus Logic (e.g., 3 votes closes it)
        if (r.approvals + r.rejections >= 3) {
            finalizeAudit(_receiptId);
        }
    }

    function finalizeAudit(uint256 _receiptId) internal {
        receipts[_receiptId].active = false;
        // Reward logic could go here
    }

    function slashValidator(address _v) internal {
        Validator storage val = validators[_v];
        uint256 slashAmount = val.stakedReputation; // 100% slash for trapdoor failure
        
        val.stakedReputation = 0;
        val.isActive = false;
        
        // Burn the slashed tokens
        reputationToken.burn(address(this), slashAmount);
        
        emit ValidatorSlashed(_v, slashAmount);
    }
}
