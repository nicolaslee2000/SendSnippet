import React from "react";
import "./tabContainer.css";
export default function tabContainer() {
  return (
    <div className="tabContainer">
      <ul id="tabContainer-tabNav">
        <li id="selected">
          <span>Send</span>
        </li>
        <li>
          <span>Receive</span>
        </li>
      </ul>
      <div id="tabContainer-tabContent">tabContainer</div>
    </div>
  );
}
