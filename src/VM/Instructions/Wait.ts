import {State} from '../State.js';

/**
 * @opcode Opcode.WAIT
 */
export function wait(state: State): void
{
    const duration = state.pop();

    if (typeof duration !== 'number' || duration < 0) {
        throw new Error(`Invalid duration for WAIT: ${duration}`);
    }

    // Check if we are inside a function/interrupt
    if (state.frames.length > 0) {
        const frame = state.frames[state.frames.length - 1];
        frame.sleepTimer = duration;
    } else {
        // Otherwise, we are pausing the Main Script
        state.sleepTime = duration;
    }
}
