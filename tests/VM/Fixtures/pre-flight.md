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

# Live Scope & Singleton Access

This test simulates a "Stock Market" to verify that multiple modules (Main and Trader) see the exact same live data from a third module (Market).

1. **Live Cross-Module Access:** The `trader` module reading `market.price` sees changes immediately.
2. **Singleton Caching:** Verify that the `market` imported by `Main` is the *same instance* as the `market` imported by `trader`.
3. **Internal Mutation:** Verify that functions like `tick()` correctly mutate the module-scoped `price` variable.

```
import "market"
import "trader"

// 1. Verify Initial State
// Market starts at 100
out("Market Open: " + market.price)

// 2. Instantiate a class from a different module
// The Bot class inside 'trader' imports 'market' internally.
// We need to ensure 'trader' sees the same 'market' instance as we do.
bot = new trader.Bot()

// 3. Simulation Loop
// We mutate the market state from Main, then ask the Bot to act on it.
ticks = 0
while ticks < 3:
    market.tick() // Increases price by 10
    bot.buy()     // Bot records the current market.price
    ticks = ticks + 1

// 4. Verify Local View (Main -> Market)
out("Current Price: " + market.price)

// 5. Verify Remote View (Trader -> Market)
// If live bindings work, the bot bought at 110, 120, and 130.
// If they failed (snapshotting), the bot would have bought at 100 three times.
out("Bot Portfolio: " + bot.portfolio[0] + ", " + bot.portfolio[1] + ", " + bot.portfolio[2])

// 6. Test Radical State Change
market.crash()
out("Market Crash: " + market.price)

bot.buy()
out("Bottom Feeding: " + bot.portfolio[3])
```

## Module: market

```
public price = 100

// Mutates the module-scoped variable
public fn tick():
    price = price + 10

public fn crash():
    price = 0
```

## Module: trader

```
import "market"

public blueprint Bot:
    portfolio: []

    fn buy():
        // Accesses the live variable 'price' from the imported 'market' module
        this.portfolio.push(market.price)
```

## PASS

- Market Open: 100
- Current Price: 130
- Bot Portfolio: 110, 120, 130
- Market Crash: 0
- Bottom Feeding: 0
