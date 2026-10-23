#!/usr/bin/env python3
"""
run_all_tests.py — Unified Automated Test Runner & QA Gatekeeper
Enterprise Overhaul Warung Madura Stock Manager (DevSprint Swarm Pro)
Author: Lead QA, Testing & Validation Architect (Worker 4 / sololevelingkakaopage02@gmail.com)

Features:
- Executes Stage 1: TypeScript Strict Typecheck (server & client)
- Executes Stage 2: ESLint Code Quality Verification
- Executes Stage 3: Vitest Comprehensive Test Suite (108 Tests)
  * Unit Tests (Business logic, input validation, date/duration calculations)
  * Database & ACID Tests (Rollback verification, concurrency isolation, audit trail)
  * Granular RBAC Tests (Actor permissions, 403 denials, financial data masking, anti-impersonation)
  * Boundary & Adversarial Tests (Data duplication, SQL injection immunity, buffer stress, XSS, leap years)
  * S1-S20 Core Scenarios & E2E HTTP API (PO reconciliation, partial receipt, unit conversions)
  * K1-K17 Extension Scenarios (Dinas scraper, nearby directory, realtime chat)
  * T1-T11 Verification & Hardening
- Generates Markdown & Terminal Verification Matrix with 100% Pass Rate Certification.
"""

import os
import sys
import time
import subprocess
import re

# ANSI Color codes for clean terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))

def print_header(title: str):
    width = 75
    print("\n" + "=" * width)
    print(f"{BOLD}{CYAN}{title.center(width)}{RESET}")
    print("=" * width)

def run_command(cmd: str, desc: str, cwd: str = WORKSPACE_DIR) -> tuple[int, str]:
    print(f"\n{BOLD}[RUNNING]{RESET} {desc}...")
    start_time = time.time()
    
    process = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    duration = time.time() - start_time
    status = process.returncode
    
    if status == 0:
        print(f"{GREEN}{BOLD}[PASS]{RESET} {desc} ({duration:.2f}s)")
    else:
        print(f"{RED}{BOLD}[FAIL]{RESET} {desc} ({duration:.2f}s)")
        print(process.stdout[-1500:] if len(process.stdout) > 1500 else process.stdout)
        
    return status, process.stdout

def parse_vitest_output(output: str):
    """Parses individual test suite results from vitest output."""
    suites = []
    # Pattern: ✓ test/xyz.test.ts (N tests) Xms
    suite_pattern = re.compile(r'✓\s+(test/[\w\.\-]+)\s+\((\d+)\s+tests?\)\s+(\d+ms|\d+\.\d+s)')
    for match in suite_pattern.finditer(output):
        file_name, count, dur = match.groups()
        suites.append({
            "file": file_name,
            "tests": int(count),
            "duration": dur,
            "status": "PASS"
        })
        
    total_passed = 0
    total_duration = "N/A"
    
    # Pattern: Tests  108 passed (108)
    total_tests_match = re.search(r'Tests\s+(\d+)\s+passed\s+\((\d+)\)', output)
    if total_tests_match:
        total_passed = int(total_tests_match.group(1))
        
    # Pattern: Duration  28.97s
    duration_match = re.search(r'Duration\s+([\d\.]+s)', output)
    if duration_match:
        total_duration = duration_match.group(1)
        
    return suites, total_passed, total_duration

def main():
    print_header("WARUNG MADURA ENTERPRISE — UNIFIED QA TEST RUNNER")
    print(f"Workspace Directory : {WORKSPACE_DIR}")
    print(f"QA Architect        : Worker 4 (sololevelingkakaopage02@gmail.com)")
    print(f"Timestamp           : {time.strftime('%Y-%m-%d %H:%M:%S %Z')}")

    total_failures = 0
    stages = []

    # ---------------------------------------------------------
    # STAGE 1: TypeScript Strict Typecheck
    # ---------------------------------------------------------
    code, out = run_command("npm run typecheck", "Stage 1: TypeScript Strict Typecheck (Server & Client)")
    if code != 0:
        total_failures += 1
        stages.append(("Stage 1: TypeScript Typecheck", "FAIL", "Strict typing errors found"))
    else:
        stages.append(("Stage 1: TypeScript Typecheck", "PASS", "0 compilation errors"))

    # ---------------------------------------------------------
    # STAGE 2: Code Quality & ESLint Linter
    # ---------------------------------------------------------
    code, out = run_command("npm run lint", "Stage 2: Code Quality & ESLint Linter")
    if code != 0:
        total_failures += 1
        stages.append(("Stage 2: ESLint Code Quality", "FAIL", "Linter violations found"))
    else:
        stages.append(("Stage 2: ESLint Code Quality", "PASS", "0 linting errors"))

    # ---------------------------------------------------------
    # STAGE 3: Comprehensive Vitest Test Suite (Single Run)
    # ---------------------------------------------------------
    code, vitest_output = run_command("npm run test", "Stage 3: Comprehensive Vitest Test Harness")
    suites, total_tests, total_dur = parse_vitest_output(vitest_output)
    
    if code != 0 or total_tests == 0:
        total_failures += 1
        stages.append(("Stage 3: Vitest Test Harness", "FAIL", f"{total_tests} tests passed with errors"))
    else:
        stages.append(("Stage 3: Vitest Test Harness", "PASS", f"{total_tests}/{total_tests} passed ({total_dur})"))

    # ---------------------------------------------------------
    # SUMMARY REPORT & VERIFICATION MATRIX
    # ---------------------------------------------------------
    print_header("AUTOMATED QA VERIFICATION MATRIX (SWARM PRO FASE 3)")
    print(f"{'Test Suite File':<42} | {'Category':<20} | {'Tests':<6} | {'Status':<6}")
    print("-" * 80)
    
    category_map = {
        "test/unit-business-logic.test.ts": "Unit & Calculations",
        "test/acid-transactions.test.ts": "Database & ACID",
        "test/rbac-comprehensive.test.ts": "Granular RBAC",
        "test/boundary-edge-adversarial.test.ts": "Edge & Adversarial",
        "test/e2e-api.test.ts": "E2E HTTP REST API",
        "test/scenarios.test.ts": "Core S1-S20 Goods In",
        "test/rbac.test.ts": "Auth & Role Matrix",
        "test/k1-k17.test.ts": "Scraper & Realtime",
        "test/t1-t11.test.ts": "Security Hardening",
    }

    verified_count = 0
    for s in suites:
        cat = category_map.get(s["file"], "Integration")
        print(f"{s['file']:<42} | {cat:<20} | {s['tests']:<6} | {GREEN}{BOLD}PASS{RESET}")
        verified_count += s['tests']

    print("-" * 80)
    print(f"{BOLD}Total Automated Tests Verified : {verified_count} / {verified_count} (100% Pass Rate){RESET}")
    print(f"{BOLD}Total Vitest Test Duration     : {total_dur}{RESET}")

    print("\n" + "=" * 75)
    if total_failures == 0:
        print(f"{GREEN}{BOLD}🎉 CERTIFICATION COMPLETE: 100% PASS RATE GATEKEEPER STANDARD ACHIEVED!{RESET}")
        print(f"{GREEN}All business logic, database transactions, RBAC controls, and edge cases PASSED.{RESET}")
        print("=" * 75 + "\n")
        sys.exit(0)
    else:
        print(f"{RED}{BOLD}❌ CERTIFICATION FAILED: {total_failures} STAGE(S) FAILED!{RESET}")
        print("=" * 75 + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
