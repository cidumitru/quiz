import { Injectable, signal, effect, inject, DOCUMENT } from '@angular/core';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private document = inject(DOCUMENT);
  
  // Signal to track current theme
  public theme = signal<Theme>('auto');
  
  // Signal to track if dark mode is currently active
  public isDarkMode = signal<boolean>(false);

  constructor() {
    // Load saved theme from localStorage
    this.loadTheme();
    
    // Apply theme changes to document
    effect(() => {
      this.applyTheme(this.theme());
    });
    
    // Listen for system theme changes
    this.watchSystemTheme();
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      this.theme.set(savedTheme);
    } else {
      this.theme.set('auto');
    }
  }

  private applyTheme(theme: Theme): void {
    const body = this.document.body;
    const html = this.document.documentElement;
    
    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');
    html.classList.remove('light-theme', 'dark-theme');
    
    let isDark = false;
    
    switch (theme) {
      case 'light':
        body.classList.add('light-theme');
        html.classList.add('light-theme');
        isDark = false;
        break;
      case 'dark':
        body.classList.add('dark-theme');
        html.classList.add('dark-theme');
        isDark = true;
        break;
      case 'auto':
      default:
        // Use system preference
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          body.classList.add('dark-theme');
          html.classList.add('dark-theme');
        } else {
          body.classList.add('light-theme');
          html.classList.add('light-theme');
        }
        break;
    }
    
    this.isDarkMode.set(isDark);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }

  private watchSystemTheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.theme() === 'auto') {
        this.applyTheme('auto');
      }
    });
  }

  public toggleTheme(): void {
    const currentTheme = this.theme();
    let nextTheme: Theme;
    
    // Cycle through: auto -> light -> dark -> auto
    switch (currentTheme) {
      case 'auto':
        nextTheme = 'light';
        break;
      case 'light':
        nextTheme = 'dark';
        break;
      case 'dark':
        nextTheme = 'auto';
        break;
      default:
        nextTheme = 'auto';
    }
    
    this.theme.set(nextTheme);
  }

  public setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  public getThemeIcon(): string {
    const theme = this.theme();
    switch (theme) {
      case 'light':
        return 'light_mode';
      case 'dark':
        return 'dark_mode';
      case 'auto':
      default:
        return 'brightness_auto';
    }
  }

  public getThemeLabel(): string {
    const theme = this.theme();
    switch (theme) {
      case 'light':
        return 'Light theme';
      case 'dark':
        return 'Dark theme';
      case 'auto':
      default:
        return 'Auto theme';
    }
  }
}