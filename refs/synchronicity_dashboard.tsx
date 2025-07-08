import React from 'react';

const SynchronicityDashboard = () => {
  return (
    <div className="min-h-screen flex" 
         style={{
           background: `
             radial-gradient(circle at 20% 30%, #1A2E17 0%, #0D1F0A 40%),
             radial-gradient(circle at 80% 70%, #0F1A0C 0%, #0D1F0A 50%),
             linear-gradient(135deg, #0D1F0A 0%, #1A2E17 50%, #0F1A0C 100%)
           `
         }}>
      
      {/* Column A1 - 77% width */}
      <div className="w-[77%] relative">
        {/* Header area with connection status and title */}
        <div className="h-20 flex items-center px-6 relative">
          {/* Connection Status - Left side */}
          <div className="flex items-center space-x-4">
            {/* Connection Status - Single blinking circle */}
            <div className="relative">
              <div className="w-6 h-6 rounded-full animate-pulse flex items-center justify-center"
                   style={{
                     backgroundColor: '#32CD32',
                     boxShadow: '0 0 12px #32CD32, 0 0 24px #00FF4140'
                   }}>
                {/* WiFi/Connection icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" 
                     xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0" 
                        stroke="#0D1F0A" strokeWidth="2.5" strokeLinecap="round" 
                        strokeLinejoin="round"/>
                  <path d="M1.42 9a16 16 0 0 1 21.16 0" 
                        stroke="#0D1F0A" strokeWidth="2.5" strokeLinecap="round" 
                        strokeLinejoin="round"/>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" 
                        stroke="#0D1F0A" strokeWidth="2.5" strokeLinecap="round" 
                        strokeLinejoin="round"/>
                  <path d="M12 20h.01" 
                        stroke="#0D1F0A" strokeWidth="3" strokeLinecap="round" 
                        strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="absolute inset-0 w-6 h-6 rounded-full animate-ping"
                   style={{
                     backgroundColor: '#32CD32',
                     opacity: 0.3
                   }}></div>
            </div>

            {/* Notifications - Single blinking circle */}
            <div className="relative">
              <div className="w-6 h-6 rounded-full animate-pulse flex items-center justify-center"
                   style={{
                     backgroundColor: '#FFD700',
                     boxShadow: '0 0 12px #FFD700, 0 0 24px #FFD70040'
                   }}>
                {/* Bell icon */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" 
                     xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" 
                        stroke="#0D1F0A" strokeWidth="2.5" strokeLinecap="round" 
                        strokeLinejoin="round"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" 
                        stroke="#0D1F0A" strokeWidth="2.5" strokeLinecap="round" 
                        strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="absolute inset-0 w-6 h-6 rounded-full animate-ping"
                   style={{
                     backgroundColor: '#FFD700',
                     opacity: 0.3
                   }}></div>
            </div>
          </div>

          {/* Calculate remaining width and center the title */}
          <div className="flex-1 flex justify-center">
            <h1 className="text-4xl font-serif italic font-bold"
                style={{ 
                  color: '#D4AF37',
                  textShadow: '0 0 15px #FFD70060, 0 0 30px #D4AF3740',
                  fontFamily: 'Georgia, serif'
                }}>
              The Synchronicity Engine
            </h1>
          </div>
        </div>

        {/* Three columns for the rest of A1 content */}
        <div className="flex h-[calc(100vh-80px)] px-6 pt-8 space-x-4">
          
          {/* Column 1: Active Intention and Now Resonating */}
          <div className="w-1/3 h-full flex flex-col space-y-4">
            
            {/* Active Intention Box */}
            <div className="rounded-2xl p-6"
                 style={{
                   backgroundColor: 'rgba(0, 0, 0, 0.4)',
                   border: '2px solid #D4AF37',
                   boxShadow: `
                     0 0 10px #FFF20040,
                     0 0 20px #D4AF3730,
                     inset 0 0 10px #D4AF3720
                   `
                 }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#D4AF37' }}>
                Active Intention
              </h2>
              
              {/* Author and Total Gratitude Potential */}
              <div className="mb-4 p-3 rounded-lg"
                   style={{
                     backgroundColor: 'rgba(0, 0, 0, 0.2)',
                     border: '1px solid #D4AF3720'
                   }}>
                <div className="text-sm mb-2" style={{ color: '#E6C565' }}>
                  by <span style={{ color: '#D4AF37' }}>Truman</span>
                </div>
                <div className="text-sm font-mono mb-2" style={{ color: '#D4AF37' }}>
                  Total: 8h 45m
                </div>
                <div className="text-xs" style={{ color: '#E6C565', opacity: 0.8 }}>
                  Clear invasive eucalyptus from the mountain peak
                </div>
              </div>

              <textarea 
                placeholder="Blessing text..."
                className="w-full h-20 p-3 rounded-lg mb-4 resize-none text-sm"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid #D4AF3750',
                  color: '#E6C565',
                  outline: 'none'
                }}
              />

              {/* Other Active Users */}
              <div className="mb-4">
                <div className="text-sm mb-2" style={{ color: '#E6C565' }}>
                  Others with this intention active:
                </div>
                <div className="flex space-x-2">
                  {[1, 2, 3].map((index) => (
                    <div key={index} 
                         className="w-8 h-8 rounded-full flex items-center justify-center"
                         style={{
                           background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)',
                           boxShadow: '0 0 8px #D4AF3750'
                         }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
                           xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" 
                              stroke="#0D1F0A" strokeWidth="2" strokeLinecap="round" 
                              strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" 
                                stroke="#0D1F0A" strokeWidth="2" strokeLinecap="round" 
                                strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expand/Collapse for Details */}
              <button 
                className="w-full text-sm py-2 px-3 rounded border transition-colors hover:bg-black/20"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderColor: '#D4AF3730',
                  color: '#E6C565'
                }}>
                ▼ Show Timeline Details
              </button>
            </div>

            {/* Now Resonating - Separate Box */}
            <div className="rounded-2xl p-6 flex-1"
                 style={{
                   backgroundColor: 'rgba(0, 0, 0, 0.4)',
                   border: '2px solid #D4AF37',
                   boxShadow: `
                     0 0 10px #FFF20040,
                     0 0 20px #D4AF3730,
                     inset 0 0 10px #D4AF3720
                   `
                 }}>
              <h3 className="text-lg font-semibold mb-2" 
                  style={{ color: '#D4AF37' }}>
                Now Resonating
              </h3>
              <div className="text-sm mb-3" style={{ color: '#E6C565' }}>
                Filters
              </div>
              
              {/* Resonating intentions list */}
              <div className="space-y-2">
                {[
                  { title: "Clear invasive eucalyptus from mountain", potential: "4h 30m", creator: "Truman" },
                  { title: "Repair ridge fencing for wildlife", potential: "2h 15m", creator: "Rafael" },
                  { title: "Plant native food forest", potential: "6h 45m", creator: "Sage" }
                ].map((intention, index) => (
                  <div key={index} 
                       className="p-2 rounded border cursor-pointer hover:bg-black/20 text-xs"
                       style={{
                         backgroundColor: 'rgba(0, 0, 0, 0.15)',
                         borderColor: '#D4AF3720'
                       }}>
                    <div className="font-medium mb-1 line-clamp-2" 
                         style={{ color: '#E6C565' }}>
                      {intention.title}
                    </div>
                    <div className="flex justify-between items-center">
                      <span style={{ color: '#E6C565', opacity: 0.7 }}>by {intention.creator}</span>
                      <span style={{ color: '#D4AF37' }}>{intention.potential}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Synchronicities */}
          <div className="w-1/3 h-full rounded-2xl p-6"
               style={{
                 backgroundColor: 'rgba(0, 0, 0, 0.4)',
                 border: '2px solid #D4AF37',
                 boxShadow: `
                   0 0 10px #FFF20040,
                   0 0 20px #D4AF3730,
                   inset 0 0 10px #D4AF3720
                 `
               }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#D4AF37' }}>
              Synchronicities
            </h2>
            
            <div className="text-sm mb-2" style={{ color: '#E6C565' }}>
              Log of All
            </div>
            <div className="text-sm mb-6" style={{ color: '#E6C565' }}>
              OrbitDB Events
            </div>
            
            {/* Event log */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {[
                "Rafael posted proof for mountain clearing",
                "Blessing assigned to service provider",
                "New offering: Temple gathering tonight",
                "Attention switched to forest restoration",
                "Token transferred in lodge booking",
                "Proof verified for ridge fencing",
                "Community prayer for water source",
                "Stewardship window requested"
              ].map((event, index) => (
                <div key={index} 
                     className="p-3 rounded-lg border-l-2"
                     style={{
                       backgroundColor: 'rgba(0, 0, 0, 0.2)',
                       borderLeftColor: '#D4AF37'
                     }}>
                  <div className="text-sm" style={{ color: '#E6C565' }}>
                    {event}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#D4AF37' }}>
                    {Math.floor(Math.random() * 60)} minutes ago
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Offerings */}
          <div className="w-1/3 h-full rounded-2xl p-6"
               style={{
                 backgroundColor: 'rgba(0, 0, 0, 0.4)',
                 border: '2px solid #D4AF37',
                 boxShadow: `
                   0 0 10px #FFF20040,
                   0 0 20px #D4AF3730,
                   inset 0 0 10px #D4AF3720
                 `
               }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold" style={{ color: '#D4AF37' }}>
                Offerings
              </h2>
              <div className="text-sm" style={{ color: '#E6C565' }}>
                Filters
              </div>
            </div>
            
            {/* Offerings list */}
            <div className="space-y-3">
              {[
                { title: "Sunrise Yoga in the Cedar Temple", host: "Annabelle", slots: 3, bids: 5, time: "Tomorrow 6:00 AM", location: "Agua Lila Upper Temple Deck" },
                { title: "Eco-Cabin Weekend Retreat", host: "Marisol", slots: 2, bids: 3, time: "Next Weekend", location: "Off-grid cabin, Sintra" },
                { title: "Mountain Trail Maintenance", host: "Carlos", slots: 5, bids: 2, time: "Saturday 8:00 AM", location: "North Ridge Trail" }
              ].map((offering, index) => (
                <div key={index} 
                     className="p-3 rounded-lg border cursor-pointer hover:bg-black/20"
                     style={{
                       backgroundColor: 'rgba(0, 0, 0, 0.2)',
                       borderColor: '#D4AF3730'
                     }}>
                  <div className="text-sm font-medium mb-2 line-clamp-2" 
                       style={{ color: '#E6C565' }}>
                    {offering.title}
                  </div>
                  <div className="text-xs mb-1" style={{ color: '#E6C565' }}>
                    by {offering.host}
                  </div>
                  <div className="text-xs mb-1" style={{ color: '#D4AF37' }}>
                    {offering.time}
                  </div>
                  <div className="text-xs mb-2" style={{ color: '#E6C565', opacity: 0.8 }}>
                    {offering.location}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span style={{ color: '#E6C565' }}>{offering.slots} slots</span>
                    <span style={{ color: '#D4AF37' }}>{offering.bids} bids</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Column A2 - 22% width */}
      <div className="w-[22%] p-6">
        {/* Full width circular profile picture */}
        <div className="w-full aspect-square rounded-full mb-4 flex items-center justify-center"
             style={{
               background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)',
               boxShadow: '0 0 15px #D4AF3760, inset 0 0 10px #FFD70030'
             }}>
          <div className="w-[85%] aspect-square rounded-full bg-gradient-to-br from-amber-600 to-yellow-700 flex items-center justify-center">
            {/* User profile icon */}
            <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" 
                 xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" 
                    stroke="#0D1F0A" strokeWidth="2" strokeLinecap="round" 
                    strokeLinejoin="round"/>
              <circle cx="12" cy="7" r="4" 
                      stroke="#0D1F0A" strokeWidth="2" strokeLinecap="round" 
                      strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Tokens of Gratitude Interface */}
        <div className="flex-1">
          {/* Scrollable container for tokens with username inside */}
          <div className="h-[calc(100vh-200px)] overflow-y-auto pr-2"
               style={{
                 backgroundColor: 'rgba(0, 0, 0, 0.3)',
                 border: '1px solid #D4AF3750',
                 borderRadius: '12px',
                 padding: '16px'
               }}>
            
            {/* Username inside the shaded box */}
            <input 
              type="text" 
              placeholder="Username"
              className="w-full px-3 py-2 text-center rounded mb-6 text-sm"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid #D4AF37',
                color: '#E6C565',
                boxShadow: '0 0 5px #D4AF3730'
              }}
            />
            
            {/* Token list */}
            <div className="space-y-3">
              {[
                { name: "Mountain Clearing", duration: "4h 30m", status: "potential" },
                { name: "Forest Restoration", duration: "2h 15m", status: "active" },
                { name: "Water Source Protection", duration: "6h 45m", status: "given" },
                { name: "Trail Maintenance", duration: "1h 20m", status: "potential" },
                { name: "Wildlife Corridor", duration: "3h 10m", status: "active" }
              ].map((token, index) => (
                <div key={index} 
                     className="p-3 rounded-lg border"
                     style={{
                       backgroundColor: 'rgba(0, 0, 0, 0.2)',
                       borderColor: '#D4AF3730'
                     }}>
                  <div className="text-sm font-medium mb-1" 
                       style={{ color: '#E6C565' }}>
                    {token.name}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span style={{ color: '#D4AF37' }}>{token.duration}</span>
                    <span style={{ 
                      color: token.status === 'active' ? '#32CD32' : 
                             token.status === 'given' ? '#FFD700' : '#E6C565' 
                    }}>
                      {token.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SynchronicityDashboard;