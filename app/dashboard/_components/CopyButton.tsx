// File: app/dashboard/_components/CopyButton.tsx
'use client';
import { useState } from 'react';

export default function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      // Reset the "Copied!" message after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button onClick={handleCopy} style={{ marginLeft: '1rem', cursor: 'pointer' }}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}