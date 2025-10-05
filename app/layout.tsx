// File: app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import Header from './components/Header'; // <-- 1. IMPORT
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
          <Header /> {/* <-- 2. RENDER THE HEADER */}
          <main style={{ padding: '2rem' }}>
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}