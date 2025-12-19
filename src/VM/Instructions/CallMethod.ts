import {dispatchNative} from '../NativeDispatcher.js';
import {State}          from '../State.js';

/**
 * @opcode Opcode.CALL_METHOD
 */
export function callMethod(state: State, arg: any): void
{
    const name: string      = arg.name;
    const argsCount: number = arg.args;
    const receiver: any     = state.pop();

    if (!receiver || typeof receiver !== 'object') {
        throw new Error(`CALL_METHOD: Receiver is not an object`);
    }

    const func = receiver[name];

    // Method is a user-defined function (bytecode).
    if (typeof func === 'object' && func.addr !== undefined) {
        const currentFrame = state.pushFrame(state.ip);

        currentFrame.locals['this'] = receiver;
        state.ip                    = func.addr;

        return;
    }

    // Native method call.
    if (typeof func === 'function') {
        const args = [];

        for (let i = 0; i < argsCount; i++) {
            args.unshift(state.pop());
        }

        const result = dispatchNative(receiver, name, args)
        state.push(result);
        return;
    }

    throw new Error(`CALL_METHOD: Method '${name}' not found on receiver`);
}
