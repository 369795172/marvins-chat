# Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Option 1: GitHub Integration (Easiest)

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Sign in with your GitHub account
3. Click "Import" next to your `marvins-chat` repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
5. **Add Environment Variable**:
   - Name: `AI_BUILDER_TOKEN`
   - Value: Your API token from https://space.ai-builders.com
6. Click "Deploy"
7. Wait for deployment to complete (~2-3 minutes)
8. Your app will be live at `https://marvins-chat-*.vercel.app`

### Option 2: Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```
   This will open your browser for authentication.

3. Deploy to production:
   ```bash
   cd chatgpt-clone
   vercel --prod
   ```

4. When prompted, add the environment variable:
   - `AI_BUILDER_TOKEN`: Your API token

## Environment Variables

Make sure to set the following in your Vercel project settings:

- **AI_BUILDER_TOKEN**: Your AI Builder Space API token

To add/update environment variables:
1. Go to your project on Vercel dashboard
2. Settings → Environment Variables
3. Add or edit variables
4. Redeploy if needed

## Post-Deployment

After deployment:
- Your app will have a URL like `https://marvins-chat-*.vercel.app`
- You can add a custom domain in Vercel project settings
- All future pushes to `main` branch will auto-deploy

## Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **API errors**: Verify `AI_BUILDER_TOKEN` is set correctly
- **404 errors**: Ensure API routes are in `app/api/` directory
