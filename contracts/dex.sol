// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./wallet.sol";

contract Dex is Wallet {

    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint id;
        address trader;
        bool buyOrder;
        bytes32 ticker;
        uint amount;
        uint price;
    }

    mapping(bytes32 => mapping(uint => Order[])) public orderBook; 

    function getOrderBook(bytes32 ticker, Side side) view public returns (Order[] memory){
        return orderBook[ticker][uint(side)];
    }
 
    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public {

    }

    function depositEth() payable public {
        balances[msg.sender][bytes32("ETH")] += balances[msg.sender][bytes32("ETH")];
        
    }

}  

    // how to call orderBook entries
    // function getOrderBook(bytes32("LINK"), Side.BUY) // Side.BUY is same as 0 as its the first enum parameter

