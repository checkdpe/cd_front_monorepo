import React from "react";
import { Button } from "@acme/button";
import "@acme/theme-tokens/css";

export const App: React.FC = () => (
  <div style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)',display:'grid',placeItems:'center',fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'}}>
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ marginBottom: 12 }}>AI Micro-Frontends</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>Tiny, isolated pieces — easy for AI to work on.</p>
      <Button label="Primary" />
      <span style={{ display: 'inline-block', width: 8 }} />
      <Button label="Ghost" variant="ghost" />
    </div>
  </div>
);
