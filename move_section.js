const fs = require('fs');

const file = 'd:\\ZEONY\\crownblaze\\public\\index.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Extract the booking section
const startPattern = '  <!-- Booking Section -->';
const endPattern = '  <!-- Footer -->';

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find booking section boundaries");
  process.exit(1);
}

const bookingBlock = content.slice(startIndex, endIndex);
// Remove booking section from original location
content = content.slice(0, startIndex) + content.slice(endIndex);

// 2. Find insertion point (after countdown container)
const insertMarker = '    </div>\r\n\r\n    <a href="#booking" class="btn-glow">Book Now</a>';
const insertMarkerAlt = '    </div>\n\n    <a href="#booking" class="btn-glow">Book Now</a>';

let insertionIndex = content.indexOf(insertMarker);
let markerLen = insertMarker.length;
if (insertionIndex === -1) {
  insertionIndex = content.indexOf(insertMarkerAlt);
  markerLen = insertMarkerAlt.length;
}

if (insertionIndex !== -1) {
  // Remove the 'Book Now' button by replacing it in the marker string
  const cleanMarker = insertMarker.replace('<a href="#booking" class="btn-glow">Book Now</a>', '');
  
  // Actually, let's just replace the exact button text globally to be safe
  content = content.replace(/<a href="#booking" class="btn-glow">Book Now<\/a>/g, '');
  
  // Find where countdown ends now
  const countdownEnd = '    </div>';
  const countdownStartIndex = content.indexOf('<div class="countdown-container" id="countdown">');
  const countdownEndIndex = content.indexOf(countdownEnd, countdownStartIndex) + countdownEnd.length;
  
  // Insert bookingBlock right after countdownEndIndex
  content = content.slice(0, countdownEndIndex) + '\n\n' + bookingBlock + content.slice(countdownEndIndex);
}

// 3. Add Floating Action Button (FAB) right before </body>
const fabHTML = `
  <!-- Scroll to top / form FAB -->
  <button id="fab-book" class="fab-btn">
    <i class="fa-solid fa-ticket"></i> Book Now
  </button>
`;

if (!content.includes('id="fab-book"')) {
  content = content.replace('</body>', fabHTML + '\n</body>');
}

fs.writeFileSync(file, content);
console.log("Moved successfully.");
