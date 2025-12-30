#!/bin/bash

# Portal + OpenCode Docker Setup
# This script starts the portal with an integrated OpenCode server

set -e

# Default project path to current directory
# Default project path to repo root (up 2 levels from apps/web)
export PROJECT_PATH="${PROJECT_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "🚀 Starting OpenCode Portal..."
echo "📁 Project path: $PROJECT_PATH"
if [ -n "$WORKSPACE_FOLDERS" ]; then
    echo "📂 Workspace folders: $WORKSPACE_FOLDERS"
fi
echo ""

# Check if opencode.json exists in project
if [ ! -f "$PROJECT_PATH/opencode.json" ]; then
    echo "⚠️  No opencode.json found in project. Creating default config..."
    cat > "$PROJECT_PATH/opencode.json" << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-google-antigravity-auth",
    "opencode-skills"
  ]
}
EOF
    echo "✅ Created opencode.json with plugins"
fi

# Start containers
cd "$(dirname "$0")"
docker compose up -d

echo ""
echo "✅ Portal is starting!"
echo "🌐 Portal UI: http://localhost:3000"
echo "🔌 OpenCode API: http://localhost:4001"
echo ""
echo "To view logs: docker compose logs -f"
echo "To stop: docker compose down"
