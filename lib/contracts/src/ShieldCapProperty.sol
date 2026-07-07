// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ConfidentialTestUSDC} from "./ConfidentialTestUSDC.sol";

/**
 * @title ShieldCapProperty
 * @notice Confidential fractional property shares on Zama FHEVM.
 *
 * Balances are encrypted per property. Secondary market is FCFS: sellers list
 * encrypted share lots at a public pricePerShare; buyers purchase any amount
 * at that price until the listing is depleted.
 */
contract ShieldCapProperty is ZamaEthereumConfig, Ownable {
    uint256 public constant MAX_OWNERSHIP_BPS = 2000;

    ConfidentialTestUSDC public immutable paymentToken;

    struct PrimaryProperty {
        string name;
        string location;
        string imageUri;
        string description;
        uint256 valueUsd;
        uint256 totalShares;
        uint256 pricePerShare;
        bool active;
    }

    struct SecondaryListing {
        uint256 propertyId;
        address seller;
        euint64 sharesRemaining;
        uint256 pricePerShare;
        bool active;
    }

    uint256 public nextPropertyId = 1;
    mapping(uint256 => PrimaryProperty) private _properties;

    mapping(uint256 => mapping(address => euint64)) private _balances;
    /** Encrypted running total of primary shares allocated across all investors. */
    mapping(uint256 => euint64) private _totalSharesAllocated;
    mapping(uint256 => mapping(address => euint64)) private _dividendPayouts;
    mapping(uint256 => address[]) private _investors;
    mapping(uint256 => mapping(address => bool)) private _registered;

    uint256 public nextListingId = 1;
    mapping(uint256 => SecondaryListing) private _listings;

    mapping(uint256 => uint256) public dividendRound;

    event PropertyListed(
        uint256 indexed propertyId,
        string name,
        uint256 totalShares,
        uint256 pricePerShare,
        uint256 timestamp
    );
    event SharesPurchased(uint256 indexed propertyId, address indexed buyer, uint256 timestamp);
    event ConfidentialTransfer(
        uint256 indexed propertyId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    event DividendDistributed(uint256 indexed propertyId, uint256 round, uint256 timestamp);
    event DividendClaimed(uint256 indexed propertyId, address indexed investor, uint256 timestamp);
    event SecondaryListingCreated(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed seller,
        uint256 pricePerShare,
        uint256 timestamp
    );
    event SecondaryListingFilled(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed buyer,
        address seller,
        uint256 timestamp
    );
    event SecondaryListingDepleted(uint256 indexed listingId, uint256 indexed propertyId, uint256 timestamp);
    event SecondaryListingCancelled(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed seller,
        uint256 timestamp
    );

    constructor(address paymentTokenAddress) Ownable(msg.sender) {
        require(paymentTokenAddress != address(0), "ShieldCap: invalid payment token");
        paymentToken = ConfidentialTestUSDC(paymentTokenAddress);
    }

    function createProperty(
        string calldata name,
        string calldata location,
        string calldata imageUri,
        string calldata description,
        uint256 valueUsd,
        uint256 totalShares,
        uint256 pricePerShare
    ) external onlyOwner returns (uint256 propertyId) {
        require(bytes(name).length > 0, "ShieldCap: empty name");
        require(totalShares > 0, "ShieldCap: invalid shares");
        require(pricePerShare > 0, "ShieldCap: invalid price");

        propertyId = nextPropertyId++;
        _properties[propertyId] = PrimaryProperty({
            name: name,
            location: location,
            imageUri: imageUri,
            description: description,
            valueUsd: valueUsd,
            totalShares: totalShares,
            pricePerShare: pricePerShare,
            active: true
        });

        emit PropertyListed(propertyId, name, totalShares, pricePerShare, block.timestamp);
    }

    function getProperty(uint256 propertyId)
        external
        view
        returns (
            string memory name,
            string memory location,
            string memory imageUri,
            string memory description,
            uint256 valueUsd,
            uint256 totalShares,
            uint256 pricePerShare,
            bool active
        )
    {
        PrimaryProperty storage p = _properties[propertyId];
        return (
            p.name,
            p.location,
            p.imageUri,
            p.description,
            p.valueUsd,
            p.totalShares,
            p.pricePerShare,
            p.active
        );
    }

    function maxSharesForProperty(uint256 propertyId) public view returns (uint64) {
        PrimaryProperty storage p = _properties[propertyId];
        require(p.active, "ShieldCap: property inactive");
        return uint64((p.totalShares * MAX_OWNERSHIP_BPS) / 10_000);
    }

    function purchaseShares(
        uint256 propertyId,
        externalEuint64 encryptedShareAmount,
        bytes calldata inputProof
    ) external {
        PrimaryProperty storage prop = _properties[propertyId];
        require(prop.active, "ShieldCap: property inactive");

        euint64 shareAmount = FHE.fromExternal(encryptedShareAmount, inputProof);

        euint64 current = _balances[propertyId][msg.sender];
        euint64 newBalance = FHE.add(current, shareAmount);
        euint64 walletMax = FHE.asEuint64(maxSharesForProperty(propertyId));
        ebool withinWalletCap = FHE.le(newBalance, walletMax);
        euint64 cappedByWallet = FHE.select(withinWalletCap, shareAmount, FHE.asEuint64(0));

        euint64 allocated = _totalSharesAllocated[propertyId];
        euint64 supplyRemaining = FHE.sub(FHE.asEuint64(uint64(prop.totalShares)), allocated);
        ebool fitsSupply = FHE.le(cappedByWallet, supplyRemaining);
        euint64 fill = FHE.select(fitsSupply, cappedByWallet, supplyRemaining);

        euint64 finalPayment = FHE.mul(fill, uint64(prop.pricePerShare));

        _allowForPaymentToken(finalPayment);
        paymentToken.pullConfidential(msg.sender, address(this), finalPayment);

        _balances[propertyId][msg.sender] = FHE.add(current, fill);
        _allowBalance(propertyId, msg.sender);

        _totalSharesAllocated[propertyId] = FHE.add(allocated, fill);
        FHE.allowThis(_totalSharesAllocated[propertyId]);

        _register(propertyId, msg.sender);
        emit SharesPurchased(propertyId, msg.sender, block.timestamp);
    }

    /**
     * @notice List encrypted shares for FCFS resale at your price per share.
     */
    function createSecondaryListing(
        uint256 propertyId,
        uint256 pricePerShare,
        externalEuint64 encryptedShareAmount,
        bytes calldata inputProof
    ) external returns (uint256 listingId) {
        require(_properties[propertyId].active, "ShieldCap: property inactive");
        require(pricePerShare > 0, "ShieldCap: invalid price");

        euint64 shareAmount = FHE.fromExternal(encryptedShareAmount, inputProof);
        euint64 sellerBal = _balances[propertyId][msg.sender];
        ebool sufficient = FHE.le(shareAmount, sellerBal);
        euint64 listed = FHE.select(sufficient, shareAmount, FHE.asEuint64(0));

        _balances[propertyId][msg.sender] = FHE.select(
            sufficient,
            FHE.sub(sellerBal, listed),
            sellerBal
        );
        _allowBalance(propertyId, msg.sender);

        listingId = nextListingId++;
        _listings[listingId] = SecondaryListing({
            propertyId: propertyId,
            seller: msg.sender,
            sharesRemaining: listed,
            pricePerShare: pricePerShare,
            active: true
        });

        _allowListingRemaining(listed, msg.sender);

        emit SecondaryListingCreated(
            listingId,
            propertyId,
            msg.sender,
            pricePerShare,
            block.timestamp
        );
    }

    /**
     * @notice FCFS partial fill — buy any encrypted amount at the listing price (first tx wins).
     */
    function buySecondaryListing(
        uint256 listingId,
        externalEuint64 encryptedShareAmount,
        bytes calldata inputProof
    ) external {
        SecondaryListing storage listing = _listings[listingId];
        require(listing.active, "ShieldCap: listing inactive");
        require(msg.sender != listing.seller, "ShieldCap: cannot buy own listing");

        uint256 propertyId = listing.propertyId;
        address seller = listing.seller;
        require(_properties[propertyId].active, "ShieldCap: property inactive");

        euint64 requested = FHE.fromExternal(encryptedShareAmount, inputProof);
        euint64 remaining = listing.sharesRemaining;
        euint64 fill = FHE.select(FHE.le(requested, remaining), requested, remaining);

        euint64 payment = FHE.mul(fill, uint64(listing.pricePerShare));
        _allowForPaymentToken(payment);
        paymentToken.pullConfidential(msg.sender, seller, payment);

        _creditBuyerFromListing(propertyId, msg.sender, fill, remaining, listing);
        _register(propertyId, msg.sender);

        emit SecondaryListingFilled(listingId, propertyId, msg.sender, seller, block.timestamp);
        emit ConfidentialTransfer(propertyId, seller, msg.sender, block.timestamp);
    }

    function _creditBuyerFromListing(
        uint256 propertyId,
        address buyer,
        euint64 fill,
        euint64 remaining,
        SecondaryListing storage listing
    ) private {
        euint64 buyerBal = _balances[propertyId][buyer];
        euint64 newBuyerBal = FHE.add(buyerBal, fill);
        ebool withinCap = FHE.le(newBuyerBal, FHE.asEuint64(maxSharesForProperty(propertyId)));
        ebool success = FHE.and(FHE.gt(fill, FHE.asEuint64(0)), withinCap);

        listing.sharesRemaining = FHE.select(success, FHE.sub(remaining, fill), remaining);
        _allowListingRemaining(listing.sharesRemaining, listing.seller);

        _balances[propertyId][buyer] = FHE.select(success, newBuyerBal, buyerBal);
        _allowBalance(propertyId, buyer);
    }

    function cancelSecondaryListing(uint256 listingId) external {
        SecondaryListing storage listing = _listings[listingId];
        require(listing.active, "ShieldCap: listing inactive");
        require(msg.sender == listing.seller, "ShieldCap: not seller");

        euint64 remaining = listing.sharesRemaining;
        euint64 sellerBal = _balances[listing.propertyId][msg.sender];
        _balances[listing.propertyId][msg.sender] = FHE.add(sellerBal, remaining);
        _allowBalance(listing.propertyId, msg.sender);

        listing.sharesRemaining = FHE.asEuint64(0);
        listing.active = false;

        emit SecondaryListingCancelled(listingId, listing.propertyId, msg.sender, block.timestamp);
    }

    function getSecondaryListing(uint256 listingId)
        external
        view
        returns (
            uint256 propertyId,
            address seller,
            euint64 sharesRemaining,
            uint256 pricePerShare,
            bool active
        )
    {
        SecondaryListing storage listing = _listings[listingId];
        return (
            listing.propertyId,
            listing.seller,
            listing.sharesRemaining,
            listing.pricePerShare,
            listing.active
        );
    }

    function distributeDividend(
        uint256 propertyId,
        externalEuint64 encryptedRevenue,
        bytes calldata inputProof
    ) external onlyOwner {
        PrimaryProperty storage prop = _properties[propertyId];
        require(prop.active, "ShieldCap: property inactive");

        euint64 revenue = FHE.fromExternal(encryptedRevenue, inputProof);

        // Pull confidential ctUSDC from the property owner into contract escrow.
        _allowForPaymentToken(revenue);
        paymentToken.pullConfidential(msg.sender, address(this), revenue);

        dividendRound[propertyId]++;
        address[] storage investors = _investors[propertyId];

        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            euint64 bal = _balances[propertyId][investor];
            euint64 payout = FHE.div(FHE.mul(bal, revenue), uint64(prop.totalShares));

            _dividendPayouts[propertyId][investor] = FHE.add(
                _dividendPayouts[propertyId][investor],
                payout
            );

            FHE.allowThis(_dividendPayouts[propertyId][investor]);
            FHE.allow(_dividendPayouts[propertyId][investor], investor);
        }

        emit DividendDistributed(propertyId, dividendRound[propertyId], block.timestamp);
        emit ConfidentialTransfer(propertyId, msg.sender, address(this), block.timestamp);
    }

    function claimDividend(uint256 propertyId) external {
        euint64 payout = _dividendPayouts[propertyId][msg.sender];
        _dividendPayouts[propertyId][msg.sender] = FHE.asEuint64(0);
        FHE.allowThis(_dividendPayouts[propertyId][msg.sender]);
        FHE.allow(_dividendPayouts[propertyId][msg.sender], msg.sender);

        // Pay investors from escrow funded by the owner at distribute time.
        _allowForPaymentToken(payout);
        paymentToken.pullConfidential(address(this), msg.sender, payout);
        emit DividendClaimed(propertyId, msg.sender, block.timestamp);
        emit ConfidentialTransfer(propertyId, address(this), msg.sender, block.timestamp);
    }

    function balanceOfProperty(uint256 propertyId, address account) external view returns (euint64) {
        return _balances[propertyId][account];
    }

    function totalSharesAllocated(uint256 propertyId) external view returns (euint64) {
        return _totalSharesAllocated[propertyId];
    }

    function dividendOf(uint256 propertyId, address account) external view returns (euint64) {
        return _dividendPayouts[propertyId][account];
    }

    function investorCount(uint256 propertyId) external view returns (uint256) {
        return _investors[propertyId].length;
    }

    function _allowBalance(uint256 propertyId, address account) private {
        FHE.allowThis(_balances[propertyId][account]);
        FHE.allow(_balances[propertyId][account], account);
    }

    function _allowListingRemaining(euint64 shares, address seller) private {
        FHE.allowThis(shares);
        FHE.allow(shares, seller);
    }

    function _allowForPaymentToken(euint64 amount) private {
        FHE.allowThis(amount);
        FHE.allowTransient(amount, address(paymentToken));
    }

    function _register(uint256 propertyId, address account) private {
        if (!_registered[propertyId][account]) {
            _registered[propertyId][account] = true;
            _investors[propertyId].push(account);
        }
    }
}
