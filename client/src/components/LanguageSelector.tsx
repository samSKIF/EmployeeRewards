import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Set the appropriate direction on component mount and language change
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // This also works with RTL languages like Arabic
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    setIsOpen(false);
  };

  // Map of language codes to names and flags
  const languages = [
    { code: 'en', name: t('language.english'), flag: '🇬🇧' },
    { code: 'fr', name: t('language.french'), flag: '🇫🇷' },
    { code: 'ar', name: t('language.arabic'), flag: '🇸🇦' },
    { code: 'es', name: t('language.spanish'), flag: '🇪🇸' },
    { code: 'ru', name: t('language.russian'), flag: '🇷🇺' },
  ];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center focus:outline-none">
                <div className="flex items-center justify-center rounded-full p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                  <Globe className="h-5 w-5" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`cursor-pointer flex items-center py-2 px-4 ${i18n.language === lang.code ? 'bg-primary/10' : ''}`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    <span>{lang.name}</span>
                    {i18n.language === lang.code && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('language.selectLanguage')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default LanguageSelector;
