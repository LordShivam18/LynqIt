import React, { useState, useEffect } from 'react';
import { getTimeFormat, setTimeFormat } from '../utils/dateUtils';
import { Settings, Clock } from 'lucide-react';

const TimeFormatSettings = () => {
  const [currentFormat, setCurrentFormat] = useState('12');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCurrentFormat(getTimeFormat());
  }, []);

  const handleFormatChange = (format) => {
    setTimeFormat(format);
    setCurrentFormat(format);
    setIsOpen(false);
    
    // Trigger a re-render of messages by dispatching a custom event
    window.dispatchEvent(new CustomEvent('timeFormatChanged'));
  };

  const getCurrentTime = () => {
    const now = new Date();
    if (currentFormat === '24') {
      return now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return now.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm gap-2"
        title="Time Format Settings"
      >
        <Clock size={16} />
        <span className="hidden sm:inline">
          {currentFormat === '24' ? '24h' : '12h'}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50">
            <div className="p-4">
              <h3 className="font-semibold text-base-content mb-3 flex items-center gap-2">
                <Settings size={16} />
                Time Format
              </h3>
              
              <div className="space-y-3">
                {/* 12-hour format option */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-200 transition-colors">
                  <input
                    type="radio"
                    name="timeFormat"
                    value="12"
                    checked={currentFormat === '12'}
                    onChange={() => handleFormatChange('12')}
                    className="radio radio-primary radio-sm"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-base-content">12-hour</div>
                    <div className="text-sm text-base-content/70">
                      Example: {new Date().toLocaleTimeString('en-US', { 
                        hour12: true, 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </label>

                {/* 24-hour format option */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-200 transition-colors">
                  <input
                    type="radio"
                    name="timeFormat"
                    value="24"
                    checked={currentFormat === '24'}
                    onChange={() => handleFormatChange('24')}
                    className="radio radio-primary radio-sm"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-base-content">24-hour</div>
                    <div className="text-sm text-base-content/70">
                      Example: {new Date().toLocaleTimeString('en-US', { 
                        hour12: false, 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-4 pt-3 border-t border-base-300">
                <div className="text-xs text-base-content/60">
                  Current time: <span className="font-mono">{getCurrentTime()}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TimeFormatSettings;
