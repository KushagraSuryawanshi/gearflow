import { useTheme } from '../app/useTheme';
import { Icon } from './Icon';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';
  const label = `Switch to ${next} theme`;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
    >
      <Icon name={next === 'dark' ? 'moon' : 'sun'} size={17} />
      <span>{next === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
