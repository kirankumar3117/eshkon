require('dotenv').config({ path: '.env.local' });
const { createClient } = require('contentful');

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN,
  environment: process.env.CONTENTFUL_ENVIRONMENT || 'master'
});

async function test() {
  try {
    const entries = await client.getEntries({
      content_type: 'page',
      'fields.slug': 'home',
      include: 2,
      limit: 1
    });
    
    // Print the full structure beautifully without truncation hiding the top level
    const fs = require('fs');
    fs.writeFileSync('contentful-output.json', JSON.stringify(entries.items, null, 2));
    console.log('Saved to contentful-output.json');
  } catch (error) {
    console.error('Error fetching from Contentful:', error.message);
  }
}

test();
