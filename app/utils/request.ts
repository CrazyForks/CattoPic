import { getApiKey } from "./auth";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

interface ConfigResponse {
  apiUrl: string;
  remotePatterns: string;
}

let BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
let hasInitialized = false;

async function initializeBaseUrl() {
  try {
    const response = await fetch("/api/config");
    const config: ConfigResponse = await response.json();
    if (config.apiUrl) {
      BASE_URL = config.apiUrl;
    }
  } catch (error) {
    console.error("Failed to fetch API config:", error);
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!hasInitialized) {
    await initializeBaseUrl();
    hasInitialized = true;
  }

  const apiKey = getApiKey();

  const { params, ...restOptions } = options;

  // 构建URL
  const url: URL = new URL(endpoint, BASE_URL || window.location.origin);
  console.log(BASE_URL, url.toString());
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
  }

  // 添加认证头
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    ...options.headers,
  };

  const response = await fetch(url.toString(), {
    ...restOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "请求失败");
  }

  return response.json();
}

// 获取静态文件目录列表
export async function fetchDirectoryListing(
  path = "/images/"
): Promise<string[]> {
  const response = await api.get<{ files: string[] }>("/directory", { path });
  return response.files;
}

// 封装常用请求方法
export const api = {
  request,
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    request<T>(endpoint, { method: "GET", params }),

  post: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),

  upload: <T>(endpoint: string, files: File[]) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("images[]", file);
    }
    return request<T>(endpoint, {
      method: "POST",
      body: formData,
    });
  },
};
