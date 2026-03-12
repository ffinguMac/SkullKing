import type { Card } from '../types';

/**
 * 카드 → 이미지 파일명 매핑
 * client/public/cards/ 폴더에 아래 규칙으로 이미지를 넣으면 됩니다.
 *
 * 색상 카드: {suit}_{value}.png  예) green_1.png, purple_14.png, black_7.png
 * 특수 카드: {special}.png       예) pirate.png, skullking.png, mermaid.png
 *
 * 이미지 크기: 140 × 200 px (필수)
 * 이미지가 없으면 기존 텍스트/색상 카드가 표시됩니다.
 */
function getCardImageId(card: Card): string {
  if (card.type === 'color') {
    return `${card.suit}_${card.value}`;
  }
  return card.special;
}

/** public/cards/ 기준 이미지 경로 */
export function getCardImagePath(card: Card): string {
  const id = getCardImageId(card);
  return `/cards/${id}.png`;
}
