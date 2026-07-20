# Tech debt

```
[short description of the issue]
fix: [what the fix is, in one sentence]
standalone: yes | no
context: [roadmap item or brief note — required when standalone: no]
```

`standalone: yes`: can be picked up freely without other context.
`standalone: no`: blocked on or coupled to roadmap work; read the context note first.

---

Root scoping doc is misspelled: `requirments.md` (should be `requirements.md`)
fix: rename the file to `requirements.md` in a dedicated commit and update any links that reference it
standalone: yes
