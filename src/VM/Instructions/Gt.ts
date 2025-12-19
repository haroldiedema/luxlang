import {State} from '../State.js';

/**
 * @opcode Opcode.GT
 */
export function gt(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a > b);
}
