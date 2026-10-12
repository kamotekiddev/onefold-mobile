const expoConfig = require("eslint-config-expo/flat")
const eslintPluginPrettier = require("eslint-plugin-prettier")
const eslintConfigPrettier = require("eslint-config-prettier")
const prettierConfig = require("./.prettierrc.json")

module.exports = [
    {
        ignores: ["dist/*", ".expo/*", "node_modules/*"],
    },
    ...expoConfig,
    {
        plugins: {
            prettier: eslintPluginPrettier,
        },
        rules: {
            "prettier/prettier": ["error", prettierConfig],
            ...eslintConfigPrettier.rules,
        },
    },
    {
        files: ["babel.config.js", "eslint.config.js"],
        languageOptions: {
            sourceType: "commonjs",
        },
    },
]
