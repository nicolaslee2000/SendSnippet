import icon from "../../assets/icons/github.png";
import "./Layout.css";
import MainBox from "../MainBox/MainBox";
export default function Layout() {
  return (
    <div id="layout-container">
      <MainBox />
      <div id="footer">
        <a
          href="https://github.com/nicolaslee2000/SendSnippet"
          target="_blank"
          rel="noreferrer"
        >
          <img src={icon} alt="Icon" />
        </a>
      </div>
    </div>
  );
}
