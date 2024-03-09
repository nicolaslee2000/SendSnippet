import React, { useState } from "react";
import "./PinBox.css";

export default function PinBox(props) {
  return (
    <input
      className="pinbox"
      placeholder="_"
      type="number"
      maxLength={1}
      autoComplete="no"
      pattern="\d*"
      autoFocus={props.autoFocus}
      value={props.value}
      onChange={props.onChange}
      ref={props.focusRef}
      onKeyDown={props.onKeyDown}
      onFocus={props.onFocus}
      onPaste={props.onPaste}
    />
  );
}
