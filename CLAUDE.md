# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev        # Start Vite development server
npm run build      # TypeScript compilation + Vite build  
npm run lint       # ESLint code analysis
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once and exit
npm run preview    # Preview production build
```

## Project Architecture

The **Synchronicity Engine** is a decentralized attention and gratitude tracking system built on OrbitDB and IPFS. The core architecture consists of:

### Core Engine (`src/lib/synchronicity-engine.ts`)
- **Attention Management**: Intention setting, attention switching, blessing lifecycle
- **Time Calculation**: Duration tracking, token tree calculations, gratitude potential
- **Service Exchange**: Proof-of-service posting, blessing transfers, token attachments
- **Marketplace Operations**: Offering creation, token-based bidding, automated winner selection

### Data Models (`src/lib/types.ts`)
- **IntentionDoc**: Work requests with blessing tracking and attention duration
- **BlessingDoc**: Time-based gratitude tokens with hierarchical parent-child relationships
- **AttentionSwitch**: Immutable attention transition logs
- **OfferingDoc**: Limited-slot opportunities with token bidding mechanics
- **ProofDoc**: Service validation triggering blessing assignment

### Database Layer
- **OrbitDB Liftoff**: Simplified distributed database management
- **Multiple Database Types**: Documents (structured data) and Events (append-only logs)
- **IPFS Backend**: Content-addressed storage using Helia
- **Test Isolation**: Fresh database instances per test with automatic cleanup

## Testing Patterns

- **Extended timeouts** (30 seconds) for IPFS operations
- **Node environment** for OrbitDB functionality
- **Cleanup automation** using rimraf for test databases
- Tests cover OrbitDB integration, core engine functions, marketplace operations, and gratitude calculations

## Technology Stack

- **Frontend**: React 19 with TypeScript, Vite for development
- **Backend**: OrbitDB with IPFS/Helia for decentralized data
- **Build**: TypeScript (strict mode), ESLint with React plugins
- **Distribution**: Electron-ready with electron-builder configuration

## Key Development Notes

- **Database-first architecture**: All state management through OrbitDB
- **Functional programming patterns**: Pure functions with managed side effects
- **Immutable operations**: Database updates create new states rather than mutations
- **Three-tier TypeScript setup**: Separate configs for app, tests, and Node tooling
- **Modern ES modules**: ES2022+ target throughout the codebase