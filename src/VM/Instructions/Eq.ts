import {State} from '../State.js';

/**
 * @opcode Opcode.EQ
 */
export function eq(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a == b);
}
