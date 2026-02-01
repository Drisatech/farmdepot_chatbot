
import React from 'react';

interface VoiceButtonProps {
  isActive: boolean;
  isSpeaking?: boolean;
  onClick: () => void;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({ isActive, isSpeaking, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shrink-0 ${
        isActive ? (isSpeaking ? 'bg-secondary' : 'bg-green-600') : 'bg-primary'
      } hover:scale-105 active:scale-95 group`}
      aria-label={isActive ? "Stop Voice Session" : "Start Voice Session"}
    >
      {isActive && (
        <>
          <div className={`absolute inset-0 rounded-full ${isSpeaking ? 'bg-secondary' : 'bg-green-600'} pulse-animation opacity-40`} />
          <div className={`absolute -inset-2 rounded-full border-2 ${isSpeaking ? 'border-secondary/30' : 'border-green-600/30'} pulse-animation opacity-20`} style={{ animationDelay: '0.5s' }} />
        </>
      )}
      
      <div className="relative z-10 flex items-center justify-center">
        {isActive ? (
          isSpeaking ? (
            <div className="flex gap-1 items-end h-4">
              <div className="w-1 bg-white animate-[bounce_0.6s_infinite]"></div>
              <div className="w-1 bg-white animate-[bounce_0.8s_infinite]"></div>
              <div className="w-1 bg-white animate-[bounce_0.7s_infinite]"></div>
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </div>
    </button>
  );
};

export default VoiceButton;
