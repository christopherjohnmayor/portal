# Multi-Instance OpenCode Portal Architecture

## Overview

This document describes the multi-instance approach for running the OpenCode Portal with multiple OpenCode servers, each connected to its own workspace/volume. This provides complete isolation between projects while maintaining a single unified UI.

## Architecture

```
┌─────────────────────────────────────────┐
│         Portal UI (Next.js)            │
│  ┌───────────────────────────────────┐  │
│  │ Server Switcher (Dropdown)       │  │
│  │   ▸ Project Alpha (4001)       │  │
│  │   ▸ Project Beta (4002)        │  │
│  │   ▸ Project Gamma (4003)        │  │
│  └───────────────────────────────────┘  │
└───────────┬─────────────────────────────┘
            │
            ├────────────────────┬────────────────────┐
            │                    │                    │
     ┌──────▼──────┐      ┌────▼─────┐      ┌───▼──────┐
     │ OpenCode 1  │      │OpenCode 2│      │OpenCode 3│
     │ Port 4001   │      │Port 4002 │      │Port 4003 │
     │ Volume A    │      │Volume B  │      │Volume C  │
     └─────────────┘      └──────────┘      └──────────┘
```

## Key Benefits

### Advantages

- **Complete Isolation**: Each OpenCode instance is completely independent
- **Independent Configs**: Each volume has its own `opencode.json`
- **Resource Control**: Scale instances independently based on project needs
- **Simple Codebase**: Minimal changes to existing portal code
- **Easy Scaling**: Add/remove servers without code changes
- **Parallel Development**: Work on multiple projects simultaneously
- **Clean Separation**: Sessions, files, and terminal context isolated per project

### Trade-offs

- **Multiple Servers**: Running multiple OpenCode instances uses more resources
- **Management Overhead**: Need to manage multiple Docker containers/services
- **Port Allocation**: Each server requires unique port
- **Network Configuration**: Services need to be on same network for internal communication

## Technical Implementation

### Core Components

#### 1. Server Management System

- **Server Registry**: List of all configured OpenCode servers
- **Active Server State**: Currently selected server for all operations
- **Persistence**: Servers stored in localStorage for browser persistence
- **Visual Differentiation**: Color-coded servers for easy identification

#### 2. Dynamic URL Routing

- **Client-Side Switching**: Portal UI switches which server URL to use
- **API Proxies**: All API calls routed to currently active server
- **WebSocket Connections**: Terminal WebSocket connects to active server
- **State Synchronization**: Switching servers reloads app to clean state

#### 3. User Interface Components

##### Server Switcher (Sidebar)

- Dropdown selector for switching between servers
- Visual indicator (dot) showing active server
- Server name display with color coding
- Quick access to server management

##### Server Management Page

- List all configured servers
- Add new server with name, URL, and color
- Edit existing server configuration
- Delete server (with confirmation)
- Switch active server
- Show connection status indicator

##### Breadcrumbs

- Updated to show current server context
- Project name derived from active server
- Clear visual hierarchy

### Data Model

#### Server Configuration Interface

```typescript
interface ServerConfig {
  id: string; // Unique identifier (e.g., "project-alpha")
  name: string; // Display name (e.g., "Project Alpha")
  url: string; // Full URL (e.g., "http://localhost:4001")
  color?: string; // Hex color for UI differentiation (optional)
}
```

#### Server State Management

```typescript
interface ServerState {
  servers: ServerConfig[]; // All configured servers
  activeServerId: string; // Currently active server ID
  setActiveServer: (id: string) => void;
  addServer: (server: ServerConfig) => void;
  removeServer: (id: string) => void;
}
```

## Deployment Strategies

### Development Environment

#### Docker Compose (Recommended)

**File Structure**:

```
project/
├── docker-compose.yml
├── .env
├── project-alpha/     # Local volume path
├── project-beta/      # Local volume path
└── project-gamma/     # Local volume path
```

**docker-compose.yml**:

- Portal service on port 3000
- OpenCode services on ports 4001, 4002, 4003
- Shared Docker network for internal communication
- Volume mounts for each project
- Git config and SSH keys shared (read-only)
- Docker socket access for Docker-in-Docker

**Usage**:

```bash
docker-compose up -d
docker-compose logs -f portal
docker-compose down
```

### Production Environment

#### Option 1: Docker Swarm

**Benefits**:

- Simple deployment
- Built-in load balancing
- Rolling updates
- Service discovery

**Configuration**:

- Use Docker Stack
- Deploy multiple services
- Shared overlay network
- Volume mounts from host or named volumes
- Health checks for all services

#### Option 2: Kubernetes

**Benefits**:

- Scalability
- Self-healing
- Resource quotas
- Namespaces for separation

**Configuration**:

- Deployments for each OpenCode instance
- Service for load balancing
- ConfigMaps for environment variables
- PersistentVolumeClaims for workspace storage
- Ingress for external access

#### Option 3: VPS with Nginx

**Benefits**:

- Full control
- Simple SSL/TLS setup
- Easy debugging
- Cost-effective

**Configuration**:

- Multiple Docker containers
- Nginx reverse proxy
- Subdomains or path routing
- SSL certificates via Let's Encrypt
- Tailscale for secure remote access

## Environment Configuration

### Environment Variables

#### Required Variables

```bash
# Default/OpenCode primary server
OPENCODE_SERVER_URL=http://localhost:4000
```

#### Optional Variables (for Pre-Configuration)

```bash
# Server 1
OPENCODE_SERVER_1_NAME=Project Alpha
OPENCODE_SERVER_1_URL=http://localhost:4001

# Server 2
OPENCODE_SERVER_2_NAME=Project Beta
OPENCODE_SERVER_2_URL=http://localhost:4002

# Server 3
OPENCODE_SERVER_3_NAME=Project Gamma
OPENCODE_SERVER_3_URL=http://localhost:4003
```

### Fallback Behavior

1. Check localStorage for persisted servers
2. Fall back to environment variables
3. Fall back to `OPENCODE_SERVER_URL` as default
4. Default to `http://localhost:4000` if nothing configured

## Client-Side State Management

### LocalStorage Keys

```javascript
{
  "opencode-servers": [...],           // Array of ServerConfig
  "opencode-active-server": "project-alpha",  // Active server ID
  // ... other existing keys
}
```

### State Persistence Flow

1. User adds server via UI → Updates `opencode-servers`
2. User switches server → Updates `opencode-active-server`
3. Page loads → Reads from localStorage
4. Switching server → Page reloads to clean state
5. Removing active server → Auto-selects first available

## API & WebSocket Integration

### API Routing

All existing API routes remain unchanged. The server URL is determined at the API layer:

#### Current Implementation

```typescript
// Static URL
const opencodeClient = createOpencodeClient({
  baseUrl: process.env.OPENCODE_SERVER_URL,
});
```

#### Updated Implementation

```typescript
// Dynamic URL based on active server
const getServerUrl = () => {
  // Read from request header, query param, or default
  const activeServer = getActiveServer();
  return activeServer?.url || process.env.OPENCODE_SERVER_URL;
};

const opencodeClient = createOpencodeClient({
  baseUrl: getServerUrl(),
});
```

### WebSocket Connection (Terminal)

#### Current Implementation

```typescript
// Hardcoded connection to OPENCODE_SERVER_URL
const ws = new WebSocket(`${serverUrl}/api/terminal/ws`);
```

#### Updated Implementation

```typescript
// Connect to active server
const { activeServer } = useServers();
const wsUrl = `${activeServer?.url || "http://localhost:4000"}/api/terminal/ws`;
const ws = new WebSocket(wsUrl);
```

## User Experience Flow

### Initial Setup

1. User opens Portal
2. Portal loads with default server (from env or localStorage)
3. User navigates to `/servers`
4. User adds additional servers (name, URL, color)
5. Servers persisted to localStorage

### Day-to-Day Usage

1. User sees active server in sidebar dropdown
2. User switches to different project via dropdown
3. App reloads (optional, for clean state)
4. All operations (sessions, files, terminal) now use new server
5. Each server maintains its own sessions, files, and terminal state

### Server Management

1. User navigates to `/servers` page
2. Views list of all configured servers
3. Can:
   - Switch active server
   - Add new server
   - Edit server details
   - Delete server (with confirmation)

## Security Considerations

### Network Security

- **Private Networks**: Use Docker networks or VPN (Tailscale)
- **Authentication**: Configure OpenCode auth on each server
- **HTTPS**: Use reverse proxy with SSL/TLS
- **Firewall**: Only expose necessary ports (3000 for Portal, 400x for internal use)

### Access Control

- **Server List Privacy**: localStorage is per-browser
- **No Shared State**: Complete isolation between servers
- **Individual Auth**: Each OpenCode instance maintains its own auth

## Performance Considerations

### Resource Usage

- **Memory**: Each OpenCode instance consumes RAM (~512MB-2GB)
- **Disk**: Each workspace volume consumes disk space independently
- **CPU**: Parallel processing allows concurrent operations

### Optimization Tips

- **Scale Based on Need**: Only run active servers
- **Resource Limits**: Set Docker memory limits per container
- **Session Cleanup**: Periodically clean old sessions
- **File Caching**: Leverage OpenCode's internal caching

## Troubleshooting

### Common Issues

#### Issue: Server Not Connecting

**Symptoms**: Connection errors, API timeouts
**Solutions**:

- Check if OpenCode container is running
- Verify port mapping in Docker configuration
- Check network connectivity
- Verify `OPENCODE_SERVER_URL` is correct

#### Issue: Sessions Not Showing

**Symptoms**: Session list empty after switching servers
**Solutions**:

- Each server has independent sessions
- Create new session in each server
- Check OpenCode server logs for errors

#### Issue: Terminal Not Connecting

**Symptoms**: Terminal shows "disconnected" status
**Solutions**:

- Verify WebSocket URL matches active server
- Check WebSocket proxy configuration (if using reverse proxy)
- Ensure OpenCode terminal endpoint is accessible

## Migration Guide

### From Single-Server Setup

#### Existing Data

- **Sessions**: Remain on original server
- **Files**: Stay in original workspace
- **Configuration**: Preserved in that server's `opencode.json`

#### Adding New Servers

1. Start new OpenCode instance with different volume
2. Add server in Portal UI
3. Switch to new server
4. Create new sessions/files as needed

#### No Data Loss

- Original server unaffected
- All existing sessions, files, and configurations preserved
- Easy rollback by switching back to original server

## Future Enhancements

### Potential Improvements

- **Side-by-Side Sessions**: Open sessions from different servers simultaneously
- **Cross-Server Operations**: Copy files between servers
- **Server Health Monitoring**: Status indicators for each server
- **Auto-Discovery**: Automatically detect OpenCode instances on network
- **Server Groups**: Organize servers by environment (dev, staging, prod)
- **Import/Export Configuration**: Backup and restore server lists
- **Server Templates**: Pre-configured server setups for common use cases

---

## Implementation Status

- [x] Server management system
- [x] Server switcher UI component
- [x] Server management page
- [x] Dynamic API URL routing
- [x] WebSocket connection switching
- [x] Docker Compose configuration
- [x] Environment variable integration
- [ ] Testing and validation

### Implementation Notes

**Frontend (Completed):**

- `useServers` hook with localStorage persistence
- Server switcher in app sidebar nav (`app-sidebar-nav.tsx`)
- Full server management page at `/servers` with CRUD operations
- Environment variable support for pre-configuring servers (OPENCODE*SERVER*{N}\_NAME/URL)
- Auto page reload on server switch to clear state

**Backend (Completed):**

- `getActiveServerUrl()` utility extracts active server from request header
- API proxy ([[...slugs]].ts) uses dynamic OpenCode client per request
- WebSocket proxy (terminal/ws.ts) routes to correct OpenCode server
- Fallback hierarchy: header → env var → default

**Infrastructure (Completed):**

- Multi-instance Docker Compose at `docker-compose.multi-instance.yml`
- Three OpenCode services (ports 4001, 4002, 4003)
- Shared network for inter-service communication
- Separate workspace volumes for each instance
- Portal connects to opencode-1 by default

**Usage:**

1. Start multi-instance setup: `docker-compose -f docker-compose.multi-instance.yml up -d`
2. Access portal at http://localhost:3000
3. Switch between servers using dropdown in sidebar
4. Each server maintains isolated sessions, files, and terminal state
