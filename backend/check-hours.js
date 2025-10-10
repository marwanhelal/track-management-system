const data = require('./export-data.json');

console.log('Checking work logs for invalid hours...\n');

let invalidCount = 0;

data.workLogs.forEach((log, i) => {
  if (!log.hours || log.hours <= 0 || log.hours > 24) {
    console.log(`[${i}] ID: ${log.id}, Hours: ${log.hours}, Engineer: ${log.engineer_id}`);
    invalidCount++;
  }
});

if (invalidCount === 0) {
  console.log('All work logs have valid hours.');
} else {
  console.log(`\nFound ${invalidCount} work logs with invalid hours.`);
}

// Show all unique hours values
console.log('\nAll unique hours values:');
const uniqueHours = [...new Set(data.workLogs.map(log => log.hours))].sort((a, b) => a - b);
console.log(uniqueHours);
