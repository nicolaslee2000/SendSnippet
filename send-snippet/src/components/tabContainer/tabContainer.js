import React, { useState } from "react";
import "./TabContainer.css";
import ReceiveTab from "../tabs/ReceiveTab/ReceiveTab";
import SendTab from "../tabs/SendTab/SendTab";

export default function TabContainer() {
  const [status, setStatus] = useState("idle");
  return (
    <div className="tabContainer">
      <div className="tabContainer tabContainer-effect-scale">
        <input
          type="radio"
          name="tabContainer"
          checked
          id="tab1"
          className="tab-content-first"
          readOnly
          disabled={status !== "idle"}
        />
        <label htmlFor="tab1">
          <i className="icon-bolt"></i>Send
        </label>

        <input
          type="radio"
          name="tabContainer"
          id="tab2"
          className="tab-content-2"
          readOnly
          disabled={status !== "idle"}
        />
        <label htmlFor="tab2">
          <i className="icon-picture"></i>Receive
        </label>

        <ul>
          <li className="tab-content-first">
            <SendTab status={status} setStatus={setStatus} />
          </li>

          <li className="tab-content-2">
            <ReceiveTab status={status} setStatus={setStatus} />
          </li>
        </ul>
      </div>
    </div>
  );
}
