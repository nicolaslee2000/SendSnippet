import React from "react";
import PinBox from "./PinBox/PinBox";
import "./PincodeInput.css";

export default function PincodeInput() {
  const DIGIT = 4;
  return (
    <div id="pincode-container">
      {[...Array(DIGIT).keys()].map((i) => {
        return <PinBox key={i} autofocus={i === 0} />;
      })}
    </div>
  );
}
