"use client";
import { useEffect, useRef, useState } from "react";
import { pEventIterator } from "p-event";
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from "@aws-sdk/client-transcribe-streaming";

type WorkletReceiveEvent = {
  message: string;
  audioData: Uint8Array;
};

export const useTranscribe = () => {
  const SAMPLE_RATE = 16000;
  const CHANNEL_COUNT = 1;
  const AUDIO_WORKLET_NAME = "audio-processor";
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const [partial, setPartial] = useState<string>();
  const [final, setFinal] = useState<string | undefined>();

  const initializeAudio = async () => {
    cleanup();
    audioContextRef.current = new AudioContext({
      sampleRate: SAMPLE_RATE,
    });
    await audioContextRef.current.audioWorklet.addModule(
      `/worklets/${AUDIO_WORKLET_NAME}.js`,
    );
    mediaStreamRef.current = await window.navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,
        noiseSuppression: true,
        sampleRate: SAMPLE_RATE,
        channelCount: CHANNEL_COUNT,
      },
    });
    const mediaStreamNode = audioContextRef.current.createMediaStreamSource(
      mediaStreamRef.current,
    );
    const audioWorkletNode = new AudioWorkletNode(
      audioContextRef.current,
      AUDIO_WORKLET_NAME,
      {
        channelCount: CHANNEL_COUNT,
        numberOfInputs: 1,
        numberOfOutputs: 1,
        processorOptions: {
          sampleRate: SAMPLE_RATE,
        },
      },
    );
    mediaStreamNode.connect(audioWorkletNode);
    audioWorkletNode.port.addEventListener("messageerror", (ev) => {
      console.log("messageerror", ev);
    });
    audioWorkletNodeRef.current = audioWorkletNode;
    audioWorkletNodeRef.current.port.start(); // 必須
    console.log("### complete prepare");
  };

  const startRecording = async () => {
    const credentials = await fetchCredentials();
    if (!credentials) {
      throw new Error("unauthorized");
    }
    if (!audioWorkletNodeRef.current) {
      throw new Error("audio worklet not found");
    }
    const asyncIterator = pEventIterator<
      "message",
      MessageEvent<WorkletReceiveEvent>
    >(audioWorkletNodeRef.current.port, "message");
    audioWorkletNodeRef.current.port.postMessage("START_LISTEN"); // start message
    await transcribe(credentials, asyncIterator);
  };

  const stopRecording = () => {
    audioWorkletNodeRef.current?.port.postMessage("STOP_LISTEN");
  };

  const cleanup = () => {
    cleanupAudio();
  };

  const cleanupAudio = () => {
    audioWorkletNodeRef.current?.disconnect();
    audioContextRef.current?.close();
  };

  const transcribe = async (
    credentials: Credentials,
    audio: AsyncIterableIterator<MessageEvent<WorkletReceiveEvent>>,
  ) => {
    const client = new TranscribeStreamingClient({
      region: "ap-northeast-1",
      credentials: {
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretAccessKey,
        sessionToken: credentials.SessionToken,
      },
    });
    const command = new StartStreamTranscriptionCommand({
      LanguageCode: "ja-JP",
      MediaEncoding: "pcm",
      MediaSampleRateHertz: SAMPLE_RATE,
      AudioStream: (async function* () {
        for await (const chunk of audio) {
          const { audioData } = chunk.data;
          yield { AudioEvent: { AudioChunk: audioData } };
        }
      })(),
    });
    const response = await client.send(command);

    try {
      if (!response.TranscriptResultStream) {
        console.error("failed to transcribe");
        return;
      }
      for await (const event of response.TranscriptResultStream) {
        for (const result of event.TranscriptEvent?.Transcript?.Results || []) {
          if (result.IsPartial) {
            setPartial(result.Alternatives?.[0].Transcript);
            setFinal(undefined);
          } else {
            setPartial(undefined);
            setFinal(result.Alternatives?.[0].Transcript);
          }
        }
        console.log("event", JSON.stringify(event));
      }
    } catch (err) {
      console.log("error");
      console.log(err);
    }
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    initializeAudio,
    startRecording,
    stopRecording,
    partial,
    final,
  };
};

type Credentials = {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
};

const fetchCredentials = async () => {
  const response = await fetch("/api/get_transcribe_sts", {
    method: "GET",
    headers: {
      Authorization: "Beaere xxx",
    },
  });
  if (response.status !== 200) {
    const text = await response.text();
    console.error("failed to get sts", text);
    throw new Error(`failed to get sts: ${text}`);
  }
  const body: {
    credentials: Credentials;
  } = await response.json();
  return body.credentials;
};
