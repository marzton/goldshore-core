/**
 * RiskRadar — SVG polar-coordinate radar chart animated with GSAP.
 *
 * Renders four axes:
 *   • Equities Exposure
 *   • Sports Exposure
 *   • TCG Exposure
 *   • Liquidity (inverted: low liquidity = higher risk)
 *   • External Threat
 */

import { useEffect, useRef } from 'react';
import { RiskRadarSnapshot } from '@goldshore/types';
import { classifyRiskLevel } from '@goldshore/engine-durable';

interface Props {
  snapshot: RiskRadarSnapshot;
}

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 120;
const RINGS = 4;

const AXES = [
  { label: 'EQUITIES', key: 'equities' as const },
  { label: 'SPORTS', key: 'sports' as const },
  { label: 'TCG', key: 'tcg' as const },
  { label: 'LIQUIDITY RISK', key: '_liquidity' as const },
  { label: 'EXT THREAT', key: '_threat' as const },
];

function toXY(angle: number, radius: number) {
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  };
}

function buildPolygon(values: number[]): string {
  return values
    .map((v, i) => {
      const angle = (i / values.length) * 2 * Math.PI - Math.PI / 2;
      const r = (v / 100) * R;
      const { x, y } = toXY(angle, r);
      return `${x},${y}`;
    })
    .join(' ');
}

export function RiskRadar({ snapshot }: Props) {
  const polygonRef = useRef<SVGPolygonElement>(null);
  const sweepRef = useRef<SVGLineElement>(null);
  const riskLevel = classifyRiskLevel(snapshot);

  const totalMax = Math.max(
    snapshot.totalExposure,
    1,
  );
  const values = [
    (snapshot.exposureByClass.equities / totalMax) * 100,
    (snapshot.exposureByClass.sports / totalMax) * 100,
    (snapshot.exposureByClass.tcg / totalMax) * 100,
    100 - snapshot.liquidityScore,
    snapshot.externalThreatLevel,
  ];

  useEffect(() => {
    let animFrame: number;
    let angle = 0;

    function animate() {
      if (!sweepRef.current) return;
      angle = (angle + 0.5) % 360;
      const rad = (angle * Math.PI) / 180 - Math.PI / 2;
      const { x, y } = toXY(rad, R);
      sweepRef.current.setAttribute('x2', String(x));
      sweepRef.current.setAttribute('y2', String(y));
      animFrame = requestAnimationFrame(animate);
    }

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const riskColors: Record<string, string> = {
    LOW: '#22c55e',
    ELEVATED: '#eab308',
    HIGH: '#f97316',
    CRITICAL: '#ef4444',
  };
  const fill = riskColors[riskLevel] ?? '#7df9c8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label={`Risk Radar — level ${riskLevel}`}
      >
        {/* Background rings */}
        {Array.from({ length: RINGS }).map((_, i) => (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={(R / RINGS) * (i + 1)}
            fill="none"
            stroke="#1e2535"
            strokeWidth="1"
          />
        ))}

        {/* Axis spokes and labels */}
        {AXES.map(({ label }, i) => {
          const angle = (i / AXES.length) * 2 * Math.PI - Math.PI / 2;
          const end = toXY(angle, R);
          const labelPos = toXY(angle, R + 22);
          return (
            <g key={i}>
              <line
                x1={CX}
                y1={CY}
                x2={end.x}
                y2={end.y}
                stroke="#1e2535"
                strokeWidth="1"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fill="#64748b"
                fontFamily="IBM Plex Mono, monospace"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Radar fill polygon */}
        <polygon
          ref={polygonRef}
          points={buildPolygon(values)}
          fill={fill}
          fillOpacity={0.15}
          stroke={fill}
          strokeWidth="1.5"
        />

        {/* Rotating sweep line */}
        <line
          ref={sweepRef}
          x1={CX}
          y1={CY}
          x2={CX}
          y2={CY - R}
          stroke={fill}
          strokeWidth="1"
          strokeOpacity={0.4}
        />

        {/* Centre dot */}
        <circle cx={CX} cy={CY} r="3" fill={fill} />
      </svg>

      {/* Raw feed terminal */}
      <div
        style={{
          width: '100%',
          background: '#0a0b0f',
          border: '1px solid #1e2535',
          borderRadius: '6px',
          padding: '0.75rem',
          fontSize: '0.7rem',
          fontFamily: 'IBM Plex Mono, monospace',
          color: '#64748b',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: fill }}>▶ </span>EXPOSURE ${snapshot.totalExposure.toLocaleString()}
        {'  '}
        <span style={{ color: fill }}>▶ </span>LIQ {snapshot.liquidityScore}%{'  '}
        <span style={{ color: fill }}>▶ </span>THREAT {snapshot.externalThreatLevel}
        {'  '}
        <span
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            color: fill,
            letterSpacing: '0.1em',
          }}
        >
          {riskLevel}
        </span>
        <span style={{ animation: 'blink 1s step-end infinite', color: fill }}> █</span>
        <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
      </div>
    </div>
  );
}
