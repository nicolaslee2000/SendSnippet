import React from "react";
import "./Button.css";
export default function Button(props) {
  const color = props.color;
  const onClick = props.onClick;
  const text = props.text;
  const loading = props.loading;

  return (
    <button
      className={`button ${color} ${loading ? "button-loading" : ""}`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? "" : props.icon ? "aa" : text}
    </button>
  );
}
