import { useRef, useState } from "react";
import "./MainBox.css";
import SendTab from "../tabs/SendTab/SendTab";
import { CSSTransition } from "react-transition-group";
import download from "../../assets/icons/receiveIcon.png";
import send from "../../assets/icons/sendIcon.png";
import { Unsubscribe } from "firebase/firestore";
import TabContainer from "../TabContainer/TabContainer";
import SendContent, { SendContentProps } from "../contents/SendContent";
import ReceiveTab from "../tabs/ReceiveTab/ReceiveTab";

/**
 *
 * Container for box where main logic starts
 * Shared states are usually stored here and passed unto children
 * contains TabContainer, Tab-content-container which stores sendContent and ReceiveContent
 */

// currently working tabs
export type tabs = "sendTab" | "receiveTab";

// global status state:
// when idle, all events possible.
// When loading, disable switching tabs, show spinner.
// When pending, disable switching tabs
export type status = "idle" | "loading" | "pending";

export default function MainBox() {
  //React transition group helper refs
  const sendRef = useRef(null);
  const receiveRef = useRef(null);

  // currently selected Tab
  const [currentTab, setCurrentTab] = useState<tabs>("sendTab");
  const [status, setStatus] = useState<status>("idle");
  // text to send
  const [tts, setTts] = useState<string>("");
  // received text
  const [receivedText, setReceivedText] = useState<string>("");

  const sendContentProps: SendContentProps = {
    tts,
    setTts,
    status,
    setStatus,
  };

  return (
    <div id="mainBox">
      <TabContainer
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        status={status}
      />
      <div
        id="content-container"
        style={
          currentTab === "sendTab"
            ? { borderTopLeftRadius: 0 }
            : { borderRadius: "5px" }
        }
      >
        <CSSTransition
          in={currentTab === "sendTab"}
          timeout={300}
          classNames="send-content-transition-container"
          unmountOnExit
          nodeRef={sendRef}
        >
          <div ref={sendRef} className="transition-container">
            <SendContent {...sendContentProps} />
          </div>
        </CSSTransition>
        <CSSTransition
          in={currentTab === "receiveTab"}
          timeout={300}
          classNames="receive-content-transition-container"
          unmountOnExit
          nodeRef={receiveRef}
        >
          <div ref={receiveRef} className="transition-container">
            <ReceiveTab status={status} setStatus={setStatus} />
          </div>
        </CSSTransition>
      </div>
      {/* <div
        className="tabContent-container"
        style={
          currentTab === "sendTab"
            ? { borderTopLeftRadius: 0 }
            : { borderRadius: "5px" }
        }
      >
        <div className="absolute-helper-container">
          <CSSTransition
            in={currentTab === "sendTab"}
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
            in={currentTab === "receiveTab"}
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
      </div> */}
    </div>
  );
}
