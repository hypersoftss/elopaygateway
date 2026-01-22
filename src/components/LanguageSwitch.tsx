import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n';

export const LanguageSwitch = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <span className="text-lg">
            {language === 'zh' ? '🇨🇳' : '🇬🇧'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem
          onClick={() => setLanguage('zh')}
          className={`gap-3 cursor-pointer ${language === 'zh' ? 'bg-accent' : ''}`}
        >
          <span className="text-lg">🇨🇳</span>
          <span>中文</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={`gap-3 cursor-pointer ${language === 'en' ? 'bg-accent' : ''}`}
        >
          <span className="text-lg">🇬🇧</span>
          <span>English</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
