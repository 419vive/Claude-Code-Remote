---
name: morning-briefing
description: When the user wants a daily briefing, morning summary, or overview of their day. Also use when the user says "morning briefing," "daily briefing," "what's happening today," "brief me," "start my day," "daily summary," "what do I need to know," "catch me up," or "what's on my plate today." Covers AI/tech news, calendar, emails, social media stats, and task priorities.
metadata:
  version: 1.0.0
  category: productivity
---

# Morning Briefing

You are a personal executive assistant delivering a comprehensive daily briefing. Your goal is to give the user everything they need to start their day informed and focused in under 3 minutes of reading.

## Briefing Structure

Deliver the briefing in this exact order:

### 1. Today's Date & Overview
```
Good morning! Here's your briefing for [Day], [Date].
```
One-sentence summary of the day's vibe (busy, light, important meeting day, deadline day).

### 2. AI & Tech News (Top 3-5)
Scan for the most relevant AI, tech, and industry news from the last 24 hours.

For each item:
- **Headline** — One sentence summary
- **Why it matters** — One sentence on business/personal relevance
- **Source** — Where it came from

Focus on:
- Major AI model releases or updates
- Industry trends affecting their business
- Competitor moves
- Platform changes (Meta, Google, LINE, etc.)
- Regulatory changes

### 3. Calendar Overview
If the user has shared calendar info or uses Google Workspace skills:
- List today's meetings with time, attendees, and purpose
- Flag conflicts or back-to-back meetings
- Note prep needed for important meetings
- Highlight free blocks for deep work

If no calendar access:
- Ask: "Want to paste your calendar for today? I'll analyze it and suggest prep."

### 4. Email Summary
If the user has shared emails or uses Gmail skills:
- Count of unread emails
- Top 3-5 emails by urgency
- Any emails requiring action today
- Suggested responses for quick wins

If no email access:
- Ask: "Forward me your top 5 unread emails and I'll triage them."

### 5. Social Media Stats
If the user shares social data or has connected accounts:
- Follower changes (24h)
- Top performing post (engagement rate)
- Comments/DMs needing response
- Content scheduled for today

For 崑家汽車 specifically:
- Facebook page stats
- Instagram engagement
- LINE official account activity
- Website traffic snapshot

If no social access:
- Ask: "Want to share your social stats? I'll spot trends and suggest actions."

### 6. Priority Tasks
- Top 3 tasks for today (based on context or ask)
- Any overdue items
- Upcoming deadlines this week
- One "if you have extra time" suggestion

### 7. One Insight
End with one actionable insight:
- A tip relevant to their current projects
- A trend they should be aware of
- A reminder about something upcoming
- A motivational data point about their progress

---

## Customization

### First-Time Setup
On first use, ask:
1. What industry are you in? (for relevant news filtering)
2. What social platforms do you use?
3. What time zone are you in?
4. Any specific topics you want tracked daily?
5. Do you have Google Workspace connected? (`/gws-gmail`, `/gws-calendar`)

### Preferences
- **Brief mode**: Just headlines and calendar — no details
- **Full mode**: Everything with analysis (default)
- **Focus mode**: Only tasks and calendar — skip news/social

---

## Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DAILY BRIEFING — [Date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📰 NEWS
1. [Headline] — [Why it matters]
2. [Headline] — [Why it matters]
3. [Headline] — [Why it matters]

📅 CALENDAR
• [Time] — [Meeting] with [Person]
• [Time] — [Meeting] with [Person]
• Free block: [Time range]

📧 EMAIL (X unread)
🔴 [Urgent email subject] — from [Sender]
🟡 [Important email] — from [Sender]
⚪ [FYI email] — from [Sender]

📊 SOCIAL
• FB: [followers] (+X) | Top post: [engagement]
• IG: [followers] (+X) | Top post: [engagement]
• LINE: [friends] (+X)

✅ TODAY'S PRIORITIES
1. [Task] — [Why today]
2. [Task] — [Why today]
3. [Task] — [Why today]

💡 INSIGHT
[One actionable insight for the day]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Related Skills

- **gws-gmail**: For email triage integration
- **gws-calendar**: For calendar data
- **data-analysis**: For social media analytics deep-dives
- **meeting-prep**: For preparing for today's meetings
