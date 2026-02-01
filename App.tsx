
import React, { useState, useEffect } from 'react';
import ChatWidget from './components/ChatWidget';
import { COLORS, FARM_DEPOT_LOGO } from './constants';

const App: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-0 right-0 p-4 md:p-6 flex flex-col items-end pointer-events-none z-50">
      <div className="pointer-events-auto flex flex-col items-end gap-4">
        {/* Chat Widget Window */}
        {isOpen && (
          <ChatWidget isOpen={isOpen} onToggle={() => setIsOpen(false)} />
        )}

        {/* Floating Launcher Button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full shadow-2xl border-4 border-primary flex items-center justify-center p-2 hover:scale-110 active:scale-95 transition-all duration-300 group"
          >
            <div className="absolute -top-2 -right-1 bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
              Ask AI
            </div>
            <img 
              src="https://farmdepot.ng/wp-content/uploads/2021/04/cropped-Farm-Depot-Logo-1.png" 
              alt="FarmDepot Logo" 
              className="w-full h-full object-contain"
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
