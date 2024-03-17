import { useRef, useState } from "react";
import "./MainBox.css";
import ReceiveTab from "../tabs/ReceiveTab/ReceiveTab";
import SendTab from "../tabs/SendTab/SendTab";
import { CSSTransition } from "react-transition-group";
import download from "../../assets/icons/receiveIcon.png";
import send from "../../assets/icons/sendIcon.png";
import { Unsubscribe } from "firebase/firestore";
import TabContainer from "../TabContainer/TabContainer";

/**
 *
 * Container for box where main logic starts
 * Shared states are usually stored here and passed unto children
 */

// currently working tabs
export type tabs = "sendTab" | "receiveTab";

// global status state:
// when idle, all events possible.
// When loading, disable switching tabs, show spinner.
// When pending, disable switching tabs
export type status = "idle" | "loading" | "pending";

export default function MainBox() {
  // currently selected Tab
  const [currentTab, setCurrentTab] = useState<tabs>("sendTab");
  const [status, setStatus] = useState<status>("idle");

  const [tab, setTab] = useState(1);
  const [unsub, setUnsub] = useState<Unsubscribe>();
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  return (
    <div id="mainBox">
      <TabContainer
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        status={status}
      />
      {/* <div className="tabs">
        <input
          type="radio"
          checked={tab === 1}
          id="tab1"
          readOnly
          disabled={status !== "idle"}
          onClick={(e) => {
            setTab(1);
          }}
        />
        <label htmlFor="tab1" className="tab">
          <div
            style={{ alignItems: "center", display: "inline-flex", gap: "3px" }}
          >
            <img alt="Icon" src={send} width={24} height={24} />
            Send
          </div>
        </label>
        <input
          type="radio"
          id="tab2"
          readOnly
          checked={tab === 2}
          disabled={status !== "idle"}
          onClick={(e) => {
            setTab(2);
          }}
        />
        <label htmlFor="tab2" className="tab">
          <div
            style={{ alignItems: "center", display: "inline-flex", gap: "3px" }}
          >
            <img alt="Icon" src={download} width={24} height={24} />
            Receive
          </div>
        </label>
      </div> */}
      <div
        className="tabContent-container"
        style={tab === 1 ? { borderTopLeftRadius: 0 } : { borderRadius: "5px" }}
      >
        <div className="absolute-helper-container">
          {/* TODO: UseRef */}
          <CSSTransition
            in={tab === 1}
            timeout={300}
            classNames="tab-content-transition-container"
            unmountOnExit
            nodeRef={ref1}
          >
            <div ref={ref1}>
              <SendTab
                status={status}
                setStatus={setStatus}
                setUnsub={setUnsub}
                unsub={unsub}
              />
            </div>
          </CSSTransition>
          <CSSTransition
            in={tab === 2}
            timeout={300}
            classNames="tab-content-transition-container"
            unmountOnExit
            nodeRef={ref2}
          >
            <div ref={ref2}>
              <ReceiveTab
                status={status}
                setStatus={setStatus}
                unsub={unsub}
                setUnsub={setUnsub}
              />
            </div>
          </CSSTransition>
        </div>
      </div>
    </div>
  );
}
