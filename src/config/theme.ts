// テーマ設定の型定義
export interface ThemeConfig {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    like: string
    pass: string
    superlike: string
  }
  gradients: {
    primary: string
    secondary: string
    card: string
  }
  shadows: {
    card: string
    button: string
  }
}

// 犬テーマ
export const dogTheme: ThemeConfig = {
  colors: {
    primary: '#F97316', // オレンジ
    secondary: '#FB923C',
    accent: '#FDBA74',
    background: '#FFF7ED',
    surface: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    like: '#10B981', // 緑
    pass: '#EF4444', // 赤
    superlike: '#8B5CF6', // 紫
  },
  gradients: {
    primary: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
    secondary: 'linear-gradient(135deg, #FB923C 0%, #FDBA74 100%)',
    card: 'linear-gradient(145deg, #FFFFFF 0%, #F9FAFB 100%)',
  },
  shadows: {
    card: '0 10px 25px -3px rgba(249, 115, 22, 0.1), 0 4px 6px -2px rgba(249, 115, 22, 0.05)',
    button: '0 4px 14px 0 rgba(249, 115, 22, 0.25)',
  },
}

// 猫テーマ
export const catTheme: ThemeConfig = {
  colors: {
    primary: '#EC4899', // ピンク
    secondary: '#F472B6',
    accent: '#FBCFE8',
    background: '#FDF2F8',
    surface: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    like: '#10B981', // 緑
    pass: '#EF4444', // 赤
    superlike: '#8B5CF6', // 紫
  },
  gradients: {
    primary: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
    secondary: 'linear-gradient(135deg, #F472B6 0%, #FBCFE8 100%)',
    card: 'linear-gradient(145deg, #FFFFFF 0%, #F9FAFB 100%)',
  },
  shadows: {
    card: '0 10px 25px -3px rgba(236, 72, 153, 0.1), 0 4px 6px -2px rgba(236, 72, 153, 0.05)',
    button: '0 4px 14px 0 rgba(236, 72, 153, 0.25)',
  },
}

// デフォルトテーマ（汎用）
export const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#3B82F6', // ブルー
    secondary: '#60A5FA',
    accent: '#DBEAFE',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    like: '#10B981',
    pass: '#EF4444',
    superlike: '#8B5CF6',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
    secondary: 'linear-gradient(135deg, #60A5FA 0%, #DBEAFE 100%)',
    card: 'linear-gradient(145deg, #FFFFFF 0%, #F9FAFB 100%)',
  },
  shadows: {
    card: '0 10px 25px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)',
    button: '0 4px 14px 0 rgba(59, 130, 246, 0.25)',
  },
}

// テーママップ
export const themes = {
  dog: dogTheme,
  cat: catTheme,
  default: defaultTheme,
} as const

export type ThemeType = keyof typeof themes

// テーマCSS変数を生成する関数
export const generateThemeCSS = (theme: ThemeConfig): string => {
  return `
    --theme-primary: ${theme.colors.primary};
    --theme-secondary: ${theme.colors.secondary};
    --theme-accent: ${theme.colors.accent};
    --theme-background: ${theme.colors.background};
    --theme-surface: ${theme.colors.surface};
    --theme-text: ${theme.colors.text};
    --theme-text-secondary: ${theme.colors.textSecondary};
    --theme-like: ${theme.colors.like};
    --theme-pass: ${theme.colors.pass};
    --theme-superlike: ${theme.colors.superlike};
    --theme-gradient-primary: ${theme.gradients.primary};
    --theme-gradient-secondary: ${theme.gradients.secondary};
    --theme-gradient-card: ${theme.gradients.card};
    --theme-shadow-card: ${theme.shadows.card};
    --theme-shadow-button: ${theme.shadows.button};
  `
}

// テーマを適用する関数
export const applyTheme = (themeType: ThemeType) => {
  const theme = themes[themeType]
  const css = generateThemeCSS(theme)
  
  // CSS変数をrootに適用
  const root = document.documentElement
  const lines = css.trim().split('\n')
  
  lines.forEach(line => {
    const [property, value] = line.trim().replace('--', '').split(': ')
    if (property && value) {
      root.style.setProperty(`--${property}`, value.replace(';', ''))
    }
  })
}