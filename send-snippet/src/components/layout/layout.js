import React from "react";
import icon from "../../assets/icons/github.png";
import "./Layout.css";
import MainBox from "../MainBox/MainBox";
export default function Layout() {
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
