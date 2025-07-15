# Synchronicity Engine UI Style Guide

*Distilled from app-v3 implementation - preserved for v4 rebuild*

## 🎨 **Color Palette**

### **Primary Colors**
```css
--primary-gold: #D4AF37;        /* Main accent - buttons, borders, text */
--secondary-gold: #E6C565;      /* Secondary accent - lighter gold */
--accent-green: #00FF88;        /* Success states, hover effects */
--accent-blue: #32CD32;         /* Status indicators, active states */
--accent-yellow: #FFD700;       /* Notifications, warnings */
```

### **Background System**
```css
/* Main background - complex gradient system */
background: radial-gradient(circle at 20% 30%, #1A2E17 0%, #0D1F0A 40%),
            radial-gradient(circle at 80% 70%, #0F1A0C 0%, #0D1F0A 50%),
            linear-gradient(135deg, #0D1F0A 0%, #1A2E17 50%, #0F1A0C 100%);

/* Panel backgrounds */
--panel-bg: rgba(0, 0, 0, 0.4);
--panel-border: 2px solid #D4AF37;
--panel-shadow: 0 0 10px rgba(255, 242, 0, 0.25), 
                0 0 20px rgba(212, 175, 55, 0.19),
                inset 0 0 10px rgba(212, 175, 55, 0.13);
```

### **Text Colors**
```css
--text-primary: #FFFFFF;        /* Main text */
--text-secondary: #E6C565;      /* Secondary text */
--text-accent: #D4AF37;         /* Accent text */
--text-muted: #C0C0C0;         /* Muted text */
```

## 🏗️ **Layout System**

### **Dashboard Structure**
```css
/* Main layout: 77% content + 22% sidebar */
.dashboard {
    min-height: 100vh;
    display: flex;
    overflow-x: hidden;
}

.main-section {
    width: 77%;
    position: relative;
}

.tokens-sidebar {
    width: 22%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}
```

### **Header System**
```css
.header {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px 24px;
    position: relative;
}

.header-title {
    font-size: 1.8rem;
    font-weight: 300;
    background: linear-gradient(45deg, #D4AF37, #E6C565);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
```

### **Content Grid**
```css
.content-area {
    display: flex;
    min-height: calc(100vh - 80px);
    padding: 20px 24px;
    gap: 16px;
    overflow-y: auto;
}

.column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
}
```

## 🎯 **Component Styles**

### **Panel System**
```css
.panel {
    border-radius: 16px;
    padding: 24px;
    background-color: rgba(0, 0, 0, 0.4);
    border: 2px solid #D4AF37;
    box-shadow: 0 0 10px rgba(255, 242, 0, 0.25),
                0 0 20px rgba(212, 175, 55, 0.19),
                inset 0 0 10px rgba(212, 175, 55, 0.13);
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.panel-header {
    font-size: 1.25rem;
    font-weight: 600;
    color: #D4AF37;
    margin-bottom: 16px;
}
```

### **Button System**
```css
/* Primary button */
.primary-button {
    padding: 8px 16px;
    background: rgba(212, 175, 55, 0.2);
    border: 1px solid #D4AF37;
    border-radius: 6px;
    color: #D4AF37;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.3s ease;
}

.primary-button:hover {
    background: rgba(212, 175, 55, 0.3);
    border-color: #E6C565;
}

/* Success button */
.success-button {
    background: rgba(50, 205, 50, 0.2);
    border: 1px solid #32CD32;
    color: #32CD32;
}
```

### **Input System**
```css
.form-input {
    width: 100%;
    padding: 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #D4AF37;
    border-radius: 8px;
    color: #E6C565;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.form-input:focus {
    outline: none;
    border-color: #E6C565;
    box-shadow: 0 0 8px rgba(212, 175, 55, 0.4);
}

.form-input::placeholder {
    color: rgba(230, 197, 101, 0.6);
}
```

## 🪙 **Token Visual System**

### **Token Physics**
```javascript
// Size calculation (logarithmic scaling)
const minSize = 30;
const maxSize = 80;
const minDuration = 60000; // 1 minute
const maxDuration = 86400000; // 24 hours

const logMin = Math.log(minDuration);
const logMax = Math.log(maxDuration);
const logDuration = Math.log(safeDurationMs);
const sizeRatio = (logDuration - logMin) / (logMax - logMin);
const size = Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * sizeRatio));
```

### **Token Color System**
```javascript
// Color progression: blue (short) -> green -> yellow -> orange -> red (long)
const colorStops = [
    { r: 100, g: 150, b: 255 }, // Light blue (short duration)
    { r: 100, g: 255, b: 150 }, // Light green
    { r: 230, g: 197, b: 101 }, // Golden yellow (original color)
    { r: 255, g: 165, b: 50 },  // Orange
    { r: 255, g: 100, b: 100 }  // Light red (long duration)
];
```

### **Token Styling**
```css
.token-circle {
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, ${colors.light}, ${colors.dark});
    border: 3px solid ${colors.border};
    box-shadow: 0 4px 12px ${colors.shadow};
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    user-select: none;
}

.token-circle:hover {
    transform: scale(1.1);
    filter: brightness(1.2) saturate(1.1);
}

.token-circle:active {
    transform: scale(0.95);
}
```

## 🎭 **Animation System**

### **Transitions**
```css
/* Standard transition */
transition: all 0.3s ease;

/* Hover effects */
:hover {
    transform: scale(1.05);
    filter: brightness(1.1);
}

/* Active states */
:active {
    transform: scale(0.95);
}
```

### **Pulse Animations**
```css
@keyframes pulse-green {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes pulse-gold {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes ping {
    75%, 100% {
        transform: scale(2);
        opacity: 0;
    }
}
```

## 🎨 **Modal System**

### **Modal Structure**
```css
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 1000;
    justify-content: center;
    align-items: center;
}

.modal-content {
    background: rgba(13, 31, 10, 0.95);
    border: 2px solid #D4AF37;
    border-radius: 16px;
    padding: 32px;
    max-width: 600px;
    width: 90%;
    backdrop-filter: blur(10px);
    box-shadow: 0 0 24px rgba(212, 175, 55, 0.3);
}
```

## 🖱️ **Drag & Drop Visual States**

### **Drag States**
```css
.dragging {
    opacity: 0.5;
    transform: scale(1.1);
    z-index: 1000;
}

.drag-over {
    border: 3px dashed rgba(0, 255, 136, 0.8);
    background-color: rgba(0, 255, 136, 0.1);
    transform: scale(1.02);
}
```

### **Drop Zone Feedback**
```css
.drop-zone-active {
    background: rgba(0, 255, 136, 0.1);
    border: 2px dashed rgba(0, 255, 136, 0.5);
    border-radius: 12px;
}
```

## 📱 **Typography System**

### **Font Stack**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### **Font Scales**
```css
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-base { font-size: 1rem; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-2xl { font-size: 1.5rem; }
.text-3xl { font-size: 1.875rem; }
```

### **Font Weights**
```css
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

## 🎯 **Key Design Principles**

### **1. Organic Forest Theme**
- Dark green backgrounds with golden accents
- Radial gradients for depth and warmth
- Soft shadows and glows for mystical feel

### **2. Token-Centric Design**
- Tokens are the primary interactive elements
- Size represents attention/time investment
- Color represents duration (temporal progression)
- Drag-and-drop as primary interaction method

### **3. Minimal Chrome**
- Focus on content, not interface
- Clean typography hierarchy
- Subtle animations and transitions
- Consistent spacing and rhythm

### **4. Responsive Physics**
- Tokens scale based on content significance
- Hover states provide immediate feedback
- Drag states maintain visual continuity
- Drop zones provide clear targets

---

*This style guide preserves the essential visual language of the Synchronicity Engine for consistent implementation in future versions.*