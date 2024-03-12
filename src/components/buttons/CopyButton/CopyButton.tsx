import { MouseEvent, useState } from "react";
import "./CopyButton.css";
import Clippy from "./Clippy";
import Check from "./Check";

export interface CopyButtonProps {
  copyText: () => void;
}
const CopyButton = ({ copyText }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    copyText();
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  return (
    <button onClick={handleClick} id="copyButton">
      <div id="copied-icons-container">
        <Check copied={copied} />
        <Clippy copied={copied} />
      </div>
    </button>
  );
};

export default CopyButton;
