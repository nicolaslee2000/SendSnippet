import React, { useState } from "react";
import "./SendTab.css";
import Button from "../../buttons/Button";

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
      {props.status !== "sent" ? (
        <textarea
          autoFocus
          value={tts}
          onChange={handleTtsChange}
          className={`sendTab-textarea ${
            props.status !== "idle" ? "loading" : ""
          }`}
          placeholder="text snippet to send"
          onFocus={handleFocus}
          disabled={props.status !== "idle"}
        ></textarea>
      ) : (
        <div className="key-container">waiting</div>
      )}

      {props.status !== "sent" ? (
        <div className="sendButton-container">
          <Button
            text="Send"
            onClick={async () => {
              props.setStatus("sendLoading");
              await new Promise((res) => setTimeout(res, 2000));
              props.setStatus("sent");
            }}
            loading={props.status === "sendLoading"}
          />
        </div>
      ) : (
        <div className="cancelButton-container">
          <Button
            text="cancel"
            onClick={async () => {
              props.setStatus("idle");
            }}
            loading={props.status === "sendLoading"}
            color="warn"
          />
        </div>
      )}

      {/* <Button
        text="Cancel"
        onClick={() => {
          props.setStatus("idle");
        }}
      /> */}
    </div>
  );
}
