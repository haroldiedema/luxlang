# Pre-flight Test

This test combines most, if not all, of the language features to ensure that the VM can handle complex scenarios.

```
import "engine"

blueprint Player(name) extends engine.Actor:
    name: name
    xp: 0
    inventory: []

    fn level_up(amount):
        // Stress testing While + Comprehension + Mutation
        // Loop runs as long as the generated array has elements
        while [n for n in 0..amount]:
            this.xp = this.xp + 10
            amount = amount - 1
            if this.xp >= 20:
                this.inventory.push("Wooden Sword")
                break // Test break inside while

    fn describe():
        return parent.describe() + ": " + this.name + " (XP: " + this.xp + ")"

// 1. Test Instantiation & Inheritance
p = new Player("Lux")

// 2. Test Complex While Loop logic
p.level_up(5) 

// 3. Test Multi-level parent dispatch and state
out(p.describe())
out("Total Actors: " + engine.actor_count)
out("Inventory: " + p.inventory[0])
```

## Module: engine

```
public actor_count = 0

public blueprint Actor:
    id: 0
    fn init():
        out("[Parent.Init] Current actor_count:" + actor_count)
        actor_count = actor_count + 1
        this.id = actor_count

    fn describe():
        return "Entity #" + this.id
```

## PASS

- [Parent.Init] Current actor_count:0
- Entity #1: Lux (XP: 20)
- Total Actors: 1
- Inventory: Wooden Sword

---
