import { describe, it, expect } from 'vitest';
import { makePublicState } from '../view.js';
import { createInitialState } from '../stateMachine.js';
describe('view - publicState', () => {
    it('publicState에 손패(hands) 노출 금지', () => {
        const state = createInitialState();
        state.hands = {
            p1: [{ type: 'color', suit: 'green', value: 14 }],
            p2: [{ type: 'special', special: 'pirate' }],
        };
        const publicState = makePublicState(state);
        expect(publicState.hands).toBeUndefined();
        expect(publicState.phase).toBeDefined();
    });
});
