import { format, isToday, isYesterday, isThisWeek, isThisYear, parseISO, differenceInDays } from 'date-fns';

// Get user's preferred time format from localStorage or default to 12-hour
export const getTimeFormat = () => {
  return localStorage.getItem('timeFormat') || '12'; // '12' or '24'
};

// Set user's preferred time format
export const setTimeFormat = (format) => {
  localStorage.setItem('timeFormat', format);
};

// Format message timestamp for display next to message
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
  const timeFormat = getTimeFormat();
  
  if (timeFormat === '24') {
    return format(date, 'HH:mm');
  } else {
    return format(date, 'h:mm a');
  }
};

// Format last seen time for user status
export const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'Never';
  
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
  const now = new Date();
  const timeFormat = getTimeFormat();
  
  if (isToday(date)) {
    const timeStr = timeFormat === '24' ? format(date, 'HH:mm') : format(date, 'h:mm a');
    return `today at ${timeStr}`;
  }
  
  if (isYesterday(date)) {
    const timeStr = timeFormat === '24' ? format(date, 'HH:mm') : format(date, 'h:mm a');
    return `yesterday at ${timeStr}`;
  }
  
  if (isThisWeek(date)) {
    const timeStr = timeFormat === '24' ? format(date, 'HH:mm') : format(date, 'h:mm a');
    return `${format(date, 'EEEE')} at ${timeStr}`;
  }
  
  if (isThisYear(date)) {
    const timeStr = timeFormat === '24' ? format(date, 'HH:mm') : format(date, 'h:mm a');
    return `${format(date, 'MMM d')} at ${timeStr}`;
  }
  
  const timeStr = timeFormat === '24' ? format(date, 'HH:mm') : format(date, 'h:mm a');
  return `${format(date, 'MMM d, yyyy')} at ${timeStr}`;
};

// Get date separator label for message groups
export const getDateSeparator = (currentMessageDate, previousMessageDate) => {
  if (!currentMessageDate) return null;
  
  const current = typeof currentMessageDate === 'string' ? parseISO(currentMessageDate) : new Date(currentMessageDate);
  
  // If no previous message, show separator for first message
  if (!previousMessageDate) {
    return getDateLabel(current);
  }
  
  const previous = typeof previousMessageDate === 'string' ? parseISO(previousMessageDate) : new Date(previousMessageDate);
  
  // Check if messages are from the same day
  const currentDay = format(current, 'yyyy-MM-dd');
  const previousDay = format(previous, 'yyyy-MM-dd');
  
  // If same day, no separator needed
  if (currentDay === previousDay) {
    return null;
  }
  
  // Different days, show separator
  return getDateLabel(current);
};

// Get appropriate date label based on WhatsApp rules
export const getDateLabel = (date) => {
  if (!date) return '';
  
  const messageDate = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (isToday(messageDate)) {
    return 'Today';
  }
  
  if (isYesterday(messageDate)) {
    return 'Yesterday';
  }
  
  if (isThisWeek(messageDate)) {
    return format(messageDate, 'EEEE'); // Monday, Tuesday, etc.
  }
  
  if (isThisYear(messageDate)) {
    return format(messageDate, 'MMMM d'); // April 3, Jan 21
  }
  
  return format(messageDate, 'MMMM d, yyyy'); // April 3, 2023
};

// Check if two dates are the same day
export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  const d1 = typeof date1 === 'string' ? parseISO(date1) : new Date(date1);
  const d2 = typeof date2 === 'string' ? parseISO(date2) : new Date(date2);
  
  return format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');
};

// Format typing indicator timestamp
export const formatTypingTime = () => {
  const timeFormat = getTimeFormat();
  const now = new Date();
  
  if (timeFormat === '24') {
    return format(now, 'HH:mm');
  } else {
    return format(now, 'h:mm a');
  }
};

// Format message status timestamps (delivered, seen)
export const formatStatusTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
  const timeFormat = getTimeFormat();
  
  if (isToday(date)) {
    return timeFormat === '24' ? format(date, 'HH:mm') : format(date, 'h:mm a');
  }
  
  if (isYesterday(date)) {
    const timeStr = timeFormat === '24' ? format(date, 'HH:mm') : format(date, 'h:mm a');
    return `Yesterday ${timeStr}`;
  }
  
  if (isThisYear(date)) {
    const timeStr = timeFormat === '24' ? format(date, 'HH:mm') : format(date, 'h:mm a');
    return `${format(date, 'MMM d')} ${timeStr}`;
  }
  
  const timeStr = timeFormat === '24' ? format(date, 'HH:mm') : format(date, 'h:mm a');
  return `${format(date, 'MMM d, yyyy')} ${timeStr}`;
};

// Group messages by date for efficient rendering
export const groupMessagesByDate = (messages) => {
  if (!messages || messages.length === 0) return [];
  
  const grouped = [];
  let currentGroup = null;
  
  messages.forEach((message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const dateSeparator = getDateSeparator(message.createdAt, previousMessage?.createdAt);
    
    // If we need a date separator, start a new group
    if (dateSeparator) {
      if (currentGroup) {
        grouped.push(currentGroup);
      }
      
      currentGroup = {
        date: dateSeparator,
        messages: [message]
      };
    } else {
      // Add to current group or create first group
      if (currentGroup) {
        currentGroup.messages.push(message);
      } else {
        currentGroup = {
          date: getDateLabel(message.createdAt),
          messages: [message]
        };
      }
    }
  });
  
  // Add the last group
  if (currentGroup) {
    grouped.push(currentGroup);
  }
  
  return grouped;
};
