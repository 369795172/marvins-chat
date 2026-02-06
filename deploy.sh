#!/bin/bash

# Deployment script for AI Builder Space
# This script deploys the Next.js app to AI Builder Space platform

API_BASE_URL="https://space.ai-builders.com/backend/v1"
API_TOKEN="sk_7303f5f8_149910ce7513ff8ae347decdabe0e3cb67dd"

curl -X POST "${API_BASE_URL}/deployments" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
  "repo_url": "https://github.com/369795172/marvins-chat",
  "service_name": "marvins-chat",
  "branch": "main",
  "port": 3000
}'
