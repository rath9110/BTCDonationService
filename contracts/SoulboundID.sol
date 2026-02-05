// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulboundID is ERC721, Ownable {
    uint256 private _nextTokenId;

    mapping(address => uint256) public addressToTokenId;

    event IdentityMinted(address indexed user, uint256 tokenId);

    constructor() ERC721("SocialIdentity", "SID") Ownable(msg.sender) {}

    function mintIdentity(address to) external onlyOwner returns (uint256) {
        require(balanceOf(to) == 0, "Identity already exists");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        addressToTokenId[to] = tokenId;
        emit IdentityMinted(to, tokenId);
        return tokenId;
    }

    // Disable transfers
    function transferFrom(address from, address to, uint256 tokenId) public override {
        revert("Transfers are not allowed for Soulbound tokens");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        revert("Transfers are not allowed for Soulbound tokens");
    }
}
