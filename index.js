import { app, h } from "hyperapp";
import { Link, Route, location } from "@hyperapp/router";
import { Products } from "./pages/products";
import { Sidebar } from "./pages/sidebar";
import { Participants } from "./pages/participants";
import { config } from "./config";
import { promisify } from "util";
import "./css/vendor/bootstrap.css";
import "./css/vendor/coreui.css";
import "./css/index.css";

import Main from "./contracts/Main.json";
import Session from "./contracts/Session.json";

const Fragment = (props, children) => children;

const Web3 = require("web3");
let web3js;

if (window.ethereum) {
  web3js = new Web3(window.ethereum);
} else if (window.web3) {
  web3js = new Web3(window.web3.currentProvider || "http://localhost:8545");
} else {
  console.log("No Web3 detected!");
}
//Function to handle account change
function handleAccountsChanged(accounts) {
  web3js.eth.defaultAccount = accounts[0];
  window.location.reload();
}

const mainContract = new web3js.eth.Contract(Main.abi, config.mainContract);

var state = {
  count: 1,
  location: location.state,
  products: [],
  dapp: {},
  balance: 0,
  account: 0,
  admin: null,
  profile: null,
  fullname: "",
  email: "".replace,
  newProduct: {},
  sessions: [],
  currentProductIndex: 0,
};

// Functions of Main Contract
const contractFunctions = {
  getAccounts: promisify(web3js.eth.getAccounts),
  getBalance: promisify(web3js.eth.getBalance),

  // TODO: The methods' name is for referenced. Update to match with your Main contract

  // Get Admin address of Main contract
  getAdmin: mainContract.methods.admin().call,

  // Get participant by address
  participants: (address) => mainContract.methods.participants(address).call,

  // Get number of participants
  nParticipants: mainContract.methods.nParticipants().call,

  // Get address of participant by index (use to loop through the list of participants)
  iParticipants: (index) => mainContract.methods.iParticipants(index).call,

  // Register new participant
  register: (fullname, email, address) =>
    mainContract.methods
      .register(fullname, email)
      .send({ from: address, gas: 15000000, gasPrice: "2000000000" }),

  // Get number of sessions
  nSessions: mainContract.methods.nSessions().call,

  // Get address of session by index (use to loop through the list of sessions)
  sessions: (index) => mainContract.methods.sessions(index).call,
};

const actions = {
  removeEventHandler: () => () => {
    window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  },

  eventHandler: () => () => {
    window.ethereum.on("accountsChanged", handleAccountsChanged);
  },

  inputProfile:
    ({ field, value }) =>
    (state) => {
      let profile = { ...state.profile } || {};
      profile[field] = value;
      return {
        ...state,
        profile,
      };
    },

  inputNewProduct:
    ({ field, value }) =>
    (state) => {
      let newProduct = { ...state.newProduct } || {};
      newProduct[field] = value;
      return {
        ...state,
        newProduct,
      };
    },

  createProduct: () => async (state, actions) => {
    //New session from Main
    try {
      await mainContract.methods
        .addSession(
          mainContract.options.address,
          state.newProduct.name,
          state.newProduct.description,
          state.newProduct.image
        )
        .send({ from: state.admin, gas: 15000000, gasPrice: "2000000000" });
    } catch (error) {
      console.log("Error createProduct: ", error);
    }
    actions.getSessions();
  },

  selectProduct: (i) => (state) => {
    return {
      currentProductIndex: i,
    };
  },

  sessionFn:
    ({ action, data }) =>
    async (state, {}) => {
      let sessionAddr = state.sessions[state.currentProductIndex].id;
      let sessionInstance = new web3js.eth.Contract(Session.abi, sessionAddr);

      switch (action) {
        case "start":
          //TODO: Handle event when User Start a new session
          try {
            let sessionStartedEvent =
              await sessionInstance.events.SessionStarted();
            sessionStartedEvent.on("data", (event) => {
              console.log(
                "sessionStartedEvent event emitted: ",
                event.returnValues
              );
            });

            await sessionInstance.methods.startSession().send({
              from: state.admin,
              gas: 15000000,
              gasPrice: "2000000000",
            });
          } catch (error) {
            console.log(error);
          }
          break;

        case "stop":
          //TODO: Handle event when User Stop a session
          try {
            let sessionStoppeddEvent =
              await sessionInstance.events.SessionStopped();
            sessionStoppeddEvent.on("data", (event) => {
              console.log(
                "sessionStoppeddEvent event emitted: ",
                event.returnValues
              );
            });

            await sessionInstance.methods.stopSession().send({
              from: state.admin,
              gas: 15000000,
              gasPrice: "2000000000",
            });
          } catch (error) {
            console.log(error);
          }
          break;

        case "pricing":
          //TODO: Handle event when User Pricing a product
          //The inputed Price is stored in `data`
          try {
            let sessionPricingEvent =
              await sessionInstance.events.SessionPricing();
            sessionPricingEvent.on("data", (event) => {
              console.log("SessionPricing event emitted: ", event.returnValues);
            });

            await sessionInstance.methods.pricingSession(Number(data)).send({
              from: state.account,
              gas: 15000000,
              gasPrice: "2000000000",
            });
          } catch (error) {
            console.log(error);
          }
          break;

        case "close":
          //TODO: Handle event when User Close a session
          //The inputed Price is stored in `data`
          try {
            let sessionClosedEvent = sessionInstance.events.SessionClosed();
            sessionClosedEvent.on("data", (event) => {
              console.log(
                "sessionClosedEvent event emitted: ",
                event.returnValues
              );
            });

            await sessionInstance.methods.closeSession(Number(data)).send({
              from: state.admin,
              gas: 15000000,
              gasPrice: "2000000000",
            });
          } catch (error) {
            console.log(error);
          }
          break;

        default:
          throw console.error("Unknown action!");
      }
    },

  location: location.actions,

  getAccount: () => async (state, actions) => {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    let accounts = await contractFunctions.getAccounts();
    let balance = await contractFunctions.getBalance(accounts[0]);
    let admin = await contractFunctions.getAdmin();
    let profile = await contractFunctions.participants(accounts[0]).call();
    profile = {
      address: profile.account,
      fullname: profile.name,
      email: profile.email,
      nSessions: profile.bidCount,
      deviation: profile.bidDeviation,
    };

    actions.setAccount({
      account: accounts[0],
      balance,
      isAdmin: admin === accounts[0],
      admin,
      profile,
    });
  },
  setAccount:
    ({ account, balance, isAdmin, admin, profile }) =>
    (state) => {
      return {
        ...state,
        account: account,
        balance: balance,
        isAdmin: isAdmin,
        admin: admin,
        profile,
      };
    },

  getParticipants: () => async (state, actions) => {
    let participants = [];

    // TODO: Load all participants from Main contract.
    // One participant should contain { address, fullname, email, nSession and deviation }
    let noOfParticipant = await contractFunctions.nParticipants();
    for (let i = 0; i < noOfParticipant; i++) {
      let parAddr = await contractFunctions.iParticipants(i).call();
      let participantInfo = await contractFunctions
        .participants(parAddr)
        .call();
      let participant = {
        address: participantInfo.account,
        fullname: participantInfo.name,
        email: participantInfo.email,
        nSessions: participantInfo.bidCount,
        deviation: participantInfo.bidDeviation,
      };
      participants.push(participant);
    }

    actions.setParticipants(participants);
  },

  setParticipants: (participants) => (state) => {
    return {
      ...state,
      participants: participants,
    };
  },

  register: () => async (state, actions) => {
    console.log("state", state);
    // TODO: Register new participant
    await contractFunctions.register(
      state.profile.fullname,
      state.profile.email,
      state.account
    );

    let profile = {};
    // TODO: And get back the information of created participant
    let participant = await contractFunctions
      .participants(state.account)
      .call();

    profile = {
      address: participant.account,
      fullname: participant.name,
      email: participant.email,
      nSessions: participant.bidCount,
      deviation: participant.bidDeviation,
    };

    actions.setProfile(profile);
  },

  setProfile: (profile) => (state) => {
    return {
      ...state,
      profile: profile,
    };
  },

  getSessions: () => async (state, actions) => {
    // TODO: Get the number of Sessions stored in Main contract
    let nSession = await contractFunctions.nSessions();
    let sessions = [];

    // TODO: And loop through all sessions to get information

    for (let index = 0; index < nSession; index++) {
      // Get session address
      let session = await contractFunctions.sessions(index).call();
      // Load the session contract instance on network
      let contract = new web3js.eth.Contract(Session.abi, session);

      let id = session; //use addr as an ID

      // TODO: Load information of session.
      // Hint: - Call methods of Session contract to reveal all nessesary information
      //       - Use `await` to wait the response of contract

      let name = ""; // TODO
      let description = ""; // TODO
      let image = ""; // TODO
      let price = 0; // TODO
      let finalPrice = 0; // TODO
      let status = "";

      let sessionInfo = await contract.methods.getSessionInfo().call();
      let accounts = await contractFunctions.getAccounts();
      let admin = await contractFunctions.getAdmin();

      // if (accounts[0] !== admin) {
      let bidderId = await contract.methods.getBidderId(accounts[0]).call();
      let bidderInfo = await contract.methods.getBidderInfo(bidderId).call();
      price = bidderInfo.price;
      // } else {
      // }

      name = sessionInfo.product.name;
      description = sessionInfo.product.description;
      image = sessionInfo.product.imageHashes;

      switch (sessionInfo.currentState) {
        case "0":
          status = "CREATE";
          break;
        case "1":
          status = "START";
          break;
        case "2":
          status = "PRICING";
          break;
        case "3":
          status = "STOP";
          break;
        case "4":
          status = "CLOSED";
          price = sessionInfo.suggestedPrice;
          finalPrice = sessionInfo.finalPrice;
          break;
        default:
          throw console.error("Unknown state!");
      }

      sessions.push({
        id,
        name,
        description,
        price,
        finalPrice,
        contract,
        image,
        status,
      });
    }
    actions.setSessions(sessions);
  },

  setSessions: (sessions) => (state) => {
    return {
      ...state,
      sessions: sessions,
    };
  },
};

const view = (
  state,
  {
    getAccount,
    getParticipants,
    register,
    inputProfile,
    getSessions,
    eventHandler,
    removeEventHandler,
  }
) => {
  return (
    <body
      class="app sidebar-show sidebar-fixed"
      oncreate={() => {
        getAccount();
        getParticipants();
        getSessions();
        eventHandler();
      }}
      onbeforeunload={() => {
        removeEventHandler();
      }}
    >
      <div class="app-body">
        <Sidebar
          balance={state.balance}
          account={state.account}
          isAdmin={state.isAdmin}
          profile={state.profile}
          register={register}
          inputProfile={inputProfile}
        ></Sidebar>
        <main class="main d-flex p-3">
          <div class="h-100  w-100">
            <Route path="/products" render={Products}></Route>
            <Route path="/participants" render={Participants}></Route>
          </div>
        </main>
      </div>
    </body>
  );
};
const el = document.body;

const main = app(state, actions, view, el);
const unsubscribe = location.subscribe(main.location);
