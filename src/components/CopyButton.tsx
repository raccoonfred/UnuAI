"use client";
import { useState } from "react";

export default function CopyButton({ text, label = "Copy", doneLabel = "Copied ✓" }: { text: string; label?: string; doneLabel?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? doneLabel : label}
    </button>
  );
}
