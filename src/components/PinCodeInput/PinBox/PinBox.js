import React from "react";
import "./PinBox.css";

export default function PinBox(props) {
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
    />
  );
}
