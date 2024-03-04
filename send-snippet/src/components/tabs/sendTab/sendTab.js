import React, { useState } from "react";
import "./SendTab.css";

export default function SendTab(props) {
  const [tts, setTts] = useState("");
  const handleTtsChange = (e) => {
    setTts(e.target.value);
  };
  return (
    <div className="tab-content" id="sendTab-container" autoFocus>
      <textarea autoFocus value={tts} onChange={handleTtsChange} id="sendTab-textarea"></textarea>
      <button>Send</button>
      <button>Reset</button>
    </div>
  );
}
