import * as React from "react";
import * as ReactDOM from "react-dom";
import { StreamView } from "../.";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { PontemWallet } from '@pontem/wallet-adapter-plugin';
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";

const App = () => {
  return (
    <div>
      <StreamView roomId="#group39:main.cafeteria.gg"/>
    </div>
  )
};

ReactDOM.render(<App />, document.getElementById("root"));
