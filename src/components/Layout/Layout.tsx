import githubIcon from "../../assets/icons/githubIcon.png";
import "./Layout.css";
import MainBox from "../MainBox/MainBox";

/**
 *
 * root component to be rendered on app. Contains mainbox and footer.
 */
export default function Layout() {
  const GITHUB_LINK = "https://github.com/nicolaslee2000/SendSnippet";

  return (
    <div id="main-layout-container">
      <div id="header">
        <div id="title">
          S E N D&nbsp;&nbsp;S N I P P E T
        </div>
      </div>
      <div id="mainBox-container">
        <MainBox />
      </div>
      <div id="footer">
        <a href={GITHUB_LINK} target="_blank" rel="noreferrer">
          <img src={githubIcon} alt="Icon" id="githubIcon" />
        </a>
      </div>
    </div>
  );
}
