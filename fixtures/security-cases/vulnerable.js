// Vulnerable Code Sample for Static Security Observation Verification
const child_process = require('child_process');

// 1. Hardcoded AWS Credential pattern
const awsSecret = "AKIAIOSFODNN7EXAMPLE";

// 2. Dynamic Code Execution
function runDynamic(code) {
  return eval(code);
}

// 3. Command Execution
function runCommand(userInput) {
  child_process.exec("ping -c 1 " + userInput);
}

// 4. Insecure CORS
const corsOptions = {
  origin: '*',
};
