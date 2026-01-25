// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

console.log("VITE ENV TEST:", {
  API: import.meta.env.VITE_API_URL,
  EMAILJS_SERVICE: import.meta.env.VITE_EMAILJS_SERVICE_ID,
});


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
