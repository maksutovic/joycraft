---
id: 7
status: done
---
# Outcome

CI keeps every suite run on main and in publish (decision `required-checks` = none). `release-gates.yml` folds into the Test workflow so a PR runs the suite one time. Two checks the change cannot edit replace the scenario holdout: main's release gates run on the PR tarball, and an upgrade from the last published version to the PR tarball keeps user bytes and rolls back.
