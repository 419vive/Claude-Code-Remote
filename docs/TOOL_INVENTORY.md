# Tool Inventory — Agents & Skills

_Generated automatically. Re-run `python3 scripts/build_tool_inventory.py` to refresh._

## Summary

- **User-installed agents** (`~/.claude/agents/`): **184**
- **Project agents** (`.claude/agents/`): **244**
- **User-installed skills** (`~/.claude/skills/`): **1**
- **Project skills** (`.claude/skills/`): **192**
- **Harness built-ins**: see section at bottom (not file-based, cannot be copied)

## How to transfer to another project (e.g. `jerry_job_hunt`)

```bash
# Option 1: pin to the new project (versioned with repo)
cp -r ~/.claude/agents  /path/to/jerry_job_hunt/.claude/agents
cp -r ~/.claude/skills  /path/to/jerry_job_hunt/.claude/skills
cp -r $THIS_REPO/.claude/agents  /path/to/jerry_job_hunt/.claude/agents-kunjia
cp -r $THIS_REPO/.claude/skills  /path/to/jerry_job_hunt/.claude/skills-kunjia

# Option 2: keep global — they apply to every project automatically
# (user-level ~/.claude/ tools are auto-loaded anywhere Claude Code runs)
```

**Built-in tools** (the ones from the harness, like `general-purpose`, `brainstorming`, `pdf`, `xlsx`) are not files — they ship with Claude Code itself. You get them free on any machine where Claude Code is installed.

---

# User-Installed Agents
_Location: `~/.claude/agents/` — 184 agents_

### _root

| Name | Description | File |
|---|---|---|
| **Accessibility Auditor** | Expert accessibility specialist who audits interfaces against WCAG standards, tests with assistive technologies, and ensures inclusive design. Defaults to finding barriers — if it… | `testing-accessibility-auditor.md` |
| **Account Strategist** | Expert post-sale account strategist specializing in land-and-expand execution, stakeholder mapping, QBR facilitation, and net revenue retention. Turns closed deals into long-term … | `sales-account-strategist.md` |
| **Accounts Payable Agent** | Autonomous payment processing specialist that executes vendor payments, contractor invoices, and recurring bills across any payment rail — crypto, fiat, stablecoins. Integrates wi… | `accounts-payable-agent.md` |
| **Ad Creative Strategist** | Paid media creative specialist focused on ad copywriting, RSA optimization, asset group design, and creative testing frameworks across Google, Meta, Microsoft, and programmatic pl… | `paid-media-creative-strategist.md` |
| **Agentic Identity & Trust Architect** | Designs identity, authentication, and trust verification systems for autonomous AI agents operating in multi-agent environments. Ensures agents can prove who they are, what they'r… | `agentic-identity-trust.md` |
| **Agentic Search Optimizer** | Expert in WebMCP readiness and agentic task completion — audits whether AI agents can actually accomplish tasks on your site (book, buy, register, subscribe), implements WebMCP de… | `marketing-agentic-search-optimizer.md` |
| **Agents Orchestrator** | Autonomous pipeline manager that orchestrates the entire development workflow. You are the leader of this process. | `agents-orchestrator.md` |
| **AI Citation Strategist** | Expert in AI recommendation engine optimization (AEO/GEO) — audits brand visibility across ChatGPT, Claude, Gemini, and Perplexity, identifies why competitors get cited instead, a… | `marketing-ai-citation-strategist.md` |
| **AI Data Remediation Engineer** | Specialist in self-healing data pipelines — uses air-gapped local SLMs and semantic clustering to automatically detect, classify, and fix data anomalies at scale. Focuses exclusiv… | `engineering-ai-data-remediation-engineer.md` |
| **AI Engineer** | Expert AI/ML engineer specializing in machine learning model development, deployment, and integration into production systems. Focused on building intelligent features, data pipel… | `engineering-ai-engineer.md` |
| **Analytics Reporter** | Expert data analyst transforming raw data into actionable business insights. Creates dashboards, performs statistical analysis, tracks KPIs, and provides strategic decision suppor… | `support-analytics-reporter.md` |
| **Anthropologist** | Expert in cultural systems, rituals, kinship, belief systems, and ethnographic method — builds culturally coherent societies that feel lived-in rather than invented | `academic-anthropologist.md` |
| **API Tester** | Expert API testing specialist focused on comprehensive API validation, performance testing, and quality assurance across all systems and third-party integrations | `testing-api-tester.md` |
| **App Store Optimizer** | Expert app store marketing specialist focused on App Store Optimization (ASO), conversion rate optimization, and app discoverability | `marketing-app-store-optimizer.md` |
| **Automation Governance Architect** | Governance-first architect for business automations (n8n-first) who audits value, risk, and maintainability before implementation. | `automation-governance-architect.md` |
| **Autonomous Optimization Architect** | Intelligent system governor that continuously shadow-tests APIs for performance while enforcing strict financial and security guardrails against runaway costs. | `engineering-autonomous-optimization-architect.md` |
| **Backend Architect** | Senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure. Builds robust, secure, performant server-side ap… | `engineering-backend-architect.md` |
| **Baidu SEO Specialist** | Expert Baidu search optimization specialist focused on Chinese search engine ranking, Baidu ecosystem integration, ICP compliance, Chinese keyword research, and mobile-first index… | `marketing-baidu-seo-specialist.md` |
| **Behavioral Nudge Engine** | Behavioral psychology specialist that adapts software interaction cadences and styles to maximize user motivation and success. | `product-behavioral-nudge-engine.md` |
| **Bilibili Content Strategist** | Expert Bilibili marketing specialist focused on UP主 growth, danmaku culture mastery, B站 algorithm optimization, community building, and branded content strategy for China's leadin… | `marketing-bilibili-content-strategist.md` |
| **Blender Add-on Engineer** | Blender tooling specialist - Builds Python add-ons, asset validators, exporters, and pipeline automations that turn repetitive DCC work into reliable one-click workflows | `blender-addon-engineer.md` |
| **Blockchain Security Auditor** | Expert smart contract security auditor specializing in vulnerability detection, formal verification, exploit analysis, and comprehensive audit report writing for DeFi protocols an… | `blockchain-security-auditor.md` |
| **Book Co-Author** | Strategic thought-leadership book collaborator for founders, experts, and operators turning voice notes, fragments, and positioning into structured first-person chapters. | `marketing-book-co-author.md` |
| **Bookkeeper & Controller** | Expert bookkeeper and controller specializing in day-to-day accounting operations, financial reconciliations, month-end close processes, and internal controls. Ensures the accurac… | `finance-bookkeeper-controller.md` |
| **Brand Guardian** | Expert brand strategist and guardian specializing in brand identity development, consistency maintenance, and strategic brand positioning | `design-brand-guardian.md` |
| **Carousel Growth Engine** | Autonomous TikTok and Instagram carousel generation specialist. Analyzes any website URL with Playwright, generates viral 6-slide carousels via Gemini image generation, publishes … | `marketing-carousel-growth-engine.md` |
| **Chief of Staff** | Master coordinator for founders and executives — filters noise, owns processes, enforces consistency, routes decisions, and positions outputs for impact so the boss can think clea… | `specialized-chief-of-staff.md` |
| **China E-Commerce Operator** | Expert China e-commerce operations specialist covering Taobao, Tmall, Pinduoduo, and JD ecosystems with deep expertise in product listing optimization, live commerce, store operat… | `marketing-china-ecommerce-operator.md` |
| **China Market Localization Strategist** | Full-stack China market localization expert who transforms real-time trend signals into executable go-to-market strategies across Douyin, Xiaohongshu, WeChat, Bilibili, and beyond | `marketing-china-market-localization-strategist.md` |
| **Civil Engineer** | Expert civil and structural engineer with global standards coverage — Eurocode, DIN, ACI, AISC, ASCE, AS/NZS, CSA, GB, IS, AIJ, and more. Specializes in structural analysis, geote… | `specialized-civil-engineer.md` |
| **CMS Developer** | Drupal and WordPress specialist for theme development, custom plugins/modules, content architecture, and code-first CMS implementation | `engineering-cms-developer.md` |
| **Code Reviewer** | Expert code reviewer who provides constructive, actionable feedback focused on correctness, maintainability, security, and performance — not style preferences. | `engineering-code-reviewer.md` |
| **Codebase Onboarding Engineer** | Expert developer onboarding specialist who helps new engineers understand unfamiliar codebases fast by reading source code, tracing code paths, and stating only facts grounded in … | `engineering-codebase-onboarding-engineer.md` |
| **Compliance Auditor** | Expert technical compliance auditor specializing in SOC 2, ISO 27001, HIPAA, and PCI-DSS audits — from readiness assessment through evidence collection to certification. | `compliance-auditor.md` |
| **Content Creator** | Expert content strategist and creator for multi-platform campaigns. Develops editorial calendars, creates compelling copy, manages brand storytelling, and optimizes content for en… | `marketing-content-creator.md` |
| **Corporate Training Designer** | Expert in enterprise training system design and curriculum development — proficient in training needs analysis, instructional design methodology, blended learning program design, … | `corporate-training-designer.md` |
| **Cross-Border E-Commerce Specialist** | Full-funnel cross-border e-commerce strategist covering Amazon, Shopee, Lazada, AliExpress, Temu, and TikTok Shop operations, international logistics and overseas warehousing, com… | `marketing-cross-border-ecommerce.md` |
| **Cultural Intelligence Strategist** | CQ specialist that detects invisible exclusion, researches global context, and ensures software resonates authentically across intersectional identities. | `specialized-cultural-intelligence-strategist.md` |
| **Customer Service** | Friendly, professional customer service specialist for any industry — handling inquiries, complaints, account support, FAQs, and seamless escalation with warmth, efficiency, and a… | `customer-service.md` |
| **Data Consolidation Agent** | AI agent that consolidates extracted sales data into live reporting dashboards with territory, rep, and pipeline summaries | `data-consolidation-agent.md` |
| **Data Engineer** | Expert data engineer specializing in building reliable data pipelines, lakehouse architectures, and scalable data infrastructure. Masters ETL/ELT, Apache Spark, dbt, streaming sys… | `engineering-data-engineer.md` |
| **Database Optimizer** | Expert database specialist focusing on schema design, query optimization, indexing strategies, and performance tuning for PostgreSQL, MySQL, and modern databases like Supabase and… | `engineering-database-optimizer.md` |
| **Deal Strategist** | Senior deal strategist specializing in MEDDPICC qualification, competitive positioning, and win planning for complex B2B sales cycles. Scores opportunities, exposes pipeline risk,… | `sales-deal-strategist.md` |
| **Developer Advocate** | Expert developer advocate specializing in building developer communities, creating compelling technical content, optimizing developer experience (DX), and driving platform adoptio… | `specialized-developer-advocate.md` |
| **DevOps Automator** | Expert DevOps engineer specializing in infrastructure automation, CI/CD pipeline development, and cloud operations | `engineering-devops-automator.md` |
| **Discovery Coach** | Coaches sales teams on elite discovery methodology — question design, current-state mapping, gap quantification, and call structure that surfaces real buying motivation. | `sales-discovery-coach.md` |
| **Document Generator** | Expert document creation specialist who generates professional PDF, PPTX, DOCX, and XLSX files using code-based approaches with proper formatting, charts, and data visualization. | `specialized-document-generator.md` |
| **Douyin Strategist** | Short-video marketing expert specializing in the Douyin platform, with deep expertise in recommendation algorithm mechanics, viral video planning, livestream commerce workflows, a… | `marketing-douyin-strategist.md` |
| **Email Intelligence Engineer** | Expert in extracting structured, reasoning-ready data from raw email threads for AI agents and automation systems | `engineering-email-intelligence-engineer.md` |
| **Embedded Firmware Engineer** | Specialist in bare-metal and RTOS firmware - ESP32/ESP-IDF, PlatformIO, Arduino, ARM Cortex-M, STM32 HAL/LL, Nordic nRF5/nRF Connect SDK, FreeRTOS, Zephyr | `engineering-embedded-firmware-engineer.md` |
| **Evidence Collector** | Screenshot-obsessed, fantasy-allergic QA specialist - Default to finding 3-5 issues, requires visual proof for everything | `testing-evidence-collector.md` |
| **Executive Summary Generator** | Consultant-grade AI specialist trained to think and communicate like a senior strategy consultant. Transforms complex business inputs into concise, actionable executive summaries … | `support-executive-summary-generator.md` |
| **Experiment Tracker** | Expert project manager specializing in experiment design, execution tracking, and data-driven decision making. Focused on managing A/B tests, feature experiments, and hypothesis v… | `project-management-experiment-tracker.md` |
| **Feedback Synthesizer** | Expert in collecting, analyzing, and synthesizing user feedback from multiple channels to extract actionable product insights. Transforms qualitative feedback into quantitative pr… | `product-feedback-synthesizer.md` |
| **Feishu Integration Developer** | Full-stack integration expert specializing in the Feishu (Lark) Open Platform — proficient in Feishu bots, mini programs, approval workflows, Bitable (multidimensional spreadsheet… | `engineering-feishu-integration-developer.md` |
| **Filament Optimization Specialist** | Expert in restructuring and optimizing Filament PHP admin interfaces for maximum usability and efficiency. Focuses on impactful structural changes — not just cosmetic tweaks. | `engineering-filament-optimization-specialist.md` |
| **Finance Tracker** | Expert financial analyst and controller specializing in financial planning, budget management, and business performance analysis. Maintains financial health, optimizes cash flow, … | `support-finance-tracker.md` |
| **Financial Analyst** | Expert financial analyst specializing in financial modeling, forecasting, scenario analysis, and data-driven decision support. Transforms raw financial data into actionable busine… | `finance-financial-analyst.md` |
| **FP&A Analyst** | Expert Financial Planning & Analysis (FP&A) analyst specializing in budgeting, variance analysis, financial planning, rolling forecasts, and strategic decision support. Bridges th… | `finance-fpa-analyst.md` |
| **French Consulting Market Navigator** | Navigate the French ESN/SI freelance ecosystem — margin models, platform mechanics (Malt, collective.work), portage salarial, rate positioning, and payment cycle realities | `specialized-french-consulting-market.md` |
| **Frontend Developer** | Expert frontend developer specializing in modern web technologies, React/Vue/Angular frameworks, UI implementation, and performance optimization | `engineering-frontend-developer.md` |
| **Game Audio Engineer** | Interactive audio specialist - Masters FMOD/Wwise integration, adaptive music systems, spatial audio, and audio performance budgeting across all game engines | `game-audio-engineer.md` |
| **Game Designer** | Systems and mechanics architect - Masters GDD authorship, player psychology, economy balancing, and gameplay loop design across all engines and genres | `game-designer.md` |
| **Geographer** | Expert in physical and human geography, climate systems, cartography, and spatial analysis — builds geographically coherent worlds where terrain, climate, resources, and settlemen… | `academic-geographer.md` |
| **Git Workflow Master** | Expert in Git workflows, branching strategies, and version control best practices including conventional commits, rebasing, worktrees, and CI-friendly branch management. | `engineering-git-workflow-master.md` |
| **Godot Gameplay Scripter** | Composition and signal integrity specialist - Masters GDScript 2.0, C# integration, node-based architecture, and type-safe signal design for Godot 4 projects | `godot-gameplay-scripter.md` |
| **Godot Multiplayer Engineer** | Godot 4 networking specialist - Masters the MultiplayerAPI, scene replication, ENet/WebRTC transport, RPCs, and authority models for real-time multiplayer games | `godot-multiplayer-engineer.md` |
| **Godot Shader Developer** | Godot 4 visual effects specialist - Masters the Godot Shading Language (GLSL-like), VisualShader editor, CanvasItem and Spatial shaders, post-processing, and performance optimizat… | `godot-shader-developer.md` |
| **Government Digital Presales Consultant** | Presales expert for China's government digital transformation market (ToG), proficient in policy interpretation, solution design, bid document preparation, POC validation, complia… | `government-digital-presales-consultant.md` |
| **Growth Hacker** | Expert growth strategist specializing in rapid user acquisition through data-driven experimentation. Develops viral loops, optimizes conversion funnels, and finds scalable growth … | `marketing-growth-hacker.md` |
| **Healthcare Customer Service** | Empathetic healthcare customer service specialist for patient support, billing inquiries, appointment management, insurance questions, complaint resolution, and seamless escalatio… | `healthcare-customer-service.md` |
| **Healthcare Marketing Compliance Specialist** | Expert in healthcare marketing compliance in China, proficient in the Advertising Law, Medical Advertisement Management Measures, Drug Administration Law, and related regulations … | `healthcare-marketing-compliance.md` |
| **Historian** | Expert in historical analysis, periodization, material culture, and historiography — validates historical coherence and enriches settings with authentic period detail grounded in … | `academic-historian.md` |
| **Hospitality Guest Services** | Comprehensive hospitality guest services specialist for hotels, resorts, restaurants, and event venues — covering reservations, check-in/check-out, concierge services, guest compl… | `hospitality-guest-services.md` |
| **HR Onboarding** | Comprehensive HR onboarding specialist for employee orientation, documentation management, compliance tracking, benefits enrollment, culture integration, and new hire support — de… | `hr-onboarding.md` |
| **Identity Graph Operator** | Operates a shared identity graph that multiple AI agents resolve against. Ensures every agent in a multi-agent system gets the same canonical answer for "who is this entity?" - de… | `identity-graph-operator.md` |
| **Image Prompt Engineer** | Expert photography prompt engineer specializing in crafting detailed, evocative prompts for AI image generation. Masters the art of translating visual concepts into precise langua… | `design-image-prompt-engineer.md` |
| **Incident Response Commander** | Expert incident commander specializing in production incident management, structured response coordination, post-mortem facilitation, SLO/SLI tracking, and on-call process design … | `engineering-incident-response-commander.md` |
| **Inclusive Visuals Specialist** | Representation expert who defeats systemic AI biases to generate culturally accurate, affirming, and non-stereotypical images and video. | `design-inclusive-visuals-specialist.md` |
| **Infrastructure Maintainer** | Expert infrastructure specialist focused on system reliability, performance optimization, and technical operations management. Maintains robust, scalable infrastructure supporting… | `support-infrastructure-maintainer.md` |
| **Instagram Curator** | Expert Instagram marketing specialist focused on visual storytelling, community building, and multi-format content optimization. Masters aesthetic development and drives meaningfu… | `marketing-instagram-curator.md` |
| **Investment Researcher** | Expert investment researcher specializing in market research, due diligence, portfolio analysis, and asset valuation. Conducts rigorous fundamental and quantitative analysis to id… | `finance-investment-researcher.md` |
| **Jira Workflow Steward** | Expert delivery operations specialist who enforces Jira-linked Git workflows, traceable commits, structured pull requests, and release-safe branch strategy across software teams. | `project-management-jira-workflow-steward.md` |
| **Korean Business Navigator** | Korean business culture for foreign professionals — 품의 decision process, nunchi reading, KakaoTalk business etiquette, hierarchy navigation, and relationship-first deal mechanics | `specialized-korean-business-navigator.md` |
| **Kuaishou Strategist** | Expert Kuaishou marketing strategist specializing in short-video content for China's lower-tier city markets, live commerce operations, community trust building, and grassroots au… | `marketing-kuaishou-strategist.md` |
| **Language Translator** | Real-time Spanish ↔ English translation specialist with cultural context, regional dialect awareness, travel phrase guidance, and tone-appropriate communication for everyday, busi… | `language-translator.md` |
| **Legal Billing & Time Tracking** | Comprehensive legal billing and time tracking specialist for accurate time capture, invoice generation, billing narrative writing, collections management, trust account compliance… | `legal-billing-time-tracking.md` |
| **Legal Client Intake** | Comprehensive legal client intake specialist for qualifying prospects, collecting case information, scheduling consultations, managing conflict checks, and delivering attorney-rea… | `legal-client-intake.md` |
| **Legal Compliance Checker** | Expert legal and compliance specialist ensuring business operations, data handling, and content creation comply with relevant laws, regulations, and industry standards across mult… | `support-legal-compliance-checker.md` |
| **Legal Document Review** | Comprehensive legal document review specialist for contracts, litigation documents, and real estate agreements — summarizing documents, flagging risk clauses, comparing contract v… | `legal-document-review.md` |
| **Level Designer** | Spatial storytelling and flow specialist - Masters layout theory, pacing architecture, encounter design, and environmental narrative across all game engines | `level-designer.md` |
| **LinkedIn Content Creator** | Expert LinkedIn content strategist focused on thought leadership, personal brand building, and high-engagement professional content. Masters LinkedIn's algorithm and culture to dr… | `marketing-linkedin-content-creator.md` |
| **Livestream Commerce Coach** | Veteran livestream e-commerce coach specializing in host training and live room operations across Douyin, Kuaishou, Taobao Live, and Channels, covering script design, product sequ… | `marketing-livestream-commerce-coach.md` |
| **Loan Officer Assistant** | Comprehensive loan officer assistant for mortgage and lending professionals — covering borrower intake, pre-qualification, document collection, pipeline management, compliance tra… | `loan-officer-assistant.md` |
| **LSP/Index Engineer** | Language Server Protocol specialist building unified code intelligence systems through LSP client orchestration and semantic indexing | `lsp-index-engineer.md` |
| **macOS Spatial/Metal Engineer** | Native Swift and Metal specialist building high-performance 3D rendering systems and spatial computing experiences for macOS and Vision Pro | `macos-spatial-metal-engineer.md` |
| **MCP Builder** | Expert Model Context Protocol developer who designs, builds, and tests MCP servers that extend AI agent capabilities with custom tools, resources, and prompts. | `specialized-mcp-builder.md` |
| **Minimal Change Engineer** | Engineering specialist focused on minimum-viable diffs — fixes only what was asked, refuses scope creep, prefers three similar lines over a premature abstraction. The discipline t… | `engineering-minimal-change-engineer.md` |
| **Mobile App Builder** | Specialized mobile application developer with expertise in native iOS/Android development and cross-platform frameworks | `engineering-mobile-app-builder.md` |
| **Model QA Specialist** | Independent model QA expert who audits ML and statistical models end-to-end - from documentation review and data reconstruction to replication, calibration testing, interpretabili… | `specialized-model-qa.md` |
| **Narrative Designer** | Story systems and dialogue architect - Masters GDD-aligned narrative design, branching dialogue, lore architecture, and environmental storytelling across all game engines | `narrative-designer.md` |
| **Narratologist** | Expert in narrative theory, story structure, character arcs, and literary analysis — grounds advice in established frameworks from Propp to Campbell to modern narratology | `academic-narratologist.md` |
| **Outbound Strategist** | Signal-based outbound specialist who designs multi-channel prospecting sequences, defines ICPs, and builds pipeline through research-driven personalization — not volume. | `sales-outbound-strategist.md` |
| **Paid Media Auditor** | Comprehensive paid media auditor who systematically evaluates Google Ads, Microsoft Ads, and Meta accounts across 200+ checkpoints spanning account structure, tracking, bidding, c… | `paid-media-auditor.md` |
| **Paid Social Strategist** | Cross-platform paid social advertising specialist covering Meta (Facebook/Instagram), LinkedIn, TikTok, Pinterest, X, and Snapchat. Designs full-funnel social ad programs from pro… | `paid-media-paid-social-strategist.md` |
| **Performance Benchmarker** | Expert performance testing and optimization specialist focused on measuring, analyzing, and improving system performance across all applications and infrastructure | `testing-performance-benchmarker.md` |
| **Pipeline Analyst** | Revenue operations analyst specializing in pipeline health diagnostics, deal velocity analysis, forecast accuracy, and data-driven sales coaching. Turns CRM data into actionable p… | `sales-pipeline-analyst.md` |
| **Podcast Strategist** | Content strategy and operations expert for the Chinese podcast market, with deep expertise in Xiaoyuzhou, Ximalaya, and other major audio platforms, covering show positioning, aud… | `marketing-podcast-strategist.md` |
| **PPC Campaign Strategist** | Senior paid media strategist specializing in large-scale search, shopping, and performance max campaign architecture across Google, Microsoft, and Amazon ad platforms. Designs acc… | `paid-media-ppc-strategist.md` |
| **Private Domain Operator** | Expert in building enterprise WeChat (WeCom) private domain ecosystems, with deep expertise in SCRM systems, segmented community operations, Mini Program commerce integration, use… | `marketing-private-domain-operator.md` |
| **Product Manager** | Holistic product leader who owns the full product lifecycle — from discovery and strategy through roadmap, stakeholder alignment, go-to-market, and outcome measurement. Bridges bu… | `product-manager.md` |
| **Programmatic & Display Buyer** | Display advertising and programmatic media buying specialist covering managed placements, Google Display Network, DV360, trade desk platforms, partner media (newsletters, sponsore… | `paid-media-programmatic-buyer.md` |
| **Project Shepherd** | Expert project manager specializing in cross-functional project coordination, timeline management, and stakeholder alignment. Focused on shepherding projects from conception to co… | `project-management-project-shepherd.md` |
| **Proposal Strategist** | Strategic proposal architect who transforms RFPs and sales opportunities into compelling win narratives. Specializes in win theme development, competitive positioning, executive s… | `sales-proposal-strategist.md` |
| **Psychologist** | Expert in human behavior, personality theory, motivation, and cognitive patterns — builds psychologically credible characters and interactions grounded in clinical and research fr… | `academic-psychologist.md` |
| **Rapid Prototyper** | Specialized in ultra-fast proof-of-concept development and MVP creation using efficient tools and frameworks | `engineering-rapid-prototyper.md` |
| **Real Estate Buyer & Seller** | Comprehensive real estate agent assistant for buyer representation, seller representation, listing management, offer negotiation, transaction coordination, and closing support — d… | `real-estate-buyer-seller.md` |
| **Reality Checker** | Stops fantasy approvals, evidence-based certification - Default to "NEEDS WORK", requires overwhelming proof for production readiness | `testing-reality-checker.md` |
| **Recruitment Specialist** | Expert recruitment operations and talent acquisition specialist — skilled in China's major hiring platforms, talent assessment frameworks, and labor law compliance. Helps companie… | `recruitment-specialist.md` |
| **Reddit Community Builder** | Expert Reddit marketing specialist focused on authentic community engagement, value-driven content creation, and long-term relationship building. Masters Reddit culture navigation. | `marketing-reddit-community-builder.md` |
| **Report Distribution Agent** | AI agent that automates distribution of consolidated sales reports to representatives based on territorial parameters | `report-distribution-agent.md` |
| **Retail Customer Returns** | Comprehensive retail customer returns specialist for processing returns, exchanges, and refunds across in-store, online, and omnichannel retail — handling policy enforcement, frau… | `retail-customer-returns.md` |
| **Roblox Avatar Creator** | Roblox UGC and avatar pipeline specialist - Masters Roblox's avatar system, UGC item creation, accessory rigging, texture standards, and the Creator Marketplace submission pipeline | `roblox-avatar-creator.md` |
| **Roblox Experience Designer** | Roblox platform UX and monetization specialist - Masters engagement loop design, DataStore-driven progression, Roblox monetization systems (Passes, Developer Products, UGC), and p… | `roblox-experience-designer.md` |
| **Roblox Systems Scripter** | Roblox platform engineering specialist - Masters Luau, the client-server security model, RemoteEvents/RemoteFunctions, DataStore, and module architecture for scalable Roblox exper… | `roblox-systems-scripter.md` |
| **Sales Coach** | Expert sales coaching specialist focused on rep development, pipeline review facilitation, call coaching, deal strategy, and forecast accuracy. Makes every rep and every deal bett… | `sales-coach.md` |
| **Sales Data Extraction Agent** | AI agent specialized in monitoring Excel files and extracting key sales metrics (MTD, YTD, Year End) for internal live reporting | `sales-data-extraction-agent.md` |
| **Sales Engineer** | Senior pre-sales engineer specializing in technical discovery, demo engineering, POC scoping, competitive battlecards, and bridging product capabilities to business outcomes. Wins… | `sales-engineer.md` |
| **Sales Outreach** | Consultative B2B sales outreach specialist for cold prospecting, lead follow-up, objection handling, proposal writing, and pipeline management — combining data-driven targeting wi… | `sales-outreach.md` |
| **Salesforce Architect** | Solution architecture for Salesforce platform — multi-cloud design, integration patterns, governor limits, deployment strategy, and data model governance for enterprise-scale orgs | `specialized-salesforce-architect.md` |
| **Search Query Analyst** | Specialist in search term analysis, negative keyword architecture, and query-to-intent mapping. Turns raw search query data into actionable optimizations that eliminate waste and … | `paid-media-search-query-analyst.md` |
| **Security Engineer** | Expert application security engineer specializing in threat modeling, vulnerability assessment, secure code review, security architecture design, and incident response for modern … | `engineering-security-engineer.md` |
| **Senior Developer** | Premium implementation specialist - Masters Laravel/Livewire/FluxUI, advanced CSS, Three.js integration | `engineering-senior-developer.md` |
| **Senior Project Manager** | Converts specs to tasks and remembers previous projects. Focused on realistic scope, no background processes, exact spec requirements | `project-manager-senior.md` |
| **SEO Specialist** | Expert search engine optimization strategist specializing in technical SEO, content optimization, link authority building, and organic search growth. Drives sustainable traffic th… | `marketing-seo-specialist.md` |
| **Short-Video Editing Coach** | Hands-on short-video editing coach covering the full post-production pipeline, with mastery of CapCut Pro, Premiere Pro, DaVinci Resolve, and Final Cut Pro across composition and … | `marketing-short-video-editing-coach.md` |
| **Social Media Strategist** | Expert social media strategist for LinkedIn, Twitter, and professional platforms. Creates cross-platform campaigns, builds communities, manages real-time engagement, and develops … | `marketing-social-media-strategist.md` |
| **Software Architect** | Expert software architect specializing in system design, domain-driven design, architectural patterns, and technical decision-making for scalable, maintainable systems. | `engineering-software-architect.md` |
| **Solidity Smart Contract Engineer** | Expert Solidity developer specializing in EVM smart contract architecture, gas optimization, upgradeable proxy patterns, DeFi protocol development, and security-first contract des… | `engineering-solidity-smart-contract-engineer.md` |
| **Sprint Prioritizer** | Expert product manager specializing in agile sprint planning, feature prioritization, and resource allocation. Focused on maximizing team velocity and business value delivery thro… | `product-sprint-prioritizer.md` |
| **SRE (Site Reliability Engineer)** | Expert site reliability engineer specializing in SLOs, error budgets, observability, chaos engineering, and toil reduction for production systems at scale. | `engineering-sre.md` |
| **Studio Operations** | Expert operations manager specializing in day-to-day studio efficiency, process optimization, and resource coordination. Focused on ensuring smooth operations, maintaining product… | `project-management-studio-operations.md` |
| **Studio Producer** | Senior strategic leader specializing in high-level creative and technical project orchestration, resource allocation, and multi-project portfolio management. Focused on aligning c… | `project-management-studio-producer.md` |
| **Study Abroad Advisor** | Full-spectrum study abroad planning expert covering the US, UK, Canada, Australia, Europe, Hong Kong, and Singapore — proficient in undergraduate, master's, and PhD application st… | `study-abroad-advisor.md` |
| **Supply Chain Strategist** | Expert supply chain management and procurement strategy specialist — skilled in supplier development, strategic sourcing, quality control, and supply chain digitalization. Grounde… | `supply-chain-strategist.md` |
| **Support Responder** | Expert customer support specialist delivering exceptional customer service, issue resolution, and user experience optimization. Specializes in multi-channel support, proactive cus… | `support-support-responder.md` |
| **Tax Strategist** | Expert tax strategist specializing in tax optimization, multi-jurisdictional compliance, transfer pricing, and strategic tax planning. Navigates complex tax codes to minimize liab… | `finance-tax-strategist.md` |
| **Technical Artist** | Art-to-engine pipeline specialist - Masters shaders, VFX systems, LOD pipelines, performance budgeting, and cross-engine asset optimization | `technical-artist.md` |
| **Technical Writer** | Expert technical writer specializing in developer documentation, API references, README files, and tutorials. Transforms complex engineering concepts into clear, accurate, and eng… | `engineering-technical-writer.md` |
| **Terminal Integration Specialist** | Terminal emulation, text rendering optimization, and SwiftTerm integration for modern Swift applications | `terminal-integration-specialist.md` |
| **Test Results Analyzer** | Expert test analysis specialist focused on comprehensive test result evaluation, quality metrics analysis, and actionable insight generation from testing activities | `testing-test-results-analyzer.md` |
| **Threat Detection Engineer** | Expert detection engineer specializing in SIEM rule development, MITRE ATT&CK coverage mapping, threat hunting, alert tuning, and detection-as-code pipelines for security operatio… | `engineering-threat-detection-engineer.md` |
| **TikTok Strategist** | Expert TikTok marketing specialist focused on viral content creation, algorithm optimization, and community building. Masters TikTok's unique culture and features for brand growth. | `marketing-tiktok-strategist.md` |
| **Tool Evaluator** | Expert technology assessment specialist focused on evaluating, testing, and recommending tools, software, and platforms for business use and productivity optimization | `testing-tool-evaluator.md` |
| **Tracking & Measurement Specialist** | Expert in conversion tracking architecture, tag management, and attribution modeling across Google Tag Manager, GA4, Google Ads, Meta CAPI, LinkedIn Insight Tag, and server-side i… | `paid-media-tracking-specialist.md` |
| **Trend Researcher** | Expert market intelligence analyst specializing in identifying emerging trends, competitive analysis, and opportunity assessment. Focused on providing actionable insights that dri… | `product-trend-researcher.md` |
| **Twitter Engager** | Expert Twitter marketing specialist focused on real-time engagement, thought leadership building, and community-driven growth. Builds brand authority through authentic conversatio… | `marketing-twitter-engager.md` |
| **UI Designer** | Expert UI designer specializing in visual design systems, component libraries, and pixel-perfect interface creation. Creates beautiful, consistent, accessible user interfaces that… | `design-ui-designer.md` |
| **Unity Architect** | Data-driven modularity specialist - Masters ScriptableObjects, decoupled systems, and single-responsibility component design for scalable Unity projects | `unity-architect.md` |
| **Unity Editor Tool Developer** | Unity editor automation specialist - Masters custom EditorWindows, PropertyDrawers, AssetPostprocessors, ScriptedImporters, and pipeline automation that saves teams hours per week | `unity-editor-tool-developer.md` |
| **Unity Multiplayer Engineer** | Networked gameplay specialist - Masters Netcode for GameObjects, Unity Gaming Services (Relay/Lobby), client-server authority, lag compensation, and state synchronization | `unity-multiplayer-engineer.md` |
| **Unity Shader Graph Artist** | Visual effects and material specialist - Masters Unity Shader Graph, HLSL, URP/HDRP rendering pipelines, and custom pass authoring for real-time visual effects | `unity-shader-graph-artist.md` |
| **Unreal Multiplayer Architect** | Unreal Engine networking specialist - Masters Actor replication, GameMode/GameState architecture, server-authoritative gameplay, network prediction, and dedicated server setup for… | `unreal-multiplayer-architect.md` |
| **Unreal Systems Engineer** | Performance and hybrid architecture specialist - Masters C++/Blueprint continuum, Nanite geometry, Lumen GI, and Gameplay Ability System for AAA-grade Unreal Engine projects | `unreal-systems-engineer.md` |
| **Unreal Technical Artist** | Unreal Engine visual pipeline specialist - Masters the Material Editor, Niagara VFX, Procedural Content Generation, and the art-to-engine pipeline for UE5 projects | `unreal-technical-artist.md` |
| **Unreal World Builder** | Open-world and environment specialist - Masters UE5 World Partition, Landscape, procedural foliage, HLOD, and large-scale level streaming for seamless open-world experiences | `unreal-world-builder.md` |
| **UX Architect** | Technical architecture and UX specialist who provides developers with solid foundations, CSS systems, and clear implementation guidance | `design-ux-architect.md` |
| **UX Researcher** | Expert user experience researcher specializing in user behavior analysis, usability testing, and data-driven design insights. Provides actionable research findings that improve pr… | `design-ux-researcher.md` |
| **Video Optimization Specialist** | Video marketing strategist specializing in YouTube algorithm optimization, audience retention, chaptering, thumbnail concepts, and cross-platform video syndication. | `marketing-video-optimization-specialist.md` |
| **visionOS Spatial Engineer** | Native visionOS spatial computing, SwiftUI volumetric interfaces, and Liquid Glass design implementation | `visionos-spatial-engineer.md` |
| **Visual Storyteller** | Expert visual communication specialist focused on creating compelling visual narratives, multimedia content, and brand storytelling through design. Specializes in transforming com… | `design-visual-storyteller.md` |
| **Voice AI Integration Engineer** | Expert in building end-to-end speech transcription pipelines using Whisper-style models and cloud ASR services — from raw audio ingestion through preprocessing, transcript cleanup… | `engineering-voice-ai-integration-engineer.md` |
| **WeChat Mini Program Developer** | Expert WeChat Mini Program developer specializing in 小程序 development with WXML/WXSS/WXS, WeChat API integration, payment systems, subscription messaging, and the full WeChat ecosy… | `engineering-wechat-mini-program-developer.md` |
| **WeChat Official Account Manager** | Expert WeChat Official Account (OA) strategist specializing in content marketing, subscriber engagement, and conversion optimization. Masters multi-format content and builds loyal… | `marketing-wechat-official-account.md` |
| **Weibo Strategist** | Full-spectrum operations expert for Sina Weibo, with deep expertise in trending topic mechanics, Super Topic community management, public sentiment monitoring, fan economy strateg… | `marketing-weibo-strategist.md` |
| **Whimsy Injector** | Expert creative specialist focused on adding personality, delight, and playful elements to brand experiences. Creates memorable, joyful interactions that differentiate brands thro… | `design-whimsy-injector.md` |
| **Workflow Architect** | Workflow design specialist who maps complete workflow trees for every system, user journey, and agent interaction — covering happy paths, all branch conditions, failure modes, rec… | `specialized-workflow-architect.md` |
| **Workflow Optimizer** | Expert process improvement specialist focused on analyzing, optimizing, and automating workflows across all business functions for maximum productivity and efficiency | `testing-workflow-optimizer.md` |
| **Xiaohongshu Specialist** | Expert Xiaohongshu marketing specialist focused on lifestyle content, trend-driven strategies, and authentic community engagement. Masters micro-content creation and drives viral … | `marketing-xiaohongshu-specialist.md` |
| **XR Cockpit Interaction Specialist** | Specialist in designing and developing immersive cockpit-based control systems for XR environments | `xr-cockpit-interaction-specialist.md` |
| **XR Immersive Developer** | Expert WebXR and immersive technology developer with specialization in browser-based AR/VR/XR applications | `xr-immersive-developer.md` |
| **XR Interface Architect** | Spatial interaction designer and interface strategist for immersive AR/VR/XR environments | `xr-interface-architect.md` |
| **Zhihu Strategist** | Expert Zhihu marketing specialist focused on thought leadership, community credibility, and knowledge-driven engagement. Masters question-answering strategy and builds brand autho… | `marketing-zhihu-strategist.md` |
| **ZK Steward** | Knowledge-base steward in the spirit of Niklas Luhmann's Zettelkasten. Default perspective: Luhmann; switches to domain experts (Feynman, Munger, Ogilvy, etc.) by task. Enforces a… | `zk-steward.md` |

---

# Project Agents
_Location: `.claude/agents/` — 244 agents_

### _root

| Name | Description | File |
|---|---|---|
| **code-reviewer** | | Use this agent when a major project step has been completed and needs to be reviewed against the original plan and coding standards. Examples: <example>Context: The user is crea… | `code-reviewer.md` |

### agency/academic

| Name | Description | File |
|---|---|---|
| **Anthropologist** | Expert in cultural systems, rituals, kinship, belief systems, and ethnographic method — builds culturally coherent societies that feel lived-in rather than invented | `agency/academic/academic-anthropologist.md` |
| **Geographer** | Expert in physical and human geography, climate systems, cartography, and spatial analysis — builds geographically coherent worlds where terrain, climate, resources, and settlemen… | `agency/academic/academic-geographer.md` |
| **Historian** | Expert in historical analysis, periodization, material culture, and historiography — validates historical coherence and enriches settings with authentic period detail grounded in … | `agency/academic/academic-historian.md` |
| **Narratologist** | Expert in narrative theory, story structure, character arcs, and literary analysis — grounds advice in established frameworks from Propp to Campbell to modern narratology | `agency/academic/academic-narratologist.md` |
| **Psychologist** | Expert in human behavior, personality theory, motivation, and cognitive patterns — builds psychologically credible characters and interactions grounded in clinical and research fr… | `agency/academic/academic-psychologist.md` |

### agency/design

| Name | Description | File |
|---|---|---|
| **Brand Guardian** | Expert brand strategist and guardian specializing in brand identity development, consistency maintenance, and strategic brand positioning | `agency/design/design-brand-guardian.md` |
| **Image Prompt Engineer** | Expert photography prompt engineer specializing in crafting detailed, evocative prompts for AI image generation. Masters the art of translating visual concepts into precise langua… | `agency/design/design-image-prompt-engineer.md` |
| **Inclusive Visuals Specialist** | Representation expert who defeats systemic AI biases to generate culturally accurate, affirming, and non-stereotypical images and video. | `agency/design/design-inclusive-visuals-specialist.md` |
| **UI Designer** | Expert UI designer specializing in visual design systems, component libraries, and pixel-perfect interface creation. Creates beautiful, consistent, accessible user interfaces that… | `agency/design/design-ui-designer.md` |
| **UX Architect** | Technical architecture and UX specialist who provides developers with solid foundations, CSS systems, and clear implementation guidance | `agency/design/design-ux-architect.md` |
| **UX Researcher** | Expert user experience researcher specializing in user behavior analysis, usability testing, and data-driven design insights. Provides actionable research findings that improve pr… | `agency/design/design-ux-researcher.md` |
| **Visual Storyteller** | Expert visual communication specialist focused on creating compelling visual narratives, multimedia content, and brand storytelling through design. Specializes in transforming com… | `agency/design/design-visual-storyteller.md` |
| **Whimsy Injector** | Expert creative specialist focused on adding personality, delight, and playful elements to brand experiences. Creates memorable, joyful interactions that differentiate brands thro… | `agency/design/design-whimsy-injector.md` |

### agency/engineering

| Name | Description | File |
|---|---|---|
| **AI Data Remediation Engineer** | Specialist in self-healing data pipelines — uses air-gapped local SLMs and semantic clustering to automatically detect, classify, and fix data anomalies at scale. Focuses exclusiv… | `agency/engineering/engineering-ai-data-remediation-engineer.md` |
| **AI Engineer** | Expert AI/ML engineer specializing in machine learning model development, deployment, and integration into production systems. Focused on building intelligent features, data pipel… | `agency/engineering/engineering-ai-engineer.md` |
| **Autonomous Optimization Architect** | Intelligent system governor that continuously shadow-tests APIs for performance while enforcing strict financial and security guardrails against runaway costs. | `agency/engineering/engineering-autonomous-optimization-architect.md` |
| **Backend Architect** | Senior backend architect specializing in scalable system design, database architecture, API development, and cloud infrastructure. Builds robust, secure, performant server-side ap… | `agency/engineering/engineering-backend-architect.md` |
| **Code Reviewer** | Expert code reviewer who provides constructive, actionable feedback focused on correctness, maintainability, security, and performance — not style preferences. | `agency/engineering/engineering-code-reviewer.md` |
| **Data Engineer** | Expert data engineer specializing in building reliable data pipelines, lakehouse architectures, and scalable data infrastructure. Masters ETL/ELT, Apache Spark, dbt, streaming sys… | `agency/engineering/engineering-data-engineer.md` |
| **Database Optimizer** | Expert database specialist focusing on schema design, query optimization, indexing strategies, and performance tuning for PostgreSQL, MySQL, and modern databases like Supabase and… | `agency/engineering/engineering-database-optimizer.md` |
| **DevOps Automator** | Expert DevOps engineer specializing in infrastructure automation, CI/CD pipeline development, and cloud operations | `agency/engineering/engineering-devops-automator.md` |
| **Embedded Firmware Engineer** | Specialist in bare-metal and RTOS firmware - ESP32/ESP-IDF, PlatformIO, Arduino, ARM Cortex-M, STM32 HAL/LL, Nordic nRF5/nRF Connect SDK, FreeRTOS, Zephyr | `agency/engineering/engineering-embedded-firmware-engineer.md` |
| **Feishu Integration Developer** | Full-stack integration expert specializing in the Feishu (Lark) Open Platform — proficient in Feishu bots, mini programs, approval workflows, Bitable (multidimensional spreadsheet… | `agency/engineering/engineering-feishu-integration-developer.md` |
| **Frontend Developer** | Expert frontend developer specializing in modern web technologies, React/Vue/Angular frameworks, UI implementation, and performance optimization | `agency/engineering/engineering-frontend-developer.md` |
| **Git Workflow Master** | Expert in Git workflows, branching strategies, and version control best practices including conventional commits, rebasing, worktrees, and CI-friendly branch management. | `agency/engineering/engineering-git-workflow-master.md` |
| **Incident Response Commander** | Expert incident commander specializing in production incident management, structured response coordination, post-mortem facilitation, SLO/SLI tracking, and on-call process design … | `agency/engineering/engineering-incident-response-commander.md` |
| **Mobile App Builder** | Specialized mobile application developer with expertise in native iOS/Android development and cross-platform frameworks | `agency/engineering/engineering-mobile-app-builder.md` |
| **Rapid Prototyper** | Specialized in ultra-fast proof-of-concept development and MVP creation using efficient tools and frameworks | `agency/engineering/engineering-rapid-prototyper.md` |
| **Security Engineer** | Expert application security engineer specializing in threat modeling, vulnerability assessment, secure code review, and security architecture design for modern web and cloud-nativ… | `agency/engineering/engineering-security-engineer.md` |
| **Senior Developer** | Premium implementation specialist - Masters Laravel/Livewire/FluxUI, advanced CSS, Three.js integration | `agency/engineering/engineering-senior-developer.md` |
| **Software Architect** | Expert software architect specializing in system design, domain-driven design, architectural patterns, and technical decision-making for scalable, maintainable systems. | `agency/engineering/engineering-software-architect.md` |
| **Solidity Smart Contract Engineer** | Expert Solidity developer specializing in EVM smart contract architecture, gas optimization, upgradeable proxy patterns, DeFi protocol development, and security-first contract des… | `agency/engineering/engineering-solidity-smart-contract-engineer.md` |
| **SRE (Site Reliability Engineer)** | Expert site reliability engineer specializing in SLOs, error budgets, observability, chaos engineering, and toil reduction for production systems at scale. | `agency/engineering/engineering-sre.md` |
| **Technical Writer** | Expert technical writer specializing in developer documentation, API references, README files, and tutorials. Transforms complex engineering concepts into clear, accurate, and eng… | `agency/engineering/engineering-technical-writer.md` |
| **Threat Detection Engineer** | Expert detection engineer specializing in SIEM rule development, MITRE ATT&CK coverage mapping, threat hunting, alert tuning, and detection-as-code pipelines for security operatio… | `agency/engineering/engineering-threat-detection-engineer.md` |
| **WeChat Mini Program Developer** | Expert WeChat Mini Program developer specializing in 小程序 development with WXML/WXSS/WXS, WeChat API integration, payment systems, subscription messaging, and the full WeChat ecosy… | `agency/engineering/engineering-wechat-mini-program-developer.md` |

### agency/game-development

| Name | Description | File |
|---|---|---|
| **Game Audio Engineer** | Interactive audio specialist - Masters FMOD/Wwise integration, adaptive music systems, spatial audio, and audio performance budgeting across all game engines | `agency/game-development/game-audio-engineer.md` |
| **Game Designer** | Systems and mechanics architect - Masters GDD authorship, player psychology, economy balancing, and gameplay loop design across all engines and genres | `agency/game-development/game-designer.md` |
| **Level Designer** | Spatial storytelling and flow specialist - Masters layout theory, pacing architecture, encounter design, and environmental narrative across all game engines | `agency/game-development/level-designer.md` |
| **Narrative Designer** | Story systems and dialogue architect - Masters GDD-aligned narrative design, branching dialogue, lore architecture, and environmental storytelling across all game engines | `agency/game-development/narrative-designer.md` |
| **Technical Artist** | Art-to-engine pipeline specialist - Masters shaders, VFX systems, LOD pipelines, performance budgeting, and cross-engine asset optimization | `agency/game-development/technical-artist.md` |

### agency/marketing

| Name | Description | File |
|---|---|---|
| **AI Citation Strategist** | Expert in AI recommendation engine optimization (AEO/GEO) — audits brand visibility across ChatGPT, Claude, Gemini, and Perplexity, identifies why competitors get cited instead, a… | `agency/marketing/marketing-ai-citation-strategist.md` |
| **App Store Optimizer** | Expert app store marketing specialist focused on App Store Optimization (ASO), conversion rate optimization, and app discoverability | `agency/marketing/marketing-app-store-optimizer.md` |
| **Baidu SEO Specialist** | Expert Baidu search optimization specialist focused on Chinese search engine ranking, Baidu ecosystem integration, ICP compliance, Chinese keyword research, and mobile-first index… | `agency/marketing/marketing-baidu-seo-specialist.md` |
| **Bilibili Content Strategist** | Expert Bilibili marketing specialist focused on UP主 growth, danmaku culture mastery, B站 algorithm optimization, community building, and branded content strategy for China's leadin… | `agency/marketing/marketing-bilibili-content-strategist.md` |
| **Book Co-Author** | Strategic thought-leadership book collaborator for founders, experts, and operators turning voice notes, fragments, and positioning into structured first-person chapters. | `agency/marketing/marketing-book-co-author.md` |
| **Carousel Growth Engine** | Autonomous TikTok and Instagram carousel generation specialist. Analyzes any website URL with Playwright, generates viral 6-slide carousels via Gemini image generation, publishes … | `agency/marketing/marketing-carousel-growth-engine.md` |
| **China E-Commerce Operator** | Expert China e-commerce operations specialist covering Taobao, Tmall, Pinduoduo, and JD ecosystems with deep expertise in product listing optimization, live commerce, store operat… | `agency/marketing/marketing-china-ecommerce-operator.md` |
| **Content Creator** | Expert content strategist and creator for multi-platform campaigns. Develops editorial calendars, creates compelling copy, manages brand storytelling, and optimizes content for en… | `agency/marketing/marketing-content-creator.md` |
| **Cross-Border E-Commerce Specialist** | Full-funnel cross-border e-commerce strategist covering Amazon, Shopee, Lazada, AliExpress, Temu, and TikTok Shop operations, international logistics and overseas warehousing, com… | `agency/marketing/marketing-cross-border-ecommerce.md` |
| **Douyin Strategist** | Short-video marketing expert specializing in the Douyin platform, with deep expertise in recommendation algorithm mechanics, viral video planning, livestream commerce workflows, a… | `agency/marketing/marketing-douyin-strategist.md` |
| **Growth Hacker** | Expert growth strategist specializing in rapid user acquisition through data-driven experimentation. Develops viral loops, optimizes conversion funnels, and finds scalable growth … | `agency/marketing/marketing-growth-hacker.md` |
| **Instagram Curator** | Expert Instagram marketing specialist focused on visual storytelling, community building, and multi-format content optimization. Masters aesthetic development and drives meaningfu… | `agency/marketing/marketing-instagram-curator.md` |
| **Kuaishou Strategist** | Expert Kuaishou marketing strategist specializing in short-video content for China's lower-tier city markets, live commerce operations, community trust building, and grassroots au… | `agency/marketing/marketing-kuaishou-strategist.md` |
| **LinkedIn Content Creator** | Expert LinkedIn content strategist focused on thought leadership, personal brand building, and high-engagement professional content. Masters LinkedIn's algorithm and culture to dr… | `agency/marketing/marketing-linkedin-content-creator.md` |
| **Livestream Commerce Coach** | Veteran livestream e-commerce coach specializing in host training and live room operations across Douyin, Kuaishou, Taobao Live, and Channels, covering script design, product sequ… | `agency/marketing/marketing-livestream-commerce-coach.md` |
| **Podcast Strategist** | Content strategy and operations expert for the Chinese podcast market, with deep expertise in Xiaoyuzhou, Ximalaya, and other major audio platforms, covering show positioning, aud… | `agency/marketing/marketing-podcast-strategist.md` |
| **Private Domain Operator** | Expert in building enterprise WeChat (WeCom) private domain ecosystems, with deep expertise in SCRM systems, segmented community operations, Mini Program commerce integration, use… | `agency/marketing/marketing-private-domain-operator.md` |
| **Reddit Community Builder** | Expert Reddit marketing specialist focused on authentic community engagement, value-driven content creation, and long-term relationship building. Masters Reddit culture navigation. | `agency/marketing/marketing-reddit-community-builder.md` |
| **SEO Specialist** | Expert search engine optimization strategist specializing in technical SEO, content optimization, link authority building, and organic search growth. Drives sustainable traffic th… | `agency/marketing/marketing-seo-specialist.md` |
| **Short-Video Editing Coach** | Hands-on short-video editing coach covering the full post-production pipeline, with mastery of CapCut Pro, Premiere Pro, DaVinci Resolve, and Final Cut Pro across composition and … | `agency/marketing/marketing-short-video-editing-coach.md` |
| **Social Media Strategist** | Expert social media strategist for LinkedIn, Twitter, and professional platforms. Creates cross-platform campaigns, builds communities, manages real-time engagement, and develops … | `agency/marketing/marketing-social-media-strategist.md` |
| **TikTok Strategist** | Expert TikTok marketing specialist focused on viral content creation, algorithm optimization, and community building. Masters TikTok's unique culture and features for brand growth. | `agency/marketing/marketing-tiktok-strategist.md` |
| **Twitter Engager** | Expert Twitter marketing specialist focused on real-time engagement, thought leadership building, and community-driven growth. Builds brand authority through authentic conversatio… | `agency/marketing/marketing-twitter-engager.md` |
| **Video Optimization Specialist** | Video marketing strategist specializing in YouTube algorithm optimization, audience retention, chaptering, thumbnail concepts, and cross-platform video syndication. | `agency/marketing/marketing-video-optimization-specialist.md` |
| **WeChat Official Account Manager** | Expert WeChat Official Account (OA) strategist specializing in content marketing, subscriber engagement, and conversion optimization. Masters multi-format content and builds loyal… | `agency/marketing/marketing-wechat-official-account.md` |
| **Weibo Strategist** | Full-spectrum operations expert for Sina Weibo, with deep expertise in trending topic mechanics, Super Topic community management, public sentiment monitoring, fan economy strateg… | `agency/marketing/marketing-weibo-strategist.md` |
| **Xiaohongshu Specialist** | Expert Xiaohongshu marketing specialist focused on lifestyle content, trend-driven strategies, and authentic community engagement. Masters micro-content creation and drives viral … | `agency/marketing/marketing-xiaohongshu-specialist.md` |
| **Zhihu Strategist** | Expert Zhihu marketing specialist focused on thought leadership, community credibility, and knowledge-driven engagement. Masters question-answering strategy and builds brand autho… | `agency/marketing/marketing-zhihu-strategist.md` |

### agency/paid-media

| Name | Description | File |
|---|---|---|
| **Ad Creative Strategist** | Paid media creative specialist focused on ad copywriting, RSA optimization, asset group design, and creative testing frameworks across Google, Meta, Microsoft, and programmatic pl… | `agency/paid-media/paid-media-creative-strategist.md` |
| **Paid Media Auditor** | Comprehensive paid media auditor who systematically evaluates Google Ads, Microsoft Ads, and Meta accounts across 200+ checkpoints spanning account structure, tracking, bidding, c… | `agency/paid-media/paid-media-auditor.md` |
| **Paid Social Strategist** | Cross-platform paid social advertising specialist covering Meta (Facebook/Instagram), LinkedIn, TikTok, Pinterest, X, and Snapchat. Designs full-funnel social ad programs from pro… | `agency/paid-media/paid-media-paid-social-strategist.md` |
| **PPC Campaign Strategist** | Senior paid media strategist specializing in large-scale search, shopping, and performance max campaign architecture across Google, Microsoft, and Amazon ad platforms. Designs acc… | `agency/paid-media/paid-media-ppc-strategist.md` |
| **Programmatic & Display Buyer** | Display advertising and programmatic media buying specialist covering managed placements, Google Display Network, DV360, trade desk platforms, partner media (newsletters, sponsore… | `agency/paid-media/paid-media-programmatic-buyer.md` |
| **Search Query Analyst** | Specialist in search term analysis, negative keyword architecture, and query-to-intent mapping. Turns raw search query data into actionable optimizations that eliminate waste and … | `agency/paid-media/paid-media-search-query-analyst.md` |
| **Tracking & Measurement Specialist** | Expert in conversion tracking architecture, tag management, and attribution modeling across Google Tag Manager, GA4, Google Ads, Meta CAPI, LinkedIn Insight Tag, and server-side i… | `agency/paid-media/paid-media-tracking-specialist.md` |

### agency/product

| Name | Description | File |
|---|---|---|
| **Behavioral Nudge Engine** | Behavioral psychology specialist that adapts software interaction cadences and styles to maximize user motivation and success. | `agency/product/product-behavioral-nudge-engine.md` |
| **Feedback Synthesizer** | Expert in collecting, analyzing, and synthesizing user feedback from multiple channels to extract actionable product insights. Transforms qualitative feedback into quantitative pr… | `agency/product/product-feedback-synthesizer.md` |
| **Product Manager** | Holistic product leader who owns the full product lifecycle — from discovery and strategy through roadmap, stakeholder alignment, go-to-market, and outcome measurement. Bridges bu… | `agency/product/product-manager.md` |
| **Sprint Prioritizer** | Expert product manager specializing in agile sprint planning, feature prioritization, and resource allocation. Focused on maximizing team velocity and business value delivery thro… | `agency/product/product-sprint-prioritizer.md` |
| **Trend Researcher** | Expert market intelligence analyst specializing in identifying emerging trends, competitive analysis, and opportunity assessment. Focused on providing actionable insights that dri… | `agency/product/product-trend-researcher.md` |

### agency/project-management

| Name | Description | File |
|---|---|---|
| **Experiment Tracker** | Expert project manager specializing in experiment design, execution tracking, and data-driven decision making. Focused on managing A/B tests, feature experiments, and hypothesis v… | `agency/project-management/project-management-experiment-tracker.md` |
| **Jira Workflow Steward** | Expert delivery operations specialist who enforces Jira-linked Git workflows, traceable commits, structured pull requests, and release-safe branch strategy across software teams. | `agency/project-management/project-management-jira-workflow-steward.md` |
| **Project Shepherd** | Expert project manager specializing in cross-functional project coordination, timeline management, and stakeholder alignment. Focused on shepherding projects from conception to co… | `agency/project-management/project-management-project-shepherd.md` |
| **Senior Project Manager** | Converts specs to tasks and remembers previous projects. Focused on realistic scope, no background processes, exact spec requirements | `agency/project-management/project-manager-senior.md` |
| **Studio Operations** | Expert operations manager specializing in day-to-day studio efficiency, process optimization, and resource coordination. Focused on ensuring smooth operations, maintaining product… | `agency/project-management/project-management-studio-operations.md` |
| **Studio Producer** | Senior strategic leader specializing in high-level creative and technical project orchestration, resource allocation, and multi-project portfolio management. Focused on aligning c… | `agency/project-management/project-management-studio-producer.md` |

### agency/sales

| Name | Description | File |
|---|---|---|
| **Account Strategist** | Expert post-sale account strategist specializing in land-and-expand execution, stakeholder mapping, QBR facilitation, and net revenue retention. Turns closed deals into long-term … | `agency/sales/sales-account-strategist.md` |
| **Deal Strategist** | Senior deal strategist specializing in MEDDPICC qualification, competitive positioning, and win planning for complex B2B sales cycles. Scores opportunities, exposes pipeline risk,… | `agency/sales/sales-deal-strategist.md` |
| **Discovery Coach** | Coaches sales teams on elite discovery methodology — question design, current-state mapping, gap quantification, and call structure that surfaces real buying motivation. | `agency/sales/sales-discovery-coach.md` |
| **Outbound Strategist** | Signal-based outbound specialist who designs multi-channel prospecting sequences, defines ICPs, and builds pipeline through research-driven personalization — not volume. | `agency/sales/sales-outbound-strategist.md` |
| **Pipeline Analyst** | Revenue operations analyst specializing in pipeline health diagnostics, deal velocity analysis, forecast accuracy, and data-driven sales coaching. Turns CRM data into actionable p… | `agency/sales/sales-pipeline-analyst.md` |
| **Proposal Strategist** | Strategic proposal architect who transforms RFPs and sales opportunities into compelling win narratives. Specializes in win theme development, competitive positioning, executive s… | `agency/sales/sales-proposal-strategist.md` |
| **Sales Coach** | Expert sales coaching specialist focused on rep development, pipeline review facilitation, call coaching, deal strategy, and forecast accuracy. Makes every rep and every deal bett… | `agency/sales/sales-coach.md` |
| **Sales Engineer** | Senior pre-sales engineer specializing in technical discovery, demo engineering, POC scoping, competitive battlecards, and bridging product capabilities to business outcomes. Wins… | `agency/sales/sales-engineer.md` |

### agency/spatial-computing

| Name | Description | File |
|---|---|---|
| **macOS Spatial/Metal Engineer** | Native Swift and Metal specialist building high-performance 3D rendering systems and spatial computing experiences for macOS and Vision Pro | `agency/spatial-computing/macos-spatial-metal-engineer.md` |
| **Terminal Integration Specialist** | Terminal emulation, text rendering optimization, and SwiftTerm integration for modern Swift applications | `agency/spatial-computing/terminal-integration-specialist.md` |
| **visionOS Spatial Engineer** | Native visionOS spatial computing, SwiftUI volumetric interfaces, and Liquid Glass design implementation | `agency/spatial-computing/visionos-spatial-engineer.md` |
| **XR Cockpit Interaction Specialist** | Specialist in designing and developing immersive cockpit-based control systems for XR environments | `agency/spatial-computing/xr-cockpit-interaction-specialist.md` |
| **XR Immersive Developer** | Expert WebXR and immersive technology developer with specialization in browser-based AR/VR/XR applications | `agency/spatial-computing/xr-immersive-developer.md` |
| **XR Interface Architect** | Spatial interaction designer and interface strategist for immersive AR/VR/XR environments | `agency/spatial-computing/xr-interface-architect.md` |

### agency/specialized

| Name | Description | File |
|---|---|---|
| **Accounts Payable Agent** | Autonomous payment processing specialist that executes vendor payments, contractor invoices, and recurring bills across any payment rail — crypto, fiat, stablecoins. Integrates wi… | `agency/specialized/accounts-payable-agent.md` |
| **Agentic Identity & Trust Architect** | Designs identity, authentication, and trust verification systems for autonomous AI agents operating in multi-agent environments. Ensures agents can prove who they are, what they'r… | `agency/specialized/agentic-identity-trust.md` |
| **Agents Orchestrator** | Autonomous pipeline manager that orchestrates the entire development workflow. You are the leader of this process. | `agency/specialized/agents-orchestrator.md` |
| **Automation Governance Architect** | Governance-first architect for business automations (n8n-first) who audits value, risk, and maintainability before implementation. | `agency/specialized/automation-governance-architect.md` |
| **Blockchain Security Auditor** | Expert smart contract security auditor specializing in vulnerability detection, formal verification, exploit analysis, and comprehensive audit report writing for DeFi protocols an… | `agency/specialized/blockchain-security-auditor.md` |
| **Compliance Auditor** | Expert technical compliance auditor specializing in SOC 2, ISO 27001, HIPAA, and PCI-DSS audits — from readiness assessment through evidence collection to certification. | `agency/specialized/compliance-auditor.md` |
| **Corporate Training Designer** | Expert in enterprise training system design and curriculum development — proficient in training needs analysis, instructional design methodology, blended learning program design, … | `agency/specialized/corporate-training-designer.md` |
| **Cultural Intelligence Strategist** | CQ specialist that detects invisible exclusion, researches global context, and ensures software resonates authentically across intersectional identities. | `agency/specialized/specialized-cultural-intelligence-strategist.md` |
| **Data Consolidation Agent** | AI agent that consolidates extracted sales data into live reporting dashboards with territory, rep, and pipeline summaries | `agency/specialized/data-consolidation-agent.md` |
| **Developer Advocate** | Expert developer advocate specializing in building developer communities, creating compelling technical content, optimizing developer experience (DX), and driving platform adoptio… | `agency/specialized/specialized-developer-advocate.md` |
| **Document Generator** | Expert document creation specialist who generates professional PDF, PPTX, DOCX, and XLSX files using code-based approaches with proper formatting, charts, and data visualization. | `agency/specialized/specialized-document-generator.md` |
| **French Consulting Market Navigator** | Navigate the French ESN/SI freelance ecosystem — margin models, platform mechanics (Malt, collective.work), portage salarial, rate positioning, and payment cycle realities | `agency/specialized/specialized-french-consulting-market.md` |
| **Government Digital Presales Consultant** | Presales expert for China's government digital transformation market (ToG), proficient in policy interpretation, solution design, bid document preparation, POC validation, complia… | `agency/specialized/government-digital-presales-consultant.md` |
| **Healthcare Marketing Compliance Specialist** | Expert in healthcare marketing compliance in China, proficient in the Advertising Law, Medical Advertisement Management Measures, Drug Administration Law, and related regulations … | `agency/specialized/healthcare-marketing-compliance.md` |
| **Identity Graph Operator** | Operates a shared identity graph that multiple AI agents resolve against. Ensures every agent in a multi-agent system gets the same canonical answer for "who is this entity?" - de… | `agency/specialized/identity-graph-operator.md` |
| **Korean Business Navigator** | Korean business culture for foreign professionals — 품의 decision process, nunchi reading, KakaoTalk business etiquette, hierarchy navigation, and relationship-first deal mechanics | `agency/specialized/specialized-korean-business-navigator.md` |
| **LSP/Index Engineer** | Language Server Protocol specialist building unified code intelligence systems through LSP client orchestration and semantic indexing | `agency/specialized/lsp-index-engineer.md` |
| **MCP Builder** | Expert Model Context Protocol developer who designs, builds, and tests MCP servers that extend AI agent capabilities with custom tools, resources, and prompts. | `agency/specialized/specialized-mcp-builder.md` |
| **Model QA Specialist** | Independent model QA expert who audits ML and statistical models end-to-end - from documentation review and data reconstruction to replication, calibration testing, interpretabili… | `agency/specialized/specialized-model-qa.md` |
| **Recruitment Specialist** | Expert recruitment operations and talent acquisition specialist — skilled in China's major hiring platforms, talent assessment frameworks, and labor law compliance. Helps companie… | `agency/specialized/recruitment-specialist.md` |
| **Report Distribution Agent** | AI agent that automates distribution of consolidated sales reports to representatives based on territorial parameters | `agency/specialized/report-distribution-agent.md` |
| **Sales Data Extraction Agent** | AI agent specialized in monitoring Excel files and extracting key sales metrics (MTD, YTD, Year End) for internal live reporting | `agency/specialized/sales-data-extraction-agent.md` |
| **Salesforce Architect** | Solution architecture for Salesforce platform — multi-cloud design, integration patterns, governor limits, deployment strategy, and data model governance for enterprise-scale orgs | `agency/specialized/specialized-salesforce-architect.md` |
| **Study Abroad Advisor** | Full-spectrum study abroad planning expert covering the US, UK, Canada, Australia, Europe, Hong Kong, and Singapore — proficient in undergraduate, master's, and PhD application st… | `agency/specialized/study-abroad-advisor.md` |
| **Supply Chain Strategist** | Expert supply chain management and procurement strategy specialist — skilled in supplier development, strategic sourcing, quality control, and supply chain digitalization. Grounde… | `agency/specialized/supply-chain-strategist.md` |
| **Workflow Architect** | Workflow design specialist who maps complete workflow trees for every system, user journey, and agent interaction — covering happy paths, all branch conditions, failure modes, rec… | `agency/specialized/specialized-workflow-architect.md` |
| **ZK Steward** | Knowledge-base steward in the spirit of Niklas Luhmann's Zettelkasten. Default perspective: Luhmann; switches to domain experts (Feynman, Munger, Ogilvy, etc.) by task. Enforces a… | `agency/specialized/zk-steward.md` |

### agency/strategy

| Name | Description | File |
|---|---|---|
| **EXECUTIVE-BRIEF** | --- | `agency/strategy/EXECUTIVE-BRIEF.md` |
| **nexus-strategy** | > **NEXUS** transforms The Agency's independent AI specialists into a synchronized intelligence network. This is not a prompt collection — it is a **deployment doctrine** that tur… | `agency/strategy/nexus-strategy.md` |
| **QUICKSTART** | > **Get from zero to orchestrated multi-agent pipeline in 5 minutes.** | `agency/strategy/QUICKSTART.md` |

### agency/support

| Name | Description | File |
|---|---|---|
| **Analytics Reporter** | Expert data analyst transforming raw data into actionable business insights. Creates dashboards, performs statistical analysis, tracks KPIs, and provides strategic decision suppor… | `agency/support/support-analytics-reporter.md` |
| **Executive Summary Generator** | Consultant-grade AI specialist trained to think and communicate like a senior strategy consultant. Transforms complex business inputs into concise, actionable executive summaries … | `agency/support/support-executive-summary-generator.md` |
| **Finance Tracker** | Expert financial analyst and controller specializing in financial planning, budget management, and business performance analysis. Maintains financial health, optimizes cash flow, … | `agency/support/support-finance-tracker.md` |
| **Infrastructure Maintainer** | Expert infrastructure specialist focused on system reliability, performance optimization, and technical operations management. Maintains robust, scalable infrastructure supporting… | `agency/support/support-infrastructure-maintainer.md` |
| **Legal Compliance Checker** | Expert legal and compliance specialist ensuring business operations, data handling, and content creation comply with relevant laws, regulations, and industry standards across mult… | `agency/support/support-legal-compliance-checker.md` |
| **Support Responder** | Expert customer support specialist delivering exceptional customer service, issue resolution, and user experience optimization. Specializes in multi-channel support, proactive cus… | `agency/support/support-support-responder.md` |

### agency/testing

| Name | Description | File |
|---|---|---|
| **Accessibility Auditor** | Expert accessibility specialist who audits interfaces against WCAG standards, tests with assistive technologies, and ensures inclusive design. Defaults to finding barriers — if it… | `agency/testing/testing-accessibility-auditor.md` |
| **API Tester** | Expert API testing specialist focused on comprehensive API validation, performance testing, and quality assurance across all systems and third-party integrations | `agency/testing/testing-api-tester.md` |
| **Evidence Collector** | Screenshot-obsessed, fantasy-allergic QA specialist - Default to finding 3-5 issues, requires visual proof for everything | `agency/testing/testing-evidence-collector.md` |
| **Performance Benchmarker** | Expert performance testing and optimization specialist focused on measuring, analyzing, and improving system performance across all applications and infrastructure | `agency/testing/testing-performance-benchmarker.md` |
| **Reality Checker** | Stops fantasy approvals, evidence-based certification - Default to "NEEDS WORK", requires overwhelming proof for production readiness | `agency/testing/testing-reality-checker.md` |
| **Test Results Analyzer** | Expert test analysis specialist focused on comprehensive test result evaluation, quality metrics analysis, and actionable insight generation from testing activities | `agency/testing/testing-test-results-analyzer.md` |
| **Tool Evaluator** | Expert technology assessment specialist focused on evaluating, testing, and recommending tools, software, and platforms for business use and productivity optimization | `agency/testing/testing-tool-evaluator.md` |
| **Workflow Optimizer** | Expert process improvement specialist focused on analyzing, optimizing, and automating workflows across all business functions for maximum productivity and efficiency | `agency/testing/testing-workflow-optimizer.md` |

### analysis

| Name | Description | File |
|---|---|---|
| **analyst** | Advanced code quality analysis agent for comprehensive code reviews and improvements | `analysis/code-analyzer.md` |
| **code-analyzer** | Advanced code quality analysis agent for comprehensive code reviews and improvements | `analysis/analyze-code-quality.md` |

### analysis/code-review

| Name | Description | File |
|---|---|---|
| **code-analyzer** | Advanced code quality analysis agent for comprehensive code reviews and improvements | `analysis/code-review/analyze-code-quality.md` |

### architecture

| Name | Description | File |
|---|---|---|
| **system-architect** | Expert agent for system architecture design, patterns, and high-level technical decisions | `architecture/arch-system-design.md` |

### architecture/system-design

| Name | Description | File |
|---|---|---|
| **system-architect** | Expert agent for system architecture design, patterns, and high-level technical decisions | `architecture/system-design/arch-system-design.md` |

### consensus

| Name | Description | File |
|---|---|---|
| **byzantine-coordinator** | Coordinates Byzantine fault-tolerant consensus protocols with malicious actor detection | `consensus/byzantine-coordinator.md` |
| **crdt-synchronizer** | Implements Conflict-free Replicated Data Types for eventually consistent state synchronization | `consensus/crdt-synchronizer.md` |
| **gossip-coordinator** | Coordinates gossip-based consensus protocols for scalable eventually consistent systems | `consensus/gossip-coordinator.md` |
| **performance-benchmarker** | Implements comprehensive performance benchmarking for distributed consensus protocols | `consensus/performance-benchmarker.md` |
| **quorum-manager** | Implements dynamic quorum adjustment and intelligent membership management | `consensus/quorum-manager.md` |
| **raft-manager** | Manages Raft consensus algorithm with leader election and log replication | `consensus/raft-manager.md` |
| **security-manager** | Implements comprehensive security mechanisms for distributed consensus protocols | `consensus/security-manager.md` |

### core

| Name | Description | File |
|---|---|---|
| **coder** | Implementation specialist for writing clean, efficient code with self-learning capabilities | `core/coder.md` |
| **planner** | Strategic planning and task orchestration agent with AI-powered resource optimization | `core/planner.md` |
| **researcher** | Deep research and information gathering specialist with AI-enhanced pattern recognition | `core/researcher.md` |
| **reviewer** | Code review and quality assurance specialist with AI-powered pattern detection | `core/reviewer.md` |
| **tester** | Comprehensive testing and quality assurance specialist with AI-powered test generation | `core/tester.md` |

### custom

| Name | Description | File |
|---|---|---|
| **test-long-runner** | Test agent that can run for 30+ minutes on complex tasks | `custom/test-long-runner.md` |

### data

| Name | Description | File |
|---|---|---|
| **ml-developer** | ML developer with self-learning hyperparameter optimization and pattern recognition | `data/data-ml-model.md` |

### data/ml

| Name | Description | File |
|---|---|---|
| **ml-developer** | Specialized agent for machine learning model development, training, and deployment | `data/ml/data-ml-model.md` |

### development

| Name | Description | File |
|---|---|---|
| **backend-dev** | Specialized agent for backend API development with self-learning and pattern recognition | `development/dev-backend-api.md` |

### development/backend

| Name | Description | File |
|---|---|---|
| **backend-dev** | Specialized agent for backend API development, including REST and GraphQL endpoints | `development/backend/dev-backend-api.md` |

### devops

| Name | Description | File |
|---|---|---|
| **cicd-engineer** | Specialized agent for GitHub Actions CI/CD pipeline creation and optimization | `devops/ops-cicd-github.md` |

### devops/ci-cd

| Name | Description | File |
|---|---|---|
| **cicd-engineer** | Specialized agent for GitHub Actions CI/CD pipeline creation and optimization | `devops/ci-cd/ops-cicd-github.md` |

### documentation

| Name | Description | File |
|---|---|---|
| **api-docs** | Expert agent for creating OpenAPI documentation with pattern learning | `documentation/docs-api-openapi.md` |

### documentation/api-docs

| Name | Description | File |
|---|---|---|
| **api-docs** | Expert agent for creating and maintaining OpenAPI/Swagger documentation | `documentation/api-docs/docs-api-openapi.md` |

### flow-nexus

| Name | Description | File |
|---|---|---|
| **flow-nexus-app-store** | Application marketplace and template management specialist. Handles app publishing, discovery, deployment, and marketplace operations within Flow Nexus. | `flow-nexus/app-store.md` |
| **flow-nexus-auth** | Flow Nexus authentication and user management specialist. Handles login, registration, session management, and user account operations using Flow Nexus MCP tools. | `flow-nexus/authentication.md` |
| **flow-nexus-challenges** | Coding challenges and gamification specialist. Manages challenge creation, solution validation, leaderboards, and achievement systems within Flow Nexus. | `flow-nexus/challenges.md` |
| **flow-nexus-neural** | Neural network training and deployment specialist. Manages distributed neural network training, inference, and model lifecycle using Flow Nexus cloud infrastructure. | `flow-nexus/neural-network.md` |
| **flow-nexus-payments** | Credit management and billing specialist. Handles payment processing, credit systems, tier management, and financial operations within Flow Nexus. | `flow-nexus/payments.md` |
| **flow-nexus-sandbox** | E2B sandbox deployment and management specialist. Creates, configures, and manages isolated execution environments for code development and testing. | `flow-nexus/sandbox.md` |
| **flow-nexus-swarm** | AI swarm orchestration and management specialist. Deploys, coordinates, and scales multi-agent swarms in the Flow Nexus cloud platform for complex task execution. | `flow-nexus/swarm.md` |
| **flow-nexus-user-tools** | User management and system utilities specialist. Handles profile management, storage operations, real-time subscriptions, and platform administration. | `flow-nexus/user-tools.md` |
| **flow-nexus-workflow** | Event-driven workflow automation specialist. Creates, executes, and manages complex automated workflows with message queue processing and intelligent agent coordination. | `flow-nexus/workflow.md` |

### github

| Name | Description | File |
|---|---|---|
| **code-review-swarm** | Deploy specialized AI agents to perform comprehensive, intelligent code reviews that go beyond traditional static analysis | `github/code-review-swarm.md` |
| **github-modes** | Comprehensive GitHub integration modes for workflow orchestration, PR management, and repository coordination with batch optimization | `github/github-modes.md` |
| **issue-tracker** | Intelligent issue management and project coordination with automated tracking, progress monitoring, and team coordination | `github/issue-tracker.md` |
| **multi-repo-swarm** | Cross-repository swarm orchestration for organization-wide automation and intelligent collaboration | `github/multi-repo-swarm.md` |
| **pr-manager** | Comprehensive pull request management with swarm coordination for automated reviews, testing, and merge workflows | `github/pr-manager.md` |
| **project-board-sync** | Synchronize AI swarms with GitHub Projects for visual task management, progress tracking, and team coordination | `github/project-board-sync.md` |
| **release-manager** | Automated release coordination and deployment with ruv-swarm orchestration for seamless version management, testing, and deployment across multiple packages | `github/release-manager.md` |
| **release-swarm** | Orchestrate complex software releases using AI swarms that handle everything from changelog generation to multi-platform deployment | `github/release-swarm.md` |
| **repo-architect** | Repository structure optimization and multi-repo management with ruv-swarm coordination for scalable project architecture and development workflows | `github/repo-architect.md` |
| **swarm-issue** | GitHub issue-based swarm coordination agent that transforms issues into intelligent multi-agent tasks with automatic decomposition and progress tracking | `github/swarm-issue.md` |
| **swarm-pr** | Pull request swarm management agent that coordinates multi-agent code review, validation, and integration workflows with automated PR lifecycle management | `github/swarm-pr.md` |
| **sync-coordinator** | Multi-repository synchronization coordinator that manages version alignment, dependency synchronization, and cross-package integration with intelligent swarm orchestration | `github/sync-coordinator.md` |
| **workflow-automation** | GitHub Actions workflow automation agent that creates intelligent, self-organizing CI/CD pipelines with adaptive multi-agent coordination and automated optimization | `github/workflow-automation.md` |

### goal

| Name | Description | File |
|---|---|---|
| **goal-planner** | Goal-Oriented Action Planning (GOAP) specialist that dynamically creates intelligent plans to achieve complex objectives. Uses gaming AI techniques to discover novel solutions by … | `goal/goal-planner.md` |
| **sublinear-goal-planner** | Goal-Oriented Action Planning (GOAP) specialist that dynamically creates intelligent plans to achieve complex objectives. Uses gaming AI techniques to discover novel solutions by … | `goal/agent.md` |

### optimization

| Name | Description | File |
|---|---|---|
| **Benchmark Suite** | Comprehensive performance benchmarking, regression detection and performance validation | `optimization/benchmark-suite.md` |
| **Load Balancing Coordinator** | Dynamic task distribution, work-stealing algorithms and adaptive load balancing | `optimization/load-balancer.md` |
| **Performance Monitor** | Real-time metrics collection, bottleneck analysis, SLA monitoring and anomaly detection | `optimization/performance-monitor.md` |
| **Resource Allocator** | Adaptive resource allocation, predictive scaling and intelligent capacity planning | `optimization/resource-allocator.md` |
| **Topology Optimizer** | Dynamic swarm topology reconfiguration and communication pattern optimization | `optimization/topology-optimizer.md` |

### payments

| Name | Description | File |
|---|---|---|
| **agentic-payments** | Multi-agent payment authorization specialist for autonomous AI commerce with cryptographic verification and Byzantine consensus | `payments/agentic-payments.md` |

### sona

| Name | Description | File |
|---|---|---|
| **sona-learning-optimizer** | SONA-powered self-optimizing agent with LoRA fine-tuning and EWC++ memory preservation | `sona/sona-learning-optimizer.md` |

### sparc

| Name | Description | File |
|---|---|---|
| **architecture** | SPARC Architecture phase specialist for system design with self-learning | `sparc/architecture.md` |
| **pseudocode** | SPARC Pseudocode phase specialist for algorithm design with self-learning | `sparc/pseudocode.md` |
| **refinement** | SPARC Refinement phase specialist for iterative improvement with self-learning | `sparc/refinement.md` |
| **specification** | SPARC Specification phase specialist for requirements analysis with self-learning | `sparc/specification.md` |

### specialized

| Name | Description | File |
|---|---|---|
| **mobile-dev** | Expert agent for React Native mobile application development across iOS and Android | `specialized/spec-mobile-react-native.md` |

### specialized/mobile

| Name | Description | File |
|---|---|---|
| **mobile-dev** | Expert agent for React Native mobile application development across iOS and Android | `specialized/mobile/spec-mobile-react-native.md` |

### sublinear

| Name | Description | File |
|---|---|---|
| **consensus-coordinator** | Distributed consensus agent that uses sublinear solvers for fast agreement protocols in multi-agent systems. Specializes in Byzantine fault tolerance, voting mechanisms, distribut… | `sublinear/consensus-coordinator.md` |
| **matrix-optimizer** | Expert agent for matrix analysis and optimization using sublinear algorithms. Specializes in matrix property analysis, diagonal dominance checking, condition number estimation, an… | `sublinear/matrix-optimizer.md` |
| **pagerank-analyzer** | Expert agent for graph analysis and PageRank calculations using sublinear algorithms. Specializes in network optimization, influence analysis, swarm topology optimization, and lar… | `sublinear/pagerank-analyzer.md` |
| **performance-optimizer** | System performance optimization agent that identifies bottlenecks and optimizes resource allocation using sublinear algorithms. Specializes in computational performance analysis, … | `sublinear/performance-optimizer.md` |
| **trading-predictor** | Advanced financial trading agent that leverages temporal advantage calculations to predict and execute trades before market data arrives. Specializes in using sublinear algorithms… | `sublinear/trading-predictor.md` |

### swarm

| Name | Description | File |
|---|---|---|
| **adaptive-coordinator** | Dynamic topology switching coordinator with self-organizing swarm patterns and real-time optimization | `swarm/adaptive-coordinator.md` |
| **hierarchical-coordinator** | Queen-led hierarchical swarm coordination with specialized worker delegation | `swarm/hierarchical-coordinator.md` |
| **mesh-coordinator** | Peer-to-peer mesh network swarm with distributed decision making and fault tolerance | `swarm/mesh-coordinator.md` |

### templates

| Name | Description | File |
|---|---|---|
| **base-template-generator** | >- Use this agent when you need to create foundational templates, boilerplate code, or starter configurations for new projects, components, or features. This agent excels at gener… | `templates/base-template-generator.md` |
| **memory-coordinator** | Manage persistent memory across sessions and facilitate cross-agent memory sharing | `templates/memory-coordinator.md` |
| **perf-analyzer** | Performance bottleneck analyzer for identifying and resolving workflow inefficiencies | `templates/performance-analyzer.md` |
| **pr-manager** | Complete pull request lifecycle management and GitHub workflow coordination | `templates/github-pr-manager.md` |
| **smart-agent** | Intelligent agent coordination and dynamic spawning specialist | `templates/automation-smart-agent.md` |
| **sparc-coder** | Transform specifications into working code with TDD practices | `templates/implementer-sparc-coder.md` |
| **sparc-coord** | SPARC methodology orchestrator with hierarchical coordination and self-learning | `templates/sparc-coordinator.md` |
| **swarm-init** | Swarm initialization and topology optimization specialist | `templates/coordinator-swarm-init.md` |
| **task-orchestrator** | Central coordination agent for task decomposition, execution planning, and result synthesis | `templates/orchestrator-task.md` |

### testing

| Name | Description | File |
|---|---|---|
| **production-validator** | Production validation specialist ensuring applications are fully implemented and deployment-ready | `testing/production-validator.md` |
| **tdd-london-swarm** | TDD London School specialist for mock-driven development within swarm coordination | `testing/tdd-london-swarm.md` |

### v3

| Name | Description | File |
|---|---|---|
| **adr-architect** | V3 Architecture Decision Record specialist that documents, tracks, and enforces architectural decisions with ReasoningBank integration for pattern learning | `v3/adr-architect.md` |
| **aidefence-guardian** | AI Defense Guardian agent that monitors all agent inputs/outputs for manipulation attempts using AIMDS | `v3/aidefence-guardian.md` |
| **claims-authorizer** | V3 Claims-based authorization specialist implementing ADR-010 for fine-grained access control across swarm agents and MCP tools | `v3/claims-authorizer.md` |
| **collective-intelligence-coordinator** | Hive-mind collective decision making with Byzantine fault-tolerant consensus, attention-based coordination, and emergent intelligence patterns | `v3/collective-intelligence-coordinator.md` |
| **ddd-domain-expert** | V3 Domain-Driven Design specialist for bounded context identification, aggregate design, domain modeling, and ubiquitous language enforcement | `v3/ddd-domain-expert.md` |
| **injection-analyst** | Deep analysis specialist for prompt injection and jailbreak attempts with pattern learning | `v3/injection-analyst.md` |
| **memory-specialist** | V3 memory optimization specialist with HNSW indexing, hybrid backend management, vector quantization, and EWC++ for preventing catastrophic forgetting | `v3/memory-specialist.md` |
| **performance-engineer** | V3 Performance Engineering Agent specialized in Flash Attention optimization (2.49x-7.47x speedup), WASM SIMD acceleration, token usage optimization (50-75% reduction), and compre… | `v3/performance-engineer.md` |
| **pii-detector** | Specialized PII detection agent that scans code and data for sensitive information leaks | `v3/pii-detector.md` |
| **reasoningbank-learner** | V3 ReasoningBank integration specialist for trajectory tracking, verdict judgment, pattern distillation, and experience replay using HNSW-indexed memory | `v3/reasoningbank-learner.md` |
| **security-architect** | V3 Security Architecture specialist with ReasoningBank learning, HNSW threat pattern search, and zero-trust design capabilities | `v3/security-architect.md` |
| **security-architect-aidefence** | | Enhanced V3 Security Architecture specialist with AIMDS (AI Manipulation Defense System) integration. Combines ReasoningBank learning with real-time prompt injection detection, … | `v3/security-architect-aidefence.md` |
| **security-auditor** | Advanced security auditor with self-learning vulnerability detection, CVE database search, and compliance auditing | `v3/security-auditor.md` |
| **sparc-orchestrator** | V3 SPARC methodology orchestrator that coordinates Specification, Pseudocode, Architecture, Refinement, and Completion phases with ReasoningBank learning | `v3/sparc-orchestrator.md` |
| **swarm-memory-manager** | V3 distributed memory manager for cross-agent state synchronization, CRDT replication, and namespace coordination across the swarm | `v3/swarm-memory-manager.md` |
| **v3-integration-architect** | V3 deep agentic-flow@alpha integration specialist implementing ADR-001 for eliminating duplicate code and building claude-flow as a specialized extension | `v3/v3-integration-architect.md` |

---

# User-Installed Skills
_Location: `~/.claude/skills/` — 1 skills_

| Name | Description |
|---|---|
| **startup-hook-skill** | Creating and developing startup hooks for Claude Code on the web. Use when the user wants to set up a repository for Claude Code on the web, create a SessionStart hook to ensure t… |

---

# Project Skills
_Location: `.claude/skills/` — 192 skills_

| Name | Description |
|---|---|
| **ab-test-setup** | When the user wants to plan, design, or implement an A/B test or experiment. Also use when the user mentions "A/B test," "split test," "experiment," "test this change," "variant c… |
| **ad-creative** | When the user wants to generate, iterate, or scale ad creative — headlines, descriptions, primary text, or full ad variations — for any paid advertising platform. Also use when th… |
| **AgentDB Advanced Features** | Master advanced AgentDB features including QUIC synchronization, multi-database management, custom distance metrics, hybrid search, and distributed systems integration. Use when b… |
| **AgentDB Learning Plugins** | Create and train AI learning plugins with AgentDB's 9 reinforcement learning algorithms. Includes Decision Transformer, Q-Learning, SARSA, Actor-Critic, and more. Use when buildin… |
| **AgentDB Memory Patterns** | Implement persistent memory patterns for AI agents using AgentDB. Includes session memory, long-term storage, pattern learning, and context management. Use when building stateful … |
| **AgentDB Performance Optimization** | Optimize AgentDB performance with quantization (4-32x memory reduction), HNSW indexing (150x faster search), caching, and batch operations. Use when optimizing memory usage, impro… |
| **AgentDB Vector Search** | Implement semantic vector search with AgentDB for intelligent document retrieval, similarity matching, and context-aware querying. Use when building RAG systems, semantic search e… |
| **ai-seo** | When the user wants to optimize content for AI search engines, get cited by LLMs, or appear in AI-generated answers. Also use when the user mentions 'AI SEO,' 'AEO,' 'GEO,' 'LLMO,… |
| **algorithmic-art** | Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic… |
| **analytics-tracking** | When the user wants to set up, improve, or audit analytics tracking and measurement. Also use when the user mentions "set up tracking," "GA4," "Google Analytics," "conversion trac… |
| **brainstorming** | You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design bef… |
| **brand-guidelines** | Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having Anthropic's look-and-feel. Use it when brand colors or style guidelin… |
| **browser** | Web browser automation with AI-optimized snapshots for claude-flow agents |
| **canvas-design** | Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other sta… |
| **churn-prevention** | When the user wants to reduce churn, build cancellation flows, set up save offers, recover failed payments, or implement retention strategies. Also use when the user mentions 'chu… |
| **ckm:banner-design** | Design banners for social media, ads, website heroes, creative assets, and print. Multiple art direction options with AI-generated visuals. Actions: design, create, generate banne… |
| **ckm:brand** | Brand voice, visual identity, messaging frameworks, asset management, brand consistency. Activate for branded content, tone of voice, marketing assets, brand compliance, style gui… |
| **ckm:design** | Comprehensive design skill: brand identity, design tokens, UI styling, logo generation (55 styles, Gemini AI), corporate identity program (50 deliverables, CIP mockups), HTML pres… |
| **ckm:design-system** | Token architecture, component specifications, and slide generation. Three-layer tokens (primitive→semantic→component), CSS variables, spacing/typography scales, component specs, s… |
| **ckm:slides** | Create strategic HTML presentations with Chart.js, design tokens, responsive layouts, copywriting formulas, and contextual slide strategies. |
| **ckm:ui-styling** | Create beautiful, accessible user interfaces with shadcn/ui components (built on Radix UI + Tailwind), Tailwind CSS utility-first styling, and canvas-based visual designs. Use whe… |
| **cold-email** | Write B2B cold emails and follow-up sequences that get replies. Use when the user wants to write cold outreach emails, prospecting emails, cold email campaigns, sales development … |
| **competitor-alternatives** | When the user wants to create competitor comparison or alternative pages for SEO and sales enablement. Also use when the user mentions 'alternative page,' 'vs page,' 'competitor c… |
| **content-strategy** | When the user wants to plan a content strategy, decide what content to create, or figure out what topics to cover. Also use when the user mentions "content strategy," "what should… |
| **copy-editing** | When the user wants to edit, review, or improve existing marketing copy. Also use when the user mentions 'edit this copy,' 'review my copy,' 'copy feedback,' 'proofread,' 'polish … |
| **copywriting** | When the user wants to write, rewrite, or improve marketing copy for any page — including homepage, landing pages, pricing pages, feature pages, about pages, or product pages. Als… |
| **dispatching-parallel-agents** | Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies |
| **do** | Execute a phased implementation plan using subagents. Use when asked to execute, run, or carry out a plan — especially one created by make-plan. |
| **doc-coauthoring** | Guide users through a structured workflow for co-authoring documentation. Use when user wants to write documentation, proposals, technical specs, decision docs, or similar structu… |
| **docx** | Use this skill whenever the user wants to create, read, edit, or manipulate Word documents (.docx files). Triggers include: any mention of 'Word doc', 'word document', '.docx', or… |
| **email-sequence** | When the user wants to create or optimize an email sequence, drip campaign, automated email flow, or lifecycle email program. Also use when the user mentions "email sequence," "dr… |
| **executing-plans** | Use when you have a written implementation plan to execute in a separate session with review checkpoints |
| **finishing-a-development-branch** | Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for … |
| **form-cro** | When the user wants to optimize any form that is NOT signup/registration — including lead capture forms, contact forms, demo request forms, application forms, survey forms, or che… |
| **free-tool-strategy** | When the user wants to plan, evaluate, or build a free tool for marketing purposes — lead generation, SEO value, or brand awareness. Also use when the user mentions "engineering a… |
| **frontend-design** | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applica… |
| **github-code-review** | Comprehensive GitHub code review with AI-powered swarm coordination |
| **github-multi-repo** | Multi-repository coordination, synchronization, and architecture management with AI swarm orchestration |
| **github-project-management** | Comprehensive GitHub project management with swarm-coordinated issue tracking, project board automation, and sprint planning |
| **github-release-management** | Comprehensive GitHub release orchestration with AI swarm coordination for automated versioning, testing, deployment, and rollback management |
| **github-workflow-automation** | Advanced GitHub Actions workflow automation with AI swarm coordination, intelligent CI/CD pipelines, and comprehensive repository management |
| **gws-admin-reports** | Google Workspace Admin SDK: Audit logs and usage reports. |
| **gws-calendar** | Google Calendar: Manage calendars and events. |
| **gws-calendar-agenda** | Google Calendar: Show upcoming events across all calendars. |
| **gws-calendar-insert** | Google Calendar: Create a new event. |
| **gws-chat** | Google Chat: Manage Chat spaces and messages. |
| **gws-chat-send** | Google Chat: Send a message to a space. |
| **gws-classroom** | Google Classroom: Manage classes, rosters, and coursework. |
| **gws-docs** | Read and write Google Docs. |
| **gws-docs-write** | Google Docs: Append text to a document. |
| **gws-drive** | Google Drive: Manage files, folders, and shared drives. |
| **gws-drive-upload** | Google Drive: Upload a file with automatic metadata. |
| **gws-events** | Subscribe to Google Workspace events. |
| **gws-events-renew** | Google Workspace Events: Renew/reactivate Workspace Events subscriptions. |
| **gws-events-subscribe** | Google Workspace Events: Subscribe to Workspace events and stream them as NDJSON. |
| **gws-forms** | Read and write Google Forms. |
| **gws-gmail** | Gmail: Send, read, and manage email. |
| **gws-gmail-forward** | Gmail: Forward a message to new recipients. |
| **gws-gmail-reply** | Gmail: Reply to a message (handles threading automatically). |
| **gws-gmail-reply-all** | Gmail: Reply-all to a message (handles threading automatically). |
| **gws-gmail-send** | Gmail: Send an email. |
| **gws-gmail-triage** | Gmail: Show unread inbox summary (sender, subject, date). |
| **gws-gmail-watch** | Gmail: Watch for new emails and stream them as NDJSON. |
| **gws-keep** | Manage Google Keep notes. |
| **gws-meet** | Manage Google Meet conferences. |
| **gws-modelarmor** | Google Model Armor: Filter user-generated content for safety. |
| **gws-modelarmor-create-template** | Google Model Armor: Create a new Model Armor template. |
| **gws-modelarmor-sanitize-prompt** | Google Model Armor: Sanitize a user prompt through a Model Armor template. |
| **gws-modelarmor-sanitize-response** | Google Model Armor: Sanitize a model response through a Model Armor template. |
| **gws-people** | Google People: Manage contacts and profiles. |
| **gws-shared** | gws CLI: Shared patterns for authentication, global flags, and output formatting. |
| **gws-sheets** | Google Sheets: Read and write spreadsheets. |
| **gws-sheets-append** | Google Sheets: Append a row to a spreadsheet. |
| **gws-sheets-read** | Google Sheets: Read values from a spreadsheet. |
| **gws-slides** | Google Slides: Read and write presentations. |
| **gws-tasks** | Google Tasks: Manage task lists and tasks. |
| **gws-workflow** | Google Workflow: Cross-service productivity workflows. |
| **gws-workflow-email-to-task** | Google Workflow: Convert a Gmail message into a Google Tasks entry. |
| **gws-workflow-file-announce** | Google Workflow: Announce a Drive file in a Chat space. |
| **gws-workflow-meeting-prep** | Google Workflow: Prepare for your next meeting: agenda, attendees, and linked docs. |
| **gws-workflow-standup-report** | Google Workflow: Today's meetings + open tasks as a standup summary. |
| **gws-workflow-weekly-digest** | Google Workflow: Weekly summary: this week's meetings + unread email count. |
| **Hooks Automation** | Automated coordination, formatting, and learning from Claude Code operations using intelligent hooks with MCP integration. Includes pre/post task hooks, session management, Git in… |
| **launch-strategy** | When the user wants to plan a product launch, feature announcement, or release strategy. Also use when the user mentions 'launch,' 'Product Hunt,' 'feature release,' 'announcement… |
| **lead-magnets** | When the user wants to create, plan, or optimize a lead magnet for email capture or lead generation. Also use when the user mentions "lead magnet," "gated content," "content upgra… |
| **make-plan** | Create a detailed, phased implementation plan with documentation discovery. Use when asked to plan a feature, task, or multi-step implementation — especially before executing with… |
| **marketing-ideas** | When the user needs marketing ideas, inspiration, or strategies for their SaaS or software product. Also use when the user asks for 'marketing ideas,' 'growth ideas,' 'how to mark… |
| **marketing-psychology** | When the user wants to apply psychological principles, mental models, or behavioral science to marketing. Also use when the user mentions 'psychology,' 'mental models,' 'cognitive… |
| **mem-search** | Search claude-mem's persistent cross-session memory database. Use when user asks "did we already solve this?", "how did we do X last time?", or needs work from previous sessions. |
| **onboarding-cro** | When the user wants to optimize post-signup onboarding, user activation, first-run experience, or time-to-value. Also use when the user mentions "onboarding flow," "activation rat… |
| **page-cro** | When the user wants to optimize, improve, or increase conversions on any marketing page — including homepage, landing pages, pricing pages, feature pages, or blog posts. Also use … |
| **paid-ads** | When the user wants help with paid advertising campaigns on Google Ads, Meta (Facebook/Instagram), LinkedIn, Twitter/X, or other ad platforms. Also use when the user mentions 'PPC… |
| **Pair Programming** | AI-assisted pair programming with multiple modes (driver/navigator/switch), real-time verification, quality monitoring, and comprehensive testing. Supports TDD, debugging, refacto… |
| **paywall-upgrade-cro** | When the user wants to create or optimize in-app paywalls, upgrade screens, upsell modals, or feature gates. Also use when the user mentions "paywall," "upgrade screen," "upgrade … |
| **pdf** | Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging multiple PDFs into one, split… |
| **persona-content-creator** | Create, organize, and distribute content across Workspace. |
| **persona-customer-support** | Manage customer support — track tickets, respond, escalate issues. |
| **persona-event-coordinator** | Plan and manage events — scheduling, invitations, and logistics. |
| **persona-exec-assistant** | Manage an executive's schedule, inbox, and communications. |
| **persona-hr-coordinator** | Handle HR workflows — onboarding, announcements, and employee comms. |
| **persona-it-admin** | Administer IT — monitor security and configure Workspace. |
| **persona-project-manager** | Coordinate projects — track tasks, schedule meetings, and share docs. |
| **persona-researcher** | Organize research — manage references, notes, and collaboration. |
| **persona-sales-ops** | Manage sales workflows — track deals, schedule calls, client comms. |
| **persona-team-lead** | Lead a team — run standups, coordinate tasks, and communicate. |
| **popup-cro** | When the user wants to create or optimize popups, modals, overlays, slide-ins, or banners for conversion purposes. Also use when the user mentions "exit intent," "popup conversion… |
| **pptx** | Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or e… |
| **pricing-strategy** | When the user wants help with pricing decisions, packaging, or monetization strategy. Also use when the user mentions 'pricing,' 'pricing tiers,' 'freemium,' 'free trial,' 'packag… |
| **product-marketing-context** | When the user wants to create or update their product marketing context document. Also use when the user mentions 'product context,' 'marketing context,' 'set up context,' 'positi… |
| **programmatic-seo** | When the user wants to create SEO-driven pages at scale using templates and data. Also use when the user mentions "programmatic SEO," "template pages," "pages at scale," "director… |
| **ReasoningBank Intelligence** | Implement adaptive learning with ReasoningBank for pattern recognition, strategy optimization, and continuous improvement. Use when building self-learning agents, optimizing workf… |
| **ReasoningBank with AgentDB** | Implement ReasoningBank adaptive learning with AgentDB's 150x faster vector database. Includes trajectory tracking, verdict judgment, memory distillation, and pattern recognition.… |
| **receiving-code-review** | Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verificat… |
| **recipe-backup-sheet-as-csv** | Export a Google Sheets spreadsheet as a CSV file for local backup or processing. |
| **recipe-batch-invite-to-event** | Add a list of attendees to an existing Google Calendar event and send notifications. |
| **recipe-block-focus-time** | Create recurring focus time blocks on Google Calendar to protect deep work hours. |
| **recipe-bulk-download-folder** | List and download all files from a Google Drive folder. |
| **recipe-collect-form-responses** | Retrieve and review responses from a Google Form. |
| **recipe-compare-sheet-tabs** | Read data from two tabs in a Google Sheet to compare and identify differences. |
| **recipe-copy-sheet-for-new-month** | Duplicate a Google Sheets template tab for a new month of tracking. |
| **recipe-create-classroom-course** | Create a Google Classroom course and invite students. |
| **recipe-create-doc-from-template** | Copy a Google Docs template, fill in content, and share with collaborators. |
| **recipe-create-events-from-sheet** | Read event data from a Google Sheets spreadsheet and create Google Calendar entries for each row. |
| **recipe-create-expense-tracker** | Set up a Google Sheets spreadsheet for tracking expenses with headers and initial entries. |
| **recipe-create-feedback-form** | Create a Google Form for feedback and share it via Gmail. |
| **recipe-create-gmail-filter** | Create a Gmail filter to automatically label, star, or categorize incoming messages. |
| **recipe-create-meet-space** | Create a Google Meet meeting space and share the join link. |
| **recipe-create-presentation** | Create a new Google Slides presentation and add initial slides. |
| **recipe-create-shared-drive** | Create a Google Shared Drive and add members with appropriate roles. |
| **recipe-create-task-list** | Set up a new Google Tasks list with initial tasks. |
| **recipe-create-vacation-responder** | Enable a Gmail out-of-office auto-reply with a custom message and date range. |
| **recipe-draft-email-from-doc** | Read content from a Google Doc and use it as the body of a Gmail message. |
| **recipe-email-drive-link** | Share a Google Drive file and email the link with a message to recipients. |
| **recipe-find-free-time** | Query Google Calendar free/busy status for multiple users to find a meeting slot. |
| **recipe-find-large-files** | Identify large Google Drive files consuming storage quota. |
| **recipe-forward-labeled-emails** | Find Gmail messages with a specific label and forward them to another address. |
| **recipe-generate-report-from-sheet** | Read data from a Google Sheet and create a formatted Google Docs report. |
| **recipe-label-and-archive-emails** | Apply Gmail labels to matching messages and archive them to keep your inbox clean. |
| **recipe-log-deal-update** | Append a deal status update to a Google Sheets sales tracking spreadsheet. |
| **recipe-organize-drive-folder** | Create a Google Drive folder structure and move files into the right locations. |
| **recipe-plan-weekly-schedule** | Review your Google Calendar week, identify gaps, and add events to fill them. |
| **recipe-post-mortem-setup** | Create a Google Docs post-mortem, schedule a Google Calendar review, and notify via Chat. |
| **recipe-reschedule-meeting** | Move a Google Calendar event to a new time and automatically notify all attendees. |
| **recipe-review-meet-participants** | Review who attended a Google Meet conference and for how long. |
| **recipe-review-overdue-tasks** | Find Google Tasks that are past due and need attention. |
| **recipe-save-email-attachments** | Find Gmail messages with attachments and save them to a Google Drive folder. |
| **recipe-save-email-to-doc** | Save a Gmail message body into a Google Doc for archival or reference. |
| **recipe-schedule-recurring-event** | Create a recurring Google Calendar event with attendees. |
| **recipe-send-team-announcement** | Send a team announcement via both Gmail and a Google Chat space. |
| **recipe-share-doc-and-notify** | Share a Google Docs document with edit access and email collaborators the link. |
| **recipe-share-event-materials** | Share Google Drive files with all attendees of a Google Calendar event. |
| **recipe-share-folder-with-team** | Share a Google Drive folder and all its contents with a list of collaborators. |
| **recipe-sync-contacts-to-sheet** | Export Google Contacts directory to a Google Sheets spreadsheet. |
| **recipe-watch-drive-changes** | Subscribe to change notifications on a Google Drive file or folder. |
| **referral-program** | When the user wants to create, optimize, or analyze a referral program, affiliate program, or word-of-mouth strategy. Also use when the user mentions 'referral,' 'affiliate,' 'amb… |
| **requesting-code-review** | Use when completing tasks, implementing major features, or before merging to verify work meets requirements |
| **revops** | When the user wants help with revenue operations, lead lifecycle management, or marketing-to-sales handoff processes. Also use when the user mentions 'RevOps,' 'revenue operations… |
| **sales-enablement** | When the user wants to create sales collateral, pitch decks, one-pagers, objection handling docs, or demo scripts. Also use when the user mentions 'sales deck,' 'pitch deck,' 'one… |
| **schema-markup** | When the user wants to add, fix, or optimize schema markup and structured data on their site. Also use when the user mentions "schema markup," "structured data," "JSON-LD," "rich … |
| **seo-audit** | When the user wants to audit, review, or diagnose SEO issues on their site. Also use when the user mentions "SEO audit," "technical SEO," "why am I not ranking," "SEO issues," "on… |
| **signup-flow-cro** | When the user wants to optimize signup, registration, account creation, or trial activation flows. Also use when the user mentions "signup conversions," "registration friction," "… |
| **site-architecture** | When the user wants to plan, map, or restructure their website's page hierarchy, navigation, URL structure, or internal linking. Also use when the user mentions "sitemap," "site m… |
| **Skill Builder** | Create new Claude Code Skills with proper YAML frontmatter, progressive disclosure structure, and complete directory organization. Use when you need to build custom skills for spe… |
| **skill-creator** | Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run … |
| **smart-explore** | Token-optimized structural code search using tree-sitter AST parsing. Use instead of reading full files when you need to understand code structure, find functions, or explore a co… |
| **social-content** | When the user wants help creating, scheduling, or optimizing social media content for LinkedIn, Twitter/X, Instagram, TikTok, Facebook, or other platforms. Also use when the user … |
| **sparc-methodology** | SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) comprehensive development methodology with multi-agent orchestration |
| **stream-chain** | Stream-JSON chaining for multi-agent pipelines, data transformation, and sequential workflows |
| **subagent-driven-development** | Use when executing implementation plans with independent tasks in the current session |
| **Swarm Orchestration** | Orchestrate multi-agent swarms with agentic-flow for parallel task execution, dynamic topology, and intelligent coordination. Use when scaling beyond single agents, implementing c… |
| **swarm-advanced** | Advanced swarm orchestration patterns for research, development, testing, and complex distributed workflows |
| **systematic-debugging** | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| **test-driven-development** | Use when implementing any feature or bugfix, before writing implementation code |
| **theme-factory** | Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10 pre-set themes with colors/fonts that you can ap… |
| **ui-ux-pro-max** | UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (… |
| **using-git-worktrees** | Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection… |
| **using-superpowers** | Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions |
| **V3 CLI Modernization** | CLI modernization and hooks system enhancement for claude-flow v3. Implements interactive prompts, command decomposition, enhanced hooks integration, and intelligent workflow auto… |
| **V3 Core Implementation** | Core module implementation for claude-flow v3. Implements DDD domains, clean architecture patterns, dependency injection, and modular TypeScript codebase with comprehensive testin… |
| **V3 DDD Architecture** | Domain-Driven Design architecture for claude-flow v3. Implements modular, bounded context architecture with clean separation of concerns and microkernel pattern. |
| **V3 Deep Integration** | Deep agentic-flow@alpha integration implementing ADR-001. Eliminates 10,000+ duplicate lines by building claude-flow as specialized extension rather than parallel implementation. |
| **V3 MCP Optimization** | MCP server optimization and transport layer enhancement for claude-flow v3. Implements connection pooling, load balancing, tool registry optimization, and performance monitoring f… |
| **V3 Memory Unification** | Unify 6+ memory systems into AgentDB with HNSW indexing for 150x-12,500x search improvements. Implements ADR-006 (Unified Memory Service) and ADR-009 (Hybrid Memory Backend). |
| **V3 Performance Optimization** | Achieve aggressive v3 performance targets: 2.49x-7.47x Flash Attention speedup, 150x-12,500x search improvements, 50-75% memory reduction. Comprehensive benchmarking and optimizat… |
| **V3 Security Overhaul** | Complete security architecture overhaul for claude-flow v3. Addresses critical CVEs (CVE-1, CVE-2, CVE-3) and implements secure-by-default patterns. Use for security-first v3 impl… |
| **V3 Swarm Coordination** | 15-agent hierarchical mesh coordination for v3 implementation. Orchestrates parallel execution across security, core, and integration domains following 10 ADRs with 14-week timeli… |
| **Verification & Quality Assurance** | Comprehensive truth scoring, code quality verification, and automatic rollback system with 0.95 accuracy threshold for ensuring high-quality agent outputs and codebase reliability. |
| **verification-before-completion** | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any suc… |
| **web-artifacts-builder** | Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui). Use for complex artifacts … |
| **writing-plans** | Use when you have a spec or requirements for a multi-step task, before touching code |
| **writing-skills** | Use when creating new skills, editing existing skills, or verifying skills work before deployment |
| **xlsx** | Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read, edit, or fix an existing .xlsx, .xlsm, .csv, or… |

---

# Harness Built-ins (reference only)

These come bundled with Claude Code. They are **not** files on disk and cannot be copied — but they are automatically available on any machine where Claude Code is installed.

The exact list is session-dependent. See the `## Available agents` and `## Available skills` sections of any Claude Code session's system prompt for a current roster.

Notable built-in agents include: `general-purpose`, `Explore`, `Plan`, `Code Reviewer`, `Backend Architect`, `Frontend Developer`, `Security Engineer`, `UX Researcher`, plus 300+ more.

Notable built-in skills include: `brainstorming`, `pdf`, `xlsx`, `docx`, `pptx`, `canvas-design`, `design-system`, `slides`, `skill-creator`, `using-git-worktrees`, plus 200+ more.
