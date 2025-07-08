# Database Scripts

## reset-database.js

**Purpose**: Completely wipes the OrbitDB database and repopulates it with fresh, consistent sample data using the synchronicity engine functions.

**Why needed**: Fixes data inconsistency issues like "No attention event found at index" by ensuring all database relationships are properly created through the tested engine functions.

### Usage

```bash
# Run the database reset
npm run reset-db

# Or run directly
node scripts/reset-database.js
```

### What it does

1. **Cleans up**: Removes the existing `./synchronicity-orbitdb` directory completely
2. **Initializes**: Creates fresh OrbitDB databases 
3. **Sequential insertion**: Uses engine functions to insert data in proper order:
   - Creates 5 intentions with proper blessing content
   - Creates attention switches that generate proper blessing indices
   - Creates proofs of service for completed work
   - Assigns blessings between users for collaboration
   - Creates offerings with token bids
   - Sets up current active user state

### Sample Data Created

- **5 Intentions**: Sacred grove, meditation labyrinth, seed library, sound sanctuary, earth ceremony
- **19 Blessings**: Created through intention setting and attention switching across 3+ users
- **19 Attention Switches**: Comprehensive user attention journeys ensuring all blessing indices are valid
- **3 Proofs of Service**: Completed work with collaborative contributors
- **3 Offerings**: Workshops and ceremonies with token bidding
- **Active States**: Multiple users currently working (truman, luna_bright, forest_heart)

### User Activity Created

- **sage_willow**: Creates sacred grove intention, completes work, receives blessing assignments
- **luna_bright**: Joins sacred grove → switches to sound sanctuary → returns to sound work  
- **forest_heart**: Joins seed library → switches to earth ceremony → returns to seed work
- **truman**: Joins labyrinth → switches to sacred grove → currently working on earth ceremony
- **river_stone**: Creates labyrinth intention, completes foundation work
- **dawn_keeper**: Creates seed library intention, collaborates on completion
- **cosmic_heart**: Creates sound sanctuary intention
- **moon_sister**: Creates earth ceremony intention

### Data Integrity

✅ All blessing `attentionIndex` values correspond to real attention switch records  
✅ All relationships between intentions, blessings, and proofs are properly maintained  
✅ All timestamps are sequential and realistic  
✅ User collaboration and token assignments follow proper workflows  

### When to use

- When seeing "No attention event found at index" errors
- After OrbitDB database corruption
- When testing with fresh, consistent data
- Before major feature development or testing

**⚠️ Warning**: This will completely erase all existing data in the OrbitDB database.