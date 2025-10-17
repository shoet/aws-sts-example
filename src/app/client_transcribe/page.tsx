"use client";

import clsx from "clsx";
import { useTranscribe } from "./_hooks/useTranscribe";

export default function Page() {
  const { initializeAudio, startRecording, stopRecording, partial, final } =
    useTranscribe();

  return (
    <div>
      <div>transcribe</div>
      <button
        onClick={initializeAudio}
        className={clsx(
          "block",
          "p-2 cursor-pointer",
          "bg-purple-300 hover:bg-purple-500 text-white font-bold text-lg",
        )}
      >
        prepare
      </button>
      <button
        onClick={startRecording}
        className={clsx(
          "block",
          "p-2 cursor-pointer",
          "bg-green-300 hover:bg-green-500 text-white font-bold text-lg",
        )}
      >
        start
      </button>
      <button
        onClick={stopRecording}
        className={clsx(
          "block",
          "p-2 cursor-pointer",
          "bg-green-300 hover:bg-green-500 text-white font-bold text-lg",
        )}
      >
        stop
      </button>
      <div>
        <h1>文字起こし</h1>
        <div>{partial || final}</div>
      </div>
    </div>
  );
}
