import React, { useEffect, useRef, useState } from "react";
import "./ReceiveTab.css";
import { CSSTransition } from "react-transition-group";
import Button from "../../buttons/Button";

export default function ReceiveTab(props) {
  const status = props.status;
  const setStatus = props.setStatus;
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  return (
    <div className="tab-content" id="receiveTab-container">
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
            className={`sendTab-textarea ${
              props.status === "loading" ? "loading" : ""
            }`}
            placeholder="text snippet to send"
            disabled={props.status !== "idle"}
          ></textarea>

          <div className="sendButton-container">
            <Button text="Send" loading={props.status === "loading"} />
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
          <div className="cancelButton-container">
            <Button
              text=""
              icon="../../../assets/icons/downloadIcon24.png"
              loading={props.status === "loading"}
              color="warn"
            />
          </div>
        </div>
      </CSSTransition>
    </div>
  );
}
