# Design System: SRS Master Station Map View
**Project ID:** 15950452266482822870

## 1. Visual Theme & Atmosphere
A sophisticated, modern, and dark-themed analytics dashboard interface. The atmosphere is highly technical yet clean, prioritizing data density and clarity. It feels utilitarian, crisp, and futuristic, perfectly suited for monitoring stations, network alarms, and trip logs.

## 2. Color Palette & Roles
*   **Electric Cobalt Blue** (`#137fec`): Used for primary actions, active navigation states, selected items, and important data highlights.
*   **Deep Obsidian Black** (e.g., `#09090b`): Used for the main application background to provide a harsh-free dark mode experience.
*   **Charcoal Slate** (e.g., `#18181b` | `#27272a`): Used for card backgrounds, sidebar navigation, and elevated container elements.
*   **Muted Zinc** (e.g., `#a1a1aa`): Used for secondary text, metadata, and borders.
*   **Crisp White** (`#ffffff`): Used for primary text and high-contrast numerical values.

## 3. Typography Rules
*   **Font Family**: `Inter`. Clean, highly legible sans-serif optimal for data-heavy applications.
*   **Headers**: Typically medium to semibold weights. Sharp, structured contrast against the dark background.
*   **Body Text**: Regular weight, often displayed in muted zinc or white depending on importance.
*   **Numbers & Data**: Tabular or highly legible formatting.

## 4. Component Stylings
*   **Buttons**: Medium rounded corners (8px / `ROUND_EIGHT`). Primary buttons use Electric Cobalt Blue (`#137fec`). Secondary buttons use a dark charcoal background with a light border.
*   **Cards/Containers**: Subtly rounded corners (8px). Backgrounds are usually Charcoal Slate to create subtle elevation against the Obsidian background. Borders are thin and subtle (`#27272a`).
*   **Inputs/Forms**: Sharp, structured rectangles with 8px corner radii. Transparent or dark backgrounds with muted zinc borders. Focus states use the Electric Cobalt Blue ring.

## 5. Layout Principles
*   **Sidebar Navigation**: A fixed left-hand sidebar for global navigation.
*   **Top Bar**: A consistent top header for page titles, user profile, and global actions.
*   **Grid Alignment**: Highly structured grid layouts, snapping charts and tables into well-defined card containers with consistent whitespace (typically 16px to 24px padding).
*   **Data Tables**: Extensive use of full-width data tables inside card containers, featuring clear zebra striping or subtle border separators.
