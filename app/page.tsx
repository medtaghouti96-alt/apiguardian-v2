// File: app/page.tsx
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #eee' }}>
        <h1>APIGuardian</h1>
        <div>
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>
      <main style={{ padding: '1rem' }}>
        <h2>Welcome to the AI Firewall</h2>
        <p>Sign up or sign in to protect your API keys.</p>
      </main>
    </div>
  );
}