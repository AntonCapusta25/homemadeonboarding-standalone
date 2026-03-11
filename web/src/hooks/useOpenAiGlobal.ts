import { useSyncExternalStore } from "react";

// OpenAI globals interface
interface OpenAiGlobals {
    toolInput: any;
    toolOutput: any;
    toolResponseMetadata: any;
    widgetState: any;
    theme: "light" | "dark";
    displayMode: "inline" | "pip" | "fullscreen";
    locale: string;
    maxHeight: number;
    safeArea: { top: number; right: number; bottom: number; left: number };
    view: string;
    userAgent: string;
}

const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

interface SetGlobalsEvent extends Event {
    detail: {
        globals: Partial<OpenAiGlobals>;
    };
}

/**
 * Hook to access OpenAI global values reactively
 * Subscribes to changes and re-renders when the specified global updates
 */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
    key: K
): OpenAiGlobals[K] {
    return useSyncExternalStore(
        (onChange) => {
            const handleSetGlobal = (event: Event) => {
                const customEvent = event as SetGlobalsEvent;
                const value = customEvent.detail.globals[key];
                if (value === undefined) {
                    return;
                }
                onChange();
            };

            window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
                passive: true,
            });

            return () => {
                window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
            };
        },
        () => (window as any).openai?.[key]
    );
}

/**
 * Convenience hooks for common OpenAI globals
 */
export function useToolInput() {
    return useOpenAiGlobal("toolInput");
}

export function useToolOutput() {
    return useOpenAiGlobal("toolOutput");
}

export function useToolResponseMetadata() {
    return useOpenAiGlobal("toolResponseMetadata");
}

export function useTheme() {
    return useOpenAiGlobal("theme");
}

export function useDisplayMode() {
    return useOpenAiGlobal("displayMode");
}
