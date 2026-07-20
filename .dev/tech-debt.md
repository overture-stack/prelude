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

`.gitignore` still ignores `configs/nginxConfigs/`, a directory removed in the config reorg (commit `b51998e`)
fix: delete the `configs/nginxConfigs/` line from `.gitignore`
standalone: yes
