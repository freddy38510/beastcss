# Beastcss Contributing Guide

First of all, thank you for taking the time to contribute! 🎉

If you're a first-time contributor, you can check the issues with [good first issue](https://github.com/freddy38510/beastcss/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) tag.

## Repo Setup

The beastcss repo is a monorepo using pnpm workspaces. The package manager used to install and link dependencies must be [pnpm](https://pnpm.io/).

To develop and test the core `beastcss` package:

1. Run `pnpm i` in beastcss's root folder.

2. Run `pnpm run build` in beastcss's root folder.

3. If you are developing beastcss itself, you can go to `packages/beastcss` and run `pnpm run dev` to automatically rebuild beastcss whenever you change its code.

> Beastcss uses pnpm v7. If you are working on multiple projects with different versions of pnpm, it's recommended to enable [Corepack](https://github.com/nodejs/corepack) by running `corepack enable`.

## Testing Beastcss against external packages

You may wish to test your locally modified copy of Beastcss against another package that depends on Beastcss. For pnpm, after building Beastcss, you can use [`pnpm.overrides`](https://pnpm.io/package_json#pnpmoverrides) to do this. Note that `pnpm.overrides` must be specified in the root `package.json`, and you must list the package as a dependency in the root `package.json`:

```json
{
  "dependencies": {
    "beastcss": "^1.0.0"
  },
  "pnpm": {
    "overrides": {
      "beastcss": "link:../path/to/modifiedBeastcss/packages/beastcss"
    }
  }
}
```

And re-run `pnpm install` to link the package.

## Pull Request Guidelines

- Checkout a topic branch from a base branch (e.g. `main`), and merge back against that branch.

- If adding a new feature:

  - Add accompanying test case.
  - Provide a convincing reason to add this feature. Ideally, you should open a suggestion issue first, and have it approved before working on it.

- If fixing a bug:

  - If you are resolving a special issue, add `(fix #xxxx[,#xxxx])` (#xxxx is the issue id) in your PR title for a better release log (e.g. `fix: update entities encoding/decoding (fix #3899)`).
  - Provide a detailed description of the bug in the PR.

- It's OK to have multiple small commits as you work on the PR. GitHub can automatically squash them before merging.

- Make sure tests pass!

- Commit messages must follow the [commit message convention](./.github/commit-convention.md) so that changelogs can be automatically generated. Commit messages are automatically validated before commit (by invoking [Git Hooks](https://git-scm.com/docs/githooks) via [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks)).

- No need to worry about code style as long as you have installed the dev dependencies. Modified files are automatically formatted with Prettier on commit (by invoking [Git Hooks](https://git-scm.com/docs/githooks) via [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks)).
