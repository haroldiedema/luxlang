import {State} from '../State.js';

/**
 * @opcode Opcode.CALL
 */
export function call(state: State, natives: Map<string, any>, arg: any): void
{
    if (arg.name && natives.has(arg.name)) {
        const args = [];

        for (let i = 0; i < arg.args; i++) {
            args.unshift(state.pop());
        }

        const result = natives.get(arg.name)!(...args);

        if (typeof result !== 'undefined') {
            state.push(result);
        }
        return;
    }

    state.pushFrame(state.ip);
    state.ip = arg.addr;
}
