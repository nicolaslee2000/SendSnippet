import { useEffect, useRef, useState } from "react";
import "./SendTab.css";
import Button from "../../buttons/Button";
import { CSSTransition } from "react-transition-group";
import QRCode from "react-qr-code";
import {
  unsubscribeDeleteEventListener,
  uploadText,
} from "../../../firebase/firebase";

export default function SendTab(props: any) {
  //temp start
  const qrlink = "https://sendsnippet.web.app/";
  //temp end
  const TIME_LIMIT = 600;
  const [tts, setTts] = useState("");
  const [noTextWarning, setNoTextWarning] = useState(false);
  const [counter, setCounter] = useState(TIME_LIMIT);
  const [code, setCode] = useState<string>();
  const status = props.status;
  const setStatus = props.setStatus;
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  let unsub: any = undefined;
  useEffect(() => {
    if (counter <= 0) {
      setNoTextWarning(false);
      setCounter(TIME_LIMIT);
      setStatus("idle");
    }
    const timer =
      status === "pending"
        ? counter > 0
          ? setInterval(() => setCounter(counter - 1), 1000)
          : undefined
        : undefined;
    return () => clearInterval(timer);
  }, [counter, status, setStatus]);
  useEffect(() => {
    return () => {
      if (unsub !== undefined && unsub !== null) {
        unsub();
      }
    };
  }, [unsub]);
  const handleTtsChange = (e: any) => {
    setTts(e.target.value);
  };
  const resetStates = () => {
    setNoTextWarning(false);
    setCounter(TIME_LIMIT);
  };
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
  const handleSend = async (e: any) => {
    let receivedKey: any;
    if (!tts) {
      setNoTextWarning(true);
      return;
    }
    try {
      receivedKey = await uploadText(tts);
      setCode(receivedKey);
    } catch (e) {
      console.log(e);
    }
    resetStates();
    props.setStatus("loading");

    await new Promise((res) => setTimeout(res, 1000));
    props.setStatus("pending");
    unsub = unsubscribeDeleteEventListener(receivedKey!, () => {
      handleCancel("a");
    });
  };
  const handleCancel = async (e: any) => {
    resetStates();
    props.setStatus("idle");
  };

  return (
    <div className="tab-content">
      <CSSTransition
        in={props.status !== "pending"}
        className="sendTab-content-transition-container"
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
              props.status === "loading" ? "loading" : ""
            }`}
            placeholder="text snippet to send"
            onFocus={handleFocus}
            disabled={props.status !== "idle"}
          ></textarea>
          {noTextWarning ? (
            <div className="noTextWarning">
              *type in/paste the text you want to send!
            </div>
          ) : (
            <></>
          )}

          <div className="sendButton-container">
            <Button
              text="Send"
              onClick={handleSend}
              loading={props.status === "loading"}
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
          {/* TODO: key expired alert message */}
          <div className="key-container">
            <div>Waiting...</div>
            <div>Enter the key on receiving device</div>
            <div>
              Expires in: {Math.floor(counter / 60)}:
              {counter - Math.floor(counter / 60) * 60}
            </div>
            {/* TODO: key copy on click */}
            <div>{code}</div>
            <div>
              <QRCode value={qrlink} size={50}></QRCode>
            </div>
          </div>
          <div className="cancelButton-container">
            <Button
              text="cancel"
              onClick={handleCancel}
              loading={props.status === "loading"}
              color="warn"
            />
          </div>
        </div>
      </CSSTransition>
    </div>
  );
}
