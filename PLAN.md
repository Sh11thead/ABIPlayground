# ABI Playground 2.0 Upgrade Plan

This document outlines the roadmap for improving the UI/UX and functionality of the ABI Playground.

## Phase 1: Core Structure & Preset Library (High Priority)
**Goal**: Improve usability by restructuring the layout and adding essential contract templates.

- [x] **Refactor Layout**:
    - Switch to a **Two-Column Layout**:
        - **Left Sidebar**: Function list (grouped by Read/Write, with search/filter).
        - **Right Panel**: Interaction area (Selected function details, params form, execution result/logs).
    - Improve mobile responsiveness for the new layout.
- [x] **Expand Preset ABI Library**:
    - Add a "Load Template" feature to quickly select standard ABIs.
    - **Add Templates**:
        - **ERC20** (Existing, enhance with `permit`, `burn`).
        - **WETH / Wrapped Token** (`deposit`, `withdraw`).
        - **ERC721** (NFT Standard).
- [x] **Input Component Enhancements**:
    - **Boolean**: Use Switch/Checkbox instead of text input.
    - **Address**: Basic validation and formatting.
    - **Amount (uint)**: Add helper to toggle between Raw (Wei) and Formatted (Ether) input? (Maybe Phase 2).

## Phase 2: Intelligence & History (Medium Priority)
**Goal**: Reduce repetitive manual entry and make the tool smarter.

- [x] **Address Book / History**:
    - Auto-save recently used contract addresses and ABIs to `localStorage`.
    - Allow users to assign aliases to addresses (e.g., "Monad WETH").
- [x] **Smart Inputs**:
    - **Address Input**: Dropdown to select from "My Wallet" or "History".
    - **Unit Converter**: Helper for `uint256` to convert ETH <-> Wei.
    - **Boolean**: Use Switch/Checkbox instead of text input.
- [ ] **Explorer Integration (Optional/Advanced)**:
    - Fetch ABI automatically from Etherscan/Explorer API given an address.

## Phase 3: Visual Polish & Advanced Features (Low Priority)
**Goal**: Make it look professional and support power-user features.

- [x] **Visual Redesign**:
    - Modern UI components (Tailwind or custom CSS polish).
    - Dark Mode support.
    - Better loading states and toast notifications for transactions.
- [x] **Event Logs**:
    - Tab to view real-time contract events/logs.
- [x] **Transaction Simulation**:
    - Simulate transactions before sending to check for reverts.
