import { MouseEvent, useEffect, useRef, useState } from "react";
import { SetState } from "../../types/SetState";
import { status } from "../MainBox/MainBox";
import "./SendContent.css";
import { CSSTransition } from "react-transition-group";
import Button from "../buttons/Button";
import QRCode from "react-qr-code";
import {
  deleteDocument,
  unsubscribeDeleteEventListener,
  uploadText,
} from "../../firebase/firebase";
import { Unsubscribe } from "firebase/firestore";

export interface SendContentProps {
  tts: string;
  setTts: SetState<string>;
  status: status;
  setStatus: SetState<status>;
}

/**
 *
 * Component to contain send window
 * contains 2 subwindows
 * 1. window input text to send, send button
 * 2. window show code, qr code to be given, cancel button
 */
export default function SendContent({
  tts,
  setTts,
  status,
  setStatus,
}: SendContentProps) {
  //DEVELOPMENT
  const qrlink = "https://sendsnippet.web.app/";

  //helper refs for react transition group
  const ref1 = useRef(null);
  const ref2 = useRef(null);

  //warning to indicate if send button clicked and no snippet present
  const noTextWarningRef = useRef<HTMLDivElement>(null);

  const TIME_LIMIT_MINUTES = 10;
  //Time limit for receiving documet. Default: 10 min
  const [timeLimit, setTimeLimit] = useState<number>(TIME_LIMIT_MINUTES * 60);

  //Starts timeLimit countdown when status changes to pending. Fires document expired event when timeLimit reaches 0
  useEffect(() => {
    if (timeLimit <= 0) {
      // TODO: document expired event
      setTimeLimit(TIME_LIMIT_MINUTES * 60);
      setStatus("idle");
    }
    const timer =
      status === "pending"
        ? timeLimit > 0
          ? setInterval(() => setTimeLimit(timeLimit - 1), 1000)
          : undefined
        : undefined;
    return () => clearInterval(timer);
  }, [timeLimit, status, setStatus]);
  // Key received after uploading document
  const [receivedKey, setReceivedKey] = useState<string>();

  // unsubscribe from onSnapshot when component unmounts
  let unsub: Unsubscribe | undefined;
  useEffect(() => {
    return () => {
      if (unsub !== undefined) {
        unsub();
      }
    };
  }, [unsub]);

  const handleTtsChange = (e: any) => {
    setTts(e.target.value);
  };
  // select all and paste from clipboard if browser supported
  const handleFocus = async (e: any) => {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch (err) {
      console.log("clipboard paste not supported");
    }
    if (e.target.value === "") {
      e.target.value = text;
    }
    e.target.select();
  };
  // callback to be fired when document on pending is downloaded by receiver
  const handleDocDeleted = () => {
    console.log("deleted");
  };
  // send button clicked
  const handleSend = async (e: any) => {
    // validate that text exists
    if (!tts) {
      noTextWarningRef.current!.innerHTML =
        "*type in/paste the text you want to send!";
      return;
    }
    setStatus("loading");
    try {
      // get key after uploading document
      const key = await uploadText(tts);
      setReceivedKey(key);
      unsub = unsubscribeDeleteEventListener(key!, handleDocDeleted);
    } catch (e) {
      console.error(e);
      setStatus("idle");
      return;
    }
    setStatus("pending");
  };
  // cancel button clicked
  const handleCancel = (e: MouseEvent<HTMLButtonElement>) => {
    deleteDocument(receivedKey);
    setStatus("idle");
  };

  return (
    <div id="sendContent">
      <CSSTransition
        in={status !== "pending"}
        className="idle-pending-transition-container"
        unmountOnExit
        timeout={300}
        nodeRef={ref1}
      >
        <div ref={ref1}>
          <textarea
            autoFocus
            value={tts}
            onChange={handleTtsChange}
            className={`sendTab-textarea ${
              status === "loading" ? "loading" : ""
            }`}
            placeholder="text snippet to send"
            onFocus={handleFocus}
            disabled={status !== "idle"}
          ></textarea>
          <div className="noTextWarning" ref={noTextWarningRef}></div>

          <div className="sendButton-container">
            <Button
              text="Send"
              onClick={handleSend}
              loading={status === "loading"}
            />
          </div>
        </div>
      </CSSTransition>
      <CSSTransition
        in={status === "pending"}
        className="idle-pending-transition-container"
        unmountOnExit
        timeout={300}
        nodeRef={ref2}
      >
        <div ref={ref2}>
          {/* TODO: key expired alert message */}
          <div className="key-container">
            <div>Waiting...</div>
            <div>Enter the key on receiving device</div>
            <div>
              Expires in: {Math.floor(timeLimit / 60)}:
              {timeLimit - Math.floor(timeLimit / 60) * 60}
            </div>
            {/* TODO: key copy on click */}
            <div>{receivedKey}</div>
            <div>
              <QRCode value={qrlink} size={50}></QRCode>
            </div>
          </div>
          <div className="cancelButton-container">
            <Button
              text="cancel"
              onClick={handleCancel}
              loading={status === "loading"}
              color="warn"
            />
          </div>
        </div>
      </CSSTransition>
    </div>
  );
}
