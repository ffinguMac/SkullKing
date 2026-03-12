import { useState } from 'react';
import type { Card } from '../types';
import { getCardImagePath } from '../utils/cardImages';
import { getCardLabel, getSuitShortLabel } from '../utils/cardLabels';

interface CardDisplayProps {
  card: Card;
  size?: 'small' | 'normal';
  style?: React.CSSProperties;
}

/** 카드 표시: 이미지 있으면 이미지, 없으면 텍스트/색상 */
export default function CardDisplay({ card, size = 'normal', style: extraStyle }: CardDisplayProps) {
  const [imgError, setImgError] = useState(false);
  const imgPath = getCardImagePath(card);

  const sizeStyle = size === 'small' ? { width: 60, height: 85 } : { width: 70, height: 100 };

  const baseStyle: React.CSSProperties = {
    ...sizeStyle,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...extraStyle,
  };

  if (!imgError) {
    return (
      <div style={{ ...baseStyle, background: '#1a1a1a' }}>
        <img
          src={`${imgPath}?v=1`}
          alt={getCardLabel(card)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const textContent =
    card.type === 'color'
      ? `${getSuitShortLabel(card.suit)} ${card.value}`
      : getCardLabel(card);

  const bgColor =
    card.type === 'color'
      ? { green: '#2d5a2d', purple: '#4a2d5a', yellow: '#5a5a2d', black: '#1a1a1a' }[card.suit] ?? '#333'
      : '#3a2a4a';

  return (
    <div
      style={{
        ...baseStyle,
        background: bgColor,
        border: '2px solid #666',
        fontSize: size === 'small' ? '0.8rem' : '0.85rem',
        padding: 4,
        textAlign: 'center' as const,
      }}
    >
      {textContent}
    </div>
  );
}
