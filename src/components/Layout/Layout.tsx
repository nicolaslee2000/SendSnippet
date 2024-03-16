import icon from "../../assets/icons/github.png";
import "./Layout.css";
import MainBox from "../MainBox/MainBox";
export default function Layout() {
  const GITHUB_LINK = "https://github.com/nicolaslee2000/SendSnippet";
  const githubIconSize = 30;
  return (
    <div id="layout-container">
      <MainBox />
      <div id="footer">
        <a href={GITHUB_LINK} target="_blank" rel="noreferrer">
          <img
            src={icon}
            alt="Icon"
            width={githubIconSize}
            height={githubIconSize}
          />
        </a>
      </div>
    </div>
  );
}
