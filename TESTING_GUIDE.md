# Testing Your ChatGPT App (Apps SDK)

## 🎯 What We Built

We built a **ChatGPT App** using the **Apps SDK**, not a Connector. This means:

- ✅ Custom tools (menu generation, logo creation, etc.)
- ✅ Custom widget UI
- ✅ Requires OpenAI submission for public use
- ⚠️ Cannot test in ChatGPT Developer Mode yet (that's for Connectors)

## 🧪 How to Test Your App

### Option 1: Submit to OpenAI for Testing (Recommended)

1. **Go to OpenAI Platform**
   - Visit: https://platform.openai.com/apps-manage
   - Sign in with your OpenAI account

2. **Create New App**
   - Click "Create App"
   - Name: "Home Chef Onboarding"
   - Description: "AI-powered onboarding for aspiring home chefs"

3. **Configure MCP Endpoint**
   - Add your endpoint:
     ```
     https://stupid-regions-admire.loca.lt/api/mcp
     ```
   - Or use Vercel (after fixing auth):
     ```
     https://homemadeonboarding-standalone-mqc782i7n-autoflowdevs-projects.vercel.app/api/mcp
     ```

4. **Submit for Review**
   - Provide test credentials (if needed)
   - Wait for approval (usually 1-3 days)
   - Once approved, test in ChatGPT

### Option 2: Test Locally with MCP Inspector

The MCP SDK provides an inspector tool to test your server:

```bash
# Install MCP Inspector
npx @modelcontextprotocol/inspector

# Or test your local server directly
npx @modelcontextprotocol/inspector http://localhost:8787/api/mcp
```

This will open a web interface where you can:
- See all your tools listed
- Call each tool with test parameters
- View responses and widget output
- Debug any issues

### Option 3: Test with curl/Postman

Test your MCP endpoint directly:

```bash
# Health check
curl https://stupid-regions-admire.loca.lt/api/mcp

# List tools
curl -X POST https://stupid-regions-admire.loca.lt/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'

# Call a tool
curl -X POST https://stupid-regions-admire.loca.lt/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_chef_progress",
      "arguments": {}
    },
    "id": 2
  }'
```

### Option 4: Build a Test Client

Create a simple Node.js script to test your MCP server:

```javascript
// test-mcp-client.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client({
  name: 'test-client',
  version: '1.0.0',
});

const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:8787/api/mcp')
);

await client.connect(transport);

// List tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool({
  name: 'get_chef_progress',
  arguments: {}
});
console.log('Result:', result);
```

Run with: `node test-mcp-client.js`

## 🔍 What You Can Test Right Now

### 1. Verify Server is Running

Open in browser:
```
https://stupid-regions-admire.loca.lt/api/mcp
```

Should return JSON with server info.

### 2. View Widget Demo

Open in browser:
```
http://localhost:8080/
```

You'll see your widget UI in action!

### 3. Check MCP Server Logs

Watch your terminal running `PORT=8787 npm run dev:mcp` for:
- Tool calls
- Errors
- Request logs

## 📋 Testing Checklist

Before submitting to OpenAI, verify:

- [ ] Server responds to health checks
- [ ] All 10 tools are registered
- [ ] Widget HTML loads correctly
- [ ] Tool calls return proper responses
- [ ] Widget displays in demo page
- [ ] No errors in server logs
- [ ] CORS headers are set
- [ ] Endpoint is publicly accessible

## 🚀 Next Steps

### For Immediate Testing

1. **Use MCP Inspector** (easiest):
   ```bash
   npx @modelcontextprotocol/inspector http://localhost:8787/api/mcp
   ```

2. **Test with curl** (verify tools work)

3. **View widget demo** at http://localhost:8080/

### For ChatGPT Testing

1. **Fix Vercel authentication** (see `FIX_VERCEL_AUTH.md`)
2. **Submit app to OpenAI** at https://platform.openai.com/apps-manage
3. **Wait for approval**
4. **Test in ChatGPT**

## 🐛 Common Issues

### "Can't connect to server"
- Check localtunnel is running
- Verify port 8787 is accessible
- Check firewall settings

### "Tools not showing"
- Verify `server.registerTool()` calls
- Check MCP server logs for errors
- Ensure proper tool schema

### "Widget not rendering"
- Check widget HTML syntax
- Verify `window.openai` integration
- Look for JavaScript errors in console

## 📚 Resources

- **MCP Inspector**: https://github.com/modelcontextprotocol/inspector
- **Apps SDK Docs**: https://developers.openai.com/apps-sdk
- **Submit App**: https://platform.openai.com/apps-manage
- **MCP Spec**: https://modelcontextprotocol.io

---

**TL;DR**: 
1. Use **MCP Inspector** to test locally now
2. **Submit to OpenAI** for ChatGPT testing
3. View **widget demo** at http://localhost:8080/
