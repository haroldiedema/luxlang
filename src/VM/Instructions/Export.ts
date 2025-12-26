import {State} from '../State.js';

/**
 * @opcode Opcode.EXPORT
 */
export function _export(state: State): void
{
    const val  = state.pop();
    const name = state.pop();

    const frame = state.frames[state.frames.length - 1];

    // If we are in the main scope (no frames) or a frame without export tracking,
    // we can either throw or ignore. Usually, modules run inside a frame.
    if (! frame) {
        return;
    }

    // TODO: Add export tracking to frames and modules.
    //       Exported variables should be tied to the module scope they came from.
    //       This allows "live" bindings between modules.

    frame.exports[name] = val;
}
