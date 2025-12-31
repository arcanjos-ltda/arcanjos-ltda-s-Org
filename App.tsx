import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ShiftBoard } from './components/ShiftBoard';
import { ResourceManager } from './components/ResourceManager';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'resources'>('schedule');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Apply theme to HTML tag
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
    >
      {activeTab === 'schedule' ? <ShiftBoard /> : <ResourceManager />}
    </Layout>
  );
};

export default App;