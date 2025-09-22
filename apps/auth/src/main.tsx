import React from "react";
import { createRoot } from "react-dom/client";
import "@aws-amplify/ui-react/styles.css";
import "./amplify";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);


