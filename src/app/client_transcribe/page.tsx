"use client";

import { useTranscribe } from "./_hooks/useTranscribe";

export default function Page() {
  const {} = useTranscribe();

  return <div>transcribe</div>;
}
