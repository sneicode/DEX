// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

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
        uint filled;
    }

    uint nextOrderId = 0;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook; 


    function getOrderBook(bytes32 ticker, Side side) view public returns (Order[] memory){
        return orderBook[ticker][uint(side)];
    }
 
    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public {
        if(side == Side.BUY){
            // check if user has enough ETH for buy order
            require(balances[msg.sender]["ETH"] >= amount.mul(price), "insufficient funds");
        }
        else if(side == Side.SELL){
            // check if user has enough tokens for sell order
            require(balances[msg.sender][ticker] >= amount, "insufficient funds");
        }
        
            // this creates the order object / loads the orderbook depending on side (buy or sell)
            Order[] storage orders = orderBook[ticker][uint(side)];
            // this creates the new order
            orders.push(
                Order(nextOrderId, msg.sender, side, ticker, amount, price, 0)
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
        if(side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount, "insufficient balance");
        }

        uint orderBookSide;
        if(side == Side.BUY){
            orderBookSide = 1;
        }
        else{
            orderBookSide = 0;
        }

        Order[] storage orders = orderBook[ticker][orderBookSide];

        uint totalFilled = 0;

        for (uint i = 0; i < orders.length && totalFilled < amount; i++){

            uint leftToFill = amount.sub(totalFilled); // 100
            uint availableToFill = orders[i].amount.sub(orders[i].filled); // 20
            uint filled = 0;
            if(availableToFill > leftToFill){
                filled = leftToFill; // Fill the entire market order
            }
            else {
                filled = availableToFill; // Fill as much as is available in order[i]
            }

            totalFilled = totalFilled.add(filled);
            orders[i].filled = orders[i].filled.add(filled);
            uint cost = filled.mul(orders[i].price);
           

            if(side == Side.BUY){
                // Verify that the buyer has enough ETH to cover trade
                require(balances[msg.sender]["ETH"] >= cost);
                // msg.sender is the buyer
                // reduce buyers' ETH-, increase buyer's token balances
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].sub(cost);
                balances[msg.sender][ticker] = balances[msg.sender][ticker].add(filled);
                // reduce sellers' token-, increase sellers' ETH balance
                balances[orders[i].trader][ticker] = balances[orders[i].trader][ticker].sub(filled);
                balances[orders[i].trader]["ETH"] = balances[orders[i].trader]["ETH"].add(cost);
            }
            else if(side == Side.SELL){
                // msg.sender is the seller
                // increase sellers' ETH-, reduce seller's token balances
                balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(filled);
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(cost);
                // reduce buyers' ETH-, increase buyer's token balances
                balances[orders[i].trader][ticker] = balances[orders[i].trader][ticker].add(filled);
                balances[orders[i].trader]["ETH"] = balances[orders[i].trader]["ETH"].sub(cost);
            }   
    
        }   


            // remove all 100% filled orders from the orderbook
            while(orders.length > 0 && orders[0].filled == orders[0].amount){
                // remove top element in the orders array by overwriting every element with the next element in the order list
                for(uint i = 0; i < orders.length - 1; i++){
                    orders[i] = orders[i + 1];
                }
                orders.pop();
            }
          
    }

} 

