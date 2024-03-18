import { MouseEvent } from "react";
import "./Button.css";

// warn: red, primary: orange
export type ButtonColors = "warn" | "primary";

export interface ButtonProps {
  color?: ButtonColors;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  text: string;
  isLoading: boolean;
  icon?: string;
}

export default function Button({
  color = "primary",
  onClick,
  text,
  isLoading,
  icon,
}: ButtonProps) {
  return (
    <button
      className={`button ${color} ${isLoading ? "loading" : ""}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? (
        ""
      ) : icon ? (
        <img src={icon} alt={text} className="buttonIcon" />
      ) : (
        text
      )}
    </button>
  );
}
