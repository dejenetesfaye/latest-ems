import React, { createContext, useContext, useState, useEffect } from 'react';

const CustomThemeContext = createContext();

export const useThemeToggle = () => useContext(CustomThemeContext);

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'dark';
  });

  const toggleMode = () => {
    setMode((prev) => {
      const newMode = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  return (
    <CustomThemeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </CustomThemeContext.Provider>
  );
};
