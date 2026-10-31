import Icon from './Icon.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
    <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15}/><span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
  </button>;
}
