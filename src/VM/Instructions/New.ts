import { State } from '../State.js';

/**
 * @opcode Opcode.NEW
 */
export function _new(state: State, arg: any): void
{
    const argCount: number = arg;

    // 1. Pop the Blueprint (It is now at the top!)
    const blueprint = state.pop();

    console.log("BLUEPRINT:", blueprint);

    if (!blueprint || blueprint.type !== 'Blueprint') {
        throw new Error('\'new\' requires a Blueprint.');
    }

    // 2. Create Instance (Pre-allocation)
    const instance: any = {
        __blueprint: blueprint,
        __methods:   blueprint.methods,
    };

    // 3. Create Frame
    // We do NOT pop args here. We leave them for the constructor's STORE ops to consume.
    const frame = state.pushFrame(state.ip, {
        program:    blueprint.prog,
        moduleName: blueprint.prog.name,
        name:       `new ${blueprint.name}`,
    });

    // 4. Inject 'this'
    frame.locals['this'] = instance;

    // 5. Jump to Constructor
    state.ip = blueprint.constructorAddr;
}
