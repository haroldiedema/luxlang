import {State} from '../State.js';

/**
 * @opcode Opcode.CALL
 */
export function call(state: State, natives: Map<string, any>, arg: any): void
{
    const operand: {
        name: string,
        addr: number | null, // explicitly allow null
        args: number,
    } = arg;

    if (operand.addr !== null && operand.addr !== undefined) {
        state.pushFrame(state.ip, {
            name: operand.name,
        });
        state.ip = operand.addr;
        return;
    }

    if (operand.name && natives.has(operand.name)) {
        const args: any[] = [];
        for (let i = 0; i < operand.args; i++) {
            args.unshift(state.pop());
        }

        const result = natives.get(operand.name)!(...args);

        if (result instanceof Promise) {
            state.isAwaitingPromise = true;

            result.then((resolved) => {
                state.push(resolved ?? null);
                state.isAwaitingPromise = false;
            }).catch((e) => {
                state.isAwaitingPromise = false;
                throw e;
            });

            return;
        }

        state.push(result ?? null);
        return;
    }

    throw new Error(`The function "${operand.name}" does not exist.`);
}
