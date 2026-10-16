#!/usr/bin/env bash
# Runs the whole suite. Needs a PostgreSQL server where DATABASE_URL's user may CREATE DATABASE
# (sqlx::test creates and drops one throw-away database per test).
set -euo pipefail
export DATABASE_URL="${DATABASE_URL:-postgres://leave:leave@localhost:5432/leave_dev}"
cargo clippy --workspace --all-targets
cargo test --workspace
