import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { enableMapSet } from "immer";
import "./index.css";
import App from "./App.tsx";

// Enable Immer plugin for Map and Set support
enableMapSet();

console.log("Main.tsx: Starting application mount...");
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
