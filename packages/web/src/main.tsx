import "@mantine/core/styles.css";
import "@tcg/simulator-ui/styles/theme.css";
import "@upstream/one-piece/styles.css";
import "./app.css";
import "./ui/board-fixes.css";

import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { SettingsProvider } from "./ui/settings.tsx";

const root = document.getElementById("app");
if (!root) throw new Error("missing #app");

createRoot(root).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="light">
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </MantineProvider>
  </StrictMode>,
);
