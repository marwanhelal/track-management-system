const fs = require('fs');
const path = require('path');

// This script would typically be run in the browser console
// But let's check what localStorage data might be available

console.log('To debug the frontend notification issue:');
console.log('1. Open browser developer tools');
console.log('2. Navigate to Application/Storage > Local Storage');
console.log('3. Check for these keys:');
console.log('   - accessToken');
console.log('   - user');
console.log('4. In the Console tab, run:');
console.log('   console.log("User:", JSON.parse(localStorage.getItem("user") || "null"));');
console.log('   console.log("Token:", localStorage.getItem("accessToken"));');
console.log('');
console.log('This will show you the current user ID and authentication status.');