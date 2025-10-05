// File: app/pricing/page.tsx
import Link from 'next/link';

// Simple inline styles for demonstration
const sectionStyle = { maxWidth: '1000px', margin: '2rem auto', textAlign: 'center' as const };
const h1Style = { fontSize: '2.5rem', marginBottom: '1rem' };
const pStyle = { fontSize: '1.1rem', color: '#666', lineHeight: '1.6', maxWidth: '600px', margin: 'auto' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '3rem', textAlign: 'left' as const };
const cardStyle = { border: '1px solid #eee', padding: '2rem', borderRadius: '8px' };
const planNameStyle = { fontSize: '1.5rem', fontWeight: 'bold' };
const priceStyle = { fontSize: '2.5rem', fontWeight: 'bold', margin: '1rem 0' };
const featureListStyle = { listStyle: 'none', padding: 0, margin: '2rem 0' };
const featureItemStyle = { marginBottom: '0.75rem' };
const buttonStyle = { fontSize: '1rem', padding: '0.8rem 1.5rem', cursor: 'pointer', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', textDecoration: 'none', display: 'block', textAlign: 'center' as const };

export default function PricingPage() {
  return (
    <section style={sectionStyle}>
      <h1 style={h1Style}>Simple, Transparent Pricing</h1>
      <p style={pStyle}>
        Start for free and scale as you grow. Our goal is to provide peace of mind,
        not another unpredictable bill.
      </p>

      <div style={gridStyle}>
        {/* --- Free Tier --- */}
        <div style={cardStyle}>
          <p style={planNameStyle}>Free</p>
          <p style={priceStyle}>$0<span style={{ fontSize: '1rem', color: '#666' }}>/month</span></p>
          <ul style={featureListStyle}>
            <li style={featureItemStyle}>✓ 50,000 Requests/mo</li>
            <li style={featureItemStyle}>✓ Real-time Dashboard</li>
            <li style={featureItemStyle}>✓ Email Alerts (Coming Soon)</li>
            <li style={featureItemStyle}>- Hard Budget Limits</li>
            <li style={featureItemStyle}>- Webhook Notifications</li>
          </ul>
          <Link href="/dashboard" style={{...buttonStyle, background: '#555'}}>Get Started</Link>
        </div>

        {/* --- Startup Tier --- */}
        <div style={{ ...cardStyle, border: '2px solid #0070f3' }}>
          <p style={planNameStyle}>Startup</p>
          <p style={priceStyle}>$29<span style={{ fontSize: '1rem', color: '#666' }}>/month</span></p>
          <ul style={featureListStyle}>
            <li style={featureItemStyle}>✓ 1,000,000 Requests/mo</li>
            <li style={featureItemStyle}>✓ Real-time Dashboard</li>
            <li style={featureItemStyle}>✓ Email Alerts (Coming Soon)</li>
            <li style={featureItemStyle}>✓ Hard Budget Limits</li>
            <li style={featureItemStyle}>✓ Webhook Notifications</li>
          </ul>
          <Link href="/dashboard/billing" style={buttonStyle}>Choose Startup</Link>
        </div>

        {/* --- Business Tier --- */}
        <div style={cardStyle}>
          <p style={planNameStyle}>Business</p>
          <p style={priceStyle}>$79<span style={{ fontSize: '1rem', color: '#666' }}>/month</span></p>
          <ul style={featureListStyle}>
            <li style={featureItemStyle}>✓ 5,000,000 Requests/mo</li>
            <li style={featureItemStyle}>✓ All features in Startup</li>
            <li style={featureItemStyle}>✓ Per-User Controls (Coming Soon)</li>
            <li style={featureItemStyle}>✓ Team Members (Coming Soon)</li>
            <li style={featureItemStyle}>✓ Priority Support</li>
          </ul>
          <Link href="/dashboard/billing" style={{...buttonStyle, background: '#555'}}>Choose Business</Link>
        </div>
      </div>
    </section>
  );
}