import { useState } from "react";

interface Props {
  value: string;
}

export default function CopyButton({ value }: Props) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button className={"support-copy" + (copied ? " copied" : "")} onClick={onCopy}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
