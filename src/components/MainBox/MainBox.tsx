import * as React from "react";
import "./MainBox.css";
import TabContainer from "../TabContainer/TabContainer";
export default function MainBox() {
  return (
    <div>
      <div className="mainBox-title">
        <h1>
          Send <em>Snippet</em>
        </h1>
      </div>
      <div id="tabContainer-container">
        <TabContainer />
      </div>
    </div>
  );
}
