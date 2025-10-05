// File: app/page.tsx
import Link from 'next/link';

// Simple inline styles for demonstration
const sectionStyle = { maxWidth: '800px', margin: '4rem auto', textAlign: 'center' as const };
const h1Style = { fontSize: '3rem', marginBottom: '1rem' };
const pStyle = { fontSize: '1.2rem', color: '#666', lineHeight: '1.6' };
const buttonStyle = { fontSize: '1.1rem', padding: '0.8rem 1.5rem', cursor: 'pointer', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', textDecoration: 'none' };

export default function HomePage() {
  return (
    <div>
      {/* --- Hero Section --- */}
      <section style={sectionStyle}>
        <h1 style={h1Style}>Never Get a Surprise AI Bill Again.</h1>
        <p style={pStyle}>
          APIGuardian is the simple firewall for your AI wallet. Monitor your API usage in real-time,
          set a hard budget, and get alerted before you overspend. Sleep soundly.
        </p>
        <Link href="/dashboard" style={buttonStyle}>
          Get Started for Free
        </Link>
      </section>

      {/* --- Problem/Solution Section --- */}
      <section style={{ ...sectionStyle, background: '#fafafa', padding: '2rem', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '2rem' }}>From "Oh No" to "No Problem"</h2>
        <p style={pStyle}>
          A simple bug or a viral post can turn your affordable AI feature into a five-figure nightmare.
          APIGuardian acts as a circuit breaker, blocking requests the moment you hit your budget,
          turning a potential disaster into a predictable expense.
        </p>
        {/* You could add screenshots here later */}
      </section>

      {/* --- Features Section --- */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: '2rem' }}>Monitor, Block, and Alert.</h2>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
          <div style={{ flex: 1 }}>
            <h3>Real-Time Monitoring</h3>
            <p>See every request and its cost appear on your dashboard instantly. No more waiting 24 hours for your provider&apos;s dashboard to update.</p>
          </div>
          <div style={{ flex: 1 }}>
            <h3>Hard Budget Limits</h3>
            <p>Set a monthly budget, and we&apos;ll automatically block all requests when it&apos;s reached. The ultimate financial safety net.</p>
          </div>
          <div style={{ flex: 1 }}>
            <h3>Proactive Alerts</h3>
            <p>Get webhook notifications when you cross 80% and 100% of your budget, so you&apos;re always in the loop.</p>
          </div>
        </div>
      </section>
    </div>
  );
}