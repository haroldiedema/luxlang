<p align="center">
  <a href="https://github.com/haroldiedema/luxlang/actions/workflows/test.yml"><img src="https://github.com/haroldiedema/luxlang/actions/workflows/test.yml/badge.svg" alt="Tests" /></a>
  <a href="https://bundlephobia.com/package/luxlang"><img src="https://img.shields.io/bundlephobia/minzip/luxlang" alt="Bundle Size" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/luxlang"><img src="https://img.shields.io/npm/v/luxlang?color=red" alt="NPM Version" /></a>
  <a href="https://esm.sh/luxlang"><img src="https://img.shields.io/badge/esm.sh-luxlang-f39c12" alt="esm.sh" /></a>
  <a href="https://unpkg.com/browse/luxlang/"><img src="https://img.shields.io/badge/unpkg-luxlang-3498db" alt="unpkg" /></a>
</p>

# Lux Language 📜

**Lux Language** (luxlang) is a lightweight, indentation-based scripting
language designed specifically for **Game Engines** and **Interactive
Applications**. The language syntax is designed to be 
"_as-beginner-friendly-as-possible_" and borrows heavily from Python's clean
and readable style.

It features a **Bytecode Virtual Machine (VM)** with a "Tick Budget" system,
allowing you to pause and resume script execution across frames. This prevents
infinite loops from freezing your game and allows for complex, long-running
behavior scripts (like AI patrols) without blocking the main thread.

The luxlang package is a zero-dependency TypeScript library that can be easily
integrated into any JavaScript/TypeScript project, including web browsers,
Node.js, and game engines like Phaser, Babylon.js, or custom engines.

## ✨ Features

* **Sandboxed:** Runs in a secure VM, isolated from host environment.
* **Lightweight:** Zero runtime dependencies.
* **Python-like Syntax:** Clean, readable, indentation-based structure.
* **Time-Sliced Execution:** Run scripts for `N` instructions per frame.
* **First-Class Data:** Native support for Arrays `[]` and Objects `{}`.
* **Native Interop:** Easily bind TypeScript/JavaScript functions to the VM.
* **Event Hooks:** Integrate with your engine's event system.
* **Safe Scoping:** Variables are function-scoped; no accidental global leaks.
* **State Persistence:** VM state can be imported & exported.
* **Modules:** Support for reusable script modules.
* **Comprehensions:** Array and Object comprehensions for concise data transformations.

Take a look at the fixture files in the `tests/VM/Fixtures` directory for a
complete list of fixture files in Markdown format that demonstrate the language features.

> NOTE: Lux does not include a "standard library" by default. Instead, you can
> bind your own native functions to the VM that interact with your engine or
> application. See [Engine Integration](#engine-integration) for more details.

## 🛠️ Architecture

Lux-lang is composed of four main components:

1. **Tokenizer:** Converts text into a stream of tokens (handles indentation).
2. **Parser:** recursive-descent parser that builds an Abstract Syntax Tree (AST).
3. **Compiler:** Flattens the AST into a linear array of instructions (Bytecode).
4. **VM:** A stack-based virtual machine that executes instructions.

---

## 🚀 Quick Start

### Installation

Install via NPM:

```bash
npm install luxlang
```

### Running a Script

```typescript
import { Compiler, VirtualMachine } from 'luxlang';

const source = `
print("Hello from Lux!")
x = 10 + 5
print(x)
`;

// 1. Compile.
const program = Compiler.compile(source);

// 2. Create a VM.
const vm = new VirtualMachine(program, {
    budget: 100, // Instructions per .run() invocation.
    throwOnError: true, // Throw on runtime errors.
    functions: {
        // Create a "native" print function that can be called
        // from any script.
        print: (...args: any[]) => {
            console.log(...args);
        }
    },
    variables: {
        // Initial global variables.
        initial_value: 42
    }
});

// 3. Run. You can call run() on every frame.
const isHalted = vm.run(16.6); // Pass delta time in ms.

if (isHalted) {
    console.log("Script finished execution.");
} else {
    console.log("Script paused, will resume next tick.");
}
```

---

## Language Guide

### Variables & Types

Lux is dynamically typed. You don't need to declare types.

```
name = "Hero"       // String
level = 42          // Number
is_alive = true     // Boolean (true/false)
nothing = null      // Null
```

### Data Structures

#### Arrays

Arrays are ordered lists of values.

```
inventory = ["sword", "shield", "potion"]

// Access
print(inventory[0])      // "sword"

// Modify
inventory[1] = "broken shield"

// Nested
matrix = [[1, 0], [0, 1]]
```

#### Objects

Objects are Key-Value maps. Keys are identifiers (no quotes needed).

```
player = {
    name: "Arthur",
    stats: {
        hp: 100,
        mp: 50
    }
}

// Dot Notation
print(player.name)       // "Arthur"
player.stats.hp = 90

// Bracket Notation (Strings)
key = "name"
print(player[key])       // "Arthur"
```

### Control Flow

#### If / Else

Standard conditional logic. Remember to use a colon `:` and indentation.

```
hp = 10
if hp > 50:
    print("Healthy")
else:
    if hp > 0:
        print("Wounded")
    else:
        print("Dead")
```

#### Loops

Iterate over arrays or ranges.

```
# Array Iteration
items = ["a", "b", "c"]
for item in items:
    print(item)

# Numeric Range (using the built-in range() native)
for i in range(5):
    if i == 3:
        continue   # Skip 3
    print(i)
```

#### Boolean Logic

Supports `and`, `or`, `not` (and `!`).

```
if (has_key and not is_locked) or is_admin:
    open_door()
```

### Functions

Functions are hoisted (can be defined anywhere). Arguments are passed by value.

```
fn calculate_damage(base, armor):
    return base - (armor / 2)

dmg = calculate_damage(50, 10)
print(dmg) // 45
```

### Blueprints

Blueprints are similar to classes in other programming languages. They allow
you to define custom object types with properties and methods.

```
blueprint Enemy:
    hp: 100
    damage: 10
    
    fn attack(target):
        target.hp = target.hp - this.damage
        print("Attacked for " + this.damage)

// Create an instance:
goblin = new Enemy()
goblin.attack(player)
print(goblin.hp) // 100
```

#### Primary vs Secondary Constructors

Blueprints allow two types of constructors:
 - primary via the blueprint declaration itself or;
 - secondary via a special `init` function that is invoked after creation.

```
blueprint Player(name):
    name: name
    hp: 100
    
    fn init():
        print("Player " + this.name + " has entered the game.")
```

Or via the `init` function:

```
blueprint Enemy:
    name: "Anonymous"
    hp: 50

    init(name):
        this.name = name
        print("Enemy " + this.name + " spawned.")
        
goblin = new Enemy("Goblin") // "Enemy Goblin spawned."
```

> NOTE: Only one constructor type can be used per blueprint.

#### Inheritance

Blueprints can inherit from other blueprints.

```
blueprint Actor(name):
    name: name
    hp: 100
    
blueprint NPC(name, dialogue) extends Actor(name):
    dialogue: dialogue
    
    fn speak():
        print(this.name + " says: " + this.dialogue)
        
villager = new NPC("Bob", "Welcome to our village!")
villager.speak()  # "Bob says: Welcome to our village!"
```

### Comprehensions

Lux supports array and object comprehensions for concise data transformations.

#### Array Comprehensions

```
squares = [x * x for x in 0..10]

print(squares) // [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
```

#### Object Comprehensions

```
nums = [1, 2, 3]
squared = { n: n * n for n in nums }

print(squared["2"]) // 4
```

### Event Hooks

The special "on" keyword allows you to define event handlers that can be
triggered from the host environment. A hooked event is invoked as an interrupt,
pausing the current script execution and jumping to the event handler. Once the
handler completes, execution resumes where it left off.

```
while(true):
    print("Patrolling...")
    wait 1000 // Waits for 1000 ms (remember to keep ticking the VM by calling .run())

on "damage_taken" (amount):
    this.hp = this.hp - amount
    print("Ouch! Took " + amount + " damage.")
```

An event can be triggered from the host using the "dispatch" method on the
Virtual Machine instance:

```typescript
vm.dispatch("damage_taken", [25]); // Passes 25 as the "amount"
```

If an event hook does not exist, the dispatch call is a no-op. It does not
crash to ensure user-defined scripts can safely handle optional events.

Note that event hooks must be defined in the main script body, not inside
functions or blueprints or imported modules.


## Reusable Modules

Lux supports modules for code reuse. You can import/export functions and variables.

```
// utils.lux
public PI = 3.14159

public fn greet(name):
    print("Hello, " + name + "!")
```

```
// main.lux
import "utils"

print(utils.PI)          # 3.14159
utils.greet("Player")    # "Hello, Player!"
```

Modules are lively linked, so changes to imported variables are reflected across modules.

Modules can be defined in the VirtualMachine two ways:

1. As compiled programs, or;
2. As native objects (JavaScript objects with functions and properties).

```typescript
import { Compiler, VirtualMachine } from 'luxlang';

const utilsModule = {
    PI: 3.14159,
    greet: (...args: any) => {
        const [name] = args;
        console.log("Hello, " + name + "!");
    },
    print: (...args: any[]) => console.log(...args),
};

const luxModule = Compiler.compile(`
public fn power(base, exp):
    result = 1
    for i in 0..exp:
        result = result * base
    return result
`);

const mainProgram = Compiler.compile(`
import "utils"
import "lux"

utils.print(utils.PI)        // 3.14159
utils.greet("Player")        // "Hello, Player!"
utils.print(lux.power(2, 3)) // 8
`);

const vm = new VirtualMachine(mainProgram, {
    budget: Infinity, // Default - run all instructions to completion.
    moduleCache: {
        "utils": utilsModule,
        "lux": luxModule
    }
});

// If budget is undefined, the VM runs to completion in one go.
vm.run();
```

Modules can also be resolved dynamically by providing a custom module resolver
function when creating the VM. You can then share a module cache between
multiple instances of Virtual Machines or load/compile modules on demand.

```typescript
import { Compiler, Program, VirtualMachine } from 'luxlang';

const myModuleCache: Record<string, Program> = {
    'myModule': Compiler.compile(`public value = 42`, 'myModule'),
    // Add more pre-compiled modules as needed
};

const resolveModule = (moduleName: string): Program | undefined => {
    return myModuleCache[moduleName];
}

const vm1 = new VirtualMachine(mainProgram1, {
    budget: Infinity,
    resolveModule,
});

const vm2 = new VirtualMachine(mainProgram1, {
    budget: Infinity,
    resolveModule,
});
```

---

## Engine Integration

The core strength of Lux is the **VM Loop**. Instead of running a script to completion, you can "tick" it inside your game loop.

### 1. Register Native Functions

Bind engine logic to the VM.

```typescript
const vm = new VirtualMachine(program, {
    budget: 100, // Amount of instructions to run per tick/frame.
    variables: {
        foo: 42, // Initial global variable.
    },
    functions: {
        print: (args) => {
            console.log(...args);
        },
        range: (args) => {
            const [end] = args;
            const result = [];
            for (let i = 0; i < end; i++) {
                result.push(i);
            }
            return result;
        },
    }
});

// Functions can also be registered after the VM has been created.
vm.registerNative("move_player", (args) => {
    const [x, y] = args;
    playerEntity.position.x += x;
    playerEntity.position.y += y;
});

vm.registerNative("wait", (args) => {
    // Custom logic to handle waiting...
});
```

### 2. The Tick Loop

Execute the script incrementally.

```typescript
function gameLoop() {
    // Run the VM until the configured budget is exhausted.
    // "delta time" is passed for time-based operations.
    const isFinished = vm.run(deltaTime);

    if (!isFinished) {
        // Script is paused (yielded or ran out of budget).
        // It will resume exactly where it left off next frame.
    }

    renderFrame();
    requestAnimationFrame(gameLoop);
}
```

### 3. Serialization

You can save and load the VM state to persist across sessions, for example
when dealing with save games.

```typescript
// Save state
const savedState = vm.save();

// Load state in a fresh VM
const newVm = new VirtualMachine(program);
newVm.load(savedState);

newVm.run(deltaTime); // Resumes from where it left off
```

## Security

The Lux VM is designed to be sandboxed. It cannot access the host environment
unless you explicitly bind native functions. This makes it safe to run
untrusted scripts without risking the integrity of your application.

Native functions are whitelisted, and attempts to access forbidden properties
(e.g., `__proto__`, `constructor`) will result in runtime errors.

Host functions and objects cannot be altered by the script, preventing prototype
pollution and other common attack vectors.

---

### Bytecode Example

The compiler generates a flat list of instructions like this:

| Opcode | Argument | Description |
| --- | --- | --- |
| `LOAD` | `x` | Push variable `x` to stack |
| `CONST` | `1` | Push number `1` to stack |
| `ADD` |  | Pop `x` and `1`, push `x + 1` |
| `JMP_IF_FALSE` | `25` | Jump to index 25 if top of stack is false |
| `GET_PROP` | `hp` | Access `.hp` on the object at top of stack |
