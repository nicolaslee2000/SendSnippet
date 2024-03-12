import { useRef, useState } from "react";
import "./PincodeInput.css";
import { CSSTransition } from "react-transition-group";

export default function PincodeInput(props: any) {
  const digitKey = props.digitKey;
  const setDigitKey = props.setDigitKey;
  // refs for controlling focus on input
  const pinboxRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  //for shake animation when entered with wrong/incomplete key
  const [shake, setShake] = useState(false);
  const containerRef = useRef(null);
  const handleChange = (e: any, i: any) => {
    const changedKey = [...digitKey];
    changedKey[i] = /^\d$/.test(e.target.value) ? e.target.value : "";
    setDigitKey(changedKey);
  };
  const handlePaste = (e: any) => {
    e.preventDefault();
    const clipboardText = e.clipboardData.getData("text");
    if (/^\d{4}$/.test(clipboardText)) {
      props.setDigitKey(clipboardText.split(""));
    }
  };
  const handleOnFocus = (e: any) => {
    e.target.select();
  };
  const handleKeyDown = (e: any) => {
    const index = Number(e.target.attributes.index.value);
    if (e.key === "ArrowRight" && index < props.DIGIT - 1) {
      e.preventDefault();
      pinboxRefs[index + 1].current.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      pinboxRefs[index - 1].current.focus();
    }
    if (e.key >= "0" && e.key <= "9" && index < props.DIGIT - 1) {
      e.preventDefault();
      if (
        e.target.selectionStart !== e.target.selectionEnd ||
        e.target.value === ""
      ) {
        //digit selected
        e.target.value = e.key;
        handleChange(e, index);
        pinboxRefs[index + 1].current.focus();
      } else {
        //digit not selected
        pinboxRefs[index + 1].current.focus();
        pinboxRefs[index + 1].current.value = e.key;
        //manual handleChange
        const changedKey = [...digitKey];
        changedKey[index + 1] = /^\d$/.test(e.key) ? e.key : "";
        setDigitKey(changedKey);
      }
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
        {digitKey.map((digit: any, i: any) => {
          return (
            <input
              key={i}
              className="pinbox"
              placeholder="_"
              maxLength={1}
              autoComplete="no"
              autoFocus={i === 0}
              value={digit}
              onChange={(e) => handleChange(e, i)}
              ref={pinboxRefs[i]}
              onKeyDown={handleKeyDown}
              onFocus={handleOnFocus}
              onPaste={handlePaste}
              index={i}
            />
          );
        })}
      </div>
    </CSSTransition>
  );
}
