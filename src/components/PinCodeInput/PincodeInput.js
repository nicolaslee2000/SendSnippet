import { useRef, useState } from "react";
import PinBox from "./PinBox/PinBox";
import "./PincodeInput.css";
import { CSSTransition } from "react-transition-group";

export default function PincodeInput(props) {
  const digitKey = props.digitKey;
  const setDigitKey = props.setDigitKey;
  // refs for controlling focus on input
  const pinboxRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  //for shake animation when entered with wrong/incomplete key
  const [shake, setShake] = useState(false);
  const containerRef = useRef(null);

  return (
    <CSSTransition
      in={shake}
      onEntered={() => setShake(false)}
      timeout={300}
      className="pincode-transition-container"
      nodeRef={containerRef}
    >
      <div id="pincode-container" ref={containerRef}>
        {[...Array(digitKey.length).keys()].map((i) => {
          return (
            <PinBox
              key={i}
              index={i}
              autofocus={i === 0}
              digitKey={digitKey}
              setDigitKey={setDigitKey}
              pinboxRefs={pinboxRefs}
              setShake={setShake}
            />
          );
        })}
      </div>
    </CSSTransition>
  );
}
