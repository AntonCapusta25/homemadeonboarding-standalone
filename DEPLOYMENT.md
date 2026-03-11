# Home Chef ChatGPT App - Deployment Guide

## 🚀 Quick Start

Your Home Chef onboarding app is ready to deploy! Follow these steps:

### 1. Local Testing

```bash
# Start the MCP server locally
npm run dev:mcp

# In another terminal, expose it with ngrok
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.app)
```

### 2. Test in ChatGPT

1. Go to [ChatGPT](https://chat.openai.com)
2. Click Settings → Developer Mode
3. Add your MCP server:
   - URL: `https://your-ngrok-url.ngrok.app/api/mcp`
4. Start chatting:
   - "Show me my home chef progress"
   - "What's my current step?"
   - "Complete the welcome step"
   - "Give me some AI tips"
   - "I want to book a consultation"

### 3. Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy
vercel --prod

# Copy your deployment URL
```

### 4. Update ChatGPT with Production URL

1. Go to ChatGPT Settings → Developer Mode
2. Update MCP server URL to: `https://your-app.vercel.app/api/mcp`
3. Test all features

## 📋 Features

### Tools Available

1. **get_chef_progress** - View overall onboarding progress
2. **get_current_step** - Get details about current step
3. **complete_step** - Mark a step as complete
4. **get_ai_tips** - Get AI-powered tips
5. **schedule_consultation** - Get booking link

### Widget Features

- ✅ Progress bar visualization
- ✅ Step-by-step checklist
- ✅ AI-powered tips section
- ✅ "Book a Call" CTA button
- ✅ Responsive design
- ✅ Beautiful UI with system fonts

## 🔧 Configuration

### Update Booking URL

Edit `server/mcp-server.ts` and replace:
```typescript
bookingUrl: "https://calendly.com/your-booking-link"
```

With your actual Calendly or booking link.

### Connect to Supabase (Optional)

Replace the in-memory storage in `server/mcp-server.ts` with Supabase:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

// Replace chefProgress with database queries
```

## 🎨 Customization

### Add More Steps

Edit `CHEF_STEPS` in `server/mcp-server.ts`:

```typescript
{
  id: "new-step",
  title: "New Step Title",
  description: "Description of what to do",
  status: "not_started" as "not_started" | "completed",
}
```

### Customize Widget Styling

Edit `public/widgets/home-chef-widget.html` CSS variables:

```css
:root {
  --color-primary: #111bf5;  /* Change primary color */
  --color-success: #10b981;  /* Change success color */
}
```

### Add More AI Tips

Edit the `aiTips` array in `server/mcp-server.ts`.

## 🐛 Troubleshooting

### MCP Server Not Responding

- Check Vercel logs: `vercel logs`
- Verify CORS headers in `vercel.json`
- Ensure `/api/mcp` endpoint is accessible

### Widget Not Rendering

- Check browser console for errors
- Verify `window.openai` is available
- Check that widget HTML is being served correctly

### Tools Not Being Called

- Verify tool descriptions are clear
- Check tool annotations are correct
- Ensure ChatGPT can understand the intent

## 📚 Next Steps

1. **Add Authentication** - Integrate user authentication
2. **Connect Database** - Replace in-memory storage with Supabase
3. **Add More Tools** - Create tools for specific actions
4. **Submit to OpenAI** - Submit for public distribution
5. **Analytics** - Track usage and user progress

## 🔗 Resources

- [OpenAI Apps SDK Docs](https://developers.openai.com/apps-sdk)
- [MCP Specification](https://modelcontextprotocol.io)
- [Vercel Deployment](https://vercel.com/docs)

## 💡 Example Prompts

Try these in ChatGPT:

- "Show me my home chef journey"
- "What do I need to do next?"
- "Mark the certification step as complete"
- "Give me tips for creating my menu"
- "I need help, can I book a call?"
