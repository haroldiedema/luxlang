import { State } from '../State.js';

/**
 * @opcode Opcode.MAKE_BLUEPRINT
 */
export function makeBlueprint(state: State, arg: any): void
{
    const [name, addr, paramCount] = arg;

    const parent = state.pop();

    if (parent !== null && parent.type !== 'Blueprint') {
        throw new Error(`Runtime Error: Class '${name}' extends a non-blueprint value (${parent?.type || 'null'}).`);
    }

    console.log(`Making blueprint '${name}' that extends '${parent ? parent.name : 'null'}, belongs to program #${state.currentProgram.hash}'`);

    const blueprint = {
        type:            'Blueprint',
        name:            name,
        constructorAddr: addr,
        paramCount:      paramCount || 0,
        methods:         {},
        prog:            state.currentProgram,
        parent:          undefined,
    };

    if (parent) {
        Object.setPrototypeOf(blueprint.methods, parent.methods);
        blueprint.parent = parent;
    }

    state.push(blueprint);
}
