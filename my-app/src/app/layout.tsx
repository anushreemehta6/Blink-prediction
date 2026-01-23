import type { Metadata } from 'next';
import { Inter, Spicy_Rice } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from '@/context/WalletContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const spicyRice = Spicy_Rice({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-spicy-rice'
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
      <body className={`${inter.className} ${spicyRice.variable}`}>
        <WalletProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}