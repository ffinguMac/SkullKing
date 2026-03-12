import { isSuitCard, isEscapeLike, isCharacterCard, } from './rules.js';
/** 트릭 판정 메인 */
export function judgeTrick(plays, leadSuit) {
    const hasKraken = plays.some((p) => p.card.type === 'special' && p.card.special === 'kraken');
    const hasWhale = plays.some((p) => p.card.type === 'special' && p.card.special === 'whale');
    if (hasKraken && hasWhale) {
        const krakenPlay = plays.find((p) => p.card.type === 'special' && p.card.special === 'kraken');
        const whalePlay = plays.find((p) => p.card.type === 'special' && p.card.special === 'whale');
        if (krakenPlay.playOrder > whalePlay.playOrder) {
            return resolveKrakenEffect(plays);
        }
        else {
            return resolveWhaleEffect(plays);
        }
    }
    if (hasKraken)
        return resolveKrakenEffect(plays);
    if (hasWhale)
        return resolveWhaleEffect(plays);
    return resolveNormalTrick(plays, leadSuit);
}
/** 크라켄 효과: 트릭 VOID, nextLeader=크라켄 없었다면 승자 */
export function resolveKrakenEffect(plays) {
    const withoutKraken = plays.filter((p) => !(p.card.type === 'special' && p.card.special === 'kraken'));
    const leadSuit = inferLeadSuitFromPlays(withoutKraken);
    const wouldHaveWon = judgeTrickWithoutKrakenWhale(withoutKraken, leadSuit);
    return {
        winnerId: null,
        isVoid: true,
        wouldHaveWonId: wouldHaveWon ?? undefined,
    };
}
/** 흰고래 효과: 특수→탈출 변환, 리드수트 제거, 숫자 최댓값 승리, 동률 시 먼저 낸 숫자, 숫자 없으면 VOID */
export function resolveWhaleEffect(plays) {
    const whalePlay = plays.find((p) => p.card.type === 'special' && p.card.special === 'whale');
    const asEscapes = plays.map((p) => p.card.type === 'special' ? { ...p, card: { type: 'special', special: 'escape' } } : p);
    const colorPlays = asEscapes
        .map((p, i) => ({ ...p, orig: plays[i] }))
        .filter((p) => p.card.type === 'color');
    if (colorPlays.length === 0) {
        return {
            winnerId: null,
            isVoid: true,
            whalePlayerId: whalePlay.playerId,
        };
    }
    const maxVal = Math.max(...colorPlays.map((p) => p.card.value));
    const maxPlays = colorPlays.filter((p) => p.card.value === maxVal);
    const first = maxPlays.reduce((a, b) => (a.orig.playOrder < b.orig.playOrder ? a : b));
    return {
        winnerId: first.orig.playerId,
        isVoid: false,
    };
}
/** 일반 트릭 판정 (크라켄/흰고래 없음) */
export function resolveNormalTrick(plays, leadSuit) {
    const winnerId = judgeTrickWithoutKrakenWhale(plays, leadSuit);
    return {
        winnerId: winnerId ?? null,
        isVoid: winnerId === null,
    };
}
/** 크라켄/흰고래 제외한 일반 판정. 승자 playerId 또는 null(VOID) */
export function judgeTrickWithoutKrakenWhale(plays, leadSuit) {
    const filtered = plays.filter((p) => p.card.type !== 'special' || (p.card.special !== 'kraken' && p.card.special !== 'whale'));
    if (filtered.length === 0)
        return null;
    const mermaids = filtered.filter((p) => p.card.type === 'special' && p.card.special === 'mermaid');
    const skullKings = filtered.filter((p) => p.card.type === 'special' && p.card.special === 'skullking');
    const pirates = filtered.filter((p) => p.card.type === 'special' && (p.card.special === 'pirate' || (p.card.special === 'tigress' && p.card.tigressDecl === 'pirate')));
    const escapes = filtered.filter((p) => isEscapeLike(p.card));
    const colorPlays = filtered.filter((p) => isSuitCard(p.card));
    if (mermaids.length > 0 && skullKings.length > 0) {
        const firstMermaid = mermaids.reduce((a, b) => (a.playOrder < b.playOrder ? a : b));
        return firstMermaid.playerId;
    }
    if (skullKings.length > 0) {
        const first = skullKings.reduce((a, b) => (a.playOrder < b.playOrder ? a : b));
        return first.playerId;
    }
    if (pirates.length > 0) {
        const first = pirates.reduce((a, b) => (a.playOrder < b.playOrder ? a : b));
        return first.playerId;
    }
    if (mermaids.length > 0) {
        const first = mermaids.reduce((a, b) => (a.playOrder < b.playOrder ? a : b));
        return first.playerId;
    }
    if (colorPlays.length > 0) {
        const blacks = colorPlays.filter((p) => p.card.suit === 'black');
        if (blacks.length > 0) {
            const maxBlack = Math.max(...blacks.map((p) => p.card.value));
            const maxBlacks = blacks.filter((p) => p.card.value === maxBlack);
            const first = maxBlacks.reduce((a, b) => (a.playOrder < b.playOrder ? a : b));
            return first.playerId;
        }
        const effectiveLead = leadSuit ?? (() => {
            const firstColor = colorPlays.sort((a, b) => a.playOrder - b.playOrder)[0];
            return firstColor ? firstColor.card.suit : null;
        })();
        if (effectiveLead) {
            const leadPlays = colorPlays.filter((p) => p.card.suit === effectiveLead);
            if (leadPlays.length > 0) {
                const maxVal = Math.max(...leadPlays.map((p) => p.card.value));
                const maxPlays = leadPlays.filter((p) => p.card.value === maxVal);
                const first = maxPlays.reduce((a, b) => (a.playOrder < b.playOrder ? a : b));
                return first.playerId;
            }
        }
    }
    if (escapes.length === filtered.length) {
        const first = escapes.reduce((a, b) => (a.playOrder < b.playOrder ? a : b));
        return first.playerId;
    }
    return null;
}
function inferLeadSuitFromPlays(plays) {
    for (const p of plays.sort((a, b) => a.playOrder - b.playOrder)) {
        if (isEscapeLike(p.card))
            continue;
        if (isCharacterCard(p.card))
            return null;
        if (isSuitCard(p.card))
            return p.card.suit;
    }
    return null;
}
