import { dispatchNative } from '../NativeDispatcher.js';
import { State }          from '../State.js';

/**
 * @opcode Opcode.CALL_METHOD
 */
export function callMethod(state: State, arg: any): void
{
    const name: string      = arg.name;
    const argsCount: number = arg.args;
    const receiver: any     = state.pop();

    if (! receiver || typeof receiver !== 'object') {
        throw new Error(receiver
            ? `Attempt to call method '${name}' on ${typeof receiver}.`
            : `Attempt to call method '${name}' on an undefined value.`
        );
    }

    const func = receiver[name];

    // Method is a user-defined function (bytecode).
    if (typeof func === 'object' && func.addr !== undefined && func.prog !== undefined) {
        const currentFrame = state.pushFrame(state.ip, {
            name:    func.name,
            program: func.prog,
        });

        currentFrame.locals['this'] = receiver;
        state.ip                    = func.addr;
        return;
    }

    // Native method call.
    if (typeof func === 'function') {
        const args: any[] = [];

        for (let i = 0; i < argsCount; i++) {
            args.unshift(state.pop());
        }

        const result = dispatchNative(receiver, name, args);
        state.push(result);
        return;
    }

    throw new Error(`The method "${name}" does not exist on the receiver object.`);
}
