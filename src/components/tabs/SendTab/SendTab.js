import React, { useState } from "react";
import "./SendTab.css";
import Button from "../../buttons/Button";
import { CSSTransition } from "react-transition-group";

export default function SendTab(props) {
  const [tts, setTts] = useState("");
  const handleTtsChange = (e) => {
    setTts(e.target.value);
  };
  const handleFocus = async (e) => {
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
  return (
    <div className="tab-content">
      <CSSTransition
        in={props.status !== "pending"}
        className="sendTab-content-transition-container"
        unmountOnExit
        timeout={300}
      >
        <div>
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
          <div className="sendButton-container">
            <Button
              text="Send"
              onClick={async () => {
                props.setStatus("loading");
                await new Promise((res) => setTimeout(res, 2000));
                props.setStatus("pending");
              }}
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
      >
        <div>
          <div className="key-container">waiting</div>
          <div className="cancelButton-container">
            <Button
              text="cancel"
              onClick={async () => {
                props.setStatus("idle");
              }}
              loading={props.status === "loading"}
              color="warn"
            />
          </div>
        </div>
      </CSSTransition>

      {/* <Button
        text="Cancel"
        onClick={() => {
          props.setStatus("idle");
        }}
      /> */}
    </div>
  );
}
