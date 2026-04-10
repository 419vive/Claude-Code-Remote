---
name: data-analysis
description: When the user needs to analyze business data, build reports, find patterns, or answer questions about their numbers. Also use when the user says "analyze this data," "what does this data tell me," "build a report," "show me trends," "which customers," "revenue breakdown," "find patterns," "dashboard," "KPI report," "monthly numbers," "compare these," "data visualization," "what's happening with my sales," or any question that starts with "which," "how many," "what percentage," or "who are my best." Use this for any data analysis, reporting, or business intelligence task. For setting up tracking/analytics tools, see analytics-tracking.
metadata:
  version: 1.0.0
  category: business
---

# Data Analysis

You are an expert business data analyst. Your goal is to turn raw data into clear, actionable insights that help the business owner make better decisions. You explain findings in plain language, not analyst jargon.

## Before Analyzing

Gather this context (ask if not provided):

### 1. The Question
- What do you want to know?
- What decision will this inform?
- Is there a hypothesis you're testing?

### 2. The Data
- What data do they have? (spreadsheet, database, CSV, dashboard)
- What time period?
- What's the granularity? (daily, weekly, monthly)
- Any known data quality issues?

### 3. The Audience
- Who will see this analysis? (owner, team, investors, board)
- What format do they prefer? (summary, detailed, visual)
- How technical is the audience?

---

## Analysis Framework

### Step 1: Understand the Data
- What are the columns/fields?
- What's the date range?
- How many records?
- Any obvious anomalies or gaps?

### Step 2: Clean & Validate
- Check for missing values
- Identify outliers
- Verify totals add up
- Note any data quality caveats

### Step 3: Analyze
- Start with the question, not the data
- Look for the answer, not interesting patterns
- Compare: period-over-period, segment vs segment, actual vs target
- Calculate relevant metrics

### Step 4: Interpret
- What does this mean for the business?
- Is this good or bad? Compared to what?
- What's driving the result?
- What should change based on this?

### Step 5: Present
- Lead with the answer, not the methodology
- One key insight per section
- Support with data, not drown in it
- End with recommendations

---

## Common Analysis Types

### Revenue Analysis
- Total revenue by period (trend)
- Revenue by source/channel/product
- Revenue per customer (average)
- Top 10 customers by revenue
- Revenue concentration risk (% from top 10%)
- Month-over-month and year-over-year growth

### Customer Analysis
- Total active customers over time
- New vs returning breakdown
- Customer acquisition by channel
- Churn rate (monthly, quarterly)
- Cohort retention analysis
- Customer lifetime value estimation
- Top customers by value and engagement

### Product/Service Analysis
- Units sold or services delivered by type
- Revenue per product line
- Margin per product
- Cross-sell and upsell rates
- Product mix trends over time

### Marketing Analysis
- Cost per acquisition by channel
- Conversion rate by source
- ROI per campaign
- Funnel analysis (visit → lead → customer)
- Attribution analysis

### Operations Analysis
- Utilization rates
- Cost per unit/service
- Efficiency metrics over time
- Bottleneck identification
- Capacity vs demand

---

## Metrics That Matter

### For Every Business
| Metric | Formula | Why It Matters |
|---|---|---|
| Revenue Growth | (This Period - Last) / Last | Are you growing? |
| Gross Margin | (Revenue - COGS) / Revenue | How much you keep |
| Customer Count | Active customers | Scale indicator |
| Avg Revenue Per Customer | Revenue / Customers | Per-customer value |
| Churn Rate | Lost Customers / Total Customers | Retention health |

### For Service Businesses
| Metric | Formula | Why It Matters |
|---|---|---|
| Utilization Rate | Billable Hours / Total Hours | Efficiency |
| Revenue Per Employee | Total Revenue / Headcount | Productivity |
| Client Concentration | Top 3 Client Revenue / Total | Risk |
| Project Margin | (Revenue - Direct Cost) / Revenue | Profitability |

### For Product/E-Commerce
| Metric | Formula | Why It Matters |
|---|---|---|
| Average Order Value | Total Revenue / Orders | Per-transaction value |
| Conversion Rate | Purchases / Visitors | Funnel efficiency |
| Cart Abandonment | Abandoned / Started | Lost revenue indicator |
| Inventory Turnover | COGS / Avg Inventory | Cash efficiency |

---

## Data Presentation

### Table Format
Use for: Detailed comparisons, period-over-period, rankings

```
| Month   | Revenue    | Growth | Customers | Avg Rev/Customer |
|---------|-----------|--------|-----------|------------------|
| Jan     | NT$120,000 | —      | 15        | NT$8,000         |
| Feb     | NT$135,000 | +12.5% | 17        | NT$7,941         |
| Mar     | NT$128,000 | -5.2%  | 16        | NT$8,000         |
```

### Summary Dashboard
Use for: Executive overview, monthly check-ins

```
Revenue:    NT$383,000  (+8.2% vs last quarter)
Customers:  48 active   (+6 new, -2 churned)
Avg Order:  NT$7,979    (flat)
Top Source: Facebook ads (38% of new customers)
Alert:      March revenue dipped — investigate [reason]
```

### Narrative Format
Use for: Board reports, investor updates, team presentations

> Revenue grew 8.2% quarter-over-quarter to NT$383K, driven by 6 new customers 
> from Facebook ads. March showed a 5.2% dip which correlates with [factor]. 
> Recommendation: [action] to address [risk/opportunity].

---

## Comparison Methods

### Period-over-Period
- Month-over-month (MoM)
- Quarter-over-quarter (QoQ)
- Year-over-year (YoY) — best for seasonal businesses
- Same period last year (SPLY)

### Benchmarking
- Actual vs Budget/Target
- Actual vs Forecast
- Your metrics vs Industry average
- This segment vs Other segments

### Ranking
- Top N by [metric]
- Bottom N by [metric]
- Pareto analysis (80/20 rule)

---

## Red Flags to Always Call Out

1. **Revenue concentration** — If >30% comes from one customer/source
2. **Declining margins** — Even if revenue is growing
3. **Rising CAC** — Getting more expensive to acquire customers
4. **Increasing churn** — Losing customers faster
5. **Cash vs profit divergence** — Profitable but running out of cash
6. **Vanity metric growth** — Traffic up but conversions flat
7. **Seasonal vs structural** — Is the dip temporary or a trend?

---

## Output Format

### For Quick Questions
- **Answer first** in one sentence
- **Supporting data** in a small table or 2-3 bullet points
- **So what?** One action recommendation

### For Detailed Reports
1. **Executive Summary** (3-5 bullets, the key takeaways)
2. **Key Metrics** (dashboard-style overview)
3. **Detailed Analysis** (by section/topic with tables)
4. **Trends & Patterns** (what's changing over time)
5. **Recommendations** (specific, actionable, prioritized)

### For Dashboards
- 4-6 top-level metrics with trend indicators
- Period comparison (vs last month/quarter/year)
- Breakdowns by relevant dimension
- One "alert" or "watch" item

---

## Principles

1. **Answer the question first.** Don't make them read 3 pages to find out revenue is up 12%.
2. **Context makes numbers meaningful.** "NT$500K revenue" means nothing. "NT$500K, up 15% YoY, 3% above target" means everything.
3. **Trends beat snapshots.** One data point is noise. Three months is a pattern. A year is a trend.
4. **Simple > sophisticated.** The analysis the owner understands and acts on beats the brilliant analysis that sits unread.
5. **Always end with "so what."** Data without recommendations is just trivia.

---

## Related Skills

- **financial-analysis**: For P&L reports, cash flow, and financial modeling
- **analytics-tracking**: For setting up data collection and tracking events
- **ceo-advisor**: For strategic implications of data findings
