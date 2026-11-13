'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        cursor: 'help',
        verticalAlign: 'middle',
      }}
    >
      <Info
        size={14}
        style={{
          color: visible ? '#0f172a' : '#64748b',
          transition: 'color 0.15s ease',
        }}
      />

      {visible && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 240,
            backgroundColor: '#ffffff',
            color: '#334155',
            fontSize: '0.74rem',
            fontWeight: 400,
            lineHeight: 1.4,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 50,
            textAlign: 'left',
            textTransform: 'none',
            letterSpacing: 'normal',
            pointerEvents: 'none',
          }}
        >
          {text}
          {/* Flechita inferior */}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              marginLeft: -5,
              borderWidth: 5,
              borderStyle: 'solid',
              borderColor: '#ffffff transparent transparent transparent',
            }}
          />
        </div>
      )}
    </span>
  );
}