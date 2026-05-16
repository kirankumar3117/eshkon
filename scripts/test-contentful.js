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
    console.log(`Found ${entries.items.length} entries for slug "home".`);
    if (entries.items.length > 0) {
      console.log(JSON.stringify(entries.items[0].fields, null, 2));
    }
  } catch (error) {
    console.error('Error fetching from Contentful:', error.message);
  }
}

test();
