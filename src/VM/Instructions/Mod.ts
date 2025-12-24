import {State} from '../State.js';

/**
 * @opcode Opcode.MOD
 */
export function mod(state: State): void
{
    const b = state.pop();
    const a = state.pop();

    state.push(a % b);
}
