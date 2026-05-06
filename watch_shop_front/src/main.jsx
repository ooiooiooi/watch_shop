import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  if (message.includes("A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received")) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")).render(<App />);

