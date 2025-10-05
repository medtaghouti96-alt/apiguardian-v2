// File: app/components/Header.tsx
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Header() {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #eee' }}>
      <Link href="/" style={{ fontWeight: 'bold', textDecoration: 'none', color: 'inherit', fontSize: '1.2rem' }}>
        APIGuardian
      </Link>
      <nav>
        <SignedOut>
          <SignInButton mode="modal">
            <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Sign In</button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" style={{ marginRight: '1rem', textDecoration: 'none', color: 'inherit' }}>
            Dashboard
          </Link>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </nav>
    </header>
  );
}