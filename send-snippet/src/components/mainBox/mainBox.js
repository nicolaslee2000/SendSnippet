import React from "react";
import "./mainBox.css";
import TabContainer from "../tabContainer/tabContainer";
export default function mainBox() {
  return (
    <div>
      <div className="mainBox-title">
        <h1>
          Send <em>Snippet</em>
        </h1>
      </div>
      <div id="tabContainer-container" >
      <TabContainer />

      </div>
    </div>
  );
}
