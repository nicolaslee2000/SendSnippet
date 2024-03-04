import React from "react";
import MainBox from "../mainBox/mainBox";
import icon from "../../assets/icons/github.png";
import "./layout.css";
export default function layout() {
  return (
    <div id="layout-container">
      <MainBox />
      <div id="footer">
        <a href="https://github.com/nicolaslee2000/SendSnippet">
          <img src={icon} alt="Icon" />
        </a>
      </div>
    </div>
  );
}
