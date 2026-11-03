import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const THEMES = [
  { id: 'nebula', name: 'Nebula', swatches: ['#8b5cf6', '#6366f1', '#12161f'] },
  { id: 'emerald', name: 'Emerald', swatches: ['#10b981', '#0d9488', '#101a16'] },
  { id: 'sunset', name: 'Sunset', swatches: ['#fb923c', '#f43f5e', '#1c1512'] },
];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('ca-theme');
    return THEMES.some(t => t.id === saved) ? saved : 'nebula';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ca-theme', theme);
  }, [theme]);

  const setTheme = id => {
    if (THEMES.some(t => t.id === id)) setThemeState(id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
