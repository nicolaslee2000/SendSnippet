import React, { useRef, useState } from "react";
import "./TabContainer.css";
import ReceiveTab from "../tabs/ReceiveTab/ReceiveTab";
import SendTab from "../tabs/SendTab/SendTab";
import { CSSTransition, Transition } from "react-transition-group";

export default function TabContainer() {
  //idle, pending, loading
  const [status, setStatus] = useState("idle");
  const [tab, setTab] = useState(1);
  const [inProp, setInProp] = useState(false);
  const nodeRef1 = useRef(null);
  const nodeRef2 = useRef(null);
  const duration = 300;

  const defaultStyle = {
    transition: `opacity ${duration}ms ease-in-out`,
    opacity: 0,
  };

  const transitionStyles = {
    entering: { opacity: 1 },
    entered: { opacity: 1 },
    exiting: { opacity: 0 },
    exited: { opacity: 0 },
  };
  return (
    <div className="tabs-container">
      <div className="tabs">
        <input
          type="radio"
          checked={tab === 1}
          id="tab1"
          readOnly
          disabled={status !== "idle"}
          onClick={(e) => {
            setTab(1);
            setInProp(true);
          }}
        />
        <label htmlFor="tab1" className="tab">
          Send
        </label>
        <input
          type="radio"
          id="tab2"
          readOnly
          checked={tab === 2}
          disabled={status !== "idle"}
          onClick={(e) => {
            setTab(2);
            setInProp(false);
          }}
        />
        <label htmlFor="tab2" className="tab">
          Receive
        </label>
      </div>
      <div
        className="tabContent-container"
        style={tab === 1 ? { borderTopLeftRadius: 0 } : { borderRadius: "5px" }}
      >
        <div className="absolute-helper-container">
          {/* TODO: UseRef */}
          <CSSTransition
            in={tab === 1}
            timeout={300}
            classNames="tab-content-transition-container"
            unmountOnExit
          >
            <div>
              <SendTab status={status} setStatus={setStatus} />
            </div>
          </CSSTransition>

          <CSSTransition
            in={tab === 2}
            timeout={300}
            classNames="tab-content-transition-container"
            unmountOnExit
          >
            <div>
              <ReceiveTab status={status} setStatus={setStatus} />
            </div>
          </CSSTransition>
        </div>
      </div>
    </div>
  );
}
