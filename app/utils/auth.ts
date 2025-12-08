const API_KEY_KEY = "imageflow_api_key";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const getApiKey = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(API_KEY_KEY);
  }
  return null;
};

export const setApiKey = (apiKey: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(API_KEY_KEY, apiKey);
  }
};

export const removeApiKey = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(API_KEY_KEY);
  }
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/api/validate-api-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Key validation failed:", {
        status: response.status,
        statusText: response.statusText,
        responseText: errorText
      });
      return false;
    }

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error("API Key validation error:", error);
    return false;
  }
};
