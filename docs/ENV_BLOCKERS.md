# Environment Blockers

Stage 1 database work has been implemented with `sql.js` instead of `better-sqlite3`.

Reason:

- The user explicitly approved replacing `better-sqlite3` with a no-compile alternative.
- The product still uses SQLite schema, local persistence, and a `database.sqlite` file.
- This avoids requiring Visual Studio Build Tools C++ workload on the current lightweight laptop.

Known packaging follow-up:

- `sql.js` needs access to `sql-wasm.wasm`. Development mode currently loads it from `node_modules/sql.js/dist`.
- Before final installer packaging, copy `node_modules/sql.js/dist/sql-wasm.wasm` into app resources and update `locateFile` for packaged mode.
