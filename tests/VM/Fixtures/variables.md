# Assignment and Retrieval

The VM should be able to store values in variables and retrieve them later.
Since there is no distinction between initialization and update, re-assigning
should overwrite the value.

```
x = 10
out(x)
x = 20
out(x)
y = x
out(y)
```

## PASS

- 10
- 20
- 20

---

# Arithmetic with Variables

The VM should be able to use variables within arithmetic expressions.

```
width = 10
height = 5
area = width * height
out(area)
out(area / 2)
```

## PASS

- 50
- 25

---
