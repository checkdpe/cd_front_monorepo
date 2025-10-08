import React, { createContext, useContext, useState, useEffect } from "react";

interface EnvironmentContextType {
  useDevEnvironment: boolean;
  setUseDevEnvironment: (useDev: boolean) => void;
  getApiBaseUrl: () => string;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

const ENVIRONMENT_STORAGE_KEY = "top-menu-environment-preference";

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [useDevEnvironment, setUseDevEnvironmentState] = useState<boolean>(() => {
    // Default to dev environment as specified in requirements
    const stored = localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : true;
  });

  const setUseDevEnvironment = (useDev: boolean) => {
    setUseDevEnvironmentState(useDev);
    localStorage.setItem(ENVIRONMENT_STORAGE_KEY, JSON.stringify(useDev));
    
    // Show warning that page refresh is needed
    if (window.confirm("Environment changed. Page will refresh to apply the new settings.")) {
      window.location.reload();
    }
  };

  const getApiBaseUrl = () => {
    if (useDevEnvironment) {
      return (import.meta as any).env.VITE_API_BASE_DEV || "https://api-dev.etiquettedpe.fr";
    } else {
      return (import.meta as any).env.VITE_API_BASE || "https://api-stg.etiquettedpe.fr";
    }
  };

  return (
    <EnvironmentContext.Provider value={{
      useDevEnvironment,
      setUseDevEnvironment,
      getApiBaseUrl
    }}>
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = (): EnvironmentContextType => {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
};
