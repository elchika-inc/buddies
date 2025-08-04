# PawMatch UI/UX設計書

## 1. デザイン原則

### 1.1 基本原則
- **シンプルさ**: 直感的で迷わない操作
- **一貫性**: 統一されたデザイン言語
- **アクセシビリティ**: すべてのユーザーが使いやすい
- **感情的つながり**: 動物への愛着を深める体験

### 1.2 デザインフィロソフィー
- **動物ファースト**: 動物の魅力を最大限に伝える
- **ストレスフリー**: 楽しい体験を提供
- **信頼性**: 安心して利用できる環境
- **包括性**: 多様なユーザーに対応

## 2. ビジュアルデザイン

### 2.1 カラーパレット
```
Primary Colors:
├── 犬アプリ (DogMatch)
│   ├── メイン: #2563eb (青)
│   ├── アクセント: #dc2626 (赤)
│   └── 成功: #16a34a (緑)
├── 猫アプリ (CatMatch)
│   ├── メイン: #7c3aed (紫)
│   ├── アクセント: #ea580c (オレンジ)
│   └── 成功: #16a34a (緑)
└── 共通色
    ├── 背景: #f8fafc (オフホワイト)
    ├── テキスト: #1f2937 (ダークグレー)
    ├── 境界線: #e5e7eb (ライトグレー)
    └── エラー: #dc2626 (赤)
```

### 2.2 タイポグラフィ
```
Font Family:
├── 日本語: 'Noto Sans JP', sans-serif
├── 英語: 'Inter', sans-serif
└── フォールバック: system-ui, sans-serif

Font Sizes:
├── 見出し1: 2.25rem (36px)
├── 見出し2: 1.875rem (30px)
├── 見出し3: 1.5rem (24px)
├── 本文: 1rem (16px)
├── 小文字: 0.875rem (14px)
└── 極小: 0.75rem (12px)

Font Weights:
├── 細字: 300
├── 通常: 400
├── 中字: 500
├── 太字: 600
└── 極太: 700
```

### 2.3 アイコンシステム
```
アイコンライブラリ: Lucide React
├── サイズ: 16px, 20px, 24px, 32px
├── ストローク: 1.5px-2px
├── スタイル: ミニマル、現代的
└── 色: テーマカラーに追従

主要アイコン:
├── Heart: お気に入り
├── X: パス
├── Star: 特にお気に入り
├── Dog: 犬
├── Cat: 猫
├── MapPin: 位置情報
├── Calendar: 年齢・日付
└── Info: 詳細情報
```

## 3. レイアウト設計

### 3.1 グリッドシステム
```
Grid System (TailwindCSS):
├── 基本グリッド: 12カラム
├── ブレイクポイント:
│   ├── mobile: 320px-768px
│   ├── tablet: 768px-1024px
│   └── desktop: 1024px+
├── ガター: 16px (モバイル), 24px (デスクトップ)
└── 最大幅: 1280px
```

### 3.2 スペーシング
```
Spacing Scale:
├── xs: 4px
├── sm: 8px
├── md: 16px
├── lg: 24px
├── xl: 32px
├── 2xl: 48px
└── 3xl: 64px
```

### 3.3 コンポーネント階層
```
Layout Hierarchy:
├── App Container
│   ├── Header (固定)
│   ├── Main Content (スクロール可能)
│   │   ├── SwipeArea
│   │   │   ├── Card Stack
│   │   │   └── Action Buttons
│   │   └── Side Panels (デスクトップ)
│   └── Footer (固定)
```

## 4. 画面設計

### 4.1 アプリ選択画面
```
AppSelector Screen:
├── Layout: 縦中央配置
├── Background: グラデーション背景
├── Content:
│   ├── ロゴ・タイトル
│   ├── 選択カード (DogMatch/CatMatch)
│   │   ├── 動物イラスト
│   │   ├── アプリ名
│   │   ├── 説明文
│   │   └── 開始ボタン
│   └── フッター情報
└── Animation: フェードイン、ホバー効果
```

### 4.2 メインスワイプ画面
```
Main Swipe Screen:
├── Layout: フルスクリーン
├── Components:
│   ├── Header
│   │   ├── アプリ名・アイコン
│   │   ├── 進捗インジケーター
│   │   └── メニューボタン
│   ├── Card Area (中央)
│   │   ├── Current Card (最前面)
│   │   ├── Next Card (背面)
│   │   └── Card Stack Shadow
│   ├── Action Buttons (下部)
│   │   ├── Pass Button
│   │   ├── Like Button
│   │   └── SuperLike Button
│   └── Side Navigation (デスクトップ)
│       ├── Favorites
│       ├── History
│       └── Settings
```

### 4.3 動物カード設計
```
Animal Card:
├── Size: 320px × 480px (mobile), 400px × 600px (desktop)
├── Border Radius: 16px
├── Shadow: 0 8px 32px rgba(0,0,0,0.1)
├── Structure:
│   ├── Image Area (70%)
│   │   ├── Main Image
│   │   ├── Image Indicators
│   │   └── Image Navigation
│   ├── Info Area (30%)
│   │   ├── Name (h2)
│   │   ├── Basic Info (age, gender, size)
│   │   ├── Location
│   │   ├── Personality Tags
│   │   └── Health Status
│   └── Overlay Elements
│       ├── Swipe Indicators
│       └── Action Feedback
```

## 5. インタラクション設計

### 5.1 スワイプインタラクション
```
Swipe Gestures:
├── Drag Start:
│   ├── Card elevation increase
│   ├── Next card partially visible
│   └── Action buttons highlight
├── Drag Progress:
│   ├── Card rotation (0-15°)
│   ├── Opacity change (0.7-1.0)
│   ├── Color overlay (direction-based)
│   └── Action button feedback
├── Drag End:
│   ├── Success: Card flies off screen
│   ├── Failure: Card returns to center
│   └── Next card moves to front
└── Timing: 
    ├── Animation duration: 300ms
    ├── Easing: cubic-bezier(0.4, 0, 0.2, 1)
    └── Stagger: 100ms between elements
```

### 5.2 ボタンインタラクション
```
Action Buttons:
├── Normal State:
│   ├── Size: 64px diameter
│   ├── Shadow: 0 2px 8px rgba(0,0,0,0.1)
│   └── Icon: 24px
├── Hover State:
│   ├── Scale: 1.1
│   ├── Shadow: 0 4px 16px rgba(0,0,0,0.15)
│   └── Color: brightness(1.1)
├── Press State:
│   ├── Scale: 0.95
│   ├── Shadow: 0 1px 4px rgba(0,0,0,0.1)
│   └── Duration: 150ms
└── Disabled State:
    ├── Opacity: 0.5
    ├── Cursor: not-allowed
    └── No interaction
```

### 5.3 フィードバック
```
Visual Feedback:
├── Success Actions:
│   ├── Color: Green overlay
│   ├── Icon: Check mark
│   ├── Animation: Scale + fade
│   └── Haptic: Light impact
├── Error Actions:
│   ├── Color: Red overlay
│   ├── Icon: X mark
│   ├── Animation: Shake
│   └── Haptic: Error vibration
└── Loading States:
    ├── Skeleton screens
    ├── Shimmer effects
    ├── Progress indicators
    └── Spinner animations
```

## 6. レスポンシブデザイン

### 6.1 モバイルファースト設計
```
Mobile Design (320px-768px):
├── Layout: Single column
├── Card Size: 90vw × 70vh (max 320px × 480px)
├── Touch Targets: 44px minimum
├── Navigation: Bottom tab bar
├── Gestures: Swipe, tap, pinch
└── Typography: 16px+ for body text
```

### 6.2 タブレット最適化
```
Tablet Design (768px-1024px):
├── Layout: Centered content
├── Card Size: 400px × 600px
├── Side Panels: Collapsible
├── Touch & Mouse: Hybrid interaction
├── Navigation: Top navigation
└── Grid: 2-column for lists
```

### 6.3 デスクトップ強化
```
Desktop Design (1024px+):
├── Layout: Multi-column
├── Card Size: 400px × 600px
├── Side Panels: Always visible
├── Mouse Interaction: Hover states
├── Keyboard: Shortcuts support
└── Grid: 3-4 column for lists
```

## 7. アニメーション設計

### 7.1 マイクロインタラクション
```
Micro-interactions:
├── Button Hover: Scale(1.05) + Shadow
├── Card Hover: Scale(1.02) + Shadow
├── Loading: Pulse animation
├── Success: Scale bounce
├── Error: Shake animation
└── Page Transition: Slide + fade
```

### 7.2 ページトランジション
```
Page Transitions:
├── Route Change: Fade + slide
├── Modal Open: Scale + fade
├── Modal Close: Scale + fade
├── Card Flip: 3D rotation
├── List Expand: Height + opacity
└── Duration: 200-400ms
```

### 7.3 スワイプアニメーション
```
Swipe Animation Stages:
├── Preparation:
│   ├── Card lift: translateZ(10px)
│   ├── Shadow increase: 0 8px 32px
│   └── Duration: 100ms
├── Active Drag:
│   ├── Real-time transform
│   ├── Rotation: translateX * 0.1
│   ├── Opacity: 0.7 - 1.0
│   └── No transition (immediate)
├── Success:
│   ├── Fly-out animation
│   ├── Direction: Based on swipe
│   ├── Duration: 300ms
│   └── Easing: ease-out
└── Failure:
    ├── Return animation
    ├── Transform: translate(0, 0)
    ├── Duration: 200ms
    └── Easing: ease-in-out
```

## 8. アクセシビリティ

### 8.1 WAI-ARIA対応
```
Accessibility Features:
├── Semantic HTML: Proper element usage
├── ARIA Labels: Screen reader support
├── Keyboard Navigation: Tab order
├── Focus Management: Visible focus
├── Color Contrast: WCAG 2.1 AA
└── Alternative Text: Image descriptions
```

### 8.2 キーボード操作
```
Keyboard Shortcuts:
├── Arrow Keys: Card navigation
├── Enter: Primary action
├── Space: Secondary action
├── Escape: Cancel/close
├── Tab: Element navigation
└── Shift+Tab: Reverse navigation
```

### 8.3 スクリーンリーダー対応
```
Screen Reader Support:
├── Alt Text: Detailed image descriptions
├── Live Regions: Dynamic content updates
├── Landmarks: Page structure
├── Headings: Proper hierarchy
├── Labels: Form and button labels
└── Descriptions: Additional context
```

## 9. パフォーマンス最適化

### 9.1 画像最適化
```
Image Optimization:
├── Lazy Loading: Intersection Observer
├── Responsive Images: srcset + sizes
├── Format: WebP with fallback
├── Compression: 80% quality
├── Placeholder: Blur-up technique
└── Preloading: Critical images
```

### 9.2 アニメーション最適化
```
Animation Performance:
├── GPU Acceleration: transform + opacity
├── Composite Layers: will-change
├── Reduce Reflows: Avoid layout triggers
├── 60fps Target: 16ms per frame
├── Memory Management: Cleanup listeners
└── Reduced Motion: Respect user preference
```

### 9.3 レンダリング最適化
```
Rendering Optimization:
├── Virtual Scrolling: Large lists
├── Memoization: React.memo
├── Debouncing: Input handling
├── Throttling: Scroll events
├── Bundle Splitting: Code splitting
└── Caching: Service worker
```

## 10. テーマシステム

### 10.1 ライトテーマ
```
Light Theme:
├── Background: #ffffff
├── Surface: #f8fafc
├── Primary: Brand colors
├── Text: #1f2937
├── Border: #e5e7eb
└── Shadow: rgba(0,0,0,0.1)
```

### 10.2 ダークテーマ（将来対応）
```
Dark Theme:
├── Background: #1f2937
├── Surface: #374151
├── Primary: Adjusted brand colors
├── Text: #f9fafb
├── Border: #4b5563
└── Shadow: rgba(0,0,0,0.3)
```

### 10.3 アクセシビリティテーマ
```
Accessibility Theme:
├── High Contrast: Enhanced contrast ratios
├── Large Text: 1.2x text scaling
├── Focus Indicators: Enhanced visibility
├── Reduced Motion: Minimal animations
├── Color Blind: Pattern + color coding
└── Screen Reader: Enhanced semantics
```