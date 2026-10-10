"""Deploy Radionline_Frontend (Next.js) to the dev VPS.

Usage (PowerShell, from this folder):
  $env:VPS_PASS = "<root password>"   # optional, you'll be prompted if unset
  py deploy.py

Optional env vars:
  VPS_HOST    default 91.108.105.182
  VPS_USER    default root
  REMOTE_DIR  server folder to deploy into. Default: the WorkingDirectory of the
              existing radionline-web service, else /var/www/radionline/frontend
  API_URL     NEXT_PUBLIC_API_URL for the build. Only written if set, or if the
              server has no .env.production yet (then http://<host>:8000/api)

What it does: uploads the source (skips node_modules, .next, .git, .env*),
syncs it into the server folder, runs npm install + npm run build there,
restarts radionline-web and checks /login. It never touches the backend.
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
REMOTE_DIR = os.environ.get("REMOTE_DIR", "")
API_URL = os.environ.get("API_URL", "")
DEFAULT_API_URL = f"http://{HOST}:8000/api"
REMOTE_TGZ = "/tmp/radionline-frontend.tgz"

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
SERVICE=radionline-web
DIR=__REMOTE_DIR__
if [ -z "$DIR" ]; then DIR=$(systemctl show -p WorkingDirectory --value "$SERVICE" 2>/dev/null || true); fi
if [ -z "$DIR" ]; then DIR=/var/www/radionline/frontend; fi
echo "Frontend folder on server: $DIR"

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
if [ -n "$API_URL" ] || [ ! -f .env.production ]; then
  printf 'NEXT_PUBLIC_API_URL=%s\n' "${API_URL:-__DEFAULT_API_URL__}" > .env.production
fi
echo "Using: $(cat .env.production)"

npm install --no-audit --no-fund
npm run build

if ! systemctl cat "$SERVICE" >/dev/null 2>&1; then
  sed "s#^WorkingDirectory=.*#WorkingDirectory=$DIR#" radionline-web.service > /etc/systemd/system/$SERVICE.service
  systemctl daemon-reload
  systemctl enable "$SERVICE"
fi
systemctl restart "$SERVICE"
ufw allow 3000/tcp >/dev/null 2>&1 || true
sleep 4
systemctl is-active "$SERVICE"
curl -sS -o /dev/null -w 'frontend /login -> HTTP %{http_code}\n' http://127.0.0.1:3000/login
"""


def build_script() -> str:
    return (
        REMOTE_SCRIPT.replace("__REMOTE_DIR__", shlex.quote(REMOTE_DIR))
        .replace("__API_URL__", shlex.quote(API_URL))
        .replace("__DEFAULT_API_URL__", DEFAULT_API_URL)
        .replace("__TGZ__", REMOTE_TGZ)
    )


def run(client: paramiko.SSHClient, command: str, timeout: int = 1800) -> int:
    _stdin, stdout, _stderr = client.exec_command(command, get_pty=True, timeout=timeout)
    for line in iter(stdout.readline, ""):
        print(line.rstrip("\n"), flush=True)
    return stdout.channel.recv_exit_status()


def main() -> None:
    password = os.environ.get("VPS_PASS") or getpass.getpass(f"{USER} password for {HOST}: ")
    print("Packing frontend...", flush=True)
    payload = make_archive()
    print(f"Archive {len(payload) // 1024} KB", flush=True)

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
    print(f"\nFrontend deployed: http://{HOST}:3000", flush=True)


if __name__ == "__main__":
    main()