import {State} from '../State.js';

/**
 * @opcode Opcode.SWAP
 */
export function swap(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(b);
    state.push(a);
}
