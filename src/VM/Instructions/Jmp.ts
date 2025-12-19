import {State} from '../State.js';

/**
 * @opcode Opcode.JMP
 */
export function jmp(state: State, arg: number): void
{
    state.ip = arg;
}
