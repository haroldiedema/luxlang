import { State } from '../State.js';

/**
 * @opcode Opcode.SUPER
 */
export function _super(state: State, arg: any): void
{
    const operand: { name: string, args: number, callee: string } = arg;
    const {name, args, callee}                                    = operand;

    const thisIndex = state.stack.length - args - 1;

    const instance = state.stack[thisIndex];
    if (! instance) {
        throw new Error(`Attempt to call parent method "${name}" on an undefined value.`);
    }

    const blueprint = instance.__blueprint;
    if (! blueprint) {
        throw new Error(`Instance has no blueprint to call super method "${name}" on.`);
    }

    const ownerBlueprint = state.getVar(callee);
    const parent = ownerBlueprint.parent;

    if (! parent) {
        throw new Error(`Blueprint "${blueprint.name}" has no parent to call "${name}" on.`);
    }

    const method = parent.methods[name];
    if (! method) {
        throw new Error(`Method "${name}" not found in parent blueprint "${parent.name}".`);
    }

    const frame = state.pushFrame(state.ip, {
        program: method.prog,
        name:    `parent.${name}`,
    });

    frame.locals['this'] = instance;
    state.ip             = method.addr;
}
