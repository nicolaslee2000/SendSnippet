import { useEffect } from "react";
import "./AlertCopied.css";
import checkedIcon from "../../assets/icons/check.png";
import * as React from "react";
export interface AlertCopiedProps {
  setCopied: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AlertCopied({ setCopied }: AlertCopiedProps) {
  const ALERT_DURATION = 2000;
  useEffect(() => {
    let timer = setTimeout(() => setCopied(false), ALERT_DURATION);
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
