import React from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "@acme/theme-tokens/css";
import "../../../dashboard.scss";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);


