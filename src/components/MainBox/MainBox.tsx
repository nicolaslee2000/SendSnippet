import { useRef, useState } from "react";
import "./MainBox.css";
import { CSSTransition } from "react-transition-group";
import TabContainer from "../TabContainer/TabContainer";
import SendContent, {
  SendContentProps,
} from "../contents/SendContent/SendContent";
import ReceiveTab from "../tabs/ReceiveTab/ReceiveTab";
import ReceiveContent, {
  ReceiveContentProps,
} from "../contents/ReceiveContent/ReceiveContent";

/**
 *
 * Container for box where main logic starts
 * Shared states are usually stored here and passed unto children
 * contains TabContainer, Tab-content-container which stores sendContent and ReceiveContent
 */

// currently working tabs
export type tabs = "sendTab" | "receiveTab";

export default function MainBox() {
  //React transition group helper refs
  const sendRef = useRef(null);
  const receiveRef = useRef(null);

  // currently selected Tab
  const [currentTab, setCurrentTab] = useState<tabs>("sendTab");
  // switching between send tab and receive receive tab is prohibited when:
  //1. User has sent data and is waiting for receiving end
  //2. Data fetch(upload) request is ongoing
  const [isAllowTabSwitch, setIsAllowTabSwitch] = useState<boolean>(true);
  // text to send
  const [tts, setTts] = useState<string>("");
  // files to send
  const [filesToSend, setFilesToSend] = useState<File[]>([]);
  // received text
  const [receivedText, setReceivedText] = useState<string>("");
  // received files
  const [receivedFiles, setReceivedFiles] = useState<File[]>([]);

  const sendContentProps: SendContentProps = {
    tts,
    setTts,
    filesToSend,
    setFilesToSend,
    setIsAllowTabSwitch,
  };

  const receiveContentProps: ReceiveContentProps = {
    receivedText,
    setReceivedText,
    receivedFiles,
    setReceivedFiles,
    setIsAllowTabSwitch,
  };

  return (
    <div id="mainBox">
      <TabContainer
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        allowTabSwitch={isAllowTabSwitch}
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
            <ReceiveContent {...receiveContentProps} />
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
