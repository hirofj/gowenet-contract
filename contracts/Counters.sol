// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Counters
 * @dev Provides counters that can only be incremented or decremented by one.
 * This is a compatibility shim for OpenZeppelin v5 which removed Counters.sol
 */
library Counters {
    struct Counter {
        uint256 _value;
    }

    function current(Counter storage counter) internal view returns (uint256) {
        return counter._value;
    }

    function increment(Counter storage counter) internal {
        unchecked {
            counter._value += 1;
        }
    }

    function decrement(Counter storage counter) internal {
        uint256 value = counter._value;
        require(value > 0, "Counter: decrement overflow");
        unchecked {
            counter._value = value - 1;
        }
    }

    function reset(Counter storage counter) internal {
        counter._value = 0;
    }
}
