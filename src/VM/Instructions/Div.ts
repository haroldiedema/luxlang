import {State} from '../State.js';

/**
 * @opcode Opcode.DIV
 */
export function div(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a / b);
}
