import {State} from '../State.js';

/**
 * @opcode Opcode.JMP_IF_FALSE
 */
export function jmpIfFalse(state: State, arg: number): void
{
    const condition = state.pop();

    if (!state.isTruthy(condition)) {
        state.ip = arg;
    }
}
