import {describe, expect, it}                                         from 'vitest';
import {Compiler, Program, VirtualMachine, VirtualMachineOptions} from '../../dist/index.js';

function createVM(code: string, options: VirtualMachineOptions = {}): VirtualMachine
{
    const program: Program = Compiler.compile(code);
    const vm                      = new VirtualMachine(program, Object.assign({throwOnError: true}, options));

    vm.registerNative('fail', () => {
        throw new Error('Native function "fail" was called.');
    });

    return vm;
}

describe('VirtualMachine', () => {
    it('should pause execution when budget is exhausted.', () => {
        const buffer: any[] = [];
        const vm            = createVM(`iterations = 0
fn loop():
    iterations = iterations + 1
    log(iterations)
    if (iterations > 10):
        fail()
    loop()
loop()
        `, {
            functions: {
                log: (v: any) => buffer.push(v),
            },
        });

        const finished = vm.run(100);
        expect(finished).toBe(false);
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should throw runtime errors if throwOnError is enabled.', () => {
        const vm = createVM(`fn causeError():
    fail() // Native function.
causeError()
        `, {throwOnError: true});

        // This implicitly also tests invoking native functions.
        expect(() => vm.run(1000)).toThrow('Native function "fail" was called.');
    });

    it('should not throw errors if throwOnError is disabled.', () => {
        const vm = createVM(`fn causeError():
    fail()
causeError()
        `, {throwOnError: false});

        let halted: boolean = false;

        expect(() => halted = vm.run(1000)).not.toThrow();
        expect(halted).toBe(true);
    });

    it('should be able to manipulate and iterate over arrays.', () => {
        const buffer: string[] = [];
        const vm               = createVM(`
items = ["Sword", "Shield", "Potion"]
items[2] = "Super Potion"

for item in items:
    log("You have a " + item)
        `, {
            functions: {
                log: (msg: string) => buffer.push(msg),
            },
        });

        const finished = vm.run(1000);
        expect(finished).toBe(true);
        expect(buffer).toEqual([
            'You have a Sword',
            'You have a Shield',
            'You have a Super Potion',
        ]);
    });

    it('should handle native object method invocation correctly.', () => {
        const buffer: string[] = [];
        const vm               = createVM(`log("Hello, " + player.getName())`, {
            variables: {
                player: {
                    getName: () => 'Hero123',
                },
            },
            functions: {
                log: (msg: string) => buffer.push(msg),
            },
        });

        const finished = vm.run(100);

        expect(finished).toBe(true);
        expect(buffer).toEqual(['Hello, Hero123']);
    });

    it('should handle custom object method invocation correctly.', () => {
        const buffer: string[] = [];
        const vm               = createVM(`
player = {
    class: "Adventurer",
    level: 5,
    hp: 100,
}

fn player.greet(name):
    return "Hello, " + name + " the mighty " + this.class + "!"

log(player.greet("Bob"))
`, {
            functions: {
                log: (msg: string) => buffer.push(msg),
            },
        });

        const finished = vm.run(100);

        expect(finished).toBe(true);
        expect(buffer).toEqual(['Hello, Bob the mighty Adventurer!']);
    });

    it('Should be able to manipulate arrays', () => {
        const buffer: any = {arr: []};
        const vm          = createVM(`
arr = [10, 20, 30]
arr.unshift(1) // remove 10.
arr.push(40, 50) // add 40, 50
arr.pop() // remove 50.
arr.shift() // remove 1.
arr.unshift(-10) // add -10 at start.
        `, {
            variables: buffer,
        });

        const finished = vm.run(100);
        expect(finished).toBe(true);
        expect(buffer.arr).toEqual([-10, 10, 20, 30, 40]);
    });

    it('cannot escape sandbox', () => {
        const vm = createVM(`
// 1. Get the Function Constructor
f = player.name.constructor.constructor

// 2. Create a new JS function that executes code
hack = f("console.log('I just hacked your game engine!')")

// 3. Run it
hack()
        `, {
            variables: {
                player: new class
                {
                    public name: string = 'Hero123';
                },
            },
        });

        expect(() => vm.run(100)).toThrow(/Access to property 'constructor' is forbidden./);
    });

    it('cannot overwrite native functions', () => {
        const vm = createVM(`
arr = [1, 2, 3]

// Attempt to overwrite 'push' method
fn arr.push():
    return "Hacked!"

// Try to call the overwritten method
arr.push(4)
        `);

        expect(() => vm.run(100)).toThrow(/Array index must be a number, got 'push'/);
    });

    it('cannot overwrite primitive methods', () => {
        const vm = createVM(`
str = "Hello"

// Attempt to overwrite 'toUpperCase' method
fn str.toUpperCase():
    return "Hacked!"

// Try to call the overwritten method
str.toUpperCase()
        `);

        expect(() => vm.run(100)).toThrow(/Cannot set property 'toUpperCase' of object because object is not defined./);
    });

    it('should serialize and deserialize VM state correctly.', () => {
        const vm = createVM(`
player = {
    name: "Noob",
    class: "Adventurer",
    level: 1,
    health: 100
}

fn loop():
    log(1)
    loop()

fn player.greet():
    return "Hello, " + this.name + " the " + this.class + "!"

fn player.kill():
    this.health = 0

log(player.greet())
`, {
            functions: {
                log: (msg: string) => { /* no-op */
                },
            },
        });

        vm.run(20); // Run some instructions.
        const savedState    = vm.save();
        const expectedState = '{"state":{"hash":"-2847d97b","ip":50,"stack":{"$ref":1},"globals":{"$ref":4},"frames":{"$ref":5}},"heap":{"1":[{"$ref":2},{"$ref":3},"kill"],"2":{"type":"ScriptFunction","addr":20,"args":0},"3":{"health":100,"level":1,"class":"Adventurer","name":"Noob","greet":{"$ref":2}},"4":{"player":{"$ref":3}},"5":[]}}';

        expect(savedState).toBe(expectedState);
    });

    it('show throw an error when state is incompatible with program', () => {
        const vm = createVM(`
a = 10
b = 20
c = a + b
        `);

        const invalidState = '{"state":{"hash":"invalid-hash","ip":10,"stack":{"$ref":1},"globals":{"$ref":2},"frames":{"$ref":3}},"heap":{"1":[],"2":{},"3":[]}}';

        expect(() => vm.load(invalidState)).toThrow(/The state is incompatible with the current program/);
    });

    it('should register event hooks correctly', () => {
        const vm = createVM(`on myEvent(name):\n    log("Hello, " + name)\n`);

        expect(vm.eventNames).toContain('myEvent');
    });

    it('should handle event interrupts without corrupting the stack', () => {
        const vm = createVM(`
sum = 0
fn loop():
    sum = sum + 10
    loop()

on interrupt():
    // This returns "999" to the stack. 
    // If RET doesn't pop it, 'sum = sum + 10' will fail next time.
    return 999

loop() // Start the infinite loop
        `);

        vm.run(25);
        const sumAtPause = vm.globals['sum'];
        expect(sumAtPause).toBeGreaterThan(0);

        vm.dispatch('interrupt');
        vm.run(25);

        expect(vm.globals['sum']).toBeGreaterThan(sumAtPause);
        expect(vm.globals['sum'] % 10).toBe(0);
    });
});
