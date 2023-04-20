# How to run (update 20/04/2023)

- Front-end: using node v10.24.1
- Truffle: use latest node version
- Ganache: v7.7.7 (@ganache/cli: 0.8.6, @ganache/core: 0.8.6) or latest
- NodeJS (https://nodejs.org/en/) for build, test, and running Frontend application
- Metamask Chrome's extension for manage accounts and transations.

- Step 1: Open a Terminal, Run Ganache: ganache -d --acctKeys keys.json
- Step 2: Open other Terminal, `cd truffle` then `truffle console`
- Step 3: In truffle development enviroment: `networks --clean` then `migrate --reset`
- Step 4: Replace the Main Contract Address in `config.js` with new deployed address.
- Step 5: In another Terminal, check the version of Node, it should be v10.24.1
- Step 6: Execute `npm start` to run frontend.
- Step 7: Clear Metamask Activity log in order to reset nonce to match your local dev env (Ganache)
- Step 8: Explore Dapp

## Truffle configuration

Truffle environment is located in `truffle` directory, with predefined configures (`truffle-config.js`):

- Development network (using Ganache):
  - Host: 127.0.0.1 (aka `localhost`)
  - Port: 8545
  - Network Id: 1337
- Compiled Contracts Directory: `../contracts/` which is shared between `frontend` (Dapps) and `truffle`
- Complilers version: `^0.8.14`

You can change those configurations, and included it to your submission.

## Ganache configuration

Ganache's workspace should be created based on `truffle-config.js`.

Double check the RPC Address, Port and Network ID matching with Truffle config.

## MetaMask configuration

Add new Network by selecting `Custom RPC` with corresponding RPC Address, Port and Network ID.

Import user by input Private Key from Ganache.

# Deploy and Configure Frontend

Use truffle to complie and deploy the Main Contract.
Replace the Main Contract Address in `config.js` with new deployed address.

Execute `npm start` to run frontend.

# Frontend Development Guideline

All function connecting with Smart contract are located in `index.js` with `TODO:` prefix.

# Ganache-cli to save private key

ganache -d --acctKeys keys.json

# Reset network before start a new working env

truffle networks --clean
