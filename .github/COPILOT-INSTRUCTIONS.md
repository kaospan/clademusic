# GitHub Code Quality Copilot Instructions

- Check the x.md file for current file contents and implementations.
- Make changes file by file to allow for review.
- Never use apologies in responses.
- Do not show or discuss the current implementation unless specifically requested.
- Do not ask the user to verify implementations visible in the provided context.
- Do not invent changes beyond what is explicitly requested.
- Do not consider previous x.md files in memory; treat each run independently.
- Do not summarize changes made.
- Avoid giving feedback about understanding in comments or documentation.
- Do not ask for confirmation of information already provided in the context.
- Do not suggest updates or changes to files when there are no actual modifications needed.
- Do not suggest whitespace changes.
- Do not remove unrelated code or functionalities; preserve existing structures.
- Always provide links to real files, not x.md.
- Provide all edits for a file in a single chunk, not in multiple steps.
# COPILOT EDITS OPERATIONAL GUIDELINES
                
## PRIME DIRECTIVE
	Avoid working on more than one file at a time.
	Multiple simultaneous edits to a file will cause corruption.
	Be chatting and teach about what you are doing while coding.

## LARGE FILE & COMPLEX CHANGE PROTOCOL

### MANDATORY PLANNING PHASE
	When working with large files (>300 lines) or complex changes:
		1. ALWAYS start by creating a detailed plan BEFORE making any edits
            2. Your plan MUST include:
                   - All functions/sections that need modification
                   - The order in which changes should be applied
                   - Dependencies between changes
                   - Estimated number of separate edits required
                
            3. Format your plan as:
## PROPOSED EDIT PLAN
	Working with: [filename]
	Total planned edits: [number]

### MAKING EDITS
	- Focus on one conceptual change at a time
	- Show clear "before" and "after" snippets when proposing changes
	- Include concise explanations of what changed and why
	- Always check if the edit maintains the project's coding style

### Edit sequence:
	1. [First specific change] - Purpose: [why]
	2. [Second specific change] - Purpose: [why]
	3. Do you approve this plan? I'll proceed with Edit [number] after your confirmation.
	4. WAIT for explicit user confirmation before making ANY edits when user ok edit [number]
            
### EXECUTION PHASE
	- After each individual edit, clearly indicate progress:
		"✅ Completed edit [#] of [total]. Ready for next edit?"
	- If you discover additional needed changes during editing:
	- STOP and update the plan
	- Get approval before continuing
                
### REFACTORING GUIDANCE
	When refactoring large files:
	- Break work into logical, independently functional chunks
	- Ensure each intermediate state maintains functionality
	- Consider temporary duplication as a valid interim step
	- Always indicate the refactoring pattern being applied
                
### RATE LIMIT AVOIDANCE
	- For very large files, suggest splitting changes across multiple sessions
	- Prioritize changes that are logically complete units
	- Always provide clear stopping points
            
## General Requirements
	Use modern technologies as described below for all code suggestions. Prioritize clean, maintainable code with appropriate comments.
            
### Accessibility
	- Ensure compliance with **WCAG 2.1** AA level minimum, AAA whenever feasible.
	- Always suggest:
	- Labels for form fields.
	- Proper **ARIA** roles and attributes.
	- Adequate color contrast.
	- Alternative texts (`alt`, `aria-label`) for media elements.
	- Semantic HTML for clear structure.
	- Tools like **Lighthouse** for audits.
        
## Browser Compatibility
	- Prioritize feature detection (`if ('fetch' in window)` etc.).
        - Support latest two stable releases of major browsers:
	- Firefox, Chrome, Edge, Safari (macOS/iOS)
        - Emphasize progressive enhancement with polyfills or bundlers (e.g., **Babel**, **Vite**) as needed.
            
## PHP Requirements
	- **Target Version**: PHP 8.1 or higher
	- **Features to Use**:
	- Named arguments
	- Constructor property promotion
	- Union types and nullable types
	- Match expressions
	- Nullsafe operator (`?->`)
	- Attributes instead of annotations
	- Typed properties with appropriate type declarations
	- Return type declarations
	- Enumerations (`enum`)
	- Readonly properties
	- Emphasize strict property typing in all generated code.
	- **Coding Standards**:
	- Follow PSR-12 coding standards
	- Use strict typing with `declare(strict_types=1);`
	- Prefer composition over inheritance
	- Use dependency injection
	- **Static Analysis:**
	- Include PHPDoc blocks compatible with PHPStan or Psalm for static analysis
	- **Error Handling:**
	- Use exceptions consistently for error handling and avoid suppressing errors.
	- Provide meaningful, clear exception messages and proper exception types.
            
## HTML/CSS Requirements
	- **HTML**:
	- Use HTML5 semantic elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<search>`, etc.)
	- Include appropriate ARIA attributes for accessibility
	- Ensure valid markup that passes W3C validation
	- Use responsive design practices
	- Optimize images using modern formats (`WebP`, `AVIF`)
	- Include `loading="lazy"` on images where applicable
	- Generate `srcset` and `sizes` attributes for responsive images when relevant
	- Prioritize SEO-friendly elements (`<title>`, `<meta description>`, Open Graph tags)
            
	- **CSS**:
	- Use modern CSS features including:
	- CSS Grid and Flexbox for layouts
	- CSS Custom Properties (variables)
	- CSS animations and transitions
	- Media queries for responsive design
	- Logical properties (`margin-inline`, `padding-block`, etc.)
	- Modern selectors (`:is()`, `:where()`, `:has()`)
	- Follow BEM or similar methodology for class naming
	- Use CSS nesting where appropriate
	- Include dark mode support with `prefers-color-scheme`
	- Prioritize modern, performant fonts and variable fonts for smaller file sizes
	- Use modern units (`rem`, `vh`, `vw`) instead of traditional pixels (`px`) for better responsiveness
            
## JavaScript Requirements
		    
	- **Minimum Compatibility**: ECMAScript 2020 (ES11) or higher
	- **Features to Use**:
	- Arrow functions
	- Template literals
	- Destructuring assignment
	- Spread/rest operators
	- Async/await for asynchronous code
	- Classes with proper inheritance when OOP is needed
	- Object shorthand notation
	- Optional chaining (`?.`)
	- Nullish coalescing (`??`)
	- Dynamic imports
	- BigInt for large integers
	- `Promise.allSettled()`
	- `String.prototype.matchAll()`
	- `globalThis` object
	- Private class fields and methods
	- Export * as namespace syntax
	- Array methods (`map`, `filter`, `reduce`, `flatMap`, etc.)
	- **Avoid**:
	- `var` keyword (use `const` and `let`)
	- jQuery or any external libraries
	- Callback-based asynchronous patterns when promises can be used
	- Internet Explorer compatibility
	- Legacy module formats (use ES modules)
	- Limit use of `eval()` due to security risks
	- **Performance Considerations:**
	- Recommend code splitting and dynamic imports for lazy loading
	**Error Handling**:
	- Use `try-catch` blocks **consistently** for asynchronous and API calls, and handle promise rejections explicitly.
	- Differentiate among:
	- **Network errors** (e.g., timeouts, server errors, rate-limiting)
	- **Functional/business logic errors** (logical missteps, invalid user input, validation failures)
	- **Runtime exceptions** (unexpected errors such as null references)
	- Provide **user-friendly** error messages (e.g., “Something went wrong. Please try again shortly.”) and log more technical details to dev/ops (e.g., via a logging service).
	- Consider a central error handler function or global event (e.g., `window.addEventListener('unhandledrejection')`) to consolidate reporting.
	- Carefully handle and validate JSON responses, incorrect HTTP status codes, etc.
            
## Folder Structure
	Follow this structured directory layout:

		project-root/
		├── api/                  # API handlers and routes
		├── config/               # Configuration files and environment variables
		├── data/                 # Databases, JSON files, and other storage
		├── public/               # Publicly accessible files (served by web server)
		│   ├── assets/
		│   │   ├── css/
		│   │   ├── js/
		│   │   ├── images/
		│   │   ├── fonts/
		│   └── index.html
		├── src/                  # Application source code
		│   ├── controllers/
		│   ├── models/
		│   ├── views/
		│   └── utilities/
		├── tests/                # Unit and integration tests
		├── docs/                 # Documentation (Markdown files)
		├── logs/                 # Server and application logs
		├── scripts/              # Scripts for deployment, setup, etc.
		└── temp/                 # Temporary/cache files


## Documentation Requirements
	- Include JSDoc comments for JavaScript/TypeScript.
	- Document complex functions with clear examples.
	- Maintain concise Markdown documentation.
	- Minimum docblock info: `param`, `return`, `throws`, `author`
    
## Database Requirements (SQLite 3.46+)
	- Leverage JSON columns, generated columns, strict mode, foreign keys, check constraints, and transactions.
    
## Security Considerations
	- Sanitize all user inputs thoroughly.
	- Parameterize database queries.
	- Enforce strong Content Security Policies (CSP).
	- Use CSRF protection where applicable.
	- Ensure secure cookies (`HttpOnly`, `Secure`, `SameSite=Strict`).
	- Limit privileges and enforce role-based access control.
	- Implement detailed internal logging and monitoring.

  # Extracted from README.md

# React TypeScript Next.js Node.js  prompt file

Author: Gabo Esquivel

## What you can build
Decentralized Finance Dashboard: Create a web app using Next.js 14 App Router and Wagmi v2 for aggregating and displaying DeFi related data such as token prices, liquidity pools, and yield farming opportunities. Use TypeScript interfaces for data modeling and Tailwind CSS for a responsive design.NFT Minting Platform: Develop a platform using Solidity for smart contract development, TypeScript for front-end logic, and Next.js for the server-side rendering of NFTs. Integrate Shadcn UI and Tailwind Aria for elegant UI components.Real-time Cryptocurrency Portfolio Tracker: Build a React application that uses the Viem v2 library for interacting with blockchain data in real-time. Use Next.js and functional components to render user portfolios dynamically, with responsiveness handled by Radix UI components.Decentralized Voting Application: Implement a secure voting system using Solidity for the backend logic and TypeScript with Next.js for the frontend. Use Zod for form input validation and ensure error resilience with custom error types.Smart Contract IDE Plugin: Create a Node.js-based plugin for IDEs that supports Solidity development, offering features like syntax highlighting and auto-completion. Use TypeScript for robust type checking and rely on modularization for code maintainability.Blockchain-based Supply Chain Management System: Design a fault-tolerant supply chain solution using Solidity for smart contract management, TypeScript for interfacing, and Next.js for presenting supply chain data to users in real-time, leveraging Tailwind CSS for effortless styling.Educational Platform for Web3 Developers: Build an interactive platform using Next.js and Vite to teach Web3 development, featuring courses on Solidity, smart contract development, and blockchain integration. Use React components for interactivity and a mobile-first design approach.DAO Management Interface: Develop a Decentralized Autonomous Organization (DAO) management app using Wagmi v2 and Solidity, hosted on a server-less architecture using Next.js. Employ Aria UI for accessibility and seamless user interaction.Crowdfunding Platform on Ethereum: Create a crowdfunding platform using TypeScript, with smart contract logic written in Solidity. Implement authentication and payment interfaces using React functional components and Radix UI for structure and style.Crypto Wallet Integration Library: Offer a library using Node.js and TypeScript to simplify the integration of cryptocurrency wallets into web apps. Embrace functional programming and export components for extensibility and ease of integration.

## Benefits


## Synopsis
Developers working on Next.js projects can use this prompt to build modular, type-safe applications with efficient error handling and optimized component structures.

## Overview of  prompt
The  file provides guidelines for developers specializing in technologies such as Solidity, TypeScript, Node.js, and React. It emphasizes writing concise and technical responses using accurate TypeScript examples while promoting functional and declarative programming styles. Key principles include favoring modularization over duplication, using descriptive variable names, and preferring named exports for components. The file outlines specific practices for JavaScript and TypeScript, such as using the "function" keyword for pure functions, leveraging TypeScript interfaces, and prioritizing error handling. It stipulates dependencies like Next.js 14, Wagmi v2, and Viem v2, and offers guidance on using React/Next.js with a focus on functional components, responsive design, and efficient error management. Additionally, it provides conventions for using server actions, data handling, and maintaining performance priorities like Web Vitals.

