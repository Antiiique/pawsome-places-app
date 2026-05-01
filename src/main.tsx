import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
document.addEventListener("keydown", (e) => { if (e.ctrlKey && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault(); });

createRoot(document.getElementById("root")!).render(<App />);
