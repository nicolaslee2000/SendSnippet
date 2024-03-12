import { useRef, useState } from "react";
import "./ReceiveTab.css";
import { CSSTransition } from "react-transition-group";
import Button from "../../buttons/Button";
import downloadIcon from "../../../assets/icons/downloadIcon24.png";
import AlertCopied from "../../AlertCopied/AlertCopied";
import PincodeInput from "../../PincodeInput/PincodeInput";

export default function ReceiveTab(props: any) {
  const DIGIT = 4;
  const status = props.status;
  const setStatus = props.setStatus;
  const [digitKey, setDigitKey] = useState(Array(DIGIT).fill(""));
  const [copied, setCopied] = useState(false);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const refAlert = useRef(null);
  const handleDownload = async (e: any) => {
    setStatus("pending");
    resetStates();
    setCopied(true);
  };
  const handleOk = (e: any) => {
    setStatus("idle");
    resetStates();
  };
  const resetStates = () => {
    setDigitKey(Array(DIGIT).fill(""));
    setCopied(false);
  };
  return (
    <div className="tab-content" id="receiveTab-container">
      <CSSTransition
        in={copied}
        unmountOnExit
        timeout={300}
        nodeRef={refAlert}
        className="alert-copied-transition-container"
      >
        <div ref={refAlert} className="alertCopied-container">
          <AlertCopied setCopied={setCopied} />
        </div>
      </CSSTransition>
      <CSSTransition
        in={status !== "pending"}
        className="sendTab-content-transition-container"
        unmountOnExit
        timeout={300}
        nodeRef={ref1}
      >
        <div ref={ref1}>
          <div className="receive-key-container">
            <PincodeInput
              digitKey={digitKey}
              setDigitKey={setDigitKey}
              DIGIT={DIGIT}
            />
          </div>
          {/* TODO: download on enter */}
          <div className="sendButton-container">
            <Button
              text=""
              icon={downloadIcon}
              loading={props.status === "loading"}
              onClick={handleDownload}
            />
          </div>
        </div>
      </CSSTransition>
      <CSSTransition
        in={props.status === "pending"}
        className="sendTab-content-transition-container"
        unmountOnExit
        timeout={300}
        nodeRef={ref2}
      >
        <div ref={ref2}>
          <div className="key-container"></div>
          {/* TODO: open link option */}
          <div className="cancelButton-container">
            <Button
              text="OK"
              loading={props.status === "loading"}
              onClick={handleOk}
            />
          </div>
        </div>
      </CSSTransition>
    </div>
  );
}
