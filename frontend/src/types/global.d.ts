declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

// iOS Safari専用のstandaloneプロパティを追加
interface Navigator {
  standalone?: boolean
}
