import { createRoot } from "react-dom/client";
simport App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/shared";
s
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
ßß