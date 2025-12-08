import { useState, useEffect } from "react";

interface Config {
  apiUrl: string;
  remotePatterns: string;
}

export function useConfig() {
  const [config, setConfig] = useState<Config>({
    apiUrl: "",
    remotePatterns: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load config:", err);
        setLoading(false);
      });
  }, []);

  return { config, loading };
}
