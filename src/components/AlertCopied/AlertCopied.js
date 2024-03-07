import React, { useEffect } from "react";
import "./AlertCopied.css";
import checkedIcon from "../../assets/icons/check.png";

export default function AlertCopied(props) {
  const ALERT_DURATION = 2500;
  useEffect(() => {
    let timer = setTimeout(() => props.setCopied(false), ALERT_DURATION);
    return () => {
      clearTimeout(timer);
    };
  });
  return (
    <>
      <img src={checkedIcon} alt="Icon" />
      Text Copied!
    </>
  );
}
