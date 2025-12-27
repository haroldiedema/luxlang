import { Program } from '../../Compiler/index.js';
import {State}     from '../State.js';

/**
 * @opcode Opcode.RET
 */
export function ret(state: State, program: Program, arg: any, moduleCache: any): void
{
    const frame = state.popFrame();

    if (!frame) {
        state.isHalted = true;
        return;
    }

    state.ip = frame.returnIp;

    if (frame.isInterrupt) {
        state.pop(); // Clean the returned value from the stack.

        if (state.eventQueue.length > 0) {
            // A. Get the next event
            const nextEvent = state.eventQueue.shift()!;
            const eventInfo = program.references.events[nextEvent.name];

            // B. Push Args for the NEXT event
            for (let i = 0; i < eventInfo.numArgs; i++) {
                state.stack.push(nextEvent.args[i] ?? null);
            }

            // C. Push a NEW Interrupt Frame
            // CRITICAL: We reuse the 'returnIp' from the frame we JUST popped.
            // This ensures that when the chain finally ends, we go back to the Main Script.
            state.pushFrame(frame.returnIp, {
                name:       `<interrupt:${nextEvent.name}>`,
                isInterrupt: true
            });

            // D. Jump to the next event
            state.ip = eventInfo.address;

            // We are done. We do NOT restore state.ip from the old frame yet.
            return;
        }

        // 3. Chain Empty? Now we actually return to the Main Script.
        state.ip = frame.returnIp;
        return;
    }

    if (frame.isModule) {
        const exports = {};
        const descriptors = Object.getOwnPropertyDescriptors(frame.exports);
        Object.defineProperties(exports, descriptors);

        if (frame.moduleName) {
            moduleCache[frame.moduleName] = exports;
        }

        state.push(exports);
    }
}
