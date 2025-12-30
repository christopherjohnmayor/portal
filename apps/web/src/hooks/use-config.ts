import useSWR from "swr";

export interface OpenCodeConfig {
    plugin?: string[];
    model?: string;
    small_model?: string;
    provider?: Record<string, unknown>;
    theme?: string;
    agent?: Record<string, unknown>;
    tools?: Record<string, boolean>;
    mcp?: Record<string, unknown>;
    instructions?: string;
    [key: string]: unknown;
}

const fetcher = async (url: string): Promise<OpenCodeConfig> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch config");
    }
    const data = await response.json();
    return data.data || data;
};

export function useConfig() {
    const { data, error, isLoading, mutate } = useSWR<OpenCodeConfig>(
        "/api/config",
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // Cache for 30 seconds
        },
    );

    return {
        config: data,
        error,
        isLoading,
        mutate,
        plugins: data?.plugin || [],
    };
}
