import React, { useState } from 'react';

export function Calendar({ 
  className, 
  classNames, 
  showOutsideDays = true, 
  selected,
  onSelect,
  mode = "single",
  granularity,
  initialFocus,
  ...props 
}) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());
  
  // Get current date info
  const today = new Date();
  const currentDate = today.getDate();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  
  // Get month details
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // Create days for the calendar grid
  const generateCalendarDays = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Previous month days to show
    const prevMonthDays = [];
    if (showOutsideDays) {
      const daysInPrevMonth = new Date(year, month, 0).getDate();
      for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        prevMonthDays.push({
          date: new Date(year, month - 1, daysInPrevMonth - i),
          isCurrentMonth: false,
          isToday: false
        });
      }
    }
    
    // Current month days
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      currentMonthDays.push({
        date,
        isCurrentMonth: true,
        isToday: i === currentDate && month === currentMonthIndex && year === currentYear
      });
    }
    
    // Next month days to fill the grid
    const totalDaysShown = (prevMonthDays.length + currentMonthDays.length);
    const daysToAdd = totalDaysShown % 7 === 0 ? 0 : 7 - (totalDaysShown % 7);
    
    const nextMonthDays = [];
    if (showOutsideDays) {
      for (let i = 1; i <= daysToAdd; i++) {
        nextMonthDays.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
          isToday: false
        });
      }
    }
    
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };
  
  // Navigation functions
  const goToPreviousMonth = () => {
    const newMonth = new Date(year, month - 1, 1);
    setCurrentMonth(newMonth);
  };
  
  const goToNextMonth = () => {
    const newMonth = new Date(year, month + 1, 1);
    setCurrentMonth(newMonth);
  };
  
  // Day name headers
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  // Format month name
  const monthName = currentMonth.toLocaleString('default', { month: 'long' });
  
// Handle day selection
const handleDayClick = (day) => {
  if (onSelect) {
    // Always select the specific day that was clicked
    onSelect(day.date);
  }
};
  
// Check if a date is selected
const isSelected = (date) => {
  if (!selected) return false;
  
  // In month granularity mode, only highlight the specific selected date
  if (granularity === "month") {
    return date.getDate() === selected.getDate() && 
           date.getMonth() === selected.getMonth() && 
           date.getFullYear() === selected.getFullYear();
  }
  
  // For day selection - specific date matching
  return date.getDate() === selected.getDate() && 
         date.getMonth() === selected.getMonth() && 
         date.getFullYear() === selected.getFullYear();
};
  
  // Combine all calendar days
  const calendarDays = generateCalendarDays();
  
  return (
    <div className={`bg-gray-900 rounded-lg p-4 shadow-md ${className || ''}`} {...props}>
      {/* Header with month and navigation */}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={goToPreviousMonth}
          className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <div className="text-white font-medium">
          {monthName} {year}
        </div>
        
        <button 
          onClick={goToNextMonth}
          className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(day => (
          <div key={day} className="text-gray-400 text-xs font-medium text-center py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar days grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          // Special selection styling for current view month
          const isCurrentViewMonth = day.date.getMonth() === month && day.date.getFullYear() === year;
          const isSelectedDate = isSelected(day.date);
          
          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              type="button"
              className={`
                w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors
                ${!isCurrentViewMonth ? 'text-gray-600' : 'text-gray-300'}
                ${day.isToday ? 'bg-blue-900 text-white font-bold' : ''}
                ${isSelectedDate ? 'bg-blue-600 text-white' : ''}
                ${!isSelectedDate && !day.isToday ? 'hover:bg-gray-800' : ''}
              `}
              tabIndex={initialFocus && day.isToday ? 0 : undefined}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Default export for compatibility with both import styles
export default Calendar;