import { State } from '../State.js';

/**
 * @opcode Opcode.NEW
 */
export function _new(state: State, arg: any): void
{
    const blueprint = state.pop();

    if (! blueprint || blueprint.type !== 'Blueprint') {
        throw new Error('\'new\' requires a Blueprint.');
    }

    const instance: any  = Object.create(blueprint.methods);
    instance.__blueprint = blueprint;

    // Mark this object as a VM object with a hidden property
    Object.defineProperty(instance, '__is_vm_object__', {
        value: true,
        enumerable: false,
        writable: false,
        configurable: false,
    });

    const frame = state.pushFrame(state.ip, {
        program: blueprint.prog,
        name:    `new ${blueprint.name}`,
    });

    frame.locals['this'] = instance;
    state.ip             = blueprint.constructorAddr;
}
