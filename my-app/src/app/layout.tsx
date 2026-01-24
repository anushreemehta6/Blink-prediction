import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Orbitron } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from '@/context/WalletContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});
const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
});

export const metadata: Metadata = {
  title: '3HIRTY - 30-Second Prediction Markets',
  description: 'Ultra-fast prediction markets on Monad. Bet on ETH price movements in 30-second rounds.',
  keywords: ['prediction market', 'monad', 'web3', 'defi', 'trading'],
  authors: [{ name: '3HIRTY Team' }],
  openGraph: {
    title: '3HIRTY - 30-Second Prediction Markets',
    description: 'Ultra-fast prediction markets on Monad',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3HIRTY - 30-Second Prediction Markets',
    description: 'Ultra-fast prediction markets on Monad',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${jetbrainsMono.variable} ${orbitron.variable}`}>
        <WalletProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0d1117',
                color: '#e6edf3',
                borderRadius: '8px',
                padding: '14px 18px',
                fontSize: '13px',
                fontWeight: '600',
                border: '1px solid rgba(0, 210, 106, 0.3)',
                fontFamily: 'var(--font-mono), monospace',
              },
              success: {
                iconTheme: { primary: '#00d26a', secondary: '#0d1117' },
              },
              error: {
                iconTheme: { primary: '#ff4757', secondary: '#0d1117' },
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}