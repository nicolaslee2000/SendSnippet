import { useRef } from "react";
import "./PincodeInput.css";
import { CSSTransition } from "react-transition-group";

export default function PincodeInput(props: any) {
  const digitKey = props.digitKey;
  const setDigitKey = props.setDigitKey;
  // refs for controlling focus on input

  const containerRef = useRef(null);
  const handleChange = (target: any, i: any) => {
    const changedKey = [...digitKey];
    changedKey[i] = /^\d$/.test(target.value) ? target.value : "";
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
    const next = e.target.nextElementSibling;
    const prev = e.target.previousElementSibling;
    const id = Number(e.target.id);
    if (e.key === "ArrowRight" && id !== props.DIGIT - 1) {
      e.preventDefault();
      next.focus();
    }
    if (e.key === "ArrowLeft" && id !== 0) {
      e.preventDefault();
      prev.focus();
    }
    if (e.key >= "0" && e.key <= "9" && id !== props.DIGIT - 1) {
      e.preventDefault();
      if (
        e.target.selectionStart !== e.target.selectionEnd ||
        e.target.value === ""
      ) {
        //digit selected
        e.target.value = e.key;
        handleChange(e.target, id);
        next.focus();
      } else {
        //digit not selected
        next.value = e.key;
        handleChange(next, id + 1);
        next.focus();
      }
    }
    if (e.key === "Enter") {
      props.handleDownload(e);
    }
    if (e.key === "Backspace" && prev !== null) {
      e.preventDefault();
      e.target.value = "";
      handleChange(e.target, id);
      prev.focus();
    }
  };
  return (
    <CSSTransition
      in={props.shake}
      onEntered={() => props.setShake(false)}
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
              onChange={(e) => handleChange(e.target, i)}
              onKeyDown={handleKeyDown}
              onFocus={handleOnFocus}
              onPaste={handlePaste}
              id={i}
            />
          );
        })}
      </div>
    </CSSTransition>
  );
}
