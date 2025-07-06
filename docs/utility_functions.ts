/* ============================================================
   Synchronicity Engine · Utility Functions
   ------------------------------------------------------------
   Pure helpers that the PoC can import across hooks, routes,
   or unit-tests. They rely only on OrbitDB collection APIs
   passed in as arguments, so they remain framework-agnostic.
   ============================================================ */

/* ----------  1. Calculate Blessing Duration  ----------
   • Takes a BlessingDoc and a reference to attentionSwitchesDB
   • Links its attentionIndex to timestamps
   • Always computes up to NOW if session still open
--------------------------------------------------------- */
export function calcBlessingDuration(
    blessing: BlessingDoc,
    userId: string,
    attentionSwitchesDB: any,
    currentTime = Date.now()
  ): number {
    // Get user's attention history in chronological order
    const userSwitches: AttentionSwitch[] = [];
    for (const entry of attentionSwitchesDB.iterator()) {
      if (entry.value.userId === userId) {
        userSwitches.push(entry.value);
      }
    }
    
    // Sort by timestamp to ensure chronological order
    userSwitches.sort((a, b) => a.timestamp - b.timestamp);
    
    // Find the start and end times based on attention index
    const startEvent = userSwitches[blessing.attentionIndex];
    const nextEvent = userSwitches[blessing.attentionIndex + 1];
    
    if (!startEvent) return 0;
    
    const startTime = startEvent.timestamp;
    const endTime = nextEvent?.timestamp ?? currentTime;
    
    return endTime - startTime;
  }
  
  /* ----------  2. Flatten Token Tree ----------
     • Returns a flat array of token IDs starting from a parent
     • Prevents infinite recursion via visited set
  ------------------------------------------------ */
  export function flattenTokenTree(
    topTokenId: string,
    blessingsDB: any,
    visited = new Set<string>()
  ): string[] {
    if (visited.has(topTokenId)) return [];
    visited.add(topTokenId);
  
    const tokenEntry = blessingsDB.get(topTokenId);
    if (!tokenEntry) return [];
    
    const token = tokenEntry.value;
    const children = (token.children ?? []) as string[];
    
    return [topTokenId, ...children.flatMap((id) => flattenTokenTree(id, blessingsDB, visited))];
  }
  
  /* ----------  3. Total Gratitude of Token Tree ----------
     • Sums durations for parent + all children
  --------------------------------------------------------- */
  export function totalTokenDuration(
    parentTokenId: string,
    blessingsDB: any,
    attentionSwitchesDB: any,
    currentTime = Date.now()
  ): number {
    const ids = flattenTokenTree(parentTokenId, blessingsDB);
    return ids
      .map((id) => {
        const blessingEntry = blessingsDB.get(id);
        if (!blessingEntry) return 0;
        return calcBlessingDuration(blessingEntry.value, blessingEntry.value.userId, attentionSwitchesDB, currentTime);
      })
      .reduce((a, b) => a + b, 0);
  }
  
  /* ----------  4. Intention Gratitude Potential ----------
     • LiveBlessings = potential/active blessings whose latest
       attention index belongs to THIS intention
     • Boosts      = attachedTokens durations
  ------------------------------------------------------ */
  export function gratitudePotential(
    intention: IntentionDoc,
    blessingsDB: any,
    attentionSwitchesDB: any,
    currentTime = Date.now()
  ): number {
    const liveBlessings = intention.blessings
      .map((id) => blessingsDB.get(id))
      .filter((entry: any) => !!entry)
      .map((entry: any) => entry.value as BlessingDoc);
  
    const liveTotal = liveBlessings
      .filter((b: BlessingDoc) => b.status === 'active' || b.status === 'potential')
      .map((b: BlessingDoc) => calcBlessingDuration(b, b.userId, attentionSwitchesDB, currentTime))
      .reduce((a: number, b: number) => a + b, 0);
  
    const boostTotal = (intention.attachedTokens ?? [])
      .map((id) => totalTokenDuration(id, blessingsDB, attentionSwitchesDB, currentTime))
      .reduce((a: number, b: number) => a + b, 0);
  
    return liveTotal + boostTotal;
  }
  
  /* ----------  5. Human-Readable Duration ----------
     • Formats milliseconds → "4h 12m"
  -------------------------------------------------- */
  export function formatDuration(ms: number): string {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  }
  
  /* ----------  6. Get User Attention History ----------
     • Returns chronologically sorted attention switches for a user
  --------------------------------------------------------- */
  export function getUserAttentionHistory(
    userId: string,
    attentionSwitchesDB: any
  ): AttentionSwitch[] {
    const userSwitches: AttentionSwitch[] = [];
    
    for (const entry of attentionSwitchesDB.iterator()) {
      if (entry.value.userId === userId) {
        userSwitches.push(entry.value);
      }
    }
    
    return userSwitches.sort((a, b) => a.timestamp - b.timestamp);
  }