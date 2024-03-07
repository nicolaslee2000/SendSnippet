import React, { useEffect } from "react";

export default function AlertCopied(props) {
  const ALERT_DURATION = 2000;
  useEffect(() => {
    let timer = setTimeout(() => props.setCopied(false), ALERT_DURATION);
    return () => {
      clearTimeout(timer);
    };
  });
  return <div>AlertCopied</div>;
}
