const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require("truffle-assertions")


contract("Dex", accounts => {

    let dex
    let link 

    before (async function(){
        dex = await Dex.deployed()
        link = await Link.deployed()
    })

    // only owner can add tokens
    it("should only be possible for owner to add tokens", async () => {
        await truffleAssert.passes( 
            dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        )
        await truffleAssert.reverts(
            dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[1]})
        ) 
    })

    // assure deposited token amounts are correct
    it("should handle deposit correctly", async () => {
        await link.approve(dex.address, 500)
        await dex.deposit(100, web3.utils.fromUtf8("LINK"))
        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal(balance.toNumber(), 100 )
        
    })

    // avoid errors with token withdrawals 
    it("should handle faulty withdrawals correctly", async () => {
        await truffleAssert.reverts( dex.withdraw(500, web3.utils.fromUtf8("LINK")))    
    })

    // assure withdrawals work for correct amounts
    it("should handle correct withdrawals correctly", async () => {
        await truffleAssert.passes( dex.withdraw(100, web3.utils.fromUtf8("LINK")))    
    }) 
})