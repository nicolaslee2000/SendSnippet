import React, { useState } from "react";
import "./TabContainer.css";
import ReceiveTab from "../tabs/ReceiveTab/ReceiveTab";
import SendTab from "../tabs/SendTab/SendTab";

export default function TabContainer() {
  //idle, pending, loading
  const [status, setStatus] = useState("idle");
  const [tab, setTab] = useState(1);
  return (
    <div className="tabs-container tabContainer-effect-scale">
      <div className="tabs">
        <input
          type="radio"
          checked={tab === 1}
          id="tab1"
          readOnly
          disabled={status !== "idle"}
          onClick={(e) => {
            setTab(1);
          }}
        />
        <label htmlFor="tab1" className="tab">
          Send
        </label>
        <input
          type="radio"
          id="tab2"
          readOnly
          checked={tab === 2}
          disabled={status !== "idle"}
          onClick={(e) => {
            setTab(2);
          }}
        />
        <label htmlFor="tab2" className="tab">
          Receive
        </label>
      </div>
      <div
        className="tabContent-container"
        style={tab === 1 ? { borderTopLeftRadius: 0 } : { borderRadius: "5px" }}
      >
        {tab === 1 ? (
          <SendTab status={status} setStatus={setStatus} />
        ) : (
          <ReceiveTab status={status} setStatus={setStatus} />
        )}
      </div>
      {/* <ul>
        <li className="tab-content-first">
          <SendTab status={status} setStatus={setStatus} />
        </li>

        <li className="tab-content-2">
          <ReceiveTab status={status} setStatus={setStatus} />
        </li>
      </ul> */}
    </div>
  );
}
