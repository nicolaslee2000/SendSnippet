import "./MainBox.css";
import TabContainer from "../TabContainer/TabContainer";

/**
 *
 * container for
 */
export default function MainBox() {
  return (
    <div id="mainBox-container">
      <div id="tabContainer-container">
        <TabContainer />
      </div>
    </div>
  );
}
