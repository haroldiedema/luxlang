import {State} from '../State.js';

/**
 * @opcode Opcode.NEG
 */
export function neg(state: State): void
{
    const value = state.pop();
    state.push(-value);
}
