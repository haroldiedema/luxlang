import { State } from '../State.js';

/**
 * @opcode Opcode.CALL_PARENT
 */
export function callParent(state: State, arg: any): void
{
    const argCount: number = arg;
    const blueprint: any   = state.pop();

    if (! blueprint || blueprint.type !== 'Blueprint') {
        throw new Error(`'super' call requires a Blueprint.`);
    }

    if (argCount !== blueprint.paramCount) {
        throw new Error(`Blueprint "${blueprint.name}" expects ${blueprint.paramCount} argument${blueprint.paramCount === 1 ? '' : 's'}, but got ${argCount}.`);
    }

    const thisIndex = state.stack.length - argCount - 1;
    const instance  = state.stack[thisIndex];
    state.stack.splice(thisIndex, 1);

    const frame = state.pushFrame(state.ip, {
        program: blueprint.prog,
        name:    `super ${blueprint.name}`,
    });

    frame.locals['this'] = instance;
    state.ip             = blueprint.constructorAddr;
}
