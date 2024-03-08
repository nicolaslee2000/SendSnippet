import React, { useState } from "react";
import "./PinBox.css";

export default function PinBox(props) {
  const validateAndChangeInput = (e) => {
    const changedKey = props.digitKey;
    const value = e.target.value;

    if (value === "") {
      if (props.index > 0) {
        props.pinboxRefs[props.index - 1].current.focus();
      }
      changedKey[props.index] = "_";
    }

    if (/^\d$/.test(e.target.value)) {
      if (props.index < props.digitKey.length - 1) {
        props.pinboxRefs[props.index + 1].current.focus();
      }
      changedKey[props.index] = value;
    }

    return changedKey;
  };
  const handleKeydownEvent = (e) => {
    const keyCode = e.keyCode;
    //handle arrow keys
    if (keyCode === 39 && props.index < props.digitKey.length - 1) {
      props.pinboxRefs[props.index + 1].current.focus();
    }
    if (keyCode === 37 && props.index > 0) {
      props.pinboxRefs[props.index - 1].current.focus();
    }
    //handle enter
    if (keyCode === 13 && props.digitKey.every((e) => /^\d$/.test(e))) {
      //receive http request
      console.log("requesting snippet");
    }
    //handle incomplete code
    if (keyCode === 13 && !props.digitKey.every((e) => /^\d$/.test(e))) {
      props.setShake(true);
    }
    //handle number key
    if ((keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105)) {
      if (e.target.value === "") {
      }
    }
    // if (e.keyCode === 8 && props.index > 0 && e.target.value === "") {
    //   e.preventDefault();
    //   props.pinboxRefs[props.index - 1].current.focus();
    // }
    // if (e.keyCode === 32 && props.index < props.digitKey.length - 1) {
    //   e.preventDefault();
    //   props.pinboxRefs[props.index + 1].current.focus();
    // }
  };
  const handleFocus = (e) => {
    setTimeout(() => {
      e.target.select();
    }, 0);
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const clipboardText = e.clipboardData.getData("text");
    if (/^\d{4}$/.test(clipboardText)) {
      props.setDigitKey(clipboardText.split(""));
    }
  };
  return (
    <input
      className="pinbox"
      placeholder="_"
      type="number"
      step="1"
      min="0"
      max="9"
      autoComplete="no"
      pattern="\d*"
      autoFocus={props.autofocus}
      value={props.digitKey[props.index]}
      onChange={() => {}}
      ref={props.pinboxRefs[props.index]}
      onKeyDown={handleKeydownEvent}
      onFocus={handleFocus}
      onPaste={handlePaste}
    />
  );
}
