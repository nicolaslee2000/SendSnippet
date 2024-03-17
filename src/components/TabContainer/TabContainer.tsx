import React from "react";
import "./TabContainer.css";
import { status, tabs } from "../MainBox/MainBox";
import receiveIcon from "../../assets/icons/receiveIcon.png";
import sendIcon from "../../assets/icons/sendIcon.png";
import { SetState } from "../../types/SetState";
/**
 *
 * Container for navigation tabs
 */
export interface TabContainerProps {
  currentTab: tabs;
  setCurrentTab: SetState<tabs>;
  status: status;
}
export default function TabContainer({
  currentTab,
  setCurrentTab,
  status,
}: TabContainerProps) {
  const handleTabOnClick = (e: React.MouseEvent<HTMLElement>) => {
    setCurrentTab(e.currentTarget.id as tabs);
  };

  return (
    <div id="tab-container">
      <button
        className={`tab ${currentTab === "sendTab" ? "selected" : ""}`}
        id="sendTab"
        onClick={handleTabOnClick}
        disabled={status !== "idle"}
      >
        <img alt="SendIcon" src={sendIcon} className="tabIcon" />
        Send
      </button>
      <button
        className={`tab ${currentTab === "receiveTab" ? "selected" : ""}`}
        id="receiveTab"
        onClick={handleTabOnClick}
        disabled={status !== "idle"}
      >
        <img alt="ReceiveIcon" src={receiveIcon} className="tabIcon" />
        Receive
      </button>
    </div>
  );
}
