import icon from "../../assets/icons/github.png";
import "./Layout.css";
import MainBox from "../MainBox/MainBox";

/**
 *
 * root component to be rendered on app. Contains mainbox and footer.
 */
export default function Layout() {
  const GITHUB_LINK = "https://github.com/nicolaslee2000/SendSnippet";
  const githubIconSize = 30;

  return (
    <div id="main-layout-container">
      <div id="header">
        <div id="title">
          Send <em>Snippet</em>
        </div>
      </div>
      <div id="mainBox-container">
        <MainBox />
      </div>
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
