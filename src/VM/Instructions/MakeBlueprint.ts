import { State } from '../State.js';

/**
 * @opcode Opcode.MAKE_BLUEPRINT
 */
export function makeBlueprint(state: State, arg: any): void
{
    const [name, addr, paramCount] = arg;

    state.push({
        type:            'Blueprint',
        name:            name,
        constructorAddr: addr,
        paramCount:      paramCount || 0,
        methods:         {},
        prog:            state.currentProgram,
    });
}
