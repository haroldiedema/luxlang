import {State} from '../State.js';

/**
 * @opcode Opcode.EXP
 */
export function exp(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a ** b);
}
