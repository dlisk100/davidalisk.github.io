---
title: "The Embedded Toolmaker: Why Vibe Coding is the Future of Industrial Operations"
summary: "Why industrial companies must revive the 'machine shop' mindset—using AI to let operators solve their own software bottlenecks."
updated: '2026-01-08'
tags: ["Strategy", "Industrial", "American Dynamism", "AI"]
draft: false
---

## 1. The Minimum Viable IT Problem

Today’s large industrial companies are supported by sprawling IT and digital infrastructures that cost ~2-5% of their revenue per year. These complex backends undergird intricate business operations and support the production of tens of billions of dollars of goods every year. Due to this complexity, rolling out new software solutions requires months of planning and scores of involved individuals. As a result, Central IT has a high “activation energy.” If a solution saves less than $100K, IT won’t get out of bed for it. But a factory is just a collection of ten thousand $500 problems. Because these challenges are below the minimum viable problem threshold for Central IT, they never get solved. Instead, they calcify into process debt.

![Graph showing IT activation energy](/images/industrial-ops-ai-1.png)

Leaders cannot continue to accept process debt as a cost of doing business. Rather, industrial companies must activate the internal operators that are already in the company and have the best knowledge of existing process debt. We must revive the concept of the **embedded toolmaker**, but instead of lathes in a machine shop, today’s toolmakers will vibe code python scripts to bridge the gap between legacy systems and the modern necessity of agility.

This post is about why the economics of software automation have changed, and how hard tech companies can build a culture of high agency toolmakers.

## 2. The Jevons Paradox of Automation

Vibe coding, or natural language programming, radically changes the economics of software. It shifts the barrier of entry from *syntax* (knowing how to write a for loop in Python) to *logic* (knowing what the for loop needs to achieve). Using tools like Cursor, Replit, or Claude Code, an operator can simply describe the problem in plain English (E.g. “Parse this PDF, extract the pressure values, and graph the outliers”) and receive executable code in seconds. This turns the ability to code from a specialized trade to a general utility, like typing or reading. Ultimately, these quickly generated scripts and applets allows industrial operators to attack the long tail of IT problems.

To be clear: I am not suggesting that vibe coding will allow someone to replace the internal SAP system. I am suggesting that vibe coding allows automated software solutions to be quickly developed to solve reoccurring drudgery that currently takes up an inordinate amount of time of a well-paid industrial operator. Some examples of industrial ops problems that I’ve encountered in my own career that can be automated via vibe coding include:

* Classifying and renaming hundreds of PDF files
* Manually parsing through tens of thousands of lines of equipment sensor data in Excel
* Cross-referencing hundreds of supplier Certificates of Analysis (CoAs) against a master specification sheet to catch out-of-spec materials before they hit the production line

Jevons Paradox provides another angle with which to analyze the impact of vibe coding on industrial ops. Jevons Paradox states that as technology increases the efficiency with which a resource is used, the total consumption of that resource increases rather than decreases.

In other words, since vibe coding reduces the cost of small applications to near $0, any company that has a need for software solutions (which includes all industrial companies), should see their consumption of code skyrocket. Simply put, if your company isn’t internally writing *thousands* of disposable scripts to kill friction, you will be outmaneuvered by companies who do.

## 3. Implementation: Return of the “Embedded Toolmaker”

To understand how to effectively deploy vibe coding tools to your operational staff, we must first understand how 20th century vibe coding tools are successfully deployed.

Traditional industrial factories have assembly lines, but they also have machine shops. If a critical part breaks on the line, the line isn’t shut down for 6 months while consultants are called in and a comprehensive review of suppliers for the broken part commences. Similarly, if a non-critical (but helpful) part breaks, the line operators don’t throw up their hands and permanently substitute in an inefficient workaround. In both cases the machinists in the factory’s machine shop quickly fabricate a new part, and the broken part is replaced within a day.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/images/industrial-ops-ai-2.jpg" alt="The original Embedded Toolmaker" style="max-width: 80%; height: auto; margin: 0 auto; display: block;" />
  <p style="font-style: italic; color: #666; margin-top: 0.5rem;">
    The original Embedded Toolmaker: Solving physical bottlenecks with local&nbsp;agency. 
    <a href="https://www.rawpixel.com/image/12240181/photo-image-plant-person-space" target="_blank" style="text-decoration: underline;">Source</a>
  </p>
</div>

In the modern version, the machining equipment is the vibe coding tools, and the machinists are empowered operations personnel within the company. To implement vibe coding effectively, every department within the company needs a “designated toolmaker.” Designated toolmakers will serve as vibe coding domain experts who host hackathons, encourage vibe coding adoption within their department, and help others debug their prompts and software. Additionally, designated toolmakers will collaborate with other toolmakers throughout the company to share best practices and drive improved infrastructure to support vibe coding.

## 4. Infrastructure and Governance

The idea of thousands of non-specialized ops workers deploying code on company machines is understandably concerning for CIOs. However, information security can be maintained with some basic guardrails:

1.  **Security training is critical**  
    Non safety trained operators aren’t permitted to run a CNC machine. Similarly, don’t let them run a Python script without digital PPE training.
2.  **Read only is king**  
    Give your security trained personnel read only access to internal APIs. Don’t expose PII, but err on the side of too little secrecy rather than too much. Security through obscurity (hiding the data) is obsolete. Security through identity (knowing who accessed the data) is the modern standard. Give them the keys, but log every time they open the door.
3.  **Git is the SOP**  
    Vibe coding helpful software is great, at least until a prolific coder leaves the company or some malformed prompts wipe out the functionality of useful apps. To protect against this, all completed and useful software must be committed to the company’s internal “git for vibe-coding.” This way, unintended changes can be rolled back, critical code bases don’t live on one person’s machine, and users across the company can discover and adapt other’s vibe coded software.
4.  **Disposable software is the norm**  
    Normalize the idea of “single use code”. A script that’s used for a week to solve a specific crunch time bottleneck is valuable, even if its deleted later. Single use software has a far better security risk profile than a permanent monolithic vibe coded service.

## 5. The Era of the High Agency Operator

The "Spreadsheet Jockey" is obsolete. They build static models of the world to explain why things happened. The High Agency Operator builds tools to *control* what happens next.

In the American Dynamism ecosystem, speed is the only real moat. If you’re waiting for a ticket to close, you’re losing. We don't need more bureaucrats shuffling around backlogs; we need Operators who can close their own ticket.

The tools are here. The permission is yours. Pick up the tool, write the script, and clear the bottleneck.