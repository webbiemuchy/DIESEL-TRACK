# 🚜 DIESEL-TRACK
### Fleet Fuel Management & Analytics System

![Version](https://img.shields.io/badge/version-4.0-yellow.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-green.svg)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Screenshots](#screenshots)
4. [Installation](#installation)
5. [File Structure](#file-structure)
6. [Usage Guide](#usage-guide)
7. [Technical Documentation](#technical-documentation)
8. [Data Management](#data-management)
9. [Troubleshooting](#troubleshooting)
10. [Security & Privacy](#security--privacy)
11. [Browser Compatibility](#browser-compatibility)
12. [Contributing](#contributing)
13. [License](#license)
14. [Support](#support)

---

## 🎯 Overview

**Diesel-Track** is a comprehensive, browser-based fleet fuel management system designed for tracking heavy machinery diesel consumption, detecting fuel anomalies, and providing detailed analytics for fleet operations.

### **What It Does:**
- Tracks fuel consumption for multiple machines and operators
- Detects fuel usage anomalies automatically
- Generates visual analytics and trends
- Exports detailed Excel reports
- Manages fleet assets and operator records
- Provides backup/restore capabilities

### **Who It's For:**
- Construction companies
- Mining operations
- Agriculture/farming operations
- Transportation fleets
- Any business managing diesel-powered equipment

### **Key Benefits:**
- ✅ **No Server Required** - Runs entirely in the browser
- ✅ **No Internet Required** - Works completely offline
- ✅ **No Installation** - Just open the HTML file
- ✅ **Privacy First** - All data stays on your computer
- ✅ **Free & Open Source** - No licensing fees

---

## ✨ Features

### **Core Functionality**

#### 1. **Refueling Management**
- Log fuel refills with machine, operator, usage hours, and fuel amount
- Real-time variance calculation (actual vs expected consumption)
- Automatic anomaly detection based on configurable thresholds
- Tank capacity overflow warnings
- Complete activity history with timestamps

#### 2. **Fleet Asset Management**
- Add/remove machines with unique IDs
- Track machine models and specifications
- Set consumption rates (L/hour or L/km)
- Define tank capacities for overflow detection
- Prevent duplicate machine IDs

#### 3. **Operator Management**
- Register operators with names and badge numbers
- Track which operator used which machine
- Individual operator performance analytics
- Quick operator lookup and filtering

#### 4. **Analytics & Visualization**
- **Overall Fleet Trend**: Line chart showing total fuel consumption over time
- **Machine Performance**: Bar chart filtered by specific machines
- **Operator Performance**: Bar chart filtered by specific operators
- Hover tooltips showing detailed information
- Machine and operator labels on all data points
- Last 20 entries visualized by default

#### 5. **Anomaly Detection**
- Configurable tolerance threshold (default: 10%)
- Automatic flagging of unusual fuel consumption
- Visual indicators (badges: OK, ANOMALY, OVER TANK)
- Status counter showing total anomalies
- Color-coded variance display

#### 6. **Data Import/Export**

**Export Features:**
- Multi-sheet Excel workbooks (.xlsx)
- Sheets: Refuel Logs, Machines, Operators
- Calculated fields (expected fuel, variance, status)
- Timestamped filenames
- One-click export

**Import Features:**
- Import machines and operators from Excel
- Automatic data validation
- Duplicate detection
- Import summary notifications

#### 7. **Backup & Restore System**

**Automatic Backups:**
- Auto-save every 5 minutes to LocalStorage
- Silent background operation
- Includes all data: machines, operators, logs, settings

**Manual Backups:**
- Create backup on demand
- Download backup as JSON file
- Upload backup files for restore
- Backup status display (last backup time, file size)

**Restore Options:**
- Restore from browser LocalStorage
- Restore from uploaded JSON file
- Confirmation dialogs prevent accidents

#### 8. **Notification System**
- **Success** (green): Confirms completed actions
- **Error** (red): Shows validation failures
- **Warning** (orange): Alerts about potential issues
- **Info** (blue): System status messages
- Auto-dismiss after 4 seconds
- Manual close option

#### 9. **Confirmation Dialogs**
- Prevents accidental deletions
- Confirms dangerous operations
- Clear cancel/confirm options
- Modal overlay design

#### 10. **Settings & Configuration**
- Adjustable anomaly detection threshold (0-100%)
- System information dashboard
- Data management tools
- Reset/wipe database option

---

## 📸 Screenshots

### Main Interface
```
┌─────────────────────────────────────────────────────────┐
│ 🚜 Diesel-Track                                         │
│ [Refueling] [Fleet Assets] [Operators] [Analytics] [⚙] │
│                                    [45 LOGS | 3 ANOMALY]│
└─────────────────────────────────────────────────────────┘

New Refueling Entry
┌──────────────────────────────────────────────────────────┐
│ [Select Machine ▾] [Select Operator ▾]                  │
│ [Hours/KM Work    ] [Liters Refilled  ] [LOG ENTRY]     │
└──────────────────────────────────────────────────────────┘

Activity History
┌──────────────────────────────────────────────────────────┐
│ Date          Machine  Operator  Usage  Fuel  Var  Status│
│ 1/8/26 10:30  EX-001   John      8.5h   132L  +1  [OK]  │
│ 1/8/26 09:15  BH-003   Sarah     6.2h   145L  +23 [⚠️]  │
└──────────────────────────────────────────────────────────┘
```

### Analytics Dashboard
```
┌────────────────────────────────────────────────────────┐
│ Overall Fleet Trend                                    │
│  150L │      ╱╲    ╱╲                                  │
│  100L │   ╱╲╱  ╲╱╲╱  ╲                                 │
│   50L │╱╲╱            ╲╱╲                              │
│       └────────────────────                            │
│         1/5  1/6  1/7  1/8                             │
└────────────────────────────────────────────────────────┘

┌────────────────────┐  ┌────────────────────────────────┐
│ Machine Performance│  │ Operator Performance           │
│ [EX-001 ▾]         │  │ [All Operators ▾]              │
│                    │  │                                │
│  █  █  █  █  █     │  │  █  █  █  █  █                 │
│                    │  │                                │
└────────────────────┘  └────────────────────────────────┘
```

---

## 🚀 Installation

### **Quick Start (2 Steps)**

1. **Download Files**
   ```
   diesel-track/
   ├── index.html
   ├── styles.css
   ├── app.js
   └── README.md
   ```

2. **Open in Browser**
   - Double-click `index.html`
   - OR drag file to browser window
   - OR right-click → Open with → [Your Browser]

**That's it!** No web server, no npm install, no dependencies.

### **Alternative: Web Server (Optional)**

If you prefer to run on a local server:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (with http-server)
npx http-server

# PHP
php -S localhost:8000
```

Then visit: `http://localhost:8000`

---

## 📁 File Structure

```
diesel-track/
│
├── index.html           # Main application interface (HTML)
├── styles.css           # All styling and animations (CSS)
├── app.js              # Core application logic (JavaScript)
├── README.md           # This file
│
└── External Dependencies (CDN):
    ├── Chart.js v3.9.1        # For analytics charts
    └── SheetJS (XLSX) v0.18.5 # For Excel export/import
```

### **File Descriptions**

#### **index.html** (~200 lines)
- Application structure and layout
- Navigation tabs
- Forms for data entry
- Tables for data display
- Analytics canvas elements
- Settings interface
- Notification container

#### **styles.css** (~450 lines)
- Dark theme design (Caterpillar yellow accent)
- Responsive grid layouts
- Notification animations
- Modal dialog styling
- Table and form styling
- Mobile responsiveness
- Print styles

#### **app.js** (~600 lines)
- Database operations (IndexedDB)
- Form validation and submission
- Data rendering and updates
- Chart generation
- Backup/restore logic
- Import/export functionality
- Notification system
- Event handlers

---

## 📖 Usage Guide

### **First Time Setup**

#### Step 1: Add Machines
1. Click **"Fleet Assets"** tab
2. Fill in machine details:
   - **Machine ID**: Unique identifier (e.g., EX-001, BH-045)
   - **Model**: Machine model (e.g., CAT 320, Komatsu D65)
   - **Consumption Rate**: Fuel per hour/km (e.g., 15.5)
   - **Tank Capacity**: Maximum fuel tank size in liters
3. Click **"Add Machine"**
4. Repeat for all machines

#### Step 2: Add Operators
1. Click **"Operators"** tab
2. Enter operator information:
   - **Full Name**: Operator's name
   - **Badge Number**: Unique identifier
3. Click **"Add Operator"**
4. Repeat for all operators

#### Step 3: Configure Settings
1. Click **"Settings"** tab
2. Set **Anomaly Threshold** (default: 10%)
   - Example: 10% means alert if fuel exceeds expected by 10%
3. Click **"Save Settings"**
4. Create your first backup: **"Create Backup Now"**

### **Daily Operations**

#### Logging a Refuel
1. Go to **"Refueling"** tab
2. Select **Machine** from dropdown
3. Select **Operator** from dropdown
4. Enter **Usage Hours** or Kilometers
5. Enter **Fuel Amount** in liters
6. Click **"Log Entry"**

**The system automatically:**
- Calculates expected fuel consumption
- Computes variance
- Flags anomalies
- Updates all charts
- Saves to database

#### Reviewing Activity
- **Activity History** table shows all refuels (newest first)
- **Variance** column shows fuel difference (red if high)
- **Status** badges indicate:
  - 🟢 **OK**: Normal consumption
  - 🔴 **ANOMALY**: Exceeds threshold
  - 🔴 **OVER TANK**: Exceeds tank capacity

#### Viewing Analytics
1. Click **"Analytics"** tab
2. Charts automatically display:
   - **Overall Fleet Trend**: All recent fuel consumption
   - **Machine Performance**: Filter by specific machine
   - **Operator Performance**: Filter by specific operator
3. Use dropdowns to filter data
4. Hover over data points for details

### **Data Management**

#### Exporting Reports
1. Click **"Export Excel"** button (top-right)
2. File downloads: `DieselTrack_Report_2026-01-08.xlsx`
3. Contains 3 sheets:
   - **Refuel Logs**: All entries with calculations
   - **Machines**: Fleet asset list
   - **Operators**: Operator directory

#### Importing Data
1. Click **"Import Excel"** button
2. Select `.xlsx` or `.xls` file
3. System validates and imports:
   - Machines from "Machines" sheet
   - Operators from "Operators" sheet
4. Shows import summary

#### Backup Operations

**Create Backup:**
1. Go to **Settings** → **Backup & Restore**
2. Click **"Create Backup Now"**
3. Backup saved to browser LocalStorage
4. Status updates showing last backup time

**Download Backup File:**
1. Click **"Download Backup File"**
2. JSON file saves to Downloads folder
3. Store in safe location (cloud, USB, etc.)

**Restore from Browser:**
1. Click **"Restore from Browser"**
2. Confirm restoration
3. All data restored from last auto-backup

**Upload Backup File:**
1. Click **"Upload Backup File"**
2. Select previously downloaded JSON file
3. Confirm restoration
4. All data restored from file

### **Maintenance Tasks**

#### Deleting Records
- **Machines**: Click "Delete" in Fleet Assets table
- **Operators**: Click "Delete" in Operators table
- **Refuel Entries**: Click "×" in Activity History
- All deletions require confirmation

#### Wiping Database
1. Go to **Settings**
2. Click **"Wipe All Data"** (red button)
3. Confirm warning dialog
4. **⚠️ This cannot be undone!**
5. System reloads with fresh database

---

## 🔧 Technical Documentation

### **Technologies Used**

| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | - | Application structure |
| CSS3 | - | Styling and animations |
| JavaScript (ES6+) | - | Application logic |
| IndexedDB | v1 | Primary data storage |
| LocalStorage | - | Backup storage |
| Chart.js | 3.9.1 | Data visualization |
| SheetJS (XLSX) | 0.18.5 | Excel import/export |

### **Database Schema (IndexedDB)**

**Database Name:** `DieselTrackDB_v4`

**Object Stores:**

```javascript
// Machines Store
{
  id: "EX-001",              // Primary key, string
  model: "CAT 320",          // string
  rate: 15.5,                // number (L/hr or L/km)
  capacity: 400              // number (liters)
}

// Operators Store
{
  id: "ax-1234-4xxx-yxxx",   // Primary key, UUID
  name: "John Smith",        // string
  badge: "OP-001"            // string
}

// Refuels Store
{
  id: "ax-5678-4xxx-yxxx",   // Primary key, UUID
  timestamp: 1704672000000,  // number (Unix timestamp)
  machineId: "EX-001",       // string (foreign key)
  operatorId: "ax-1234...",  // string (foreign key)
  usage: 8.5,                // number (hours or km)
  fuel: 131.75               // number (liters)
}

// Settings Store
{
  id: "current",             // Primary key, always "current"
  tolerance: 10              // number (percentage 0-100)
}
```

### **Key Functions**

```javascript
// Database Operations
openDb()                    // Initialize IndexedDB
dbPut(store, data)          // Insert/update record
dbGetAll(store)             // Retrieve all records
dbDelete(store, id)         // Delete record
loadState()                 // Load all data into memory

// Validation
validateMachine(id, model, rate, capacity)
validateOperator(name, badge)
validateRefuel(machineId, operatorId, usage, fuel)

// UI Functions
renderTables()              // Update all data tables
renderAnalytics()           // Generate charts
updateFilters()             // Update dropdown options
updateStatusIndicator()     // Update anomaly counter

// Notifications
showNotification(message, type)  // Display notification
showConfirm(message, callback)   // Show confirmation dialog

// Backup/Restore
backupToLocalStorage()      // Create backup
restoreFromLocalStorage()   // Restore from backup
downloadBackup()            // Download JSON file
uploadBackup(file)          // Upload JSON file

// Import/Export
exportData()                // Generate Excel file
importData(file)            // Import from Excel
```

### **Anomaly Detection Algorithm**

```javascript
// For each refuel entry:
expected = machine.rate × refuel.usage
variance = refuel.fuel - expected
variancePercent = (variance / expected) × 100

// Flag as anomaly if:
isAnomaly = (
  refuel.fuel > machine.capacity ||           // Overflow
  (variance > 0 && variancePercent > threshold) // Over-consumption
)
```

### **Auto-Backup System**

```javascript
// Runs every 5 minutes
setInterval(backupToLocalStorage, 5 * 60 * 1000)

// Backup includes:
{
  machines: [...],
  operators: [...],
  refuels: [...],
  settings: {...},
  timestamp: Date.now()
}

// Stored in: localStorage['DieselTrack_Backup']
```

### **Event Flow**

```
User Action
    ↓
Form Validation
    ↓
Database Write (IndexedDB)
    ↓
State Update (in-memory)
    ↓
UI Re-render (tables/charts)
    ↓
Auto-backup (LocalStorage)
    ↓
Notification Display
```

---

## 💾 Data Management

### **Storage Overview**

| Storage Type | Purpose | Capacity | Persistence |
|-------------|---------|----------|-------------|
| **IndexedDB** | Primary database | ~50MB - 1GB | Permanent* |
| **LocalStorage** | Backup storage | ~5-10MB | Permanent* |
| **Downloaded Files** | Manual backups | Unlimited | User-managed |

*Permanent until browser data cleared

### **Data Lifecycle**

```
1. User Entry → IndexedDB (immediate)
2. IndexedDB → LocalStorage (every 5 min)
3. LocalStorage → JSON File (manual download)
4. JSON File → LocalStorage → IndexedDB (restore)
```

### **Backup Strategy (Recommended)**

**3-2-1 Rule:**
- **3** copies of data
  - Original (IndexedDB)
  - Auto-backup (LocalStorage)
  - Downloaded file
- **2** different storage types
  - Browser storage
  - File system
- **1** offsite copy
  - Cloud storage (Google Drive, Dropbox)
  - Email to yourself
  - External drive

**Frequency:**
- **Auto**: Every 5 minutes (LocalStorage)
- **Daily**: Export Excel reports
- **Weekly**: Download backup JSON file
- **Monthly**: Verify backup integrity

### **Data Export Formats**

**Excel (.xlsx)**
- Multi-sheet workbook
- Human-readable
- Can be edited in Excel/Google Sheets
- Best for: Reports, sharing with management

**JSON (.json)**
- Complete system backup
- Machine-readable
- Easily parsed/edited
- Best for: Backup/restore, data migration

### **Data Import Requirements**

**Excel Import:**
- Must have sheet named "Machines" or "Operators"
- Columns must match database schema
- Machine IDs must be unique
- Empty rows are skipped

**JSON Import:**
- Must be valid JSON format
- Must have: machines, operators, refuels arrays
- Settings object optional
- Invalid format rejected with error

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Charts Not Displaying**
**Symptoms:** Blank white boxes in Analytics tab

**Solutions:**
1. Check browser console (F12) for errors
2. Verify Chart.js loaded: Check Network tab
3. Ensure data exists: Add some refuel entries
4. Try refreshing page
5. Clear cache and reload

**CDN Check:**
```javascript
// Verify in console:
typeof Chart !== 'undefined'  // Should be true
```

#### **"Database error" Notification**
**Symptoms:** Red notification on page load

**Solutions:**
1. Check browser console for specific error
2. Try incognito/private mode (tests fresh DB)
3. Clear IndexedDB: F12 → Application → IndexedDB → Delete
4. Restore from backup
5. Update browser to latest version

**Manual DB Reset:**
```javascript
// In browser console:
indexedDB.deleteDatabase('DieselTrackDB_v4')
location.reload()
```

#### **Import/Export Not Working**
**Symptoms:** Buttons don't respond or show errors

**Solutions:**
1. Check file format (.xlsx for import, .json for backup)
2. Verify file isn't corrupted (open in Excel/text editor)
3. Check browser console for error messages
4. Try smaller file first (test with 5-10 records)
5. Ensure XLSX library loaded (check Network tab)

#### **Backup Status Shows "No backup found"**
**Symptoms:** Settings page shows warning

**Solutions:**
1. Click "Create Backup Now" to create first backup
2. Check if browser data was recently cleared
3. Upload a previously downloaded backup file
4. Verify LocalStorage enabled in browser settings

#### **Notifications Not Appearing**
**Symptoms:** Actions complete but no feedback

**Solutions:**
1. Check if notification container exists (inspect HTML)
2. Look for CSS conflicts hiding notifications
3. Check z-index issues with other elements
4. Try clicking action again
5. Check browser console for JavaScript errors

#### **Anomaly Detection Too Sensitive/Loose**
**Symptoms:** Too many or too few anomalies flagged

**Solutions:**
1. Go to Settings tab
2. Adjust "Anomaly Detection Threshold"
   - Lower = more sensitive (flag more anomalies)
   - Higher = less sensitive (flag fewer anomalies)
3. Default: 10% (reasonable for most operations)
4. Test with known good/bad refuels
5. Adjust based on your fleet's normal variance

### **Browser-Specific Issues**

#### **Safari Private Mode**
- IndexedDB not available in private browsing
- Use regular browsing mode
- Or download files for backup only

#### **Internet Explorer**
- Not supported (use modern browser)
- Minimum: Edge, Chrome 80+, Firefox 75+

#### **Mobile Browsers**
- Horizontal scrolling on tables (expected)
- Zoom for better visibility
- Use landscape orientation for Analytics

### **Performance Issues**

#### **Slow with Many Records**
**If you have 1000+ refuel logs:**

1. **Export old data:**
   - Export to Excel
   - Delete old logs from database
   - Keep Excel files for archive

2. **Optimize queries:**
   - Charts only show last 20 entries
   - Use filters to narrow data

3. **Browser performance:**
   - Close other tabs
   - Clear browser cache
   - Update to latest browser version

#### **Storage Quota Exceeded**
**Symptoms:** "Storage quota exceeded" error

**Solutions:**
1. Export data to Excel
2. Delete old refuel logs
3. Create backup before deleting
4. Browser limits: ~50MB (Firefox), ~1GB (Chrome)

---

## 🔐 Security & Privacy

### **Data Privacy**

✅ **What We DO:**
- Store all data locally on your computer
- Use browser-standard storage APIs
- Never send data to any server
- Never track user behavior
- Never collect analytics

❌ **What We DON'T:**
- No server communication
- No external API calls (except CDN for libraries)
- No cookies
- No user tracking
- No data sharing

### **Security Considerations**

#### **Browser Storage Security**
- **IndexedDB**: Isolated per domain/origin
- **LocalStorage**: Isolated per domain/origin
- **Not encrypted**: Readable by anyone with computer access
- **Browser-protected**: Other websites cannot access

#### **Production Security Recommendations**

For sensitive fleet data, consider:

1. **Add Encryption**
   ```javascript
   // Example: Encrypt backup before storing
   const encrypted = CryptoJS.AES.encrypt(
     JSON.stringify(backup), 
     userPassword
   ).toString()
   ```

2. **User Authentication**
   - Add login system
   - Role-based access (admin vs operator)
   - Session management

3. **Server-Side Storage**
   - Move to backend database (PostgreSQL, MongoDB)
   - Implement API authentication
   - Use HTTPS for all connections

4. **Audit Logging**
   - Log all data modifications
   - Track who changed what and when
   - Keep audit trail for compliance

5. **Regular Backups**
   - Automated daily backups to secure server
   - Encrypted backup files
   - Offsite backup storage

### **Access Control**

**Current System (Browser-Based):**
- Anyone with computer access can view data
- No user authentication
- No access logs

**For Production:**
- Implement user accounts
- Role-based permissions:
  - **Admin**: Full access
  - **Manager**: View reports, add entries
  - **Operator**: Add refuels only
  - **Viewer**: Read-only access

### **Data Retention**

**Current:**
- Data kept indefinitely
- Manual deletion only
- No automatic purging

**Recommended:**
- Archive logs older than 1 year
- Export to secure storage
- Purge after 2-3 years (depending on regulations)
- Keep summary statistics

### **Compliance Considerations**

If your business requires compliance with:

**GDPR (EU):**
- Add data export feature for individuals
- Implement data deletion requests
- Document data processing
- Obtain consent for data collection

**ISO 27001:**
- Add access controls
- Implement audit logging
- Document security procedures
- Regular security reviews

**Industry-Specific:**
- Consult legal/compliance team
- Document data handling procedures
- Implement required controls

---

## 🌐 Browser Compatibility

### **Fully Supported**

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 80+ | Best performance |
| Edge | 80+ | Chromium-based |
| Firefox | 75+ | Full support |
| Safari | 13+ | MacOS/iOS |
| Opera | 67+ | Chromium-based |

### **Required Browser Features**

✅ **Must Support:**
- IndexedDB (database storage)
- LocalStorage (backup storage)
- ES6+ JavaScript (modern syntax)
- Canvas API (for charts)
- File API (download/upload)
- Blob API (file creation)

### **Not Supported**

❌ **Will NOT Work:**
- Internet Explorer (any version)
- Opera Mini
- Very old Android browsers (<5.0)
- Very old iOS Safari (<11)

### **Mobile Support**

📱 **Works On:**
- iOS Safari (13+)
- Chrome Mobile (Android)
- Firefox Mobile
- Samsung Internet

**Mobile Limitations:**
- Smaller screen (use landscape for analytics)
- Touch-optimized buttons
- Horizontal scroll on tables
- File download to mobile storage

### **Testing Compatibility**

```javascript
// Check in browser console:

// IndexedDB
'indexedDB' in window

// LocalStorage
typeof(Storage) !== "undefined"

// File API
typeof(File) !== "undefined"

// Canvas (for charts)
typeof(HTMLCanvasElement) !== "undefined"

// All should return: true
```

---

## 🤝 Contributing

### **How to Contribute**

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**
4. **Test thoroughly**
5. **Commit**: `git commit -m 'Add amazing feature'`
6. **Push**: `git push origin feature/amazing-feature`
7. **Open Pull Request**

### **Contribution Guidelines**

**Code Style:**
- Use consistent indentation (2 spaces)
- Comment complex logic
- Use descriptive variable names
- Follow existing code patterns

**Testing:**
- Test in multiple browsers
- Test with large datasets (1000+ records)
- Test import/export functionality
- Verify backup/restore works

**Documentation:**
- Update README for new features
- Add inline code comments
- Document API changes
- Include usage examples

### **Feature Requests**

Have an idea? Open an issue with:
- **Title**: Brief description
- **Use Case**: Why it's needed
- **Proposed Solution**: How it might work
- **Alternatives**: Other approaches considered

### **Bug Reports**

Found a bug? Include:
- **Browser & Version**: Chrome 120, Firefox 115, etc.
- **Steps to Reproduce**: Exact steps to cause bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Console Errors**: F12 → Console tab

---

## 📄 License

**MIT License**

Copyright (c) 2026 Diesel-Track Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 📞 Support

### **Getting Help**

**Documentation:**
- This README (comprehensive guide)
- Inline code comments (technical details)
- Browser console messages (debugging)

**Community Support:**
- GitHub Issues (bug reports, questions)
- Discussions (feature ideas, use cases)
- Wiki (advanced guides, tips)

**Self-Service Resources:**
- [Troubleshooting](#troubleshooting) section above
- Browser DevTools (F12 for debugging)
- Console error messages
- Backup/restore if data issues

### **Reporting Issues**

**Before Opening Issue:**
1. Check existing issues (might be solved already)
2. Review troubleshooting section
3. Test in different browser
4. Check browser console for errors

**When Opening Issue:**
1. Use descriptive title
2. Include browser/version
3. Provide steps to reproduce
4. Attach screenshots if relevant
5. Copy console errors

### **Response Time**

- **Critical Bugs**: Within 24-48 hours
- **Feature Requests**: Within 1 week
- **Questions**: Within 2-3 days
- **Documentation**: Within 1 week

---

## 🎯 Roadmap

### **Planned Features**

**Version 4.1 (Next)**
- [ ] PDF report generation
- [ ] Email report scheduling
- [ ] Advanced filtering options
- [ ] Custom date ranges for analytics
- [ ] Machine maintenance tracking

**Version 4.2**
- [ ] Multi-user support
- [ ] User authentication system
- [ ] Role-based access control
- [ ] Audit logging
- [ ] Server-side sync option

**Version 4.3**
- [ ] Mobile app (React Native)
- [ ] Offline-first sync
- [ ] Photo attachments for refuels
- [ ] GPS location tracking
- [ ] QR code scanning for machines

**Version 5.0 (Major)**
- [ ] Complete backend rewrite
- [ ] REST API
- [ ] Real-time collaboration
- [ ] Advanced ML anomaly detection
- [ ] Predictive maintenance alerts

**Community Requested:**
- [ ] Dark/light theme toggle
- [ ] Customizable reports
- [ ] Integration with fuel cards
- [ ] Cost tracking per machine
- [ ] Carbon footprint calculator

---

## 📚 Additional Resources

### **Related Documentation**
- [Backup Location Guide](./docs/backup-guide.md)
- [API Documentation](./docs/api.md) (for developers)
- [Deployment Guide](./docs/deployment.md)
- [Troubleshooting FAQ](./docs/faq.md)

### **External Resources**
- [IndexedDB API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [SheetJS Documentation](https://docs.sheetjs.com/)

### **Community**
- GitHub Repository: `github.com/your-org/diesel-track`
- Issue Tracker: `github.com/your-org/diesel-track/issues`
- Discussions: `github.com/your-org/diesel-track/discussions`

---

## 🎓 Training & Onboarding

### **Quick Start Tutorial (5 Minutes)**

**Step 1: Open Application**
- Double-click `index.html`
- Wait for "System initialized successfully" notification

**Step 2: Add Your First Machine**
1. Click "Fleet Assets" tab
2. Enter: ID=`TEST-01`, Model=`Test Excavator`, Rate=`15`, Capacity=`400`
3. Click "Add Machine"
4. ✅ Success notification appears

**Step 3: Add Your First Operator**
1. Click "Operators" tab
2. Enter: Name=`John Doe`, Badge=`OP-001`
3. Click "Add Operator"
4. ✅ Operator added

**Step 4: Log Your First Refuel**
1. Click "Refueling" tab
2. Select: Machine=`TEST-01`, Operator=`John Doe`
3. Enter: Usage=`8`, Fuel=`120`
4. Click "Log Entry"
5. ✅ Entry appears in Activity History

**Step 5: View Analytics**
1. Click "Analytics" tab
2. See your data visualized in charts
3. Try the machine/operator filters

**Step 6: Create Backup**
1. Click "Settings" tab
2. Click "Create Backup Now"
3. ✅ Backup saved successfully

**🎉 You're ready to use Diesel-Track!**

### **Training Checklist**

**For Administrators:**
- [ ] Understand database structure
- [ ] Know how to add/remove machines and operators
- [ ] Can create and restore backups
- [ ] Understand anomaly detection settings
- [ ] Can export reports for management
- [ ] Know troubleshooting procedures

**For Operators:**
- [ ] Can log refuel entries
- [ ] Understand how to select machine and operator
- [ ] Know what usage hours/km means
- [ ] Can view their own performance in analytics

**For Management:**
- [ ] Can read Activity History table
- [ ] Understand variance and status indicators
- [ ] Can filter analytics by machine/operator
- [ ] Can export Excel reports
- [ ] Know how to identify fuel anomalies

---

## 📊 Use Cases & Examples

### **Use Case 1: Construction Site**

**Scenario:**
- 12 excavators, bulldozers, and loaders
- 8 operators working in shifts
- Manager needs daily fuel reports

**Solution:**
1. Add all machines with accurate consumption rates
2. Register all operators with badge numbers
3. Log every refuel at start/end of shift
4. Review Analytics daily for anomalies
5. Export Excel report at end of week
6. Track fuel costs per machine

**Benefits:**
- Identify fuel theft immediately
- Optimize machine allocation
- Track operator efficiency
- Reduce fuel waste by 15-20%

### **Use Case 2: Mining Operation**

**Scenario:**
- 20+ heavy machinery units
- 24/7 operation with shift rotations
- High fuel consumption (500+ liters/day per machine)
- Compliance reporting required

**Solution:**
1. Set strict anomaly thresholds (5-8%)
2. Enable auto-backup for data security
3. Daily Excel exports for accounting
4. Weekly performance reviews
5. Monthly trend analysis

**Benefits:**
- Detect equipment maintenance needs
- Prevent unauthorized machine use
- Accurate fuel budgeting
- Audit-ready documentation

### **Use Case 3: Agricultural Fleet**

**Scenario:**
- Seasonal operation (planting/harvest)
- Mix of tractors, combines, harvesters
- Family-run business with multiple drivers
- Variable consumption based on terrain

**Solution:**
1. Adjust consumption rates seasonally
2. Track usage in hours (not kilometers)
3. Higher tolerance threshold (15-20%)
4. Focus on trend analysis over strict limits
5. Export reports for tax documentation

**Benefits:**
- Track fuel costs per crop season
- Plan fuel purchases in advance
- Document expenses for tax purposes
- Compare year-over-year efficiency

---

## 🔄 Migration & Upgrade Guide

### **Upgrading from v3 to v4**

**Database Changes:**
- New database name: `DieselTrackDB_v4`
- Settings store added
- Auto-backup system included

**Migration Steps:**

1. **Export v3 Data:**
   ```javascript
   // In v3, open console (F12) and run:
   const tx = db.transaction(['machines', 'operators', 'refuels'], 'readonly');
   const data = {
     machines: await tx.objectStore('machines').getAll(),
     operators: await tx.objectStore('operators').getAll(),
     refuels: await tx.objectStore('refuels').getAll()
   };
   console.log(JSON.stringify(data));
   // Copy output to file
   ```

2. **Install v4:**
   - Download v4 files
   - Open `index.html`
   - System creates new v4 database

3. **Import v3 Data:**
   - Create Excel file with v3 data
   - Use "Import Excel" button
   - Verify all data imported correctly

4. **Verify Migration:**
   - Check machine count matches
   - Check operator count matches
   - Spot-check refuel entries
   - Test analytics charts

5. **Cleanup:**
   - Create v4 backup
   - Delete old v3 database
   - Archive v3 files

### **Breaking Changes**
- Database name changed (no auto-migration)
- New settings store (default values used if missing)
- Chart library updated (may affect custom themes)

---

## 🏆 Best Practices

### **Data Entry Best Practices**

**Machine IDs:**
- Use consistent format: `TYPE-NUMBER` (e.g., `EX-001`, `BH-045`)
- Include machine type for easy identification
- Keep IDs short (under 10 characters)
- Use uppercase for consistency

**Operator Badge Numbers:**
- Match company ID system
- Use existing badge numbers from ID cards
- Don't use personally identifiable info (SSN, etc.)

**Refuel Logging:**
- Log immediately after refueling (while data is fresh)
- Double-check fuel amount from pump receipt
- Record actual hours/km from machine odometer
- Note any anomalies in comments (if feature added)

**Consumption Rates:**
- Use manufacturer specifications as baseline
- Adjust based on actual observed consumption
- Re-calibrate quarterly based on data
- Account for seasonal variations

**Tank Capacities:**
- Use exact specifications from manual
- Account for unusable reserve fuel
- Set slightly below maximum to prevent false alerts

### **Maintenance Best Practices**

**Daily:**
- Review Activity History for anomalies
- Address flagged entries same day
- Verify all refuels logged
- Check status indicator

**Weekly:**
- Export Excel report for records
- Review Analytics trends
- Update consumption rates if needed
- Verify backup status

**Monthly:**
- Download backup file to external storage
- Review all machine performance
- Analyze operator trends
- Clean up test/invalid entries

**Quarterly:**
- Full system audit
- Recalibrate consumption rates
- Update documentation
- Train new users

**Annually:**
- Archive old data (export and delete entries >1 year)
- Review and update procedures
- Security audit
- Consider upgrades/migrations

### **Security Best Practices**

**Access Control:**
- Limit who can delete entries
- Separate operator vs admin access
- Log all administrative actions
- Use separate user accounts

**Data Protection:**
- Daily backups to cloud storage
- Weekly backups to external drive
- Monthly offsite backup
- Test restore procedure quarterly

**Privacy Considerations:**
- Don't store sensitive personal info
- Use badge numbers, not names (if possible)
- Comply with local data protection laws
- Document data retention policy

---

## 🧪 Testing Guide

### **Manual Testing Checklist**

**Smoke Tests (Every Release):**
- [ ] Application loads without errors
- [ ] Can add machine
- [ ] Can add operator
- [ ] Can log refuel
- [ ] Charts render correctly
- [ ] Export creates file
- [ ] Backup/restore works

**Functional Tests:**
- [ ] Machine form validation works
- [ ] Operator form validation works
- [ ] Refuel form validation works
- [ ] Duplicate machine ID rejected
- [ ] Anomaly detection triggers correctly
- [ ] Tank overflow warning appears
- [ ] Delete confirmations appear
- [ ] All notifications dismiss properly

**Browser Compatibility Tests:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome Mobile
- [ ] Safari iOS

**Data Integrity Tests:**
- [ ] Large dataset (1000+ entries) performs well
- [ ] Backup includes all data
- [ ] Restore rebuilds state correctly
- [ ] Export includes all columns
- [ ] Import handles duplicates
- [ ] Delete operations work correctly

**Edge Cases:**
- [ ] Empty database state
- [ ] Single machine/operator
- [ ] Zero fuel amount (should reject)
- [ ] Negative values (should reject)
- [ ] Very large numbers (millions)
- [ ] Special characters in names
- [ ] Browser storage full
- [ ] Offline operation

### **Automated Testing (Future)**

```javascript
// Example test structure for future implementation
describe('Refuel Entry', () => {
  test('should reject negative fuel amount', () => {
    const result = validateRefuel('EX-001', 'op-1', 8, -10);
    expect(result).toBe(false);
  });
  
  test('should calculate variance correctly', () => {
    const expected = 15 * 8; // rate × usage
    const actual = 120;
    const variance = actual - expected;
    expect(variance).toBe(0);
  });
  
  test('should detect anomaly when over threshold', () => {
    const machine = { rate: 15, capacity: 400 };
    const refuel = { usage: 8, fuel: 150 };
    const isAnomaly = detectAnomaly(machine, refuel, 10);
    expect(isAnomaly).toBe(true);
  });
});
```

---

## 📝 Changelog

### **Version 4.0** (January 2026)
**Major Release - Complete Rewrite**

**New Features:**
- ✨ Notification system with animations
- ✨ Confirmation dialogs for destructive actions
- ✨ Auto-backup every 5 minutes
- ✨ Backup download/upload functionality
- ✨ Enhanced analytics with tooltips
- ✨ Status indicator with anomaly counter
- ✨ Settings persistence
- ✨ System information dashboard

**Improvements:**
- 🔧 Refactored database operations
- 🔧 Enhanced error handling
- 🔧 Better form validation
- 🔧 Improved mobile responsiveness
- 🔧 Cleaner code structure
- 🔧 Performance optimizations

**Bug Fixes:**
- 🐛 Fixed chart rendering issues
- 🐛 Fixed backup corruption on large datasets
- 🐛 Fixed operator name display in charts
- 🐛 Fixed date formatting inconsistencies

**Breaking Changes:**
- ⚠️ New database name (requires migration)
- ⚠️ Settings stored in database (not localStorage)

### **Version 3.2** (December 2025)
- Added Excel import functionality
- Improved chart labels
- Fixed mobile layout issues

### **Version 3.1** (November 2025)
- Added tank capacity overflow detection
- Enhanced variance calculation
- Bug fixes and performance improvements

### **Version 3.0** (October 2025)
- Complete UI redesign
- Added analytics dashboard
- Implemented anomaly detection

---

## 🤝 Acknowledgments

**Built With:**
- [Chart.js](https://www.chartjs.org/) - Beautiful charts
- [SheetJS](https://sheetjs.com/) - Excel functionality
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) - Client-side storage

**Inspired By:**
- Heavy equipment operators worldwide
- Fleet managers seeking efficiency
- Open-source community

**Special Thanks:**
- Contributors and testers
- Users providing feedback
- Everyone who reported bugs

---

## 📞 Contact & Support

**Project Maintainer:**
- GitHub: [@webbiemuchy](https://github.com/webbiemuchy)
- Email: muchakaziwebster.it@gamil.com

**Bug Reports:**
- Email: muchakaziwebster.it@gamil.com

**Feature Requests:**
- Email: muchakaziwebster.it@gamil.com

---

## ⭐ Star History

If you find Diesel-Track useful, please consider giving it a star on GitHub! ⭐

---

**Made with ❤️ for fleet managers and heavy equipment operators worldwide.**

**© 2026 Diesel-Track Contributors | MIT License**
