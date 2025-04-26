import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

// Load Montserrat and Material Icons
const montserrat = document.createElement("link");
montserrat.rel = "stylesheet";
montserrat.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&display=swap";
document.head.appendChild(montserrat);

const roboto = document.createElement("link");
roboto.rel = "stylesheet";
roboto.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap";
document.head.appendChild(roboto);

const icons = document.createElement("link");
icons.rel = "stylesheet";
icons.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
document.head.appendChild(icons);

const title = document.createElement("title");
title.textContent = "FitTrack Pro";
document.head.appendChild(title);

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
