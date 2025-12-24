# Object Declarations

The VM should be able to handle object declarations and property access correctly. This test focuses
on creating an object, setting its properties, and accessing them.

```
player = {
    name: "Alice",
    class: "Cleric",
    score: 100
}

out(player.name)   // Should output "Alice"
out(player.class)  // Should output "Cleric"
out(player.score)  // Should output 100
```

## PASS

- Alice
- Cleric
- 100

---

# Object Declarations (simplified syntax)

Objects can also be declared without commas separating the properties.
Note that this is just syntactic sugar; the behavior is identical to the
previous test.

```
enemy = {
    type: "Goblin"
    health: 50
    damage: 15
}

out(enemy.type)    // Should output "Goblin"
out(enemy.health)  // Should output 50
out(enemy.damage)  // Should output 15
```

## PASS

- Goblin
- 50
- 15

---

# Nested Objects

Objects can be nested. This test focuses on creating an object with nested
objects and accessing their properties.

```
game = {
    level: 1
    player: {
        name: "Bob"
        stats: {
            health: 100
            mana: 50
        }
    }
}

out(game.player.name)          // Should output "Bob"
out(game.player.stats.health)  // Should output 100
out(game.player.stats.mana)    // Should output 50
```

## PASS

- Bob
- 100
- 50

---

# Object Declaration (single line)

The VM should be able to handle object declarations on a single line. This test focuses
on creating an object with properties defined in a single line and accessing them.

```
item = { name: "Sword", type: "Weapon", damage: 25 }

out(item.name)   // Should output "Sword"
out(item.type)   // Should output "Weapon"
out(item.damage) // Should output 25
```

## PASS

- Sword
- Weapon
- 25

---

# Object Property Update

Object properties are mutable. This test focuses on updating properties of an object
after its creation and accessing the updated values.

```
car = {
    make: "Toyota",
    model: "Corolla",
    year: 2020
}

out(car.year)  // Should output 2020

car.year = 2021
out(car.year)  // Should output 2021
```

## PASS

- 2020
- 2021

---

# Object with Mixed Property Types

The VM should be able to handle objects with properties of mixed types. This
test focuses on creating an object with string, number, and boolean properties
and accessing them.

```
settings = {
    volume: 75,
    fullscreen: true,
    username: "Player1"
}

out(settings.volume)      // Should output 75
out(settings.fullscreen)  // Should output true
out(settings.username)    // Should output "Player1"
```

## PASS

```json
[75, true, "Player1"]
```

---

# Test if property exists

The VM should be able to check if a property exists in an object. This test focuses
on using a conditional to check for the existence of a property.

```
config = {
    resolution: "1920x1080",
    vsync: true
}

if "resolution" in config:
    out("Resolution is set")
else:
    out("Resolution is not set")
    
if "fullscreen" in config:
    out("Fullscreen is set")
else:
    out("Fullscreen is not set")
```

## PASS

- Resolution is set
- Fullscreen is not set
