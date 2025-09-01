const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Simulate the OTP generation and JWT functions
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const generateOTPToken = (email, otp) => {
  const payload = {
    email,
    otp,
    type: 'otp_verification'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: process.env.OTP_EXPIRES_IN || '5m'
  });
};

const verifyOTPToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
  } catch (error) {
    throw new Error('Invalid or expired OTP token');
  }
};

// Test the OTP flow
console.log('🧪 Testing OTP JWT Flow...\n');

// Step 1: Generate OTP and create token
const testEmail = 'test@example.com';
const otp = generateOTP();
console.log(`1. Generated OTP: ${otp}`);

const otpToken = generateOTPToken(testEmail, otp);
console.log(`2. Generated JWT Token: ${otpToken.substring(0, 50)}...\n`);

// Step 2: Verify the token
try {
  const decoded = verifyOTPToken(otpToken);
  console.log('3. Token verification successful!');
  console.log(`   Email: ${decoded.email}`);
  console.log(`   OTP: ${decoded.otp}`);
  console.log(`   Type: ${decoded.type}`);
  console.log(`   Expires: ${new Date(decoded.exp * 1000).toISOString()}\n`);
  
  // Step 3: Simulate OTP verification
  const userInputOTP = otp; // In real scenario, this comes from user input
  if (decoded.otp === userInputOTP && decoded.email === testEmail) {
    console.log('✅ OTP Verification Flow: SUCCESS');
    console.log('   - OTP matches');
    console.log('   - Email matches');
    console.log('   - Token is valid and not expired');
  } else {
    console.log('❌ OTP Verification Flow: FAILED');
  }
} catch (error) {
  console.log(`❌ Token verification failed: ${error.message}`);
}

console.log('\n🎉 OTP JWT implementation test completed!');
