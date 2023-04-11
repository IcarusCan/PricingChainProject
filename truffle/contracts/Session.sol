// SPDX-License-Identifier: MIT

pragma solidity ^0.8.14;
import "./Main.sol";

contract Session {
    // Variable to hold Main Contract Address when create new Session Contract
    address public mainContract;
    // Variable to hold Main Contract instance to call functions from Main
    Main MainContractInstance;

    address public admin;
    bytes32 private sessionHash;
    bool private locked;

    //Struct to hold product info
    struct Product {
        string name;
        string description;
        string imageHashes;
    }

    //Struct to hold bidder info
    struct Bidder {
        address account;
        uint256 price;
    }

    //State of session
    enum SessionState {
        CREATE,
        START,
        PRICING,
        STOP,
        CLOSED
    }

    //Struct to hold general info of a session
    struct ISession {
        Product product; // 1 product/session
        //Bidder[] bidded;
        uint256 suggestedPrice;
        uint256 finalPrice;
        SessionState currentState;
    }
    ISession private _sessions;

    //Map to save bidder info
    mapping(uint256 => Bidder) private _bidders;
    mapping(address => uint256) private _idOf;
    uint256 private _bidderCount;

    //Event that need to be listened
    event SessionStarted(
        address indexed sessionAddr,
        SessionState indexed curState
    );
    event SessionStopped(
        address indexed sessionAddr,
        SessionState indexed curState
    );
    event SessionPricing(
        address indexed sessionAddr,
        address indexed account,
        uint256 oldPrice,
        uint256 newPrice
    );
    event SessionClosed(
        address indexed sessionAddr,
        uint256 indexed suggestedPrice,
        uint256 indexed finalPrice
    );

    constructor(
        address _admin,
        address _mainContract,
        string memory _productName,
        string memory _description,
        string memory _imageHashes
    ) {
        admin = _admin;
        //Get Main Contract address
        mainContract = _mainContract;
        // Get Main Contract instance
        MainContractInstance = Main(_mainContract);

        ISession memory newSession = ISession({
            product: Product({
                name: _productName,
                description: _description,
                imageHashes: _imageHashes
            }),
            //bidded: new Bidder[](0),
            suggestedPrice: 0,
            finalPrice: 0,
            currentState: SessionState.CREATE
        });

        _sessions = newSession;
    }

    function startSession() external _instate(SessionState.CREATE) _onlyAdmin {
        _sessions.currentState = SessionState.START;
        emit SessionStarted(address(this), SessionState.START);
    }

    function pricingSession(
        uint256 _newPrice
    ) external _pricing _isRegistered _isCompleteRegistered nonReentrant {
        address _currentBidder = msg.sender;
        address _sessionAddr = address(this);
        uint256 oldPrice;

        if (!MainContractInstance.hasBid(_currentBidder, _sessionAddr)) {
            MainContractInstance.setHasBid(_currentBidder, _sessionAddr);
            //Update bidder in 1st time
            _bidders[_bidderCount].account = _currentBidder;
            _bidders[_bidderCount].price = _newPrice;
            _idOf[_currentBidder] = _bidderCount;
            _sessions.currentState = SessionState.PRICING;

            //If bidded, IParticipant -> bidCount need update
            MainContractInstance.setBidCount(_currentBidder); // +1 when called
            //Increase ID only once
            _bidderCount++;
        } else {
            oldPrice = _bidders[_idOf[_currentBidder]].price;
            _bidders[_idOf[_currentBidder]].price = _newPrice;
        }

        emit SessionPricing(_sessionAddr, _currentBidder, oldPrice, _newPrice);
    }

    function stopSession() external _instate(SessionState.PRICING) _onlyAdmin {
        _sessions.currentState = SessionState.STOP;
        emit SessionStopped(address(this), SessionState.STOP);
    }

    function closeSession(
        uint256 _actual
    ) external _instate(SessionState.STOP) _onlyAdmin {
        uint256 _participantCount = _bidderCount;
        uint256 _errorOfId;
        uint256 _errorSum;
        uint256 _priceSum;

        _sessions.finalPrice = _actual;
        _sessions.currentState = SessionState.CLOSED;

        for (uint256 id = 0; id < _participantCount; id++) {
            uint256 bidderPrice = _bidders[id].price;
            address account = _bidders[id].account;

            _errorOfId = _deviationOf(id, _actual);
            _errorSum += _errorOfId;
            _priceSum += bidderPrice * (100 - _errorOfId);

            //Update IParticipant info setBidCount (addrBidder, bidCount)
            MainContractInstance.setBidDev(account, _errorOfId);
        }

        _sessions.suggestedPrice =
            _priceSum /
            ((100 * _participantCount) - _errorSum);

        emit SessionClosed(address(this), _sessions.suggestedPrice, _actual);
    }

    //Calculate the deviation of bidder
    function _deviationOf(
        uint256 _idBidder,
        uint256 _actualPrice
    ) private view _onlyAdmin returns (uint256) {
        uint256 curDev;
        uint256 newDev;
        uint256 calDev;
        uint256 _participantCount = _bidderCount;
        address bidderAddr = _bidders[_idBidder].account;

        //Get current deviation of participant
        curDev = MainContractInstance.participants(bidderAddr).bidDeviation;

        //Calculate new deviation of participant base on actual price
        if (_actualPrice >= _bidders[_idBidder].price) {
            newDev =
                ((_actualPrice - _bidders[_idBidder].price) * 100) /
                _actualPrice;
        } else {
            newDev =
                ((_bidders[_idBidder].price - _actualPrice) * 100) /
                _actualPrice;
        }

        //Update deviation of participant base on current and new deviation
        calDev =
            (curDev * _participantCount + newDev) /
            (_participantCount + 1);

        return calDev;
    }

    function getBidderCount() external view returns (uint256) {
        return _bidderCount;
    }

    function getBidderId(address _bidderAddr) external view returns (uint256) {
        require(_bidderAddr != address(0), "Session: Invalid bidderAddr");
        return _idOf[_bidderAddr];
    }

    function getBidderInfo(
        uint256 _index
    ) external view returns (Bidder memory) {
        return _bidders[_index];
    }

    function getSessionInfo() public view returns (ISession memory) {
        return _sessions;
    }

    function SessionHash() external returns (bytes32) {
        sessionHash = keccak256(abi.encodePacked(address(this), mainContract));
        return sessionHash;
    }

    modifier _instate(SessionState expected_state) {
        require(
            _sessions.currentState == expected_state,
            "Session: Not allow with current session state!"
        );
        _;
    }

    modifier _pricing() {
        require(
            _sessions.currentState == SessionState.START ||
                _sessions.currentState == SessionState.PRICING,
            "Session: State must be START or PRICING!"
        );
        _;
    }

    modifier _isRegistered() {
        require(
            MainContractInstance.registered(msg.sender),
            "Session: Only registered address can do this!"
        );
        _;
    }

    modifier _isCompleteRegistered() {
        require(
            MainContractInstance._completeAccount(msg.sender),
            "Session: Register your Name and Email first!"
        );
        _;
    }

    modifier _onlyAdmin() {
        require(admin != address(0), "Session: Invalid address 0!");
        require(admin == msg.sender, "Session: Only admin can do this!");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Session: Reentrant call.");
        locked = true;
        _;
        locked = false;
    }
}
