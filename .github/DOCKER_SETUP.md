# Docker Registry Setup

This guide explains how to set up automatic Docker image builds and pushes to Docker Hub and GitHub Container Registry.

## Prerequisites

### GitHub Container Registry (GHCR)
✅ **Already configured!** The workflow uses `GITHUB_TOKEN` which is automatically available in GitHub Actions.

### Docker Hub (Optional)
To also push to Docker Hub, you need to add the following secrets to your GitHub repository:

1. Go to your GitHub repository Settings → Secrets and variables → Actions
2. Add the following repository secrets:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_PASSWORD`: Your Docker Hub password or access token (recommended)

**To create a Docker Hub access token:**
1. Log in to Docker Hub
2. Go to Account Settings → Security → Access Tokens
3. Click "New Access Token"
4. Give it a name (e.g., "GitHub Actions") and copy the token
5. Use this token as `DOCKER_PASSWORD` in GitHub secrets

## How It Works

The workflow (`docker-publish.yml`) automatically:

1. **Triggers on:**
   - Every push to `master` branch
   - Manual workflow dispatch (from GitHub Actions tab)

2. **Builds:**
   - Multi-platform images (linux/amd64, linux/arm64)
   - Uses Docker Buildx for efficient builds
   - Caches layers for faster subsequent builds

3. **Pushes to:**
   - GitHub Container Registry: `ghcr.io/dogacanaydin/airshare:latest`
   - Docker Hub: `docker.io/<your-username>/airshare:latest` (if secrets are configured)

4. **Tags:**
   - `latest` - Latest build from master
   - `master-<sha>` - Specific commit SHA
   - Semantic versions if you use version tags

## Testing the Workflow

### Option 1: Push to Master
```bash
git add .
git commit -m "Update application"
git push origin master
```

### Option 2: Manual Trigger
1. Go to your GitHub repository
2. Click on "Actions" tab
3. Select "Build and Push Docker Image" workflow
4. Click "Run workflow"

## Watchtower Integration

Once the workflow runs successfully, Watchtower will automatically detect new images and update your containers.

Your `docker-compose.yml` is already configured to pull from GHCR:
```yaml
image: ghcr.io/dogacanaydin/airshare:latest
```

## Troubleshooting

### Workflow fails with "unauthorized" for Docker Hub
- Verify `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are set correctly
- If you only want to use GHCR, you can remove the Docker Hub login step from the workflow

### Watchtower not updating
- Check if the workflow ran successfully in GitHub Actions
- Verify the image was pushed: `docker pull ghcr.io/dogacanaydin/airshare:latest`
- Check Watchtower logs: `docker logs watchtower`

### Image not found
- For GHCR images, ensure the repository/package visibility is set to public
- Go to repository Settings → Packages → airshare → Package settings → Change visibility
