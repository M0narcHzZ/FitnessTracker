import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  console.log(`API Request ${method} ${url}:`, data);
  
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    // Важно: для FormData не устанавливаем Content-Type, браузер сам добавит его с правильным boundary
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    // Для FormData используем данные напрямую, для других данных - JSON.stringify
    body: isFormData ? data as FormData : data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // For DELETE with 204, just return true
  if (method === "DELETE" && res.status === 204) {
    return true;
  }

  try {
    await throwIfResNotOk(res);
    // Parse JSON only if the status isn't 204 No Content
    if (res.status !== 204) {
      const responseData = await res.json();
      console.log(`API Response ${method} ${url}:`, responseData);
      return responseData;
    }
    return true;
  } catch (error) {
    console.error(`API Error ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
