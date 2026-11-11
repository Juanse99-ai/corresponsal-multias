// Entrada del plugin para OpenClaw. La lógica está en puente.js (se prueba sin
// OpenClaw en test/corresponsal-puente.test.ts).
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { puente } from "./puente.js";

export default definePluginEntry(puente);
