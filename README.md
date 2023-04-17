# How to run (update 05/04/2023)

- Front-end: using node v10.24.1
- Truffle: use latest node version
- Ganache: v7.7.7 (@ganache/cli: 0.8.6, @ganache/core: 0.8.6) or latest

# Prerequisite

- Ganache (https://www.trufflesuite.com/ganache) for Running local Ethereum network
- NodeJS (https://nodejs.org/en/) for build, test, and running Frontend application
- Truffle (https://www.trufflesuite.com/truffle) for compile and deploy Smart contract
- Metamask Chrome's extension for manage accounts and transations.

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
