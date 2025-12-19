import {State} from '../State.js';

/**
 * @opcode Opcode.MUL
 */
export function mul(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a * b);
}
