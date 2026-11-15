import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Inter na Mesa • Energia pra torcida', description: 'Sua alimentação no Inter, de 20 a 22 de novembro de 2026. Escolha, pague com Pix e retire com QR Code.', manifest: '/manifest.webmanifest', appleWebApp: { capable: true, title: 'Inter na Mesa', statusBarStyle: 'default' }, icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f6f5f0' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }
