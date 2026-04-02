/**
 * SentimentHeatmap — Political sector volatility heatmap using Framer Motion.
 *
 * Each sector is rendered as an animated tile whose background colour is
 * driven by its Volatility Score (0-100).  Tiles with a Policy Shift Alert
 * pulse via Framer Motion's keyframe animation.
 */

import { motion } from 'framer-motion';
import type { PoliticalSector } from '@goldshore/engine-durable';

export interface SectorSignal {
  sector: PoliticalSector;
  /** Volatility Score 0-100 */
  score: number;
  /** True when score >= POLICY_SHIFT_THRESHOLD */
  alert: boolean;
}

interface Props {
  signals: SectorSignal[];
}

/** Maps a 0-100 score to a heatmap colour (green → yellow → red) */
function scoreToColor(score: number): string {
  if (score < 35) return '#22c55e';  // low — green
  if (score < 55) return '#84cc16';  // guarded — lime
  if (score < 65) return '#eab308';  // elevated — yellow
  if (score < 80) return '#f97316';  // high — orange
  return '#ef4444';                  // critical — red
}

const SECTOR_LABELS: Record<PoliticalSector, string> = {
  defense: 'DEFENSE',
  tech: 'TECH',
  energy: 'ENERGY',
  healthcare: 'HEALTHCARE',
  finance: 'FINANCE',
};

export function SentimentHeatmap({ signals }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '0.75rem',
      }}
    >
      {signals.map(({ sector, score, alert }) => {
        const color = scoreToColor(score);
        return (
          <motion.div
            key={sector}
            animate={
              alert
                ? { opacity: [1, 0.45, 1], scale: [1, 1.04, 1] }
                : { opacity: 1, scale: 1 }
            }
            transition={alert ? { duration: 1.4, repeat: Infinity } : {}}
            style={{
              background: `${color}18`,
              border: `1px solid ${color}55`,
              borderRadius: '8px',
              padding: '1rem 0.75rem',
              textAlign: 'center',
              cursor: 'default',
            }}
          >
            <div
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '0.65rem',
                letterSpacing: '0.12em',
                color: '#64748b',
                marginBottom: '0.5rem',
              }}
            >
              {SECTOR_LABELS[sector]}
            </div>

            <div
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '1.75rem',
                fontWeight: 700,
                color,
                lineHeight: 1,
              }}
            >
              {score}
            </div>

            <div
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '0.6rem',
                color: '#475569',
                marginTop: '0.25rem',
              }}
            >
              VOL SCORE
            </div>

            {alert && (
              <div
                style={{
                  marginTop: '0.5rem',
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.55rem',
                  letterSpacing: '0.1em',
                  color,
                }}
              >
                ⚡ POLICY SHIFT
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
