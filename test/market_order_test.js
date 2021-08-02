const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require("truffle-assertions")

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
    it("should throw when creating a sell market order with a 0 token balance ", async () => {
        let dex = await Dex.deployed()
        let balance = await dex.balances(address[0], web3.utils.fromUtf8("LINK"))
        assert.equal(balance.toNumber(), 0, "initial Link token balance is not 0")

        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )
    })

    // When creating a BUY market order, the seller needs to have sufficient ETH for the trade
    it("should throw when creating a SELL market order with a 0 token balance", async () => {
        let dex = await Dex.deployed()

        let balance = await dex.balances(address[0], web3.utils.fromUtf8("ETH"))
        assert.equal(balance.toNumber(), 0, "initial ETH balance is not 0")

        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )
    })
    
    // Market orders can be submitted even if the order book is empty
    it("should throw when creating a SELL market order with a 0 token balance", async () => {
        let dex = await Dex.deployed()

        await dex.depositEth({value: 10000})

        let orderbook = dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0)
        assert(orderbook.length == 0, "buy side orderbook length is not 0")

        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )
    })

    // Market orders should be filled until the order book is empty or the market order is 100% filled
    it("Market orders should be filled until market order is 100% filled", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        // get SELL side orderbook and assure it is empty at start of test
        let orderbook = dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        assert(orderbook.length == 0, "SELL side order book is not empty at start of test")
        
        // add the LINK token 
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        // provide 3 accounts with LINK tokens from account 0
        await link.transfer(accounts[1], 50)
        await link.transfer(accounts[2], 50)
        await link.transfer(accounts[3], 50)

        // approve accounts 1-3 for DEX to sell 50 link tokens per account
        await link.approve(dex.address, 50, {from: accounts[1]})
        await link.approve(dex.address, 50, {from: accounts[2]})
        await link.approve(dex.address, 50, {from: accounts[3]})

        // deposit LINK tokens into Dex 
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[1]})
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[2]})
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[3]})

        // create 3 SELL side limit orders, 1 each for accounts 1 - 3
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 200, {from: account[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 400, {from: account[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 10, 300, {from: account[3]})

        // create market order that fills 2/3 of the order book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 20)

        // get SELL side of orderbook once again 
        await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        // assure length is 1, (2 thirds consumed, on limitOrder left)
        assert(orderbook.length == 1, "remaining SELL side orders is not 1")
        assert(orderbook[0].filled == 0, "remaining SELL side order should be untouched")
        
        
        
        await truffleAssert.passes(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )






    // For a buyer (limitOrder provider) to acquire tokens he needs enough ETH balance
    it("should throw when creating a BUY market order with a 0 ETH balance", async () => {
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


})