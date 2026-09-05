#!/usr/bin/env bash
# One-time Docker setup for Cursor Cloud / nested-container VMs.
# Run from the repo root: bash scripts/setup-docker.sh
set -euo pipefail

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "Docker is already installed and running."
  exit 0
fi

echo "Installing Docker CE + compose plugin..."
sudo apt-get update -qq
sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release iptables fuse-overlayfs

if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "Configuring Docker daemon for nested containers..."
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "storage-driver": "fuse-overlayfs",
  "features": {
    "containerd-snapshotter": false
  }
}
EOF

sudo update-alternatives --set iptables /usr/sbin/iptables-legacy 2>/dev/null || true
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy 2>/dev/null || true
sudo usermod -aG docker "$USER" 2>/dev/null || true

if ! docker info >/dev/null 2>&1; then
  echo "Starting dockerd..."
  sudo pkill dockerd 2>/dev/null || true
  sleep 1
  sudo nohup dockerd --host=unix:///var/run/docker.sock >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 30); do
    if sudo docker info >/dev/null 2>&1; then break; fi
    sleep 2
  done
fi

sudo chmod 666 /var/run/docker.sock 2>/dev/null || true

if docker info >/dev/null 2>&1; then
  echo "Docker is ready."
  docker info | rg -i "Server Version|Storage Driver" || docker info | head -15
else
  echo "Docker failed to start. Check /tmp/dockerd.log"
  tail -30 /tmp/dockerd.log || true
  exit 1
fi
