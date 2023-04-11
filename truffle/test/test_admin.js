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
   * 1.3 Participant has not be whitelisted yet
   * 1.4 Whitelist a new participant successfully
   */
  describe("1. Whitelist a new participant", async () => {
    it("1.1 Only admin can access this function", async () => {
      let newAcc = web3.eth.accounts.create().address;
      try {
        await mainInstance.addWhitelist(newAcc, { from: newAcc });
      } catch (e) {
        assert.equal(e.reason, "Main: Only admin can do this!");
      }
    });

    it("1.2 Guarantee that there is no re-entrancy", async () => {
      let newAcc = web3.eth.accounts.create().address;
      let newAcc2 = web3.eth.accounts.create().address;
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

    it("1.3 Participant has not be whitelisted yet", async () => {
      try {
        await mainInstance.addWhitelist(accounts[1], { from: admin });
      } catch (e) {
        assert.equal(e.reason, "Main: Participant is whitelisted!");
      }
    });

    it("1.4 Whitelist a new participant successfully", async () => {
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
   * 2.3 Test to initialize a new pricing session successfully
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

    it("2.3 initialize successfully", async () => {
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
   * 5.3 Close a Pricing Session and update value to Main contract successfully
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

    it("5.3 Close and update value successfully", async () => {
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
      await sessionInstance.pricingSession(110, { from: accounts[2] });

      await sessionInstance.stopSession({ from: admin });
      let res1 = await sessionInstance.closeSession(150, { from: admin });
      // console.log("res1", res1.logs[0].args.suggestedPrice.toString());
      // console.log("er", res1.logs[0].args.finalPrice.toString());
      //
      assert.equal(res1.logs[0].event, "SessionClosed");
      assert.equal(res1.logs[0].args.suggestedPrice.toString(), "105");
      assert.equal(res1.logs[0].args.finalPrice.toString(), "150");

      //Check updated info in Main Contract after session close
      // let noOfPar = 2;
      // let actual_price = 150;
      // let par1_price = 100;
      // let par2_price = 110;

      // let par1_dnew = ((actual_price - par1_price) * 100) / actual_price;
      // let par1_dcur = 0;
      // let par1_dcal = (par1_dcur * noOfPar + par1_dnew) / (noOfPar + 1);

      // let par2_dnew = ((actual_price - par2_price) * 100) / actual_price;
      // let par2_dcur = 0;
      // let par2_dcal = (par2_dcur * noOfPar + par2_dnew) / (noOfPar + 1);

      // console.log("par1_dcal", par1_dcal);
      // console.log("par2_dcal", par2_dcal);

      let par1 = await mainInstance.participants(accounts[1], {
        from: accounts[1],
      });
      // console.log("par1", par1);

      let par2 = await mainInstance.participants(accounts[2], {
        from: accounts[2],
      });
      // console.log("par2", par2);

      assert.equal(par1.bidCount.toString(), "1");
      assert.equal(par1.bidDeviation.toString(), "11");
      assert.equal(par2.bidCount.toString(), "1");
      assert.equal(par2.bidDeviation.toString(), "8");

      // console.log(par2.bidCount.toString(), web3.utils.BN(par2.bidDeviation));

      //Add a new session and test all again
      newSession = await mainInstance.addSession(
        mainInstance.address,
        "abc1",
        "xyz1",
        "abc1",
        { from: admin }
      );

      sessionInstance = await Session.at(
        newSession.logs[0].args.sessionAddress
      );
      await mainInstance.register("acc3", "acc3", { from: accounts[3] });

      await sessionInstance.startSession({ from: admin });
      await sessionInstance.pricingSession(140, { from: accounts[1] });
      await sessionInstance.pricingSession(130, { from: accounts[2] });
      await sessionInstance.pricingSession(180, { from: accounts[3] });
      await sessionInstance.stopSession({ from: admin });
      let res2 = await sessionInstance.closeSession(150, { from: admin });

      assert.equal(res2.logs[0].event, "SessionClosed");
      assert.equal(res2.logs[0].args.suggestedPrice.toString(), "150");
      assert.equal(res2.logs[0].args.finalPrice.toString(), "150");

      par1 = await mainInstance.participants(accounts[1], {
        from: accounts[1],
      });
      par2 = await mainInstance.participants(accounts[2], {
        from: accounts[2],
      });
      let par3 = await mainInstance.participants(accounts[3], {
        from: accounts[3],
      });

      assert.equal(par1.bidCount.toString(), "2");
      assert.equal(par1.bidDeviation.toString(), "9");
      assert.equal(par2.bidCount.toString(), "2");
      assert.equal(par2.bidDeviation.toString(), "9");
      assert.equal(par3.bidCount.toString(), "1");
      assert.equal(par3.bidDeviation.toString(), "5");
    });
  });
});
