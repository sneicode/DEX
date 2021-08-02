// BUY SIDE
// 1. The user must have ETH deposited such that deposited eth >= buy order value (always buy with ETH, so need more ETH in account than the order value of the buy order)
// 2. The user (different user) must have enough tokens deposited such that token balance >= sell order amount (enough LINK tokens to sell)
// 3. The first order ([0]) in the BUY order book should have the highest price
// (above is equal: the order of the elements should be ordered on price from highest to lowest)
// add two more myself

// 1. input parameters: address, ticker, ethBalance, buy order value

const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require("truffle-assertions")


contract("Dex", accounts => {
    
    // The user must have sufficient ETH deposited to create a limit order
    it("should throw an error if ETH balance is too low when creating a BUY limit order", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 1)
        )
        dex.depositEth({value: 10})
        await truffleAssert.passes(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 1)
        )
    })

    // 2. The user (different user) must have enough tokens deposited such that token balance >= sell order amount (enough LINK tokens to sell)
    it("should throw an error if token balance is too low when creating a SELL limit order", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        await truffleAssert.reverts(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 1)
        )
        await link.approve(dex.address, 500)
        await dex.deposit(10, web3.utils.fromUtf8("LINK"))
        await truffleAssert.passes(
            dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 1)
        )
    })
    // 3.a) The first order ([0]) in the BUY order book should have the highest price
    it("should throw an error if the first order in the BUY order book doesn't have the highest price", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await link.approve(dex.address, 500)
        await dex.depositEth({value: 3000})
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 300)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 100)
        await dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 1, 200) 

        let orderbook = dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0)
        //assert(orderbook.length > 0)

        for(let i = 0; i < orderbook.length -1; i++) {
            assert(orderbook[i].price >= orderbook[i+1].price, "unordered buy order book")
        }
    })
    // 3.b) The first order ([0]) in the SELL order book should have the lowest price
    it("should throw an error if the first order in the SELL order book doesn't have the lowest price", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await link.approve(dex.address, 500)
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300)
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 100)
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 200) 

        let orderbook = dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        
        //assert(orderbook.length > 0)
        for(let i = 0; i < orderbook.length -1; i++) {
            assert(orderbook[i].price <= orderbook[i+1].price, "unordered sell order book")
        }
    })
    
})
// MARKET ORDER TESTING
// When creating a SELL market order, the seller needs to have sufficient tokens for the trade 
// When creating a BUY market order, the buyer needs to have sufficient eth for the trade
// Market orders can be submitted even if the order book is empty
// Market orders should be filled until the order book is empty or the market order is 100% filled
// the eth balance of the buyer should decrease with the filled ammount
// the token balances of the limit order sellers should decrease with the filled amount 
// Filled limit orders should be removed from the orderbook

contract("Dex", accounts => {
    
        // When creating a SELL market order, the seller needs to have sufficient tokens for the trade
        it("seller needs enough tokens for the trade", async () => {
            await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
            await truffleAssert.reverts(
                dex.addMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
            )
            await link.approve(dex.address, 500)
            await dex.deposit(10, web3.utils.fromUtf8("LINK"))
            await truffleAssert.passes(
                // add sell market order 
                dex.addMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )

        it("buyer needs enough ETH for the trade", async () => {
            await dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
            await truffleAssert.reverts(
                dex.addMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
            )
            await link.approve(dex.address, 500)
            await dex.depositEth(10, web3.utils.fromUtf8("LINK"))
            await truffleAssert.passes(
                // add sell market order 
                dex.addMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )
    })

}