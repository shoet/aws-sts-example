import { useEffect, useRef, useState } from "react";

type Credentials = {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
};

export const useTranscribe = () => {
  const [error, setError] = useState<string>();
  const credentialsRef = useRef<Credentials | null>(null);

  const cleanup = () => {
    credentialsRef.current = null;
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const fetchCredentials = async () => {
    const response = await fetch("/api/get_transcribe_sts", {
      method: "GET",
      headers: {
        "Set-Cookie": "authToken=xxx;",
      },
    });
    if (response.status !== 200) {
      setError("failed to get sts");
      const text = await response.text();
      console.error("failed to get sts", text);
      return;
    }
    const body: {
      credentials: Credentials;
    } = await response.json();
    credentialsRef.current = body.credentials;
  };

  const startTranscribe = async () => {
    cleanup();
    await fetchCredentials();
  };

  return {
    startTranscribe,
  };
};
