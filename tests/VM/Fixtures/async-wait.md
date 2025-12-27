# Wait keyword

> - runCount: 2
> - expectCompletion: true

The VM should pause execution for a specified duration using the `wait` keyword.
Note that each tick in the test-suite advances the internal clock by 1 second between runs.

```
out("Start")
wait(500) // Wait for 500 milliseconds.
out("End")
```

## PASS
- Start
- End

---
