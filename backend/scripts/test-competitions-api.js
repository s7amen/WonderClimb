// Using built-in fetch (Node 18+)

const API_BASE = 'http://localhost:3000/api/v1';

// Test token - replace with actual token from login
const TEST_TOKEN = process.env.TEST_TOKEN || '';

async function testCompetitionsAPI() {
  console.log('Testing Competitions API...\n');

  const headers = {
    'Content-Type': 'application/json',
  };

  if (TEST_TOKEN) {
    headers['Authorization'] = `Bearer ${TEST_TOKEN}`;
  }

  // Test 1: GET /admin/competitions
  console.log('1. Testing GET /admin/competitions');
  try {
    const response = await fetch(`${API_BASE}/admin/competitions`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      console.log(`   ✅ Success! Found ${data.competitions?.length || 0} competitions`);
    } else {
      console.log(`   ❌ Error:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`   ❌ Exception:`, error.message);
  }

  console.log('\n');

  // Test 2: POST /admin/competitions/import/preview
  console.log('2. Testing POST /admin/competitions/import/preview');
  try {
    const response = await fetch(`${API_BASE}/admin/competitions/import/preview`, {
      method: 'POST',
      headers,
    });
    
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      console.log(`   ✅ Success! Scraped ${data.competitions?.length || 0} competitions`);
      if (data.competitions && data.competitions.length > 0) {
        console.log(`   First competition:`, JSON.stringify(data.competitions[0], null, 2));
      }
    } else {
      console.log(`   ❌ Error:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`   ❌ Exception:`, error.message);
    console.log(`   Stack:`, error.stack);
  }

  console.log('\n');
}

testCompetitionsAPI().catch(console.error);

