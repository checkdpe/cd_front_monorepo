import React from "react";
import { TopMenu } from "@acme/top-menu";
import { DpeList } from "./components/DpeList";

export const App: React.FC = () => (
  <div style={{ minHeight: '100vh' }}>
    <TopMenu />
    <div style={{ padding: 24 }}>
      <h1>DPE List</h1>
      <DpeList />
    </div>
  </div>
);
