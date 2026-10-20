#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This bootstrap script is for Ubuntu Linux." >&2
  exit 2
fi

sudo apt-get update
sudo apt-get install --yes ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl --fail --silent --show-error --location \
  https://download.docker.com/linux/ubuntu/gpg \
  --output /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" |
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update
sudo apt-get install --yes docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod --append --groups docker "$USER"

mkdir -p "$HOME/gearflow"
chmod 700 "$HOME/gearflow"

echo "Docker is installed and $HOME/gearflow is ready."
echo "Sign out and back in once so the Docker group membership takes effect."
