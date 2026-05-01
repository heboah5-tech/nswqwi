import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ensureVisitorId } from "./lib/visitor";

ensureVisitorId();

createRoot(document.getElementById("root")!).render(<App />);
