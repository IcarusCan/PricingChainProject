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
        uint32 price;
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
        //Bidder[] _bidders;
        uint32 suggestedPrice;
        uint32 finalPrice;
        SessionState currentState;
    }
    ISession private _sessions;

    //Map to save bidder info
    mapping(uint8 => Bidder) private _bidders;
    mapping(address => uint8) private _idOf;
    uint8 private _bidderCount = 1;

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
        uint32 oldPrice,
        uint32 newPrice
    );
    event SessionClosed(
        address indexed sessionAddr,
        uint32 indexed suggestedPrice,
        uint32 indexed finalPrice
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
            //_bidders: new Bidder[](0),
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
        uint32 _newPrice
    ) external _pricing _isWhitelisted _isCompleteRegistered nonReentrant {
        require(_newPrice > 0);

        address _currentBidder = msg.sender;
        address _sessionAddr = address(this);
        uint32 oldPrice;

        if (!MainContractInstance.hasBid(_currentBidder, _sessionAddr)) {
            MainContractInstance.setHasBid(_currentBidder, _sessionAddr);
            //Update bidder in 1st time
            _bidders[_bidderCount].account = _currentBidder;
            _bidders[_bidderCount].price = _newPrice;
            _idOf[_currentBidder] = _bidderCount;
            _sessions.currentState = SessionState.PRICING;

            //If bidded, IParticipant -> bidCount need update
            MainContractInstance.setBidCount(_currentBidder, address(this)); // +1 when called
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
        uint32 _actual
    ) external _instate(SessionState.STOP) _onlyAdmin {
        require(_actual > 0);

        _sessions.currentState = SessionState.CLOSED;
        _sessions.suggestedPrice = calSuggestPrice();
        _sessions.finalPrice = _actual;

        for (uint8 id = 1; id < _bidderCount; id++) {
            //Update IParticipant info setBidDev
            MainContractInstance.setBidDev(
                address(this),
                _bidders[id].account,
                calDeviation(id, _actual)
            );
        }

        emit SessionClosed(address(this), _sessions.suggestedPrice, _actual);
    }

    //Calculate the deviation of bidder
    function calDeviation(
        uint8 _id,
        uint32 _actualPrice
    ) private view _onlyAdmin returns (uint32) {
        require(_id > 0);
        require(_actualPrice > 0);

        address bidderAddr = _bidders[_id].account;
        uint32 curPrice = _bidders[_id].price;
        uint32 newDev;
        uint32 calDev;
        //Get current deviation of participant
        uint32 curDev = MainContractInstance
            .participants(bidderAddr)
            .bidDeviation;

        //Calculate new deviation of participant base on actual price
        //Get 3 decimal point by newDev(*10^decimal) = newDev*1000
        //The unit here is percentage, 500 (because of decimal above) mean 5%
        if (_actualPrice >= curPrice) {
            newDev = (((_actualPrice - curPrice) * 100) * 1000) / _actualPrice;
        } else {
            newDev = (((curPrice - _actualPrice) * 100) * 1000) / _actualPrice;
        }

        //Update deviation of participant base on current and new deviation
        calDev =
            (curDev * uint32(_bidderCount - 1) + newDev) /
            (uint32(_bidderCount - 1) + 1); //because init of bidderCount = 1

        return calDev; // to get correct display, now div by 10^decimal = 10^3
    }

    function calSuggestPrice() public view returns (uint32) {
        require(_bidderCount > 1, "Session: No bidder to calculate!");

        uint32 _curDev;
        uint32 _devSum;
        uint32 _priceSum;
        uint32 _suggestedPrice;

        for (uint8 id = 1; id < _bidderCount; id++) {
            uint32 bidderPrice = _bidders[id].price;
            address account = _bidders[id].account;

            _curDev =
                MainContractInstance.participants(account).bidDeviation /
                1000; //div by 10^decimal
            _devSum += _curDev;
            _priceSum += bidderPrice * (100 - _curDev);
        }

        //  Get 2 decimal point by _suggestedPrice(*10^decimal) = _suggestedPrice*100
        _suggestedPrice =
            _priceSum /
            ((100 * uint32(_bidderCount - 1)) - _devSum);
        return _suggestedPrice;
    }

    function getBidderId(address _bidderAddr) external view returns (uint8) {
        require(_bidderAddr != address(0), "Session: Invalid bidderAddr");
        return _idOf[_bidderAddr];
    }

    function getBidderInfo(uint8 _index) external view returns (Bidder memory) {
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

    modifier _isWhitelisted() {
        require(
            MainContractInstance.hasWhitelisted(msg.sender),
            "Session: Only registered address can do this!"
        );
        _;
    }

    modifier _isCompleteRegistered() {
        require(
            MainContractInstance.completeAccount(msg.sender),
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
