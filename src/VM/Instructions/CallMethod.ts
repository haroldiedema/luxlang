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

    // Blueprint method call.
    if (receiver && typeof receiver === 'object' && '__methods' in receiver && '__blueprint' in receiver) {
        if (! (receiver.__methods && typeof receiver.__methods[name] === 'object')) {
            throw new Error(`The method "${name}" does not exist on "${receiver.__blueprint.name}".`);
        }

        const methodFunc = receiver.__methods[name];

        const currentFrame = state.pushFrame(state.ip, {
            name:    methodFunc.name,
            program: methodFunc.prog,
        });

        currentFrame.locals['this'] = receiver;
        state.ip                    = methodFunc.addr;
        return;
    }

    throw new Error(`The method "${name}" does not exist on the receiver object.`);
}
