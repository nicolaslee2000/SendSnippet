import { FocusEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { SetState } from "../../types/SetState";
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
import {
  CONTENT_TRANSITION_CONTAINER_CLASSNAME,
  TIME_LIMIT_SECONDS,
} from "../../constants/constants";

export interface SendContentProps {
  tts: string;
  setTts: SetState<string>;
  setAllowTabSwitch: SetState<boolean>;
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
  setAllowTabSwitch,
}: SendContentProps) {
  //DEVELOPMENT
  const qrlink = "https://sendsnippet.web.app/";

  //helper refs for react transition group
  const ref1 = useRef(null);
  const ref2 = useRef(null);

  //warning to indicate if send button clicked and no snippet present
  const noTextWarningRef = useRef<HTMLDivElement>(null);

  //Time limit for receiving documet. Default: 10 min
  const [timeLimit, setTimeLimit] = useState<number>(TIME_LIMIT_SECONDS);

  const [isLoading, setIsLoading] = useState(false);
  // toSend is default window with text area, sent is window on which key will be displayed
  const [display, setDisplay] = useState<"toSend" | "sent">("toSend");
  // if window is sent or it is loading, disallow tab switch
  useEffect(() => {
    setAllowTabSwitch(display !== "sent" && !isLoading);
  }, [display, isLoading, setAllowTabSwitch]);

  //Starts timeLimit countdown when status changes to pending. Fires document expired event when timeLimit reaches 0
  useEffect(() => {
    if (timeLimit <= 0) {
      // TODO: document expired event
      setTimeLimit(TIME_LIMIT_SECONDS);
      setDisplay("toSend");
    }
    const timer =
      display === "sent"
        ? timeLimit > 0
          ? setInterval(() => setTimeLimit(timeLimit - 1), 1000)
          : undefined
        : undefined;
    return () => clearInterval(timer);
  }, [timeLimit, display]);
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

  // select all and paste from clipboard if browser supported
  const handleFocus = async (e: FocusEvent<HTMLTextAreaElement>) => {
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
    setDisplay("toSend");
  };
  // send button clicked
  const handleSend = async (e: MouseEvent<HTMLButtonElement>) => {
    // validate that text exists
    if (!tts) {
      noTextWarningRef.current!.innerHTML =
        "*type in/paste the text you want to send!";
      return;
    }
    try {
      setIsLoading(true);
      // get key after uploading document
      const key = await uploadText(tts);
      setReceivedKey(key);
      unsub = unsubscribeDeleteEventListener(key!, handleDocDeleted);
    } catch (e) {
      console.error(e);
      setDisplay("toSend");
      return;
    }
    setIsLoading(false);
    setDisplay("sent");
  };
  // cancel button clicked
  const handleCancel = (e: MouseEvent<HTMLButtonElement>) => {
    deleteDocument(receivedKey);
    setDisplay("toSend");
  };

  return (
    <div id="sendContent">
      <CSSTransition
        in={display === "toSend"}
        className={CONTENT_TRANSITION_CONTAINER_CLASSNAME}
        unmountOnExit
        timeout={300}
        nodeRef={ref1}
      >
        <div ref={ref1} className={CONTENT_TRANSITION_CONTAINER_CLASSNAME}>
          <textarea
            autoFocus
            value={tts}
            onChange={(e) => {
              setTts(e.target.value);
            }}
            id="toSend-textarea"
            placeholder="text snippet to send"
            onFocus={handleFocus}
            disabled={isLoading}
          ></textarea>
          <div id="noTextWarning" ref={noTextWarningRef}></div>
          <div id="sendButton-container">
            <Button text="Send" onClick={handleSend} isLoading={isLoading} />
          </div>
        </div>
      </CSSTransition>
      <CSSTransition
        in={display === "sent"}
        className={CONTENT_TRANSITION_CONTAINER_CLASSNAME}
        unmountOnExit
        timeout={300}
        nodeRef={ref2}
      >
        <div ref={ref2} className={CONTENT_TRANSITION_CONTAINER_CLASSNAME}>
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
              isLoading={isLoading}
              color="warn"
            />
          </div>
        </div>
      </CSSTransition>
    </div>
  );
}
