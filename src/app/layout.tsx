import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '儿童绘本生成器',
    template: '%s | 儿童绘本生成器',
  },
  description:
    '使用 AI 生成精美的儿童绘本故事和插画',
  keywords: [
    '儿童绘本',
    'AI 故事',
    '绘本生成器',
    'AI 绘画',
  ],
  authors: [{ name: 'Storybook Generator', url: 'https://github.com/chenhao620806/storybook-generator' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
