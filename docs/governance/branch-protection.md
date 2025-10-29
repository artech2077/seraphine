# Branch Protection Baseline

Configure the `main` branch with the following rules in GitHub repository settings:

1. Require pull request reviews before merging (minimum 1 approving review).
2. Require status checks to pass before merging and include the `ci` workflow.
3. Require branches to be up to date before merging.
4. Restrict force pushes and deletions to repository administrators.

Document any deviations from these defaults in this file so the team can revisit the policy.
