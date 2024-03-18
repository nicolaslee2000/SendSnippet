import { useEffect, useRef, useState } from "react";
import "./ReceiveContent.css";
import { CSSTransition } from "react-transition-group";
import Button from "../../buttons/Button";
import downloadIcon from "../../../assets/icons/downloadIcon.png";
import AlertCopied from "../../AlertCopied/AlertCopied";
import PincodeInput from "../../PincodeInput/PincodeInput";
import { downloadFiles, readText } from "../../../firebase/firebase";
import CopyButton from "../../buttons/CopyButton/CopyButton";
import { SetState } from "../../../types/SetState";

export interface ReceiveContentProps {
  receivedText: string;
  setReceivedText: SetState<string>;
  receivedFiles: File[];
  setReceivedFiles: SetState<File[]>;
  setIsAllowTabSwitch: SetState<boolean>;
}

export default function ReceiveContent({
  receivedText,
  setReceivedText,
  setIsAllowTabSwitch,
}: ReceiveContentProps) {
  const [display, setDisplay] = useState<"enterKey" | "downloadDocuments">(
    "enterKey"
  );
  const [isLoading, setIsLoading] = useState(false);
  // if window is sent or it is loading, disallow tab switch
  useEffect(() => {
    setIsAllowTabSwitch(!isLoading);
  }, [isLoading, setIsAllowTabSwitch]);

  const DIGIT = 4;
  const [digitKey, setDigitKey] = useState<string[]>(Array(DIGIT).fill(""));
  const [copied, setCopied] = useState(false);
  //for shake animation when entered with wrong/incomplete key
  const [shake, setShake] = useState(false);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const refAlert = useRef(null);
  const handleDownload = async (e: any) => {
    // FIX dont check returned text before validating digitkey
    setIsLoading(true);
    const returnedText = await readText(digitKey.join(""));
    setIsLoading(false);
    if (!/^\d{4}$/.test(digitKey.join("")) || returnedText === null) {
      setShake(true);
      return;
    }
    setReceivedText(returnedText!);
    setCopied(false);
    setDisplay("downloadDocuments");
  };
  const handleOk = (e: any) => {
    setCopied(false);
    setDisplay("enterKey");
  };
  const copy = () => {
    setCopied(true);
    navigator.clipboard.writeText(receivedText);
  };
  const handleDownloadFile = async () => {
    setIsLoading(true);
    try {
      const returnedText = await readText(digitKey.join(""));
      setReceivedText(returnedText!);
      setCopied(false);
      setIsLoading(false);
      setDisplay("downloadDocuments");
    } catch (e) {
      await downloadFiles(digitKey.join(""));
      // ERROR HANDLING
      setIsLoading(false);
      setDisplay("downloadDocuments");
    }
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
        in={display === "enterKey"}
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
              shake={shake}
              setShake={setShake}
              handleDownload={handleDownloadFile}
            />
          </div>
          {/* TODO: download on enter */}
          <div className="sendButton-container">
            <Button
              text=""
              icon={downloadIcon}
              isLoading={isLoading}
              onClick={handleDownloadFile}
            />
          </div>
        </div>
      </CSSTransition>
      <CSSTransition
        in={display === "downloadDocuments"}
        className="sendTab-content-transition-container"
        unmountOnExit
        timeout={300}
        nodeRef={ref2}
      >
        <div ref={ref2}>
          <div className="key-container2" id="keycontainertemp">
            <textarea
              autoFocus
              value={receivedText}
              className={`receiveTab-textarea`}
              readOnly
              onFocus={(e) => e.target.select()}
            ></textarea>
            <CopyButton copyText={copy} />
          </div>
          <a href="https://www.google.com" rel="noreferrer" target="_blank">
            Open Link
          </a>
          {/* TODO: open link option */}
          <div className="cancelButton-container">
            <Button text="OK" isLoading={isLoading} onClick={handleOk} />
          </div>
        </div>
      </CSSTransition>
    </div>
  );
}
