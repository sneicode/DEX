const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require("truffle-assertions")

contract("Dex", accounts => {
    
    // When creating a SELL market order, the seller needs to have sufficient tokens for the trade
    it("should throw when creating a sell market order with a 0 token balance ", async () => {
        let dex = await Dex.deployed()
        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal(balance.toNumber(), 0, "initial Link token balance is not 0")

        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )
    })

    
    // Market orders can be submitted even if the order book is empty
    it("Market orders can be submitted even if the order book is empty", async () => {
        let dex = await Dex.deployed()

        await dex.depositEth({value: 50000})

        let orderbook = dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0)
        assert(orderbook.length == 0, "buy side orderbook length is not 0")

        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )
    })

    // Market orders should be filled until the order book is 100% filled
    it("Market orders should not fill more limit orders than the market order amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        // get SELL side orderbook and assure it is empty at start of test
        let orderbook = dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        assert(orderbook.length == 0, "SELL side order book is not empty at start of test")
        
        // add the LINK token 
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        // provide 3 accounts with LINK tokens from account 0
        await link.transfer(accounts[1], 150)
        await link.transfer(accounts[2], 150)
        await link.transfer(accounts[3], 150)

        // approve accounts 1-3 for DEX to sell 50 link tokens per account
        await link.approve(dex.address, 50, {from: accounts[1]})
        await link.approve(dex.address, 50, {from: accounts[2]})
        await link.approve(dex.address, 50, {from: accounts[3]})

        // deposit LINK tokens into Dex 
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[1]})
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[2]})
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[3]})

        // create 3 SELL side limit orders, 1 each for accounts 1 - 3
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: account[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, {from: account[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, {from: account[3]})

        // create market order that fills 2/3 of the order book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)

        // get SELL side of orderbook once again 
        await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        // assure length is 1, (2 thirds consumed and 1 limitOrder left)
        assert(orderbook.length == 1, "remaining SELL side orders is not 1")
        assert(orderbook[0].filled == 0, "remaining SELL side order should be untouched")
    
    })
        
    // Market orders should be filled until the order book is empty 
    it("Market orders should be filled until market order is empty", async () => {
        let dex = await Dex.deployed()
        
        // check if SELL order book has 1 entry remaining
        let orderbook = dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        assert(orderbook.length == 1, "Confirms that SELL order book length is 1 as of last test")

        // add two new limit orders // no need for adding token, nor transfer nor deosit
        // as that is still available from last test
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, {from: account[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, {from: account[2]})

        // check buyer link balance before adding new market order
        let beforeBalance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

        // create Market order that goes beyond available tokens (15 available, 35 missing)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 50)

        // check buyer link balance after adding new market order
        let updatedBalance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

        // buyer should have 15 link more even that marketorder was for 50 link
        assert.equal(beforeBalance.toNumber() + 15, updatedBalance.toNumber())

        // assure order book is empty
        assert(orderbook.length == 0, "order book on the SELL side not empty")
    })


    // the eth balance of the buyer should decrease with the filled amount
    it("the eth balance of the buyer should decrease with the filled ammount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        // seller deposit link and creates sell limit order for 1 Link
        await link.approve(dex.address, 500, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from: accounts[1]})

        // check buyer eth balance before and after adding new market order
        let beforeBalance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1)
        let updatedBalance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))

        assert.equal(beforeBalance.toNumber() - 300, updatedBalance.toNumber())
    })

    // the token balances of the limit order sellers should decrease with the filled amount
    it("the token balances of the limit order sellers should decrease with the filled amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed() 

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        assert(orderbook.length == 0, "Sell side orderbook should be empty at start of test")
        
        // seller account [2] deposit link
        await link.approve(dex.address, 500, {from: accounts[2]})
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[2]})
        
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 400, {from: account[2]})

        // check seller link balances before trade 
        let account1beforeBalance = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"))
        let account2beforeBalance = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"))
        
        // account[0] buys 2 available Link
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2)

        let account1updatedBalance = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"))
        let account2updatedBalance = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"))

        assert.equal(account1beforeBalance.toNumber() - 1, account1updatedBalance.toNumber())
        assert.equal(account2beforeBalance.toNumber() - 1, account2updatedBalance.toNumber())
    })

    // Filled limit orders should be removed from the orderbook
    it("Filled limit orders should be removed from the orderbook", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed() 

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        // seller deposit link tokens and creates a limitorder for 1 link at 300 wei
        await link.approve(dex.address, 500)
        await dex.deposit(50, web3.utils.fromUtf8("LINK"))

        await dex.depositEth({value: 10000})

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1)

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        assert(orderbook.length == 0, "sell side order book shoud be empty after trade")
    })

    //9. Partly filled limit orders should be modified to represent the filled/remaining amount
    it("partially filled limit orders should be removed from the orderbook", async () => {
        let dex = await Dex.deployed()
        
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        assert(orderbook.length == 0, "Sell side orderbook should be empty at start of test")

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 2, 300)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1)

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        // amount - filled should be remaining order amount
        assert.equal(orderbook[0].filled, 1)
        assert.equal(orderbook[0].amount, 2)
    })


}) 