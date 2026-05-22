'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'rw', label: 'Kinyarwanda' },
] as const;

const STORAGE_KEY = 'financeflow-language';

export function LanguageSelector() {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
    if (storedLanguage) {
      setLanguage(storedLanguage);
    }
  }, []);

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    window.localStorage.setItem(STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent('languagechange', { detail: code }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-border" aria-label="Change language">
          <Globe className="h-[1.15rem] w-[1.15rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 border-border bg-background/95 text-foreground shadow-xl backdrop-blur-sm supports-[backdrop-filter]:bg-background/90"
      >
        <DropdownMenuLabel>Select Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onSelect={() => handleLanguageChange(item.code)}
            className="flex items-center justify-between"
          >
            <span>{item.label}</span>
            {language === item.code ? <span className="text-primary">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
