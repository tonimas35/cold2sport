/**
 * Player preferences, kept in localStorage. Replaces the upstream app's
 * SimulatorSettingsProvider, which also syncs with the hosted platform's
 * account API (not available in a static site). Same two settings the board
 * uses: how a card tap behaves and the animation speed.
 */
import type { CardInteractionMode } from "@tcg/simulator-contract";
import type { AnimationSpeed } from "@tcg/simulator-runtime/animation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface Settings {
  readonly cardInteractionMode: CardInteractionMode;
  readonly animationSpeed: AnimationSpeed;
}

const STORAGE_KEY = "opbot.web.settings";
const DEFAULTS: Settings = { cardInteractionMode: "detailed", animationSpeed: "normal" };

function read(): Settings {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? "null") as Partial<Settings> | null;
    // `?anim=off` (used by the end-to-end tests) overrides the stored speed.
    const forced = new URLSearchParams(globalThis.location?.search ?? "").get("anim");
    const speed = forced ?? raw?.animationSpeed;
    return {
      cardInteractionMode: raw?.cardInteractionMode === "quick" ? "quick" : "detailed",
      animationSpeed: speed === "off" || speed === "fast" || speed === "slow" || speed === "normal" ? speed : DEFAULTS.animationSpeed,
    };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsContextValue {
  readonly settings: Settings;
  update(patch: Partial<Settings>): void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { readonly children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(read);
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try {
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private browsing: keep the setting for this visit only.
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings outside SettingsProvider");
  return value;
}
