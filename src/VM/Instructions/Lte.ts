import {State} from '../State.js';

/**
 * @opcode Opcode.LTE
 */
export function lte(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a <= b);
}
