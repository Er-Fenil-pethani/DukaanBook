import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={`Switch to ${next} theme`}
      aria-label={`Switch to ${next} theme`}
      className="h-9 w-9"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 transition-all" />
      ) : (
        <Moon className="h-4 w-4 transition-all" />
      )}
    </Button>
  );
}
