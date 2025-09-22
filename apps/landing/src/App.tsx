import React from "react";
import { Button } from "@acme/button";
import "@acme/theme-tokens/css";
import { TopMenu } from "@acme/top-menu";

export const App: React.FC = () => (
  <div style={{minHeight:'100vh',background:'#ffffff',color:'#0b0c0f',fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'}}>
    <TopMenu />
    <div style={{ textAlign: 'center', display:'grid', placeItems:'center', minHeight:'calc(100vh - 56px)'}}>
      <h1 style={{ marginBottom: 12 }}>AI Micro-Frontends</h1>
      <p style={{ color:'#4b5563', marginBottom: 16 }}>Tiny, isolated pieces — easy for AI to work on.</p>
      <Button label="Primary" />
      <span style={{ display: 'inline-block', width: 8 }} />
      <Button label="Ghost" variant="ghost" />
    </div>
  </div>
);
