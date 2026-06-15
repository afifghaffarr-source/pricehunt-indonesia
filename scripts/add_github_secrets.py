"""Add Supabase secrets to GitHub repo via encrypted API.

Uses libsodium sealed box (NaCl) — public key fetched from GitHub,
values encrypted client-side, only ciphertext is sent.
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import requests
from nacl import encoding, public


def get_github_token() -> str:
    """Read token from git credentials file.

    Handles both formats:
      https://x-access-token:TOKEN@github.com
      https://oauth2:TOKEN@github.com  (fine-grained PAT)
      https://user:TOKEN@github.com
    """
    cred_path = Path.home() / ".git-credentials.d/github"
    with open(cred_path) as f:
        line = f.read().strip()
    # URL is: scheme://userinfo@host  — userinfo = "username:password"
    # We want the part AFTER the last ":" before "@"
    match = re.search(r"://[^:]*:(.+)@", line)
    if not match:
        raise SystemExit(f"Could not parse token from {cred_path}: {line[:80]}")
    return match.group(1)


def get_env_value(key: str, env_path: Path) -> str:
    """Read KEY=value from .env.local file."""
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip()
    raise SystemExit(f"Key {key} not found in {env_path}")


def encrypt(public_key_b64: str, secret_value: str) -> str:
    """Encrypt secret with NaCl sealed box, return base64 ciphertext."""
    pk = public.PublicKey(public_key_b64.encode(), encoding.Base64Encoder())
    sealed_box = public.SealedBox(pk)
    encrypted = sealed_box.encrypt(secret_value.encode())
    return encoding.Base64Encoder().encode(encrypted).decode()


def upsert_secret(token: str, owner: str, repo: str, name: str, value: str, key_id: str, pk: str) -> dict:
    """Create or update a secret. GitHub uses PUT for upsert."""
    encrypted_value = encrypt(pk, value)
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/{name}"
    payload = {"encrypted_value": encrypted_value, "key_id": key_id}
    resp = requests.put(
        url,
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        json=payload,
    )
    if resp.status_code in (201, 204):
        return {"name": name, "status": "ok", "http": resp.status_code}
    return {"name": name, "status": "error", "http": resp.status_code, "body": resp.text}


def main():
    repo = "afifghaffarr-source/pricehunt-indonesia"
    owner, repo_name = repo.split("/")
    env_path = Path("/home/ubuntu/projects/bijakbeli-app/.env.local")

    token = get_github_token()

    # Fetch public key
    pk_resp = requests.get(
        f"https://api.github.com/repos/{owner}/{repo_name}/actions/secrets/public-key",
        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github+json"},
    )
    pk_resp.raise_for_status()
    pk_data = pk_resp.json()
    key_id, pk_b64 = pk_data["key_id"], pk_data["key"]
    print(f"Public key ID: {key_id}")

    # Define secrets to add: (secret_name_in_github, .env.local_key)
    secrets_to_add = [
        ("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
        ("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        ("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    ]

    results = []
    for secret_name, env_key in secrets_to_add:
        value = get_env_value(env_key, env_path)
        # Don't print value, only confirm length
        print(f"\n→ Adding {secret_name} (length: {len(value)})")
        result = upsert_secret(token, owner, repo_name, secret_name, value, key_id, pk_b64)
        results.append(result)
        print(f"  {result}")

    # Verify by listing secrets
    print("\n=== Verifying ===")
    list_resp = requests.get(
        f"https://api.github.com/repos/{owner}/{repo_name}/actions/secrets",
        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github+json"},
    )
    list_resp.raise_for_status()
    secrets_list = list_resp.json()["secrets"]
    print(f"Total secrets in repo: {len(secrets_list)}")
    for s in secrets_list:
        print(f"  - {s['name']}")

    print("\n=== Summary ===")
    ok = sum(1 for r in results if r["status"] == "ok")
    print(f"  {ok}/{len(results)} secrets added successfully")


if __name__ == "__main__":
    main()
