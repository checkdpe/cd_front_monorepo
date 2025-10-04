import React from "react";
import { TopMenu } from "@acme/top-menu";
import { DpeList } from "./components/DpeList";

export const App: React.FC = () => {
  // Get the auth URL from environment variables
  const authUrl = import.meta.env.VITE_AUTH_URL || "/auth";
  
  return (
    <div style={{ minHeight: '100vh' }}>
      <TopMenu authHref={authUrl} />
      <div style={{ padding: 24 }}>
        <h1>DPE List</h1>
        <DpeList />
      </div>
    </div>
  );
};
