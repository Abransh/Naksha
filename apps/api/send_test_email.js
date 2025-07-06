#!/usr/bin/env node

const axios = require("axios");

// Grab your API key from the environment
const API_KEY = "YOUR-KEY";
if (!API_KEY) {
  console.error("Error: Please set the RESEND_API_KEY environment variable");
  process.exit(1);
}

// Resend API endpoint
const URL = "https://api.resend.com/emails";

// Email payload
const payload = {
  from: "admin@nakksha.in",
  to: ["abranshbaliyan2807@gmail.com"],
  subject: "Test email from Resend API",
  html: "<strong>Hello from Resend!</strong>",
};

async function sendEmail() {
  try {
    const response = await axios.post(URL, payload, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    console.log("Email sent! Message ID:", response.data.id);
  } catch (err) {
    console.error("Failed to send email:", err.response?.data || err.message);
    process.exit(1);
  }
}

sendEmail();
