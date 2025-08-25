#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting PawMatch Full Deployment${NC}"
echo "=================================="

# Step 1: Deploy API (基盤となるAPI)
echo -e "\n${YELLOW}Step 1: Deploying API...${NC}"
cd api && npm run deploy
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ API deployment failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ API deployed successfully${NC}"

# Step 2: Deploy Workers in parallel (Crawler, Dispatcher, Converter)
echo -e "\n${YELLOW}Step 2: Deploying Workers...${NC}"
cd ../

# Use npx to run concurrently
npx concurrently \
    --names "CRAWLER,DISPATCH,CONVERT" \
    --prefix-colors "cyan,magenta,yellow" \
    --success first \
    "cd crawler && npm run deploy" \
    "cd dispatcher && npm run deploy" \
    "cd converter && npm run deploy"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Workers deployment failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All Workers deployed successfully${NC}"

# Step 3: Deploy Apps in parallel (DogMatch and CatMatch)
echo -e "\n${YELLOW}Step 3: Building and Deploying Apps...${NC}"

# First build both apps in parallel
npx concurrently \
    --names "BUILD:DOG,BUILD:CAT" \
    --prefix-colors "blue,green" \
    --success all \
    "cd app && npm run build:dog" \
    "cd app && npm run build:cat"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ App builds failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Apps built successfully${NC}"

# Then deploy both apps in parallel
echo -e "\n${YELLOW}Deploying Apps to Cloudflare Pages...${NC}"
npx concurrently \
    --names "DEPLOY:DOG,DEPLOY:CAT" \
    --prefix-colors "blue,green" \
    --success all \
    "cd app && npx wrangler pages deploy .next --project-name=dogmatch" \
    "cd app && npx wrangler pages deploy .next --project-name=catmatch"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ App deployments failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 All deployments completed successfully!${NC}"
echo "=================================="
echo -e "${GREEN}Summary:${NC}"
echo "  ✅ API deployed"
echo "  ✅ Crawler deployed"
echo "  ✅ Dispatcher deployed"
echo "  ✅ Converter deployed"
echo "  ✅ DogMatch app deployed"
echo "  ✅ CatMatch app deployed"
echo ""
echo -e "${YELLOW}URLs:${NC}"
echo "  API: https://api.pawmatch.app"
echo "  DogMatch: https://dogmatch.pages.dev"
echo "  CatMatch: https://catmatch.pages.dev"