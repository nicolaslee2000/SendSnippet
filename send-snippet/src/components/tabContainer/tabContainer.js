import React, { useState } from "react";
import "./TabContainer.css";
import ReceiveTab from "../tabs/ReceiveTab/ReceiveTab";
import SendTab from "../tabs/SendTab/SendTab";

export default function TabContainer() {
  const [activeTab, setActiveTab] = useState("tab1");
  return (
    <div className="tabContainer">
      <div className="tabContainer tabContainer-effect-slide-top tabContainer-theme-1">
        <input
          type="radio"
          name="tabContainer"
          checked
          id="tab1"
          className="tab-content-first"
        />
        <label htmlFor="tab1">
          <i className="icon-bolt"></i>Send
        </label>

        <input
          type="radio"
          name="tabContainer"
          id="tab2"
          className="tab-content-2"
        />
        <label htmlFor="tab2">
          <i className="icon-picture"></i>Receive
        </label>
        <div className="tab-content-container">
          {activeTab === "tab1" ? <SendTab /> : <ReceiveTab />}
        </div>
        {/* <ul>
          <li className="tab-content tab-content-first typography">
            <textarea></textarea>
            <button>Send</button>
            <button>Reset</button>
          </li>

          <li className="tab-content tab-content-2 typography">
            <input type="text" placeholder="code" />
            <button>download</button>
          </li>
        </ul> */}
      </div>
    </div>
  );
}
