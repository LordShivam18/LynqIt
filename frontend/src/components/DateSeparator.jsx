import React from 'react';

const DateSeparator = ({ date }) => {
  if (!date) return null;

  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex-grow border-t border-base-300"></div>
      <div className="px-4 py-1 bg-base-200 rounded-full text-xs text-base-content/70 font-medium shadow-sm">
        {date}
      </div>
      <div className="flex-grow border-t border-base-300"></div>
    </div>
  );
};

export default DateSeparator;
