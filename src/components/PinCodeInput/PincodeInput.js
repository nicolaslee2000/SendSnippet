import { useRef, useState } from "react";
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
  const handleChange = (e, i) => {
    const changedKey = digitKey;
    changedKey[i] = e.target.value;
    setDigitKey(changedKey);
    console.log(typeof digitKey);
    console.log(typeof props.digitKey);
    console.log(digitKey);
    console.log(props.digitKey);
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const clipboardText = e.clipboardData.getData("text");
    if (/^\d{4}$/.test(clipboardText)) {
      props.setDigitKey(clipboardText.split(""));
    }
  };
  return (
    <CSSTransition
      in={shake}
      onEntered={() => setShake(false)}
      timeout={300}
      className="pincode-transition-container"
      nodeRef={containerRef}
    >
      <div id="pincode-container" ref={containerRef}>
        {digitKey.map((digit, i) => {
          return (
            <input
              key={i}
              className="pinbox"
              placeholder="_"
              maxLength="1"
              autoComplete="no"
              autoFocus={i === 0}
              value={digit}
              onChange={(e) => handleChange(e, i)}
              ref={pinboxRefs[i]}
              // onKeyDown={() => {}}
              onFocus={() => {}}
              onPaste={handlePaste}
            />
          );
        })}
      </div>
    </CSSTransition>
  );
}
