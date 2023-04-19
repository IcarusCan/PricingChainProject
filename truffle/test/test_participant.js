const Main = artifacts.require("Main");
const Session = artifacts.require("Session");

contract("Session", function (accounts) {
  let mainInstance;
  let admin;
  let sessionInstance;

  beforeEach(async () => {
    mainInstance = await Main.new(accounts);
    admin = await mainInstance.admin();
    let newSession = await mainInstance.addSession(
      mainInstance.address,
      "abc",
      "xyz",
      "123",
      { from: admin }
    );
    sessionInstance = await Session.at(newSession.logs[0].args.sessionAddress);
  });

  describe("Session Contract is deployed", async () => {
    it("should assert true", async () => {
      return assert.isTrue(sessionInstance !== undefined);
    });
  });

  /**
   * 1. Complete Participant registration
   * 1.1 Registered by user that is not on whitelist
   * 1.2 Invalid input: Name is empty
   * 1.3 Invalid input: Email is empty
   * 1.4 Participant register their Fullname and Email successfully and try to register again
   * 1.5 Participant register their Fullname and Email successfully
   */
  describe("1. Complete Participant registration", async () => {
    it("1.1 User that is not on whitelist", async () => {
      let newAcc = web3.eth.accounts.create().address;
      try {
        await mainInstance.register("new_name", "new_email", { from: newAcc });
      } catch (error) {
        assert.equal(error.reason, "Main: Only registered user can do it!");
      }
    });

    it("1.2 Invalid input: Name is empty", async () => {
      try {
        await mainInstance.register("", "new_email", { from: accounts[1] });
      } catch (error) {
        assert.equal(error.reason, "Main: Name should not be empty");
      }
    });

    it("1.3 Invalid input: Email is empty", async () => {
      try {
        await mainInstance.register("new_name", "", { from: accounts[1] });
      } catch (error) {
        assert.equal(error.reason, "Main: Email should not be empty");
      }
    });

    it("1.4 Register successfully then try to register again", async () => {
      await mainInstance.register("name", "email", { from: accounts[1] });
      try {
        await mainInstance.register("name1", "email1", { from: accounts[1] });
      } catch (error) {
        assert.equal(error.reason, "Main: Your account is completed!");
      }
    });

    it("1.5 Register successfully", async () => {
      await mainInstance.register("name", "email", { from: accounts[1] });
      let result = await mainInstance.completeAccount(accounts[1]);

      return assert.isTrue(result === true);
    });

    // it("TESTING", async () => {
    //   const txPromises = [
    //     mainInstance.register("acc1", "acc1", { from: accounts[1] }),
    //     mainInstance.register("acc2", "acc2", { from: accounts[1] }),
    //   ];

    //   try {
    //     await Promise.all(txPromises);
    //   } catch (error) {
    //     assert.equal(error.reason, "Main: Your account is completed!");
    //   }
    // });
  });

  /**
   * 2. Pricing Session
   * 2.1 Participant who is not on whitelist (register by admin first) try to access the pricing session
   * 2.2 Participant who is not complete their profile (name and email) try to access the pricing session
   * 2.3 Current state must be START or PRICING
   * 2.4 Guarantee that there is no re-entrancy
   * 2.5 Invalid input price
   * 2.6 Place a price successfully
   * 2.7 Update a price fail
   * 2.8 Update a price successfully
   */
  describe("2. Pricing Session", async () => {
    it("2.1 Not on whitelist (register by admin first)", async () => {
      let newAcc = web3.eth.accounts.create().address;
      await sessionInstance.startSession({ from: admin });
      try {
        await sessionInstance.pricingSession(100, { from: newAcc });
      } catch (error) {
        assert.equal(
          error.reason,
          "Session: Only registered address can do this!"
        );
      }
    });

    it("2.2 Not complete their profile (name and email)", async () => {
      await sessionInstance.startSession({ from: admin });
      try {
        await sessionInstance.pricingSession(100, { from: accounts[1] });
      } catch (error) {
        assert.equal(
          error.reason,
          "Session: Register your Name and Email first!"
        );
      }
    });

    it("2.3 Current state must be START or PRICING", async () => {
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      try {
        await sessionInstance.pricingSession(100, { from: accounts[1] });
      } catch (error) {
        assert.equal(error.reason, "Session: State must be START or PRICING!");
      }
    });

    it("2.4 Guarantee that there is no re-entrancy", async () => {
      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      const txPromises = [
        sessionInstance.pricingSession(100, { from: accounts[1] }),
        sessionInstance.pricingSession(150, { from: accounts[1] }),
      ];

      try {
        await Promise.all(txPromises);
      } catch (error) {
        assert.equal(error.reason, "Session: Reentrant call.");
      }
    });

    it("2.5 Invalid input price", async () => {
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await sessionInstance.startSession({ from: admin });
      try {
        await sessionInstance.pricingSession(-50, { from: accounts[1] });
      } catch (error) {
        assert.include(error.message, "value out-of-bounds");
      }
    });

    it("2.6 Place a price successfully", async () => {
      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      let res = await sessionInstance.pricingSession(50, { from: accounts[1] });

      assert.equal(res.logs[0].event, "SessionPricing");
      assert.equal(res.logs[0].args.newPrice, 50);
    });

    it("2.7 Update a price fail", async () => {
      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await sessionInstance.pricingSession(50, { from: accounts[1] });
      await sessionInstance.stopSession({ from: admin });

      try {
        await sessionInstance.pricingSession(80, { from: accounts[1] });
      } catch (error) {
        assert.equal(error.reason, "Session: State must be START or PRICING!");
      }
    });

    it("2.8 Update a price successfully", async () => {
      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await sessionInstance.pricingSession(50, { from: accounts[1] });
      let res = await sessionInstance.pricingSession(80, { from: accounts[1] });

      assert.equal(res.logs[0].event, "SessionPricing");
      assert.equal(res.logs[0].args.oldPrice, 50);
      assert.equal(res.logs[0].args.newPrice, 80);
    });
  });
});
