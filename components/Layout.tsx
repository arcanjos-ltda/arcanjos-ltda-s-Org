import React from 'react';
import { Calendar, Users, LayoutDashboard, Sun, Moon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'schedule' | 'resources';
  setActiveTab: (tab: 'schedule' | 'resources') => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab,
  isDarkMode,
  toggleTheme
}) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-200 font-sans transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-200">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <LayoutDashboard className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">MedScale</span>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Escala Mensal</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
              activeTab === 'resources'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Recursos</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-600">
          <p>System Version 1.1.0</p>
          <p>Connected to Supabase</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
        {children}
      </main>
    </div>
  );
};