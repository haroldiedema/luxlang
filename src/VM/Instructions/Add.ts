import {State} from '../State.js';

/**
 * @opcode Opcode.ADD
 */
export function add(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a + b);
}
