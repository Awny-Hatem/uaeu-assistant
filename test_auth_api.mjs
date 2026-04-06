import fetch from 'node-fetch';

async function testAuth() {
  console.log("TESTING AUTHENTICATION FLOW...");
  try {
    // 1. Signup
    let res = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser123',
        password: 'password123',
        studentType: 'Current Student',
        major: 'Computer Science'
      })
    });
    
    let cookie = res.headers.get('set-cookie');
    let data = await res.json();
    console.log("Signup Response:", data);
    
    if(data.error === "Username already exists") {
        // Try to login if it already exists
        res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser123', password: 'password123' })
        });
        cookie = res.headers.get('set-cookie');
        data = await res.json();
        console.log("Login Response:", data);
    }
    
    if (!cookie) {
      console.log("FAILED: No session cookie returned.");
      return;
    }
    
    // Extract the raw cookie string to use for subsequent requests
    const cookieHeader = cookie.split(';')[0];
    
    // 2. Fetch Session
    res = await fetch('http://localhost:3000/api/auth/session', {
      headers: { 'Cookie': cookieHeader }
    });
    data = await res.json();
    console.log("Session Response:", data);
    
    // 3. Post a Chat Message
    console.log("POSTING CHAT MESSAGE...");
    res = await fetch('http://localhost:3000/api/chat', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
       body: JSON.stringify({
           messages: [{ role: 'user', content: 'What is the schedule for CS courses?' }],
           userContext: { studentType: 'Current Student', major: 'Computer Science' }
       })
    });
    
    let chatData = await res.json();
    console.log("Chat Response Source:", chatData.source);
    
    // 4. Test History
    console.log("FETCHING HISTORY...");
    res = await fetch('http://localhost:3000/api/history', {
      headers: { 'Cookie': cookieHeader }
    });
    let historyData = await res.json();
    console.log(`History count: ${historyData.messages?.length}`);
    if (historyData.messages?.length >= 2) {
        console.log("HISTORY TEST PASSED! Contextual conversation is saved.");
    } else {
        console.log("HISTORY TEST FAILED OR INCOMPLETE.", historyData.messages);
    }

  } catch(e) {
    console.error("Test failed:", e);
  }
}

testAuth();
