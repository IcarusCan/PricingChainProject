// SPDX-License-Identifier: MIT

pragma solidity ^0.8.14;
import "./Session.sol";

contract Main {
    address public admin;

    // Structure to hold details of Bidder
    struct IParticipant {
        address account;
        string name;
        string email;
        uint256 bidCount;
        uint256 bidDeviation;
    }
    //map to IParticipant
    mapping(address => IParticipant) private _participants;
    address[] private _iParticipants;

    mapping(address => bool) public hasWhitelisted;
    mapping(address => bool) public _completeAccount;

    //map to save session addr
    mapping(uint256 => address) private _sessions;
    //map to save session hash
    mapping(address => bytes32) private _sessionHashes;
    uint256 private _sessionId;

    //hasBis[bidderAddr][sessionAddr] --> check bidder has bid or not
    mapping(address => mapping(address => bool)) private _hasBid;

    // For re-entrance guarantee
    bool private locked;

    event NewSessionCreated(
        uint256 indexed sessionId,
        address indexed sessionAddress,
        bytes32 sessionHash
    );

    constructor(address[] memory _accounts) {
        admin = msg.sender;
        uint256 accountsLength = _accounts.length;
        for (uint256 i = 1; i < accountsLength; i++) {
            whitelist(_accounts[i]);
        }
    }

    // Register/update user name and email by registed participants
    function register(
        string calldata _name,
        string calldata _email
    ) external _onlyRegistered {
        address account = msg.sender;
        require(!_completeAccount[account], "Main: Your account is completed!");
        _participants[account].name = _name;
        _participants[account].email = _email;
        _completeAccount[account] = true;
    }

    // Add a Session Contract
    function addSession(
        address _maincontract,
        string calldata _productName,
        string calldata _description,
        string calldata _imageHashes
    ) external _onlyAdmin nonReentrant {
        // New instance of Session each time called
        Session newSession = new Session(
            admin,
            _maincontract,
            _productName,
            _description,
            _imageHashes
        );
        address sessionAddr = address(newSession);
        bytes32 sessionHash = newSession.SessionHash();

        //save address by ID
        _sessions[_sessionId] = sessionAddr;
        //save session hash to Main contract
        _sessionHashes[sessionAddr] = sessionHash;

        emit NewSessionCreated(_sessionId, sessionAddr, sessionHash);
        _sessionId++;
    }

    // For admin to add a new participant
    function addWhitelist(
        address _newParticipant
    ) external _onlyAdmin nonReentrant returns (bool) {
        whitelist(_newParticipant);
        return true;
    }

    // Register new participant by admin
    function whitelist(address _newParticipant) private _onlyAdmin {
        require(
            !hasWhitelisted[_newParticipant],
            "Main: Participant is whitelisted!"
        );

        //Update map to IParticipant
        _participants[_newParticipant].account = _newParticipant;

        // Update to save address of participant
        _iParticipants.push(_newParticipant);
        hasWhitelisted[_newParticipant] = true;
    }

    // Get participant by address
    function participants(
        address _addr
    ) external view returns (IParticipant memory) {
        return _participants[_addr];
    }

    // Update bidCount of participant
    function setBidCount(address _addr) external returns (uint256) {
        return _participants[_addr].bidCount++;
    }

    // Update bidDeviation of participant
    function setBidDev(address _addr, uint256 _dev) external returns (uint256) {
        _participants[_addr].bidDeviation = _dev;
        return _dev;
    }

    // Get number of participants
    function nParticipants() external view returns (uint256) {
        return _iParticipants.length;
    }

    // Get address of participant by index (use to loop through the list of participants)
    function iParticipants(uint256 _index) external view returns (address) {
        return _iParticipants[_index];
    }

    //Check that participant addr has bidded
    function hasBid(
        address _participant,
        address _sessionAddr
    ) external view returns (bool) {
        return _hasBid[_participant][_sessionAddr];
    }

    function setHasBid(
        address _participant,
        address _sessionAddr
    ) external returns (bool) {
        bool setBid = true;
        _hasBid[_participant][_sessionAddr] = setBid;
        return setBid;
    }

    // Get number of sessions
    function nSessions() external view returns (uint256) {
        return _sessionId;
    }

    // Get address of session by index (use to loop through the list of sessions)
    function sessions(uint256 _index) external view returns (address) {
        return _sessions[_index];
    }

    // Get saved session hash in Main contract
    function getSessionHash(address _addr) external view returns (bytes32) {
        return _sessionHashes[_addr];
    }

    modifier _onlyAdmin() {
        require(admin == msg.sender, "Main: Only admin can do this!");
        _;
    }

    modifier _onlyRegistered() {
        require(
            _participants[msg.sender].account == msg.sender,
            "Main: Only registered user can do it!"
        );
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Main: Reentrant call.");
        locked = true;
        _;
        locked = false;
    }
}
