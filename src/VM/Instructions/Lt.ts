import {State} from '../State.js';

/**
 * @opcode Opcode.LT
 */
export function lt(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a < b);
}
