# Stop Trusting Claude's First Answer (The LLM Council Skill) | Ten Fold

Source: https://guides.tenfoldmarketing.com/llm-council

---

Apr 18, 2026 · Free Guide

# Stop Trusting Claude's First Answer (Use the LLM Council Instead)

Claude is agreeable. Ask it "should I launch this?" and it'll find 5 reasons you should. Ask "is this a bad idea?" and it'll find 5 reasons it is. Same idea, opposite answers. This free skill fixes it — 5 AI advisors argue about your question, peer-review each other anonymously, and hand you a verdict you can actually trust.

## Why one answer is the problem

You ask Claude a question, it gives you an answer that sounds smart, you feel good, you move on. But that answer got shaped by how you asked it — your assumptions, your framing, your emotional lean. Claude picked up on all of it and told you what you wanted to hear.

That's fine for writing emails. It's dangerous for making decisions.

## Where this comes from

[Andrej Karpathy](https://x.com/karpathy) (co-founder of OpenAI, former head of AI at Tesla) built something called the LLM Council. Instead of asking one model a question, you poll multiple models. Then have them peer-review each other anonymously. Then a chairman synthesizes the final answer.

This skill runs the same method entirely inside Claude Code — using sub-agents with different thinking styles instead of different models. You type **"council this"** and 5 advisors spin up, argue, review each other's blind spots, and deliver a verdict. All in one session.

## The 5 advisors

Not 5 copies of Claude. 5 fundamentally different **thinking lenses**. They can't converge on the same answer because they're not looking at the same angle.

01

The Contrarian

Hunts for what will fail. Assumes the idea has a fatal flaw and tries to find it.

02

The First Principles Thinker

Asks if you're even solving the right problem. Strips away your assumptions.

03

The Expansionist

Looks for upside you're missing. What happens if this works better than expected?

04

The Outsider

Has zero context about you or your field. Catches the curse of knowledge.

05

The Executor

Only cares what you do Monday morning. No clear first step? They'll say so.

## Why the peer review matters

This is what separates the council from just asking Claude 5 times. After all 5 advisors respond, the skill anonymizes every response — shuffles which advisor maps to which letter. Reviewers don't know who said what. They evaluate on merit.

Then 5 reviewers read all 5 responses and answer 3 questions:

  1. Which response is strongest and why?
  2. Which has the biggest blind spot?
  3. **What did all five miss?**

That last question is where the gold comes from. Every time the council runs, peer review catches something no individual advisor saw. The gap between perspectives reveals what nobody thought to mention.

## The chairman hands you a verdict

One final agent gets everything — all 5 responses, all 5 reviews — and produces the verdict. Not "it depends." Not "consider both sides." A real answer with a concrete first step:

Where the council agrees

High-confidence signals — multiple advisors converged here independently.

Where the council clashes

The genuine disagreements. Presented, not smoothed over.

Blind spots caught

Things only peer review surfaced. The most valuable part.

The recommendation

A clear, direct answer.

One thing to do first

Single concrete next step. No list of 10 things.

HOW TO INSTALL

## Install it in 10 seconds

Just tell Claude Code to install this skill from the repo below. It'll handle everything.

github.com/tenfoldmarc/llm-council-skill

Tell Claude: _"install this skill for me: https://github.com/tenfoldmarc/llm-council-skill"_

**Prefer to do it manually?** Paste this into your terminal:

git clone https://github.com/tenfoldmarc/llm-council-skill ~/.claude/skills/llm-council

Then open Claude Code and say "council this: [your question]"

## What to council

The council works on any decision where being wrong is expensive and you keep going back and forth.

  * **Positioning.** "Should I niche down further or broaden my audience?"
  * **Pricing.** "Am I leaving money on the table or pricing myself out?"
  * **Hiring vs automation.** "Should I hire a VA or build an automation?"
  * **Product format.** "Live workshop or self-paced course?"
  * **Any fork in the road** where you've been circling for days.

If you already know the answer and just want validation — skip it. The council will tell you things you don't want to hear. That's the point.

## All Resources

[LLM Council Skill (GitHub)The free skill — install in one line→](https://github.com/tenfoldmarc/llm-council-skill)[Karpathy's Original LLM CouncilThe tweet that started it all→](https://x.com/karpathy/status/1962263486196867115)[Claude CodeYou need this installed to use the skill→](https://claude.com/claude-code)

The Next Step

## Guides show you what. AI Builders shows you how.

Inside the community, I walk through every build live — including the stuff that doesn't make it into guides. Regular people (not developers) figuring out AI together, shipping real projects, asking me anything. No fluff, no theory, just the actual work.

[Join AI Builders→](https://paid.tenfoldmarketing.com)

paid.tenfoldmarketing.com
