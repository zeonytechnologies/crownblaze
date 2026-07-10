const fs = require('fs');
const file = 'd:\\ZEONY\\crownblaze\\public\\index.html';
let content = fs.readFileSync(file, 'utf8');

const bookingStart = '  <!-- Booking Section -->';
const bookingStartIndex = content.indexOf(bookingStart);
if (bookingStartIndex !== -1) {
  const nextSectionIndex = content.indexOf('</section>', bookingStartIndex);
  if (nextSectionIndex !== -1) {
    const bookingEndIndex = nextSectionIndex + '</section>'.length;
    let bookingBlock = content.slice(bookingStartIndex, bookingEndIndex);
    
    // Remove the booking section from the middle of the countdown
    content = content.slice(0, bookingStartIndex) + content.slice(bookingEndIndex);
    
    // Clean up excessive newlines caused by the removal
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // The perfect insertion point is right before the banner, which naturally follows the countdown
    const insertTarget = '    <!-- Big DJ Festival Banner -->';
    const insertIndex = content.indexOf(insertTarget);
    
    if (insertIndex !== -1) {
      content = content.slice(0, insertIndex) + bookingBlock + '\n\n' + content.slice(insertIndex);
      fs.writeFileSync(file, content);
      console.log('Fixed HTML layout correctly.');
    } else {
      console.log('Insert target not found.');
    }
  } else {
    console.log('Booking section end not found.');
  }
} else {
  console.log('Booking section start not found.');
}
