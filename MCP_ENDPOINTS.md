# 🎯 Your Home Chef MCP Endpoints

## Production Endpoints (Vercel)

### Main Endpoint
```
https://homemadeonboarding-standalone-mqc782i7n-autoflowdevs-projects.vercel.app/api/mcp
```

### SSE Endpoint (for ChatGPT)
```
https://homemadeonboarding-standalone-mqc782i7n-autoflowdevs-projects.vercel.app/api/mcp/sse
```

## Local Development Endpoints

### Main Endpoint
```
http://localhost:8787/api/mcp
```

### SSE Endpoint
```
http://localhost:8787/api/mcp/sse
```

## How to Add to ChatGPT

### Option 1: Using SSE Endpoint (Recommended)
1. Open [ChatGPT](https://chat.openai.com)
2. Go to **Settings** → **Developer Mode** (or **Beta Features**)
3. Enable **Developer Mode**
4. Click **Add MCP Server** or **Manage Connectors**
5. Add this URL:
   ```
   https://homemadeonboarding-standalone-mqc782i7n-autoflowdevs-projects.vercel.app/api/mcp/sse
   ```

### Option 2: Using Main Endpoint
If `/sse` doesn't work, try the main endpoint:
```
https://homemadeonboarding-standalone-mqc782i7n-autoflowdevs-projects.vercel.app/api/mcp
```

## Test Your Endpoints

### Check if Server is Running
Open in browser:
```
https://homemadeonboarding-standalone-mqc782i7n-autoflowdevs-projects.vercel.app/api/mcp
```

You should see:
```json
{
  "status": "ok",
  "service": "Home Chef MCP Server",
  "version": "1.0.0",
  "endpoints": {
    "sse": "/api/mcp/sse",
    "http": "/api/mcp"
  }
}
```

## Example ChatGPT Prompts

Once connected, try these:

### Basic Progress
- "Show me my home chef progress"
- "What's my current step?"
- "Complete the welcome step"

### AI Menu Generation
- "Generate an Italian menu with 5 dishes, vegetarian, mid-range prices"
- "Create a Mexican menu with 7 dishes, gluten-free options, premium pricing"

### AI Logo Creation
- "Create a modern logo for 'Chef Maria's Kitchen'"
- "Generate an elegant logo for my chef business called 'Bella's Bistro' in red and gold"

### Kitchen Verification
- "Verify my kitchen - I have clean countertops, proper lighting, fire safety equipment, and good ventilation"

### Food Safety
- "Give me food safety tips for cooking"
- "Show me cleaning safety tips"
- "I want to take the food safety certification test"

### Booking
- "I need help, can I book a consultation?"

## All 10 Available Tools

1. ✅ `get_chef_progress` - View overall progress
2. ✅ `get_current_step` - Current step details
3. ✅ `complete_step` - Mark step complete
4. ✅ `get_ai_tips` - AI-powered tips
5. ✅ `schedule_consultation` - Book expert call
6. ✅ `generate_menu` - AI menu generation
7. ✅ `generate_logo` - Logo creation
8. ✅ `verify_kitchen_photo` - Kitchen verification
9. ✅ `get_safety_tips` - Food safety tips
10. ✅ `take_safety_test` - Certification test

## Hosting Multiple MCPs

### Recommended Structure

For multiple MCP servers, I recommend:

**Option 1: Separate Vercel Projects**
```
home-chef-mcp.vercel.app/api/mcp
analytics-mcp.vercel.app/api/mcp
crm-mcp.vercel.app/api/mcp
```

**Option 2: Single Domain, Multiple Endpoints**
```
your-mcps.vercel.app/api/home-chef
your-mcps.vercel.app/api/analytics
your-mcps.vercel.app/api/crm
```

**Option 3: Monorepo on Vercel**
```
your-workspace/
├── apps/
│   ├── home-chef-mcp/
│   ├── analytics-mcp/
│   └── crm-mcp/
└── vercel.json (configure multiple projects)
```

See `MCP_HOSTING_GUIDE.md` for detailed comparisons.

## Update Your Deployment

To update your MCP server:

```bash
# Make changes to your code
# Then redeploy
vercel --prod --yes
```

Your new deployment URL will be shown in the output.

## Troubleshooting

### MCP Not Responding
- Check Vercel logs: `vercel logs`
- Verify endpoint is accessible in browser
- Check CORS headers are set correctly

### ChatGPT Can't Connect
- Try both `/api/mcp` and `/api/mcp/sse` endpoints
- Ensure you're using the full HTTPS URL
- Check that Developer Mode is enabled in ChatGPT

### Widget Not Showing
- Widget is embedded in MCP responses
- ChatGPT will display it automatically when tools are called
- Check browser console for errors

## Next Steps

1. ✅ Test all 10 tools in ChatGPT
2. Update booking URL in `server/mcp-server.ts`
3. Add real OpenAI API integration for menu/logo generation
4. Connect to Supabase for persistent storage
5. Add user authentication
6. Submit to OpenAI for public distribution (optional)

## Support Files

- `DEPLOYED.md` - Deployment guide
- `MCP_HOSTING_GUIDE.md` - Hosting options
- `walkthrough.md` - Implementation details
- `DEPLOYMENT.md` - General deployment info

---

**Your MCP is live and ready to use!** 🎉

Add the SSE endpoint to ChatGPT and start testing your Home Chef onboarding app!
