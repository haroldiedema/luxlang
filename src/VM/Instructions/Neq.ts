import {State} from '../State.js';

/**
 * @opcode Opcode.NEQ
 */
export function neq(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a != b);
}
