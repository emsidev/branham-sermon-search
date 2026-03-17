#!/usr/bin/env python3
"""Generate feature briefs and mark feature completion in todos.md."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Sequence, Tuple

FEATURE_ID_RE = re.compile(r"^[A-Z]\d{2}$")
FEATURE_HEADING_RE = re.compile(r"^###\s+([A-Z]\d{2})\s+-\s+(.+)$")
PRIMARY_AGENT_RE = re.compile(r"^Primary agent:\s*(.+)$")
STATUS_LINE_RE = re.compile(r"^Status:\s*(.+)$")


@dataclass(frozen=True)
class BacklogRow:
    line_index: int
    status: str
    feature_id: str
    feature_name: str
    primary_agent: str
    owned_surface: str
    integrator: str
    raw_line: str


def _read_lines(path: Path) -> Tuple[List[str], bool]:
    text = path.read_text(encoding="utf-8")
    return text.splitlines(), text.endswith("\n")


def _write_lines(path: Path, lines: Sequence[str], had_trailing_newline: bool) -> None:
    output = "\n".join(lines)
    if had_trailing_newline:
        output += "\n"
    path.write_text(output, encoding="utf-8")


def _parse_table_row(line: str, line_index: int) -> BacklogRow | None:
    stripped = line.strip()
    if not stripped.startswith("|") or stripped.startswith("|---"):
        return None

    columns = [part.strip() for part in stripped.strip("|").split("|")]
    if len(columns) < 6:
        return None

    status, feature_id, feature_name, primary_agent, owned_surface, integrator = columns[:6]
    if not FEATURE_ID_RE.fullmatch(feature_id):
        return None

    return BacklogRow(
        line_index=line_index,
        status=status,
        feature_id=feature_id,
        feature_name=feature_name,
        primary_agent=primary_agent,
        owned_surface=owned_surface,
        integrator=integrator,
        raw_line=line,
    )


def _find_backlog_row(lines: Sequence[str], feature_id: str) -> BacklogRow:
    for idx, line in enumerate(lines):
        row = _parse_table_row(line, idx)
        if row and row.feature_id == feature_id:
            return row
    raise ValueError(f"FeatureID '{feature_id}' was not found in the backlog table.")


def _find_feature_block(lines: Sequence[str], feature_id: str) -> Tuple[int, int, str]:
    start_idx = -1
    feature_name = ""

    for idx, line in enumerate(lines):
        match = FEATURE_HEADING_RE.match(line)
        if match and match.group(1) == feature_id:
            start_idx = idx
            feature_name = match.group(2)
            break

    if start_idx == -1:
        raise ValueError(f"FeatureID '{feature_id}' spec block was not found.")

    end_idx = len(lines)
    for idx in range(start_idx + 1, len(lines)):
        if lines[idx].startswith("### "):
            end_idx = idx
            break

    return start_idx, end_idx, feature_name


def _extract_primary_agent(block_lines: Sequence[str]) -> str | None:
    for line in block_lines:
        match = PRIMARY_AGENT_RE.match(line.strip())
        if match:
            return match.group(1)
    return None


def _format_backlog_row(row: BacklogRow, status: str) -> str:
    return (
        f"| {status} | {row.feature_id} | {row.feature_name} | "
        f"{row.primary_agent} | {row.owned_surface} | {row.integrator} |"
    )


def _build_brief(lines: Sequence[str], feature_id: str) -> str:
    row = _find_backlog_row(lines, feature_id)
    block_start, block_end, block_feature_name = _find_feature_block(lines, feature_id)
    block_lines = list(lines[block_start:block_end])

    feature_name = block_feature_name or row.feature_name
    primary_agent = _extract_primary_agent(block_lines) or row.primary_agent
    block_text = "\n".join(block_lines).strip()

    return (
        f"AGENT: {primary_agent}\n"
        f"You are implementing {feature_id} - {feature_name} for a sermon reading app. "
        "Read all instructions carefully before writing any code.\n\n"
        "Constraints\n\n"
        "TypeScript strict mode must be maintained\n"
        "No new dependencies without explicit approval\n"
        "Do not modify any file outside your allowed ownership boundary\n"
        "Integrator notes must be complete enough that integration-owner needs zero follow-up decisions\n\n"
        "Your Role and Boundaries\n"
        "Follow the Allowed files and Forbidden files sections exactly.\n\n"
        "Feature Spec\n"
        f"{block_text}\n"
    )


def _run_verification(command: str, cwd: Path) -> None:
    print(f"Running verification command: {command}")
    result = subprocess.run(command, shell=True, cwd=str(cwd))
    if result.returncode != 0:
        raise RuntimeError(f"Verification command failed with exit code {result.returncode}.")


def _complete_feature(
    todos_path: Path,
    feature_id: str,
    status: str,
    verify_command: str | None,
    dry_run: bool,
) -> None:
    if not FEATURE_ID_RE.fullmatch(feature_id):
        raise ValueError(f"Invalid FeatureID '{feature_id}'. Expected format like S05 or R03.")

    if verify_command:
        _run_verification(verify_command, todos_path.parent)

    lines, had_trailing_newline = _read_lines(todos_path)
    row = _find_backlog_row(lines, feature_id)
    block_start, block_end, _ = _find_feature_block(lines, feature_id)

    status_line_index = -1
    for idx in range(block_start + 1, block_end):
        if STATUS_LINE_RE.match(lines[idx].strip()):
            status_line_index = idx
            break

    if status_line_index == -1:
        raise ValueError(f"FeatureID '{feature_id}' spec block is missing a 'Status:' line.")

    new_table_line = _format_backlog_row(row, status)
    new_status_line = f"Status: {status}"

    if dry_run:
        print(f"[DRY-RUN] Backlog line {row.line_index + 1}:")
        print(f"  OLD: {lines[row.line_index]}")
        print(f"  NEW: {new_table_line}")
        print(f"[DRY-RUN] Spec status line {status_line_index + 1}:")
        print(f"  OLD: {lines[status_line_index]}")
        print(f"  NEW: {new_status_line}")
        return

    lines[row.line_index] = new_table_line
    lines[status_line_index] = new_status_line
    _write_lines(todos_path, lines, had_trailing_newline)

    print(f"Updated {feature_id} to '{status}' in:")
    print(f"- Backlog table line {row.line_index + 1}")
    print(f"- Spec block status line {status_line_index + 1}")


def _create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate feature implementation briefs and mark feature completion in todos.md."
    )
    parser.add_argument(
        "--todos",
        default="todos.md",
        help="Path to todos.md (default: todos.md in current working directory).",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    brief_parser = subparsers.add_parser("brief", help="Generate implementation brief for a FeatureID.")
    brief_parser.add_argument("feature_id", help="FeatureID (for example: S05, R03, X02).")

    complete_parser = subparsers.add_parser(
        "complete",
        aliases=["done"],
        help="Mark a FeatureID complete in backlog table and spec block.",
    )
    complete_parser.add_argument("feature_id", help="FeatureID (for example: S05, R03, X02).")
    complete_parser.add_argument(
        "--status",
        default="DONE",
        help="Status value to set (default: DONE).",
    )
    complete_parser.add_argument(
        "--verify-command",
        help="Optional shell command to run before updating status (for example: \"npx vitest run\").",
    )
    complete_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show proposed status updates without writing todos.md.",
    )

    return parser


def main() -> int:
    parser = _create_parser()
    args = parser.parse_args()

    todos_path = Path(args.todos).resolve()
    if not todos_path.exists():
        print(f"todos.md not found: {todos_path}", file=sys.stderr)
        return 1

    feature_id = args.feature_id.upper().strip()

    try:
        lines, _ = _read_lines(todos_path)

        if args.command == "brief":
            print(_build_brief(lines, feature_id))
            return 0

        if args.command in {"complete", "done"}:
            _complete_feature(
                todos_path=todos_path,
                feature_id=feature_id,
                status=args.status.strip(),
                verify_command=args.verify_command,
                dry_run=args.dry_run,
            )
            return 0

        parser.error(f"Unknown command: {args.command}")
        return 2
    except (ValueError, RuntimeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
