"""Deploy Radionline_Frontend (Next.js) to the Hostinger VPS.

Usage (PowerShell, from this folder):
  $env:VPS_PASS = "<root password>"   # optional; else prompt
  $env:DEPLOY_ENV = "dev"             # or "prod" (default: prod)
  py deploy.py

Optional env vars:
  DEPLOY_ENV  dev | prod (default prod)
  VPS_HOST    default 91.108.105.182
  VPS_USER    default root
  REMOTE_DIR  override server folder
  SERVICE     override systemd unit
  API_URL     if set, writes NEXT_PUBLIC_API_URL into .env.production
              (existing .env.production is left alone when API_URL is empty)
  HEALTH_URL  local check after restart (default /login on the env port)

What it does: uploads the source (skips node_modules, .next, .git, .env*),
syncs it into the server folder, runs npm install + npm run build there,
restarts the web service and checks /login. It never touches the backend.
Needs: pip install paramiko
"""
from __future__ import annotations

import getpass
import io
import os
import shlex
import sys
import tarfile
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent
HOST = os.environ.get("VPS_HOST", "91.108.105.182")
USER = os.environ.get("VPS_USER", "root")
DEPLOY_ENV = (os.environ.get("DEPLOY_ENV") or "prod").strip().lower()

TARGETS = {
    "prod": {
        "remote_dir": "/var/www/radionline/frontend",
        "service": "radionline-web",
        "default_api_url": "https://radionlineofficial.com/api",
        "health_url": "http://127.0.0.1:3000/login",
        "port": "3000",
    },
    "dev": {
        "remote_dir": "/var/www/radionline-dev/frontend",
        "service": "radionline-dev-web",
        "default_api_url": "https://dev.radionlineofficial.com/api",
        "health_url": "http://127.0.0.1:3001/login",
        "port": "3001",
    },
}

if DEPLOY_ENV not in TARGETS:
    raise SystemExit(f"DEPLOY_ENV must be one of: {', '.join(TARGETS)} (got {DEPLOY_ENV!r})")

_target = TARGETS[DEPLOY_ENV]
REMOTE_DIR = os.environ.get("REMOTE_DIR", _target["remote_dir"])
SERVICE = os.environ.get("SERVICE", _target["service"])
API_URL = os.environ.get("API_URL", "")
DEFAULT_API_URL = os.environ.get("DEFAULT_API_URL", _target["default_api_url"])
HEALTH_URL = os.environ.get("HEALTH_URL", _target["health_url"])
WEB_PORT = os.environ.get("WEB_PORT", _target["port"])
REMOTE_TGZ = f"/tmp/radionline-frontend-{DEPLOY_ENV}.tgz"

SKIP_DIRS = {"node_modules", ".next", ".git", "out", "build", "dist", "_shot_tmp", "_ui_shots", ".idea", ".vscode"}
SKIP_FILES = {".env", ".env.local", ".env.production", ".env.development", "_dev_restart.log", "deploy.py"}
SKIP_SUFFIXES = {".tsbuildinfo", ".log"}


def should_skip(rel: Path) -> bool:
    if set(rel.parts) & SKIP_DIRS:
        return True
    return rel.name in SKIP_FILES or rel.suffix in SKIP_SUFFIXES


def make_archive() -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for path in ROOT.rglob("*"):
            rel = path.relative_to(ROOT)
            if path.is_file() and not should_skip(rel):
                tar.add(path, arcname=rel.as_posix())
    return buf.getvalue()


REMOTE_SCRIPT = r"""
set -euo pipefail
SERVICE=__SERVICE__
DIR=__REMOTE_DIR__
HEALTH_URL=__HEALTH_URL__
WEB_PORT=__WEB_PORT__
if [ -z "$DIR" ]; then DIR=$(systemctl show -p WorkingDirectory --value "$SERVICE" 2>/dev/null || true); fi
if [ -z "$DIR" ]; then DIR=/var/www/radionline/frontend; fi
echo "Deploy env: __DEPLOY_ENV__"
echo "Frontend folder on server: $DIR"
echo "Service: $SERVICE"

# Safety: never sync into a backend or old combined-repo folder.
if [ -f "$DIR/requirements.txt" ] || [ -f "$DIR/run.py" ] || [ -d "$DIR/backend" ]; then
  echo "Refusing: $DIR looks like a backend or combined-repo folder. Set REMOTE_DIR." >&2
  exit 1
fi

mkdir -p "$DIR"
STAGE=$(mktemp -d)
tar -xzf __TGZ__ -C "$STAGE"
rm -f __TGZ__
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude node_modules --exclude .next --exclude '.env*' "$STAGE"/ "$DIR"/
else
  cp -a "$STAGE"/. "$DIR"/
fi
rm -rf "$STAGE"

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -qE 'v(2[0-9]|[3-9][0-9])'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

cd "$DIR"
API_URL=__API_URL__
if [ -n "$API_URL" ]; then
  # Preserve WS URL if present
  WS_LINE=$(grep -E '^NEXT_PUBLIC_WS_URL=' .env.production 2>/dev/null || true)
  printf 'NEXT_PUBLIC_API_URL=%s\n' "$API_URL" > .env.production
  if [ -n "$WS_LINE" ]; then printf '%s\n' "$WS_LINE" >> .env.production; fi
elif [ ! -f .env.production ]; then
  printf 'NEXT_PUBLIC_API_URL=%s\n' "__DEFAULT_API_URL__" > .env.production
fi
echo "Using: $(cat .env.production)"

npm install --no-audit --no-fund
npm run build

if ! systemctl cat "$SERVICE" >/dev/null 2>&1; then
  echo "Missing systemd unit $SERVICE — create it before deploy." >&2
  exit 1
fi
systemctl restart "$SERVICE"
ufw allow "${WEB_PORT}/tcp" >/dev/null 2>&1 || true
systemctl is-active "$SERVICE"
for i in 1 2 3 4 5 6 7 8 9 10; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$HEALTH_URL" || true)
  if [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "308" ] || [ "$code" = "302" ]; then
    echo "frontend /login -> HTTP $code"
    exit 0
  fi
  sleep 2
done
echo "Health check failed: $HEALTH_URL (last HTTP $code)" >&2
journalctl -u "$SERVICE" -n 30 --no-pager || true
exit 1
"""


def build_script() -> str:
    return (
        REMOTE_SCRIPT.replace("__REMOTE_DIR__", shlex.quote(REMOTE_DIR))
        .replace("__SERVICE__", shlex.quote(SERVICE))
        .replace("__API_URL__", shlex.quote(API_URL))
        .replace("__DEFAULT_API_URL__", DEFAULT_API_URL)
        .replace("__HEALTH_URL__", shlex.quote(HEALTH_URL))
        .replace("__WEB_PORT__", shlex.quote(WEB_PORT))
        .replace("__DEPLOY_ENV__", shlex.quote(DEPLOY_ENV))
        .replace("__TGZ__", REMOTE_TGZ)
    )


def run(client: paramiko.SSHClient, command: str, timeout: int = 1800) -> int:
    _stdin, stdout, _stderr = client.exec_command(command, get_pty=True, timeout=timeout)
    for line in iter(stdout.readline, ""):
        print(line.rstrip("\n"), flush=True)
    return stdout.channel.recv_exit_status()


def resolve_password() -> str:
    if os.environ.get("VPS_PASS"):
        return os.environ["VPS_PASS"]
    # Reuse backend .env SFTP password when present (same VPS root).
    backend_env = ROOT.parent / "Radionline_Backend" / ".env"
    if backend_env.is_file():
        for line in backend_env.read_text(encoding="utf-8").splitlines():
            if line.startswith("FILE_SFTP_PASSWORD="):
                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                if val:
                    print("Using FILE_SFTP_PASSWORD from Backend .env for VPS login.", flush=True)
                    return val
    return getpass.getpass(f"{USER} password for {HOST}: ")


def main() -> None:
    password = resolve_password()
    print(f"Packing frontend for DEPLOY_ENV={DEPLOY_ENV}...", flush=True)
    payload = make_archive()
    print(f"Archive {len(payload) // 1024} KB → {SERVICE} @ {REMOTE_DIR}", flush=True)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...", flush=True)
    client.connect(HOST, username=USER, password=password, timeout=30, allow_agent=False, look_for_keys=False)
    sftp = client.open_sftp()
    with sftp.file(REMOTE_TGZ, "wb") as remote:
        remote.write(payload)
    sftp.close()

    code = run(client, "bash -s <<'RN_DEPLOY_EOF'\n" + build_script() + "\nRN_DEPLOY_EOF")
    client.close()
    if code != 0:
        print(f"\nDeploy FAILED (exit {code}).", flush=True)
        raise SystemExit(code)
    print(f"\nFrontend deployed ({DEPLOY_ENV}): {HEALTH_URL}", flush=True)


if __name__ == "__main__":
    main()
