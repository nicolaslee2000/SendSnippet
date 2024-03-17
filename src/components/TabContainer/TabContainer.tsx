import React from "react";
import "./TabContainer.css";
import { tabs } from "../MainBox/MainBox";
import receiveIcon from "../../assets/icons/receiveIcon.png";
import sendIcon from "../../assets/icons/sendIcon.png";
/**
 *
 * Container for navigation tabs
 */
export interface TabContainerProps {
  currentTab: tabs;
  setCurrentTab: React.Dispatch<React.SetStateAction<tabs>>;
}
export default function TabContainer({
  currentTab,
  setCurrentTab,
}: TabContainerProps) {
  const handleTabOnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setCurrentTab(e.currentTarget.id as tabs);
  };

  return (
    <div id="tab-container">
      <button
        className={`tab ${currentTab === "sendTab" ? "checked" : ""}`}
        id="sendTab"
        onClick={handleTabOnClick}
      >
        <img alt="SendIcon" src={sendIcon} className="tabIcon" />
        Send
      </button>
      <button
        className={`tab ${currentTab === "receiveTab" ? "checked" : ""}`}
        id="receiveTab"
        onClick={handleTabOnClick}
      >
        <img alt="ReceiveIcon" src={receiveIcon} className="tabIcon" />
        Receive
      </button>
      {/* 
      <input
        type="radio"
        id="tab1"
        readOnly
        disabled={status !== "idle"}
        onClick={(e) => {
          setTab(1);
        }}
      />
      <label htmlFor="tab1" className="tab">
        <div
          style={{ alignItems: "center", display: "inline-flex", gap: "3px" }}
        >
          <img alt="Icon" src={send} width={24} height={24} />
          Send
        </div>
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
        <div
          style={{ alignItems: "center", display: "inline-flex", gap: "3px" }}
        >
          <img alt="Icon" src={download} width={24} height={24} />
          Receive
        </div>
      </label> */}
    </div>
  );
}
