  # Gumloop Package Script Map

  | Script | Exists | Target | Safe | External calls | Live action risk | Gumloop validation |
  | --- | --- | --- | --- | --- | --- | --- |
  | local-export:check / :smoke | verify | scripts/tests | yes | no | none | npm run local-export:check |
  | local-demo:check / :smoke | verify | scripts/tests | yes | no | none | npm run local-demo:check |
  | mock-gateway:check / :smoke | verify | scripts/tests | yes | no | none | npm run mock-gateway:check |
  | guided-demo:check / :smoke | verify | scripts/tests | yes | no | none | npm run guided-demo:check |
  | local-runtime:check / :smoke | verify | scripts/tests | yes | no | none | npm run local-runtime:check |
  | clickup-local:check / :smoke | verify | scripts/tests | yes | no | none | npm run clickup-local:check |
  | gumloop-handoff:check / :smoke | added | scripts/gumloop-handoff-check.js, tests/smoke/gumloopHandoffSmoke.js | yes |
  no | none | npm run gumloop-handoff:check |


  Added gumloop-handoff:* only because the target files now exist. No script commits/pushes/deploys.
