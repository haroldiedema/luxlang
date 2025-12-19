import {State} from '../State.js';

/**
 * @opcode Opcode.RET
 */
export function ret(state: State, arg: any): void
{
    const frame = state.popFrame();

    if (!frame) {
        state.isHalted = true;
        return;
    }

    state.ip = frame.returnIp;
}
