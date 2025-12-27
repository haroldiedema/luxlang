import { describe, it, expect } from 'vitest';
import { Compiler, VirtualMachine } from '../../dist/index.js';

describe('VM Serializer', () => {
    it('should serialize and deserialize VM state correctly', () => {
        // 1. The Main Program
        //    We import a module, modify its state, enter a loop to burn our
        //    instruction budget (forcing a pause), and then modify it again.
        const main = `
import "store"

// Phase 1: Pre-Pause
// Set the live variable to 10. 
store.count = 10
out("Phase 1: " + store.count)

// Burn Budget Loop
// With a budget of 50, this loop will force the VM to pause 
// before it reaches Phase 2.
i = 0
while i < 10:
    i = i + 1

// Phase 2: Post-Resume
// If the VM resumed correctly, we should execute this.
store.count = store.count + 10
out("Phase 2: " + store.count)
        `;

        // 2. The Dependency Module
        //    A simple module with a public variable.
        const modules = {
            'store': Compiler.compile(`public count = 0`, `store`),
        };

        const out: any[] = [];

        // 3. Setup VM 1 (The "Runner")
        const vm = new VirtualMachine(Compiler.compile(main), {
            budget:        50, // Strict budget to force a pause
            resolveModule: (name: string) => modules[name],
            functions:     {
                out: (...args: any[]) => out.push(...args),
            },
        });

        // Run until budget exhausted
        vm.run();

        // ASSERT: Ensure we paused mid-execution
        expect(out).toEqual(['Phase 1: 10']);
        expect(vm.state.isHalted).toBe(false); // Should NOT be halted yet

        // 4. Serialize
        const serialized = vm.save();

        // 5. Setup VM 2 (The "Resumer")
        //    Completely new instance, knowing nothing of the previous run.
        const vm2 = new VirtualMachine(Compiler.compile(main), {
            budget:        500,
            resolveModule: (name: string) => modules[name],
            functions:     {
                out: (...args: any[]) => out.push(...args),
            },
        });

        // Load the snapshot
        vm2.load(serialized);

        // ASSERT: Verify state was hydrated before we even run
        //         We check the internal scope of the 'store' module to ensure
        //         the value 10 persisted.
        const storeHash = modules['store'].hash;
        expect(vm2.state.scopes[storeHash]['count']).toBe(10);

        // 6. Continue execution
        vm2.run();

        // ASSERT: Verify completion
        //         The output should contain both phases, proving flow control
        //         resumed correctly. The value should be 20, proving the live
        //         binding 'store.count' worked.
        expect(out).toEqual(['Phase 1: 10', 'Phase 2: 20']);
        expect(vm2.state.isHalted).toBe(true);
    });
});
