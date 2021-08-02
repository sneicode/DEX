// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./wallet.sol";

contract Dex is Wallet {

    using SafeMath for uint256;

    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint price;
    }

    uint nextOrderId = 0;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook; 


    function getOrderBook(bytes32 ticker, Side side) view public  returns (Order[] memory){
        return orderBook[ticker][uint(side)];
    }
 
    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public {
        if(side == Side.BUY){
            // check if user has enough ETH for buy order
            require(balances[msg.sender][bytes32("ETH")] >= amount.mul(price), "insufficient funds");
        }
        else if(side == Side.SELL){
            // check if user has enough tokens for sell order
            require(balances[msg.sender][ticker] >= amount, "insufficient funds");
        }
        
            // this creates the order object / loads the orderbook depending on side (buy or sell)
            Order[] storage orders = orderBook[ticker][uint(side)];
            // this creates the new order
            orders.push(
                Order(nextOrderId, msg.sender, side, ticker, amount, price)
                );
            
            // bubble sort
            // start iteration at the end of the array
            uint i = orders.length > 0 ? orders.length -1 : 0;

            if(side == Side.BUY){
                while (i > 0){
                    if(orders[i - 1].price > orders[i].price) {
                        break;
                    }
                    // using existing values and their relative positions to swap order 
                    Order memory orderToMove = orders[i - 1];
                    orders[i - 1] = orders[i];
                    orders[i] = orderToMove;
                    i--;
                }
            }
            else if(side == Side.SELL){
                while (i > 0){
                    if(orders[i - 1].price < orders[i].price) {
                        break;
                    }
                    Order memory orderToMove = orders[i - 1];
                    orders[i - 1] = orders[i];
                    orders[i] = orderToMove;
                    i--;
                }
            }

            nextOrderId++;        
    }


    function createMarketOrder(Side side, bytes32 ticker, uint amount) public {

    }



} 

