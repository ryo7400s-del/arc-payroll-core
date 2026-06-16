// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IUSDC {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

error ScheduleNotFound();
error SchedulePaused();
error TooEarly(uint256 next, uint256 now_);
error RecipientNotWhitelisted(address r);
error WeeklyLimitExceeded();
error SingleTxLimitExceeded();
error InsufficientAllowance();
error InsufficientBalance();
error InvalidAmount();
error InvalidInterval();
error InvalidRecipient();
error AddressAlreadyWhitelisted();
error AddressNotInWhitelist();

contract PaymentScheduler {
    address public constant USDC = 0x3600000000000000000000000000000000000000;
    uint256 public constant WEEK = 7 days;

    struct Schedule {
        uint96  id;
        address recipient;
        uint256 amount;
        uint256 interval;
        uint256 nextExecution;
        bool    active;
        string  label;
    }

    struct SpendingGuard {
        uint256 weeklyLimit;
        uint256 weeklyUsed;
        uint256 weekResetAt;
        uint256 maxSingleTx;
    }

    mapping(address => Schedule[]) private _schedules;
    mapping(address => SpendingGuard) private _guards;
    mapping(address => address[]) private _whitelist;
    mapping(address => mapping(address => bool)) private _whitelisted;
    mapping(address => uint256) public totalSent;
    uint96 private _nextId;

    event ScheduleExecuted(address indexed owner, address indexed recipient, uint256 amount, bytes32 txRef);
    event ScheduleBlocked(address indexed owner, string reason);
    event GuardUpdated(address indexed owner, uint256 weeklyLimit, uint256 maxSingleTx);
    event WeeklyReset(address indexed owner);
    event WhitelistUpdated(address indexed owner, address indexed addr, bool added);

    function setGuard(uint256 weeklyLimit, uint256 maxSingleTx) external {
        if (weeklyLimit == 0 || maxSingleTx == 0) revert InvalidAmount();
        if (maxSingleTx > weeklyLimit) revert InvalidAmount();
        SpendingGuard storage g = _guards[msg.sender];
        g.weeklyLimit = weeklyLimit;
        g.maxSingleTx = maxSingleTx;
        if (g.weekResetAt == 0) g.weekResetAt = block.timestamp + WEEK;
        emit GuardUpdated(msg.sender, weeklyLimit, maxSingleTx);
    }

    function getGuard(address owner) external view returns (SpendingGuard memory) {
        return _guards[owner];
    }

    function weeklyRemaining(address owner) external view returns (uint256) {
        SpendingGuard memory g = _guards[owner];
        if (block.timestamp >= g.weekResetAt) return g.weeklyLimit;
        return g.weeklyLimit > g.weeklyUsed ? g.weeklyLimit - g.weeklyUsed : 0;
    }

    function addToWhitelist(address addr) external {
        if (addr == address(0)) revert InvalidRecipient();
        if (_whitelisted[msg.sender][addr]) revert AddressAlreadyWhitelisted();
        _whitelist[msg.sender].push(addr);
        _whitelisted[msg.sender][addr] = true;
        emit WhitelistUpdated(msg.sender, addr, true);
    }

    function removeFromWhitelist(address addr) external {
        if (!_whitelisted[msg.sender][addr]) revert AddressNotInWhitelist();
        address[] storage list = _whitelist[msg.sender];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == addr) { list[i] = list[list.length - 1]; list.pop(); break; }
        }
        _whitelisted[msg.sender][addr] = false;
        emit WhitelistUpdated(msg.sender, addr, false);
    }

    function isWhitelisted(address owner, address addr) external view returns (bool) {
        return _whitelisted[owner][addr];
    }

    function getWhitelist(address owner) external view returns (address[] memory) {
        return _whitelist[owner];
    }

    function createSchedule(address recipient, uint256 amount, uint256 interval, string calldata label, uint256 firstExecution) external returns (uint96) {
    if (recipient == address(0)) revert InvalidRecipient();
    if (amount == 0) revert InvalidAmount();
    if (interval < 3600) revert InvalidInterval();
    if (!_whitelisted[msg.sender][recipient]) revert RecipientNotWhitelisted(recipient);
    uint256 nextExec = firstExecution > 0 ? firstExecution : block.timestamp + interval;
    uint96 id = _nextId++;
    _schedules[msg.sender].push(Schedule({ id: id, recipient: recipient, amount: amount, interval: interval, nextExecution: nextExec, active: true, label: label }));
    return id;
}
    function toggleSchedule(uint256 index) external {
        require(index < _schedules[msg.sender].length);
        _schedules[msg.sender][index].active = !_schedules[msg.sender][index].active;
    }

    function getSchedules(address owner) external view returns (Schedule[] memory) {
        return _schedules[owner];
    }

    function executeSchedule(address owner, uint256 index) external returns (bytes32 txRef) {
        require(index < _schedules[owner].length, "Not found");
        Schedule storage s = _schedules[owner][index];
        if (!s.active) { emit ScheduleBlocked(owner, "Paused"); revert SchedulePaused(); }
        if (block.timestamp < s.nextExecution) { emit ScheduleBlocked(owner, "Too early"); revert TooEarly(s.nextExecution, block.timestamp); }
        if (!_whitelisted[owner][s.recipient]) { emit ScheduleBlocked(owner, "Not whitelisted"); revert RecipientNotWhitelisted(s.recipient); }
        SpendingGuard storage g = _guards[owner];
        if (block.timestamp >= g.weekResetAt) { g.weeklyUsed = 0; g.weekResetAt = block.timestamp + WEEK; emit WeeklyReset(owner); }
        if (g.maxSingleTx != 0 && s.amount > g.maxSingleTx) { emit ScheduleBlocked(owner, "Single tx limit"); revert SingleTxLimitExceeded(); }
        if (g.weeklyLimit != 0 && g.weeklyUsed + s.amount > g.weeklyLimit) { emit ScheduleBlocked(owner, "Weekly limit"); revert WeeklyLimitExceeded(); }
        if (IUSDC(USDC).balanceOf(owner) < s.amount) revert InsufficientBalance();
        if (IUSDC(USDC).allowance(owner, address(this)) < s.amount) revert InsufficientAllowance();
        g.weeklyUsed += s.amount;
        s.nextExecution = block.timestamp + s.interval;
        totalSent[owner] += s.amount;
        txRef = keccak256(abi.encodePacked(owner, s.id, s.recipient, s.amount, block.timestamp));
        require(IUSDC(USDC).transferFrom(owner, s.recipient, s.amount), "Transfer failed");
        emit ScheduleExecuted(owner, s.recipient, s.amount, txRef);
    }

    function canExecute(address owner, uint256 index) external view returns (bool ok, string memory reason) {
        if (index >= _schedules[owner].length) return (false, "Not found");
        Schedule memory s = _schedules[owner][index];
        SpendingGuard memory g = _guards[owner];
        if (!s.active) return (false, "Paused");
        if (block.timestamp < s.nextExecution) return (false, "Too early");
        if (!_whitelisted[owner][s.recipient]) return (false, "Not whitelisted");
        uint256 used = block.timestamp >= g.weekResetAt ? 0 : g.weeklyUsed;
        if (g.maxSingleTx != 0 && s.amount > g.maxSingleTx) return (false, "Single tx limit");
        if (g.weeklyLimit != 0 && used + s.amount > g.weeklyLimit) return (false, "Weekly limit");
        if (IUSDC(USDC).balanceOf(owner) < s.amount) return (false, "Insufficient balance");
        if (IUSDC(USDC).allowance(owner, address(this)) < s.amount) return (false, "Insufficient allowance");
        return (true, "OK");
    }

    // ── x402 Payment ──────────────────────────────────────────────
    struct X402Request {
        address payer;
        address merchant;
        uint256 amount;
        uint256 expiry;
        uint256 nonce;
        bytes   signature;
    }

    mapping(bytes32 => bool) _usedNonces;

    event X402PaymentExecuted(address indexed payer, address indexed merchant, uint256 amount, bytes32 nonce);

    function executeX402Payment(X402Request calldata req) external {
        require(block.timestamp <= req.expiry, "Expired");
        bytes32 nonceKey = keccak256(abi.encodePacked(req.payer, req.nonce));
        require(!_usedNonces[nonceKey], "Nonce used");
        require(_whitelisted[req.payer][req.merchant], "Not whitelisted");

        bytes32 innerHash = keccak256(abi.encode(
    req.payer, req.merchant, req.amount, req.expiry, req.nonce
));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash));

        address signer = _recover(ethHash, req.signature);
        require(signer == req.payer, "Invalid signature");

        _usedNonces[nonceKey] = true;
        IUSDC(USDC).transferFrom(req.payer, req.merchant, req.amount);

        emit X402PaymentExecuted(req.payer, req.merchant, req.amount, bytes32(req.nonce));
    }

    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Bad sig length");
        bytes32 r; bytes32 s; uint8 v;
        assembly { r := mload(add(sig,32)) s := mload(add(sig,64)) v := byte(0,mload(add(sig,96))) }
        if (v < 27) v += 27;
        return ecrecover(hash, v, r, s);
    }
}
