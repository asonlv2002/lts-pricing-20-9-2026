# Calculator Layout Analysis
**Project:** PhanMemBaoBi  
**Date:** April 2026  
**Status:** Complete Layout Documentation

---

## 1. LAYOUT STRUCTURE OVERVIEW

### Current Two-Panel Layout (Default Mode)
The main calculator page uses a **CSS Grid-based side-by-side layout** with:
- **LEFT PANEL:** Input Form (fixed width)
- **RIGHT PANEL:** Results/Manager View (flexible, takes remaining space)
- **GAP:** 20px spacing between panels

---

## 2. PRIMARY CSS CLASS DEFINITIONS

### `main-grid` (Core Grid Container)
**File:** `src/app/globals.css` (Line 167)

```css
.main-grid { 
  display: grid; 
  grid-template-columns: 300px 1fr;
  gap: 20px;
  align-items: start;
}
```

**What it does:**
- Creates a **2-column grid layout**
- Column 1 (LEFT): **Exactly 300px** for the input form
- Column 2 (RIGHT): **Flexible (1fr)** - grows to fill remaining space
- Gap of **20px** between the two columns
- align-items: start keeps both panels aligned to the top

---

## 3. GRID COLUMN CHILDREN

### HTML Structure (from src/app/page.tsx lines 236-246)
```
grid-col-input (LEFT): Contains InputCard
grid-col-result (RIGHT, id=resultArea): Contains ManagerView + TechView
```

### Desktop Scrolling Setup
- Body: overflow hidden (no page scroll)
- Each column: height calc(100vh - 104px), overflow-y auto
- Input scrollbar: hidden (still scrolls)
- Results scrollbar: visible thin 6px gray

---

## 4. MANAGER LAYOUT CLASSES

### manager-content Class
**File:** globals.css Line 1290

```css
.manager-content { padding-right: 180px; }

@media (max-width: 1200px) {
  .manager-content { padding-right: 0; }
}
```

Reserves 180px on right for side Table of Contents (TOC)

---

## 5. LAYOUT VARIANTS

| Layout Type | Grid Template | Note |
|------------|---------------|------|
| default | 300px 1fr | Side-by-side |
| stacked | 1fr (single column) | Vertical stack, max-width 800px |
| wide | 260px 1fr | Narrower input panel |
| bento | 1fr grid 6col | Input hidden, tile layout |

---

## 6. MOBILE BEHAVIOR (≤1100px)

### Bottom Tab Navigation
- Two tabs: "Input" and "Results"
- Only one shown at a time
- Fixed bottom bar, 64px height
- Active tab: accent color + underline
- Grid columns hidden/shown via display: none

---

## 7. EXACT CLASS HIERARCHY

```
.container (width 100%, padding 20px)
  .mobile-calc-container (padding-bottom 80px on mobile)
    .main-grid (display: grid; grid-template-columns: 300px 1fr)
      .grid-col-input (column 1, 300px)
        InputCard
      #resultArea .grid-col-result (column 2, 1fr flex)
        ManagerView
        TechView
    .mobile-calc-nav (fixed bottom ≤1100px)
      .m-tab buttons
```

---

## 8. KEY CSS RULES SUMMARY

### Main Grid
- 2-column grid: 300px (left input) + 1fr (right results)
- 20px gap between
- Desktop: each column height=calc(100vh-104px), scroll independently
- Mobile: hide inactive column via display:none

### Input Panel (grid-col-input)
- Width: 300px on default layout
- Scrollbar: hidden
- Mobile: shown/hidden with .active class

### Results Panel (#resultArea, grid-col-result)
- Width: flexible 1fr
- Scrollbar: thin 6px gray
- Mobile: shown/hidden with .active class

### Manager Content
- Padding-right: 180px (desktop ≥1200px)
- Padding-right: 0 (mobile ≤1200px)
- TOC repositioned inline on smaller screens

---

## 9. STATE CONTROL

Data attributes control layout:
- data-theme: light|dark
- data-layout: default|stacked|wide|bento
- data-density: compact|comfortable|spacious
- in-config-page class: shown in config view

Mobile state:
- mobileTab: 'input'|'result' (React state)
- Passed to grid-col-input/result via .active class

---

## 10. RESPONSIVE BREAKPOINTS

| Width | Behavior |
|-------|----------|
| > 1200px | TOC positioned absolute, manager-content padding-right 180px |
| 801-1200px | TOC inline, manager-content padding 0 |
| ≤ 1100px | Mobile tabs, grid columns tab-switch |
| ≤ 801px | Body scroll enabled, columns auto height |

