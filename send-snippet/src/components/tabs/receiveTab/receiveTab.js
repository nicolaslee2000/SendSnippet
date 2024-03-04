import React, { useEffect, useState } from "react";
import "./ReceiveTab.css";

export default function ReceiveTab() {
  const [counter, setCounter] = useState(600);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const timer =
      pending &&
      counter > 0 &&
      setInterval(() => setCounter(counter - 1), 1000);
    return () => clearInterval(timer);
  }, [counter, pending]);
  return (
    <div className="tab-content" id="receiveTab-container">
      <input type="text" placeholder="code" />
      <button onClick={() => setPending(true)}>download</button>
      <div>
        {Math.floor(counter / 60)}:{counter - Math.floor(counter / 60) * 60}
      </div>
    </div>
  );
}
