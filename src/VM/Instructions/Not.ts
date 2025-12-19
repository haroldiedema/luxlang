import {State} from '../State.js';

/**
 * @opcode Opcode.NOT
 */
export function not(state: State): void
{
    const value = state.pop();
    state.push(!value);
}
