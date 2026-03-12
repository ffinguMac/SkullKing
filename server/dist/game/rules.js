export function normalizeCard(card) {
    return JSON.parse(JSON.stringify(card));
}
export function isSuitCard(card) {
    return card.type === 'color';
}
/** 탈출/약탈품/티그리스(탈출선언) */
export function isEscapeLike(card) {
    if (card.type === 'special') {
        if (card.special === 'escape' || card.special === 'loot')
            return true;
        if (card.special === 'tigress' && card.tigressDecl === 'escape')
            return true;
    }
    return false;
}
/** 해적/인어/스컬킹/티그리스(해적선언)/크라켄/흰고래 */
export function isCharacterCard(card) {
    if (card.type === 'special') {
        if (card.special === 'pirate')
            return true;
        if (card.special === 'mermaid')
            return true;
        if (card.special === 'skullking')
            return true;
        if (card.special === 'tigress' && card.tigressDecl === 'pirate')
            return true;
        if (card.special === 'kraken')
            return true;
        if (card.special === 'whale')
            return true;
    }
    return false;
}
/** 리드 수트가 있을 때, 손에 리드 수트 색상 카드가 있으면 반드시 제출. 특수카드는 언제든 가능 */
export function canPlayCard(card, hand, leadSuit) {
    if (!leadSuit)
        return true;
    if (!isSuitCard(card))
        return true; // 특수카드는 언제든 가능
    const hasLeadSuit = hand.some((c) => isSuitCard(c) && c.suit === leadSuit);
    if (!hasLeadSuit)
        return true;
    return card.type === 'color' && card.suit === leadSuit;
}
