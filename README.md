# Lux Language 📜

**Lux Language** is a lightweight, indentation-based scripting language designed specifically for **Game Engines** and **Interactive Applications**.

It features a **Bytecode Virtual Machine (VM)** with a "Tick Budget" system, allowing you to pause and resume script execution across frames. This prevents infinite loops from freezing your game and allows for complex, long-running behavior scripts (like AI patrols) without blocking the main thread.

## ✨ Features

* **Sandboxed:** Runs in a secure VM, isolated from host environment.
* **Lightweight:** Zero runtime dependencies.
* **Python-like Syntax:** Clean, readable, indentation-based structure.
* **Time-Sliced Execution:** Run scripts for `N` instructions per frame.
* **First-Class Data:** Native support for Arrays `[]` and Objects `{}`.
* **Native Interop:** Easily bind TypeScript/JavaScript functions to the VM.
* **Safe Scoping:** Variables are function-scoped; no accidental global leaks.
* **State Persistence:** VM state can be imported & exported.

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
const bytecode = Compiler.compile(source);

// 2. Create a VM.
const vm = new VM(bytecode);

// 3. Run. You can call run() on every frame.
const isHalted = vm.run(100); // Run with a budget of 100 ops

if (isHalted) {
    console.log("Script finished execution.");
} else {
    console.log("Script paused, will resume next tick.");
}
```

---

## 📘 Language Guide

### Variables & Types

Lux is dynamically typed. You don't need to declare types.

```python
name = "Hero"       # String
level = 42          # Number
is_alive = true     # Boolean (true/false)
nothing = null      # Null

```

### Data Structures

#### Arrays

Arrays are ordered lists of values.

```python
inventory = ["sword", "shield", "potion"]

# Access
print(inventory[0])      # "sword"

# Modify
inventory[1] = "broken shield"

# Nested
matrix = [[1, 0], [0, 1]]

```

#### Objects

Objects are Key-Value maps. Keys are identifiers (no quotes needed).

```python
player = {
    name: "Arthur",
    stats: {
        hp: 100,
        mp: 50
    }
}

# Dot Notation
print(player.name)       # "Arthur"
player.stats.hp = 90

# Bracket Notation (Strings)
key = "name"
print(player[key])       # "Arthur"

```

### Control Flow

#### If / Else

Standard conditional logic. Remember to use a colon `:` and indentation.

```python
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

```python
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

```python
if (has_key and not is_locked) or is_admin:
    open_door()

```

### Functions

Functions are hoisted (can be defined anywhere). Arguments are passed by value.

```python
fn calculate_damage(base, armor):
    return base - (armor / 2)

dmg = calculate_damage(50, 10)
print(dmg) # 45

```

---

## 🎮 Engine Integration

The core strength of Lux is the **VM Loop**. Instead of running a script to completion, you can "tick" it inside your game loop.

### 1. Register Native Functions

Bind engine logic to the VM.

```typescript
// In your Game Engine setup
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
    // Allow the script to run for 50 instructions per frame.
    // This prevents infinite loops from freezing the game.
    const isFinished = vm.run(50);

    if (!isFinished) {
        // Script is paused (yielded or ran out of budget).
        // It will resume exactly where it left off next frame.
    }

    renderFrame();
    requestAnimationFrame(gameLoop);
}

```

---

## 🛠️ Architecture

1. **Tokenizer:** Converts text into a stream of tokens (handles indentation).
2. **Parser:** recursive-descent parser that builds an Abstract Syntax Tree (AST).
3. **Compiler:** Flattens the AST into a linear array of Opcodes (Bytecode).
4. **VM:** A stack-based virtual machine that executes Opcodes.

### Opcode Examples

The compiler generates a flat list of instructions like this:

| Opcode | Argument | Description |
| --- | --- | --- |
| `LOAD` | `x` | Push variable `x` to stack |
| `CONST` | `1` | Push number `1` to stack |
| `ADD` |  | Pop `x` and `1`, push `x + 1` |
| `JMP_IF_FALSE` | `25` | Jump to index 25 if top of stack is false |
| `GET_PROP` | `hp` | Access `.hp` on the object at top of stack |
