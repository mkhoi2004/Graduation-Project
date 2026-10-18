# SDD ledger — plan: docs/superpowers/plans/2026-10-18-warehouse-module.md

Setup: Ruling: execute in the existing workspace — this feature continues uncommitted auth/reception/doctor work required by the warehouse integration; isolating from HEAD would omit those interfaces — cost if wrong: warehouse changes are not isolated from other unfinished project changes.
Setup: Ruling: helper scripts are not executable in this Windows sandbox, so task briefs and completion evidence are tracked manually in this ledger — cost if wrong: less automated enforcement of per-task boundaries.
Pre-flight: Tasks 1→2 share domain functions and Prisma models; names in the plan are consistent.
Pre-flight: Tasks 2→3 share the posting service; doctor integration will call one public patient-issue method.
Pre-flight: Tasks 2→4 share REST response contracts; frontend types will mirror controller DTOs.
Pre-flight: Tasks 2/4→5 share printable document data and print count.
