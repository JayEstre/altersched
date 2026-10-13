<<<<<<< HEAD
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
=======
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
<<<<<<< HEAD
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  globalIgnores(['.next/**', 'node_modules/**', 'out/**', 'build/**', 'dist/**', 'next-env.d.ts']),
])
=======
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**", "build/**", "dist/**", "next-env.d.ts"]),
]);
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
