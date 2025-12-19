import {State} from '../State.js';

/**
 * @opcode Opcode.GTE
 */
export function gte(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a >= b);
}
