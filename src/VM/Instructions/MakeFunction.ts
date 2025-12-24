import { State } from '../State.js';

/**
 * @opcode Opcode.MAKE_FUNCTION
 */
export function makeFunction(state: State, arg: any): void
{
    state.push({
        type: 'ScriptFunction',
        addr: arg.addr,
        args: arg.args,
        name: arg.name,
        prog: state.currentProgram,
    });
}
