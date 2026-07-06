/**
 * SearchBar — Global search input for the dashboard.
 *
 * Prepared for multi-domain search integration. The component's structure
 * supports searching across all LifeOS domains without any refactoring:
 *   - Chats
 *   - Planner tasks
 *   - Reminders
 *   - Finance entries
 *   - Travel itineraries
 *   - Wellness logs
 *
 * Props:
 *   value       — string        — controlled input value (future: from parent state)
 *   onChange    — (val) => void — updates parent search state
 *   onSearch    — (val) => void — fires on Enter or submit; future: calls search API
 *   placeholder — string        — override default placeholder text
 *   isLoading   — boolean       — shows a spinner while search is in progress (future)
 *
 * Current state: Uncontrolled local state, no backend calls.
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Search } from 'lucide-react';

function SearchBar({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'Search tasks, reminders, trips…',
  isLoading = false,
}) {
  /* Support both controlled (value prop) and uncontrolled usage */
  const [localValue, setLocalValue] = useState('');
  const isControlled = controlledValue !== undefined;
  const inputValue = isControlled ? controlledValue : localValue;

  const handleChange = (e) => {
    const val = e.target.value;
    if (!isControlled) setLocalValue(val);
    onChange?.(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch?.(inputValue);
    }
  };

  return (
    <div className="flex-1 md:flex-initial flex justify-center max-w-full md:max-w-[420px] md:w-[420px] px-2">
      <div className="relative w-full group">
        {/* Search icon */}
        <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-violet-400 transition-colors duration-200 pointer-events-none">
          {isLoading ? (
            /* Future: spinner while search results are loading */
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
          ) : (
            <Search size={18} />
          )}
        </span>

        <input
          id="dashboard-search"
          type="search"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search LifeOS — tasks, reminders, trips and more"
          autoComplete="off"
          className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-900/90 text-sm text-white placeholder-slate-500 border border-white/5 outline-none transition-all duration-200 focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20"
        />
      </div>
    </div>
  );
}

SearchBar.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onSearch: PropTypes.func,
  placeholder: PropTypes.string,
  isLoading: PropTypes.bool,
};

export default SearchBar;
