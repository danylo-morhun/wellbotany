// One-line Conventional Commits: `type(scope): subject`, no body, no footer.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "style", "test", "docs", "chore", "perf", "ci"],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "auth",
        "catalog",
        "cart",
        "checkout",
        "orders",
        "products",
        "admin",
        "db",
        "przelewy24",
        "shipping",
        "home",
        "seo",
        "config",
        "deps",
      ],
    ],
    "scope-empty": [2, "never"],
    "subject-max-length": [2, "always", 50],
    "body-empty": [2, "always"],
    "footer-empty": [2, "always"],
  },
};
