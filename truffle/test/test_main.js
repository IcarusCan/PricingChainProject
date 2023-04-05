const Main = artifacts.require("Main");

contract("Main", function (accounts) {
  it("should assert true", async function () {
    await Main.deployed();
    return assert.isTrue(true);
  });
});
