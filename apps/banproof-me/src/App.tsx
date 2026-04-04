import { RiskRadarSnapshot } from '@goldshore/types';
import { classifyRiskLevel } from '@goldshore/engine-durable';
import { RiskRadar } from './components/radar/RiskRadar';
import { SentimentHeatmap } from './components/quant/SentimentHeatmap';

const MOCK_SNAPSHOT: RiskRadarSnapshot = {
  id: 'rr_demo',
  accountId: 'acc_123',
  timestamp: new Date().toISOString(),
  totalExposure: 72400,
  exposureByClass: { equities: 54000, sports: 12000, tcg: 6400 },
  liquidityScore: 68,
  externalThreatLevel: 58,
};

const MOCK_SIGNALS = [
  { sector: 'defense' as const, score: 72, alert: true },
  { sector: 'tech' as const, score: 41, alert: false },
  { sector: 'energy' as const, score: 65, alert: true },
  { sector: 'healthcare' as const, score: 30, alert: false },
  { sector: 'finance' as const, score: 55, alert: false },
];

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: '100vh',
    padding: '2rem',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    gridColumn: '1 / -1',
    borderBottom: '1px solid #1e2535',
    paddingBottom: '1rem',
    marginBottom: '0.5rem',
  },
  title: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    fontSize: '2rem',
    letterSpacing: '-0.02em',
    color: '#7df9c8',
  },
  riskLabel: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '0.85rem',
    letterSpacing: '0.1em',
    marginTop: '0.25rem',
    color: '#f97316',
  },
  card: {
    background: '#111520',
    borderRadius: '12px',
    border: '1px solid #1e2535',
    padding: '1.5rem',
  },
  cardTitle: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '0.8rem',
    letterSpacing: '0.15em',
    color: '#64748b',
    textTransform: 'uppercase' as const,
    marginBottom: '1rem',
  },
};

export default function App() {
  const riskLevel = classifyRiskLevel(MOCK_SNAPSHOT);

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <h1 style={styles.title}>BANPROOF INTELLIGENCE</h1>
        <p style={styles.riskLabel}>RISK_LEVEL: {riskLevel}</p>
      </header>

      <div style={styles.card}>
        <p style={styles.cardTitle}>Risk Radar — 360° Exposure</p>
        <RiskRadar snapshot={MOCK_SNAPSHOT} />
      </div>

      <div style={styles.card}>
        <p style={styles.cardTitle}>Pol-Quant — Sector Volatility</p>
        <SentimentHeatmap signals={MOCK_SIGNALS} />
      </div>
    </div>
  );
}
