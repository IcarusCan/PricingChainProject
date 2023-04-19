const Main = artifacts.require("Main");
const Session = artifacts.require("Session");

contract("Main", function (accounts) {
  let mainInstance;
  let admin;

  beforeEach(async () => {
    mainInstance = await Main.new(accounts);
    admin = await mainInstance.admin();
  });

  describe("Main Contract is deployed", async () => {
    it("should assert true", async () => {
      return assert.isTrue(mainInstance !== undefined);
    });
  });

  /**
   * 1. Whitelist a new participant
   * 1.1 Only admin can access this function
   * 1.2 Guarantee that there is no re-entrancy
   * 1.3 Invalid participant address
   * 1.4 Admin can't be whitelisted
   * 1.5 Participant has not been whitelisted yet
   * 1.6 Whitelist a new participant successfully
   */
  describe("1. Whitelist a new participant", async () => {
    it("1.1 Only admin can access this function", async () => {
      let newAcc = web3.eth.accounts.create().address;
      try {
        await mainInstance.addWhitelist(newAcc, { from: newAcc });
        assert.fail("The function should have reverted");
      } catch (e) {
        assert.equal(e.reason, "Main: Only admin can do this!");
      }
    });

    it("1.2 Guarantee that there is no re-entrancy", async () => {
      let newAcc = await web3.eth.accounts.create().address;
      let newAcc2 = await web3.eth.accounts.create().address;
      const txPromises = [
        mainInstance.addWhitelist(newAcc, { from: admin }),
        mainInstance.addWhitelist(newAcc2, { from: admin }),
      ];

      try {
        await Promise.all(txPromises);
      } catch (e) {
        assert.equal(e.reason, "Main: Reentrant call.");
      }
    });

    it("1.3 Invalid participant address", async () => {
      let addr0 = 0x0000000000000000000000000000000000000000;
      try {
        await mainInstance.addWhitelist(addr0, { from: admin });
        assert.fail("The function should have reverted");
      } catch (e) {
        assert.include(e.message, "invalid address");
      }
    });

    it("1.4 Admin can't be whitelisted", async () => {
      try {
        await mainInstance.addWhitelist(admin, { from: admin });
        assert.fail("The function should have reverted");
      } catch (e) {
        assert.equal(e.reason, "Main: Admin can't be whitelisted!");
      }
    });

    it("1.5 Participant has not been whitelisted yet", async () => {
      try {
        await mainInstance.addWhitelist(accounts[1], { from: admin });
        assert.fail("The function should have reverted");
      } catch (e) {
        assert.equal(e.reason, "Main: Participant is whitelisted!");
      }
    });

    it("1.6 Whitelist a new participant successfully", async () => {
      let newAcc = web3.eth.accounts.create().address;
      await mainInstance.addWhitelist(newAcc, { from: admin });
      let res = await mainInstance.hasWhitelisted(newAcc);
      return assert.isTrue(res === true);
    });
  });

  /**
   * 2. Initiate a new Pricing Session
   * 2.1 Test to initialize a new pricing session with other account (not admin)
   * 2.2 Test to initialize a new pricing session by re-entrance
   * 2.3 Should revert when input is invalid: contract address 0
   * 2.4 Should revert when input is invalid: Empty product name
   * 2.5 Should revert when input is invalid: Empty description
   * 2.6 Should revert when input is invalid: Empty img hash
   * 2.7 Test to initialize a new pricing session successfully
   */
  describe("2. Initiate a new Pricing Session", async () => {
    it("2.1 initialize with other account (not admin)", async () => {
      try {
        await mainInstance.addSession(
          mainInstance.address,
          "Robot",
          "Gundam",
          "abc",
          { from: accounts[1] }
        );
      } catch (e) {
        assert.equal(e.reason, "Main: Only admin can do this!");
      }
    });

    it("2.2 initialize by re-entrance", async () => {
      const args = [mainInstance.address, "Robot", "Gundam", "abc"];
      const txPromises = [
        mainInstance.addSession(...args, { from: admin }),
        mainInstance.addSession(...args, { from: admin }),
      ];

      try {
        await Promise.all(txPromises);
      } catch (e) {
        assert.equal(e.reason, "Main: Reentrant call.");
      }
    });

    it("2.3 Invalid input: contract address 0", async () => {
      try {
        await mainInstance.addSession(0, "Robot", "Gundam", "abc", {
          from: admin,
        });
        assert.fail("The function should have reverted");
      } catch (e) {
        assert.include(e.message, "invalid address");
      }
    });

    it("2.4 Invalid input: Empty product name", async () => {
      try {
        await mainInstance.addSession(
          mainInstance.address,
          "",
          "Gundam",
          "abc",
          {
            from: admin,
          }
        );
        assert.fail("The function should have reverted");
      } catch (e) {
        assert.include(e.message, "Main: Product name should not be empty");
      }
    });

    it("2.5 Invalid input: Empty description", async () => {
      try {
        await mainInstance.addSession(mainInstance.address, "abc", "", "abc", {
          from: admin,
        });
        assert.fail("The function should have reverted");
      } catch (e) {
        assert.include(e.message, "Main: Description should not be empty");
      }
    });

    it("2.6 Invalid input: Empty img hash", async () => {
      try {
        await mainInstance.addSession(
          mainInstance.address,
          "abc",
          "Gundam",
          "",
          {
            from: admin,
          }
        );
        assert.fail("The function should have reverted");
      } catch (e) {
        assert.include(e.message, "Main: Image hashes should not be empty");
      }
    });

    it("2.7 initialize successfully", async () => {
      let result = await mainInstance.addSession(
        mainInstance.address,
        "Robot",
        "Gundam",
        "abc",
        { from: admin }
      );
      assert.equal(result.logs[0].event, "NewSessionCreated");
    });
  });

  /**
   * 3. Start a Pricing Session
   * 3.1 Only admin can Start a session
   * 3.2 Current state must be CREATE
   * 3.3 Start a Pricing Session successfully
   */
  describe("3. Start a Pricing Session", async () => {
    it("3.1 Only admin can Start a session", async () => {
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );

      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );

      try {
        await sessionInstance.startSession({ from: accounts[1] });
      } catch (e) {
        assert.equal(e.reason, "Session: Only admin can do this!");
      }
    });

    it("3.2 Current state must be CREATE", async () => {
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );

      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );
      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await sessionInstance.pricingSession(100, { from: accounts[1] });

      try {
        await sessionInstance.startSession({ from: admin });
      } catch (e) {
        assert.equal(
          e.reason,
          "Session: Not allow with current session state!"
        );
      }
    });

    it("3.3 Start a Pricing Session successfully", async () => {
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );

      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );
      let result = await sessionInstance.startSession({ from: admin });

      assert.equal(result.logs[0].event, "SessionStarted");
    });
  });

  /**
   * 4. Stop a Pricing Session
   * 4.1 Only admin can Stop a session
   * 4.2 Current state must be PRICING
   * 4.3 Stop a Pricing Session successfully
   */
  describe("4. Stop a Pricing Session", async () => {
    it("4.1 Only admin can Stop a session", async () => {
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );

      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );

      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await sessionInstance.pricingSession(100, { from: accounts[1] });

      try {
        await sessionInstance.stopSession({ from: accounts[1] });
      } catch (e) {
        assert.equal(e.reason, "Session: Only admin can do this!");
      }
    });

    it("4.2 Current state must be PRICING", async () => {
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );

      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );

      await sessionInstance.startSession({ from: admin });

      try {
        await sessionInstance.stopSession({ from: admin });
      } catch (e) {
        assert.equal(
          e.reason,
          "Session: Not allow with current session state!"
        );
      }
    });

    it("4.3 Stop a Pricing Session successfully", async () => {
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );

      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );
      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await sessionInstance.pricingSession(100, { from: accounts[1] });
      let result = await sessionInstance.stopSession({ from: admin });

      assert.equal(result.logs[0].event, "SessionStopped");
    });
  });

  /**
   * 5. Close a Pricing Session
   * 5.1 Only admin can Close a session
   * 5.2 Current state must be STOP
   * 5.3 Invalid input price
   * 5.4 Close a Pricing Session and update value to Main contract successfully (1)
   * 5.5 Close a Pricing Session and update value to Main contract successfully (2)
   */
  describe("5. Close a Pricing Session", async () => {
    it("5.1 Only admin can Close a session", async () => {
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );
      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );
      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await sessionInstance.pricingSession(100, { from: accounts[1] });
      await sessionInstance.stopSession({ from: admin });
      try {
        await sessionInstance.closeSession(100, { from: accounts[1] });
      } catch (e) {
        assert.equal(e.reason, "Session: Only admin can do this!");
      }
    });

    it("5.2 Current state must be STOP", async () => {
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );
      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );
      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await sessionInstance.pricingSession(100, { from: accounts[1] });
      try {
        await sessionInstance.closeSession(100, { from: admin });
      } catch (e) {
        assert.equal(
          e.reason,
          "Session: Not allow with current session state!"
        );
      }
    });

    it("5.3 Invalid input price", async () => {
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );
      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );
      await sessionInstance.startSession({ from: admin });
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await sessionInstance.pricingSession(100, { from: accounts[1] });
      await sessionInstance.stopSession({ from: admin });
      try {
        await sessionInstance.closeSession(-100, { from: accounts[1] });
      } catch (e) {
        assert.include(e.message, "value out-of-bounds");
      }
    });

    it("5.4 Close and update value successfully (1)", async () => {
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await mainInstance.register("acc2", "acc2", { from: accounts[2] });
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );
      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );
      await sessionInstance.startSession({ from: admin });
      await sessionInstance.pricingSession(100, { from: accounts[1] });
      await sessionInstance.pricingSession(125, { from: accounts[2] });

      //Calculate suggest price and also dev
      let proposedPrice = await sessionInstance.calSuggestPrice();
      let calDev = async (id, actualPrice, bidderCount) => {
        let bidderInfo = await sessionInstance.getBidderInfo(id);
        let curPrice = parseFloat(bidderInfo.price);
        let parInfo = await mainInstance.participants(bidderInfo.account);
        let curDev = parseFloat(parInfo.bidDeviation) / 1000;

        let newDev = (Math.abs(actualPrice - curPrice) * 100) / actualPrice;
        return (curDev * bidderCount + newDev) / (bidderCount + 1);
      };
      let par1_dev_expect = await calDev(1, 150, 2);
      par1_dev_expect = Math.round(par1_dev_expect * 100) / 100; //get 2 digit after decimal point

      let par2_dev_expect = await calDev(2, 150, 2);
      par2_dev_expect = Math.round(par2_dev_expect * 100) / 100; //get 2 digit after decimal point

      await sessionInstance.stopSession({ from: admin });
      let res = await sessionInstance.closeSession(150, { from: admin });

      //Check and compare
      assert.equal(res.logs[0].event, "SessionClosed");
      assert.equal(
        res.logs[0].args.suggestedPrice.toString(),
        proposedPrice.toString()
      );
      assert.equal(res.logs[0].args.finalPrice.toString(), "150");

      //Check updated info in Main Contract after session close
      let par1 = await mainInstance.participants(accounts[1], {
        from: accounts[1],
      });
      // (par1.bidDeviation / 1000) = get correct value from blockchain due to 10^decimal
      par1_dev_actual = Math.round((par1.bidDeviation / 1000) * 100) / 100;

      let par2 = await mainInstance.participants(accounts[2], {
        from: accounts[2],
      });
      par2_dev_actual = Math.round((par2.bidDeviation / 1000) * 100) / 100;

      assert.equal(par1.bidCount.toString(), "1");
      assert.equal(par1_dev_actual, par1_dev_expect);

      assert.equal(par2.bidCount.toString(), "1");
      assert.equal(par2_dev_actual, par2_dev_expect);
    });

    it("5.5 Close and update value successfully (2)", async () => {
      await mainInstance.register("acc1", "acc1", { from: accounts[1] });
      await mainInstance.register("acc2", "acc2", { from: accounts[2] });
      let newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc",
        "yyz",
        "abc",
        { from: admin }
      );
      let sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );
      await sessionInstance.startSession({ from: admin });
      await sessionInstance.pricingSession(100, { from: accounts[1] });
      await sessionInstance.pricingSession(125, { from: accounts[2] });
      await sessionInstance.stopSession({ from: admin });
      await sessionInstance.closeSession(150, { from: admin });

      //----------New session---------
      newSession = await mainInstance.addSession(
        mainInstance.address,
        "bla",
        "bla",
        "123",
        { from: admin }
      );
      sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );

      await mainInstance.register("acc3", "acc3", { from: accounts[3] });
      // await mainInstance.register("acc3", "acc3", { from: accounts[4] });
      await sessionInstance.startSession({ from: admin });
      await sessionInstance.pricingSession(140, { from: accounts[1] });
      await sessionInstance.pricingSession(130, { from: accounts[2] });
      await sessionInstance.pricingSession(180, { from: accounts[3] });
      // await sessionInstance.pricingSession(160, { from: accounts[4] });

      //Calculate suggest price and also dev
      let proposedPrice = await sessionInstance.calSuggestPrice();
      let calDev = async (id, actualPrice, bidderCount) => {
        let bidderInfo = await sessionInstance.getBidderInfo(id);
        let curPrice = parseFloat(bidderInfo.price);
        let parInfo = await mainInstance.participants(bidderInfo.account);
        let curDev = parseFloat(parInfo.bidDeviation) / 1000;

        let newDev = (Math.abs(actualPrice - curPrice) * 100) / actualPrice;
        return (curDev * bidderCount + newDev) / (bidderCount + 1);
      };
      let par1_dev_expect = await calDev(1, 150, 3);
      par1_dev_expect = Math.round(par1_dev_expect * 100) / 100; //get 2 digit after decimal point
      // console.log("par1_dev_expect", par1_dev_expect);

      let par2_dev_expect = await calDev(2, 150, 3);
      par2_dev_expect = Math.round(par2_dev_expect * 100) / 100; //get 2 digit after decimal point
      // console.log("par2_dev_expect", par2_dev_expect);

      let par3_dev_expect = await calDev(3, 150, 3);
      par3_dev_expect = Math.round(par3_dev_expect * 100) / 100; //get 2 digit after decimal point
      // console.log("par3_dev_expect", par3_dev_expect);

      await sessionInstance.stopSession({ from: admin });
      let res = await sessionInstance.closeSession(150, { from: admin });

      //Check and compare
      assert.equal(res.logs[0].event, "SessionClosed");
      assert.equal(
        res.logs[0].args.suggestedPrice.toString(),
        proposedPrice.toString()
      );
      assert.equal(res.logs[0].args.finalPrice.toString(), "150");

      //Check updated info in Main Contract after session close
      let par1 = await mainInstance.participants(accounts[1], {
        from: accounts[1],
      });
      par1_dev_actual = Math.round((par1.bidDeviation / 1000) * 100) / 100;

      let par2 = await mainInstance.participants(accounts[2], {
        from: accounts[2],
      });
      par2_dev_actual = Math.round((par2.bidDeviation / 1000) * 100) / 100;

      let par3 = await mainInstance.participants(accounts[3], {
        from: accounts[3],
      });
      par3_dev_actual = Math.round((par3.bidDeviation / 1000) * 100) / 100;

      assert.equal(par1.bidCount.toString(), "2");
      assert.equal(par1_dev_actual, par1_dev_expect);

      assert.equal(par2.bidCount.toString(), "2");
      assert.equal(par2_dev_actual, par2_dev_expect);

      assert.equal(par3.bidCount.toString(), "1");
      assert.equal(par3_dev_actual, par3_dev_expect);
    });
  });
});
