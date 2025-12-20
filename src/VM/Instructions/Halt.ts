import {State} from '../State.js';

/**
 * @opcode Opcode.HALT
 * @deprecated Use `RET` instruction instead.
 */
export function halt(state: State): void
{
    state.isHalted = true;
}
