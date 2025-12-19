import {State} from '../State.js';

/**
 * @opcode Opcode.SUB
 */
export function sub(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a - b);
}
