import {State} from '../State.js';

/**
 * @opcode Opcode.DUP
 */
export function dup(state: State): void
{
    const val = state.peek();

    state.push(val);
}
